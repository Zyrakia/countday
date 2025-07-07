import { and, asc, desc, eq, getTableColumns, like, notInArray, or, sql, SQL, sum } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import {
	Batch,
	BatchStatus,
	batchTable,
	insertBatchSchema,
	Item,
	itemCountTable,
	itemTable,
} from '../db/schema';
import { asNumber } from '../util/as-number';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { BatchService } from './batch';
import { CountService } from './count';
import { ItemService } from './item';

export enum ConsumptionMethod {
	/**
	 * FIFO (First In, First Out)
	 *
	 * Consumes based on the oldest batch received date.
	 */
	FIFO,

	/**
	 * LIFO (Last In, First Out)
	 *
	 * Consumes based on the earliest batch received date.
	 */
	LIFO,

	/**
	 * FEFO (First Expire, First Out)
	 *
	 * Consumes based on the earliest expiry date.
	 * As a backup, this will also secondary consume by
	 * oldest batch receive date.
	 */
	FEFO,
}

/**
 * Defines the order in which each consumption method needs
 * to retrieve batches in.
 */
const consumptionMethodOrders: Readonly<Record<ConsumptionMethod, OrderByDefinition<Batch>>> = {
	[ConsumptionMethod.FIFO]: { key: 'createdDate', dir: 'asc' },
	[ConsumptionMethod.LIFO]: { key: 'createdDate', dir: 'desc' },
	[ConsumptionMethod.FEFO]: [
		{ key: 'expiryDate', dir: 'asc' },
		{ key: 'createdDate', dir: 'asc' },
	],
};

/**
 * Responsible for CRUD operations relating to stock, such as
 * modifying and querying item stock.
 *
 * This service is not responsible for handling
 * counts or batches, only the interactions between
 * batches and items.
 */
export const StockService = createService(db, {
	/**
	 * Calculates the total quantity of an item based on it's ID.
	 *
	 * @param id the ID of the item
	 * @param qtyType the type of quantity to calculate, defaults to `active`
	 * @param wher a where statement to include when counting batches
	 * @return the total quantity the item has, or 0 by default
	 */
	getItemQty: async (client, id: string, qtyType: BatchStatus = 'active', where?: SQL) => {
		const [{ qty }] = await client
			.select({ qty: sum(batchTable.qty) })
			.from(batchTable)
			.where(and(eq(batchTable.itemId, id), eq(batchTable.status, qtyType), where));

		return asNumber(qty, 0);
	},

	/**
	 * Obtains an item and it's current active quantity.
	 *
	 * @param idOrFormId the ID or form ID of the item to get
	 * @param qtyType the type of quantity to calculate, defaults to `active`
	 * @return the item with it's total quantity calculated
	 */
	getItemWithQty: async (client, idOrFormId: string, qtyType?: BatchStatus) => {
		const [item, itemServiceErr] = await ItemService.$with(client).getOne(idOrFormId);
		if (itemServiceErr !== null) throw itemServiceErr;

		const [totalQty, qtyErr] = await StockService.$with(client).getItemQty(item.id, qtyType);
		if (qtyErr !== null) throw qtyErr;

		return { ...item, totalQty };
	},

	/**
	 * Returns the `x` most important batches of an item for a quick stock overview.
	 *
	 * @param itemId the ID of the item to query for
	 * @param limit the number of batches to retrieve, defaults to `5`
	 * @return the most important batches for a specific item, decided by the system
	 */
	getBatchSummary: async (client, itemId: string, limit = 5) => {
		const buildBatchPriorityCase = (order: Record<BatchStatus, number>) => {
			const maxPriority = Math.max(...Object.values(order));
			const whens = Object.entries(order).map(([status, priority]) => {
				return sql`WHEN ${batchTable.status} = ${status} THEN ${priority}`;
			});

			return sql`CASE ${sql.join(whens, sql` `)} ELSE ${maxPriority + 1} END`;
		};

		const whenStatus = <T extends SQL>(status: BatchStatus, expr: T) => {
			return sql`CASE WHEN ${batchTable.status} = ${status} THEN ${expr} ELSE NULL END`;
		};

		return await client
			.select()
			.from(batchTable)
			.where(eq(batchTable.itemId, itemId))
			.orderBy(
				// Priority by status
				buildBatchPriorityCase({ expired: 1, active: 2, archived: 3 }),

				// Expired batches, most recently expired first, if missing, oldest first
				desc(whenStatus('expired', sql`${batchTable.expiryDate}`)),

				// Active batches: oldest batches first
				asc(whenStatus('active', sql`${batchTable.createdDate}`)),

				// Archived batches: most recently stocked out first, else oldest first
				desc(
					whenStatus(
						'archived',
						sql`COALESCE(${batchTable.stockoutDate}, ${batchTable.createdDate})`,
					),
				),
			)

			.limit(limit);
	},

	/**
	 * Returns a list of items in bulk, with pagination support.
	 *
	 * Each item result includes the total quantity that the item
	 * has of a certain status.
	 *
	 * @param qtyType the type of quantity to include in the result
	 * @param limit the maximum amount of rows to return
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'totalQty'`
	 * @param where a where statement to include in the query
	 */
	getItems: async (
		client,
		qtyType: BatchStatus,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Item & { totalQty: number }> = {
			key: 'totalQty',
			dir: qtyType === 'active' ? 'asc' : 'desc',
		},
		where?: SQL,
	) => {
		const totalQtyColumn = sum(batchTable.qty);
		const evaluatedOrderBy = createOrderByValue(orderBy, {
			...getTableColumns(itemTable),
			totalQty: totalQtyColumn,
		});

		return client
			.select({ ...getTableColumns(itemTable), totalQty: totalQtyColumn })
			.from(itemTable)
			.leftJoin(batchTable, and(eq(batchTable.itemId, itemTable.id), eq(batchTable.status, qtyType)))
			.where(where)
			.groupBy(itemTable.id)
			.orderBy(...evaluatedOrderBy)
			.limit(limit)
			.offset(offset);
	},

	/**
	 * Searches for items by name without case sensitivity, with pagination support.
	 *
	 * Each item result includes the total quantity that the item
	 * has of a certain status.
	 *
	 * @param query the search query, i.e. partial or complete item name
	 * @param qtyType the type of quantity to include in the result
	 * @param limit the maximum amount of rows to return
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'totalQty'`
	 * @param where a where statement to include in the query
	 */
	findItems: async (
		client,
		query: string,
		qtyType: BatchStatus,
		limit: number,
		offset?: number,
		orderBy?: OrderByDefinition<Item & { totalQty: number }>,
	) => {
		const queryTemplate = `%${query.toLowerCase()}%`;

		const [stock, err] = await StockService.$with(client).getItems(
			qtyType,
			limit,
			offset,
			orderBy,
			or(
				like(sql`LOWER(${itemTable.name})`, queryTemplate),
				like(sql`LOWER(${itemTable.description})`, queryTemplate),
			),
		);

		if (err !== null) throw err;
		return stock;
	},

	/**
	 * Removes a specific amount of quantity from an item.
	 *
	 * The quantity is removed from the oldest active batch first, and
	 * will continue to remove until finished or no more active quantity
	 * exists for the item.
	 *
	 * If the item ID is invalid, or there are no batches to remove from, the
	 * original quantity will be returned.
	 *
	 * @param itemId the ID of the item to remove from
	 * @param quantity the amount of quantity to remove
	 * @param method the method in which to consume the quantity, default {@link ConsumptionMethod.FIFO}
	 * @param where an additional where statement to include when fetching batches
	 * @return the quantity that was not able to be removed, could be 0
	 */
	consume: async (
		client,
		itemId: string,
		quantity: number,
		method: ConsumptionMethod = ConsumptionMethod.FIFO,
		where?: SQL,
	) => {
		z.number().nonnegative().parse(quantity);

		const [item, itemServiceErr] = await ItemService.$with(client).getOne(itemId);
		if (itemServiceErr !== null) throw itemServiceErr;

		const [batches, batchServiceErr] = await BatchService.$with(client)._getAllByItem(
			item.id,
			consumptionMethodOrders[method],
			and(eq(batchTable.status, 'active'), where),
		);

		if (batchServiceErr !== null) throw batchServiceErr;

		return await client.transaction(async (tx) => {
			let remaining = quantity;
			for (const batch of batches) {
				if (remaining <= 0) break;

				const qtyToRemove = Math.min(batch.qty, remaining);
				const newQty = batch.qty - qtyToRemove;
				remaining -= qtyToRemove;

				const batchUpdates: Partial<Batch> = { qty: newQty };
				if (newQty === 0) {
					batchUpdates.status = 'archived';
					batchUpdates.stockoutDate = new Date().toISOString();
				}

				const [, err] = await BatchService.$with(tx).update(batch.id, batchUpdates);
				if (err !== null) throw err;
			}

			return remaining;
		});
	},

	/**
	 * Creates a new batch.
	 *
	 * This will create drift for any active counts that have
	 * already counted the affected item.
	 *
	 * @param batch the properties of the batch to create
	 * @return the created batch, if creation was successful
	 */
	receive: async (client, batch: z.infer<typeof insertBatchSchema>) => {
		return await client.transaction(async (tx) => {
			const [inserted, batchServiceErr] = await BatchService.$with(tx).insert(batch);
			if (batchServiceErr !== null) throw batchServiceErr;

			const [, err] = await CountService.$with(tx).processDrift({
				itemId: inserted.itemId,
				qtyChange: inserted.qty,
			});

			if (err !== null) throw err;
			return inserted;
		});
	},

	/**
	 * Reconciles a completed inventory count session by adjusting batch quantities
	 * and creating new batches for discrepancies.
	 *
	 * The reconciliation process prioritizes explicit batch counts:
	 * 1.  **Specific Batch Counts:** Any `itemCount` entries with an associated `batchId` are processed first.
	 *     The quantity of these specific batches is directly updated to the `countedQty`.
	 *     If a batch's `countedQty` becomes zero, its status is changed to 'archived'.
	 * 2.  **Generic Item Counts:** For `itemCount` entries *without* a `batchId`, the system calculates the
	 *     difference between the `countedQty` and the *remaining active stock* of that item
	 *     (i.e., stock from batches *not* explicitly counted in this reconciliation).
	 *     *   If `countedQty` is less than the remaining stock, the difference is consumed from the
	 *         remaining batches using the default consumption method.
	 *     *   If `countedQty` is greater than the remaining stock, a new batch is created for the
	 *         difference, representing newly 'found' or unclassified stock for the item.
	 *
	 * @param countId the ID of the count session to reconcile
	 */
	reconcileCount: async (client, countId: string) => {
		await client.transaction(async (tx) => {
			const counts = await tx.select().from(itemCountTable).where(eq(itemCountTable.countId, countId));

			const genericAdjustments = [];
			const batchAdjustments = [];

			for (const count of counts) {
				if (count.batchId) batchAdjustments.push(count);
				else genericAdjustments.push(count);
			}

			const batchAdjustmentIds = batchAdjustments.map(({ batchId }) => batchId!);
			const excludeAdjustedBatches = notInArray(batchTable.id, batchAdjustmentIds);

			await Promise.all(
				genericAdjustments.map(async (count) => {
					const [currentQty, itemQtyErr] = await StockService.$with(tx).getItemQty(
						count.itemId,
						'active',
						excludeAdjustedBatches,
					);
					if (itemQtyErr !== null) throw itemQtyErr;

					const offsetQty = count.countedQty - currentQty;

					if (offsetQty === 0) return;

					if (offsetQty < 0) {
						const [uncomsumedQty, consumeErr] = await StockService.$with(tx).consume(
							count.itemId,
							Math.abs(offsetQty),
							undefined,
							excludeAdjustedBatches,
						);

						if (consumeErr !== null) throw consumeErr;

						if (uncomsumedQty !== 0)
							throw `${uncomsumedQty} remaining quantity could not be removed from ${count.itemId} during count reconciliation.`;
					} else {
						await StockService.$with(tx).receive({
							itemId: count.itemId,
							qty: offsetQty,
						});
					}
				}),
			);

			await Promise.all(
				batchAdjustments.map(async (count) => {
					if (!count.batchId) return;

					const isDepleted = count.countedQty === 0;
					await BatchService.$with(tx).update(count.batchId, {
						qty: count.countedQty,
						status: isDepleted ? 'archived' : 'active',
					});
				}),
			);
		});
	},
});
