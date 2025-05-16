import { and, asc, desc, eq, getTableColumns, like, or, sql, SQL, sum } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import { Batch, BatchStatus, batchTable, Item, itemTable, updateBatchSchema } from '../db/schema';
import { asNumber } from '../util/as-number';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { BatchService } from './batch';
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
 * Responsible for CRUD operations relating to stock, such as
 * modifying and querying item stock.
 *
 * This service is not responsible for handling
 * counts or batches, only the interactions between
 * batches and items.
 */
export namespace StockService {
	/**
	 * Calculates the total quantity of an item based on it's ID.
	 *
	 * @param id the ID of the item
	 * @param qtyType the type of quantity to calculate, defaults to `active`
	 * @return the total quantity the item has, or 0 by default
	 */
	export async function getItemStock(id: string, qtyType: BatchStatus = 'active') {
		const [{ qty }] = await db
			.select({ qty: sum(batchTable.qty) })
			.from(batchTable)
			.where(and(eq(batchTable.itemId, id), eq(batchTable.status, 'active')));

		return asNumber(qty, 0);
	}

	/**
	 * Obtains an item and it's current active quantity.
	 *
	 * @param idOrFormId the ID or form ID of the item to get
	 * @param qtyType the type of quantity to calculate, defaults to `active`
	 * @return the item with it's total quantity calculated
	 */
	export async function getWithQty(idOrFormId: string, qtyType?: BatchStatus) {
		const item = await ItemService.getOne(idOrFormId);
		if (!item) return;

		return { ...item, totalQty: await getItemStock(idOrFormId, qtyType) };
	}

	/**
	 * Helper function to build an SQL CASE block for assigning a priority value to each
	 * batch status type, allowing for it to be used in sorting.
	 *
	 * @param order the mapping of batch status type to priority
	 * @return the constructed SQL CASE block
	 */
	function buildBatchPriorityCase(order: Record<BatchStatus, number>) {
		const maxPriority = Math.max(...Object.values(order));
		const whens = Object.entries(order).map(([status, priority]) => {
			return sql`WHEN ${batchTable.status} = ${status} THEN ${priority}`;
		});

		return sql`CASE ${sql.join(whens, sql` `)} ELSE ${maxPriority + 1} END`;
	}

	/**
	 * Returns the `x` most important batches of an item for a quick stock overview.
	 *
	 * @param itemId the ID of the item to query for
	 * @param limit the number of batches to retrieve, defaults to `5`
	 * @return the most important batches for a specific item, decided by the system
	 */
	export async function getBatchSummary(itemId: string, limit = 5) {
		const whenStatus = <T extends SQL>(status: BatchStatus, expr: T) => {
			return sql`CASE WHEN ${batchTable.status} = ${status} THEN ${expr} ELSE NULL END`;
		};

		return await db
			.select()
			.from(batchTable)
			.where(eq(batchTable.itemId, itemId))
			.orderBy(
				// Priority by status
				buildBatchPriorityCase({ expired: 1, active: 2, archived: 3 }),

				// Expired batches, most recently expired first, if missing, oldest first
				desc(whenStatus('expired', sql`${batchTable.expiryDate}`)),

				// Active batches: oldest batches first
				asc(whenStatus('active', sql`${batchTable.receivedDate}`)),

				// Archived batches: most recently stocked out first, else oldest first
				desc(
					whenStatus(
						'archived',
						sql`COALESCE(${batchTable.stockoutDate}, ${batchTable.receivedDate})`,
					),
				),
			)

			.limit(limit);
	}

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
	export async function get(
		qtyType: BatchStatus,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Item & { totalQty: number }> = {
			key: 'totalQty',
			dir: qtyType === 'active' ? 'asc' : 'desc',
		},
		where?: SQL,
	) {
		const totalQtyColumn = sum(batchTable.qty);
		const evaluatedOrderBy = createOrderByValue(orderBy, {
			...getTableColumns(itemTable),
			totalQty: totalQtyColumn,
		});

		return db
			.select({ ...getTableColumns(itemTable), totalQty: totalQtyColumn })
			.from(itemTable)
			.leftJoin(
				batchTable,
				and(eq(batchTable.itemId, itemTable.id), eq(batchTable.status, qtyType)),
			)
			.where(where)
			.groupBy(itemTable.id)
			.orderBy(...evaluatedOrderBy)
			.limit(limit)
			.offset(offset);
	}

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
	export async function find(
		query: string,
		qtyType: BatchStatus,
		limit: number,
		offset?: number,
		orderBy?: OrderByDefinition<Item & { totalQty: number }>,
	) {
		const queryTemplate = `%${query.toLowerCase()}%`;
		return get(
			qtyType,
			limit,
			offset,
			orderBy,
			or(
				like(sql`LOWER(${itemTable.name})`, queryTemplate),
				like(sql`LOWER(${itemTable.description})`, queryTemplate),
			),
		);
	}

	/**
	 * Defines the order in which each consumption method needs
	 * to retrieve batches in.
	 */
	const consumptionMethodOrders: Readonly<Record<ConsumptionMethod, OrderByDefinition<Batch>>> = {
		[ConsumptionMethod.FIFO]: { key: 'receivedDate', dir: 'asc' },
		[ConsumptionMethod.LIFO]: { key: 'receivedDate', dir: 'desc' },
		[ConsumptionMethod.FEFO]: [
			{ key: 'expiryDate', dir: 'asc' },
			{ key: 'receivedDate', dir: 'asc' },
		],
	};

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
	 * @return the quantity that was not able to be removed, could be 0, or nothing if
	 * removal was not possible
	 */
	export async function consume(
		itemId: string,
		quantity: number,
		method = ConsumptionMethod.FIFO,
	) {
		z.number().nonnegative().parse(quantity);

		const item = await ItemService.getOne(itemId);
		if (!item) return;

		return await db.transaction(async (tx) => {
			const batches = await BatchService.getAllByItem(
				item.id,
				consumptionMethodOrders[method],
				eq(batchTable.status, 'active'),
			);

			let remaining = quantity;
			for (const batch of batches) {
				if (remaining <= 0) break;

				const qtyToRemove = Math.min(batch.qty, remaining);
				const newQty = batch.qty - qtyToRemove;
				remaining -= qtyToRemove;

				const batchUpdates: Partial<z.infer<typeof updateBatchSchema>> = { qty: newQty };
				if (newQty === 0) {
					batchUpdates.status = 'archived';
					batchUpdates.stockoutDate = new Date().toISOString();
				}

				await tx.update(batchTable).set(batchUpdates).where(eq(batchTable.id, batch.id));
			}

			return remaining;
		});
	}
}
