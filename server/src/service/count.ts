import { and, count, countDistinct, eq, getTableColumns, sql, SQL, sum } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import {
	DatabaseCount,
	DatabaseCountDrift,
	DatabaseItem,
	countDriftTable,
	countTable,
	itemCountTable,
	itemTable,
} from '../db/schema';
import { asNumber } from '../util/as-number';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { nowIso } from '../util/time';
import { StockService } from './stock';
import { CreateCountDriftSchema, CreateItemCountSchema } from '@countday/shared';

type ItemCountStaus = 'counted' | 'uncounted' | 'drifted';

/**
 * Handles CRUD operations for counts and item counts.
 */
export const CountService = createService(db, {
	/**
	 * Creates a new count.
	 *
	 * @return the inserted count
	 */
	start: async (client) => {
		const [created] = await client.insert(countTable).values({ startedDate: nowIso() }).returning();

		if (!created) throw `Unknown error while starting count`;
		return created;
	},

	/**
	 * Marks a count as finished, and applies all inventory reconciliations
	 * that the count has made.
	 *
	 * @param id the ID of the count to finish
	 * @return the finished count
	 */
	finish: async (client, id: string) => {
		return await client.transaction(async (tx) => {
			const [updated] = await tx
				.update(countTable)
				.set({ finishedDate: nowIso() })
				.where(eq(countTable.id, id))
				.returning();

			if (!updated) throw `Unable to finish count by ID "${id}"`;

			let [, err] = await StockService.$with(tx).reconcileCount(id);
			if (err !== null) throw err;

			[, err] = await CountService.$with(tx).clearDrifts(updated.id);
			if (err !== null) throw err;

			return updated;
		});
	},

	/**
	 * Deletes a count.
	 *
	 * @param id the ID of the count to delete
	 * @return the deleted count
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client.delete(countTable).where(eq(countTable.id, id)).returning();
		if (!deleted) throw `Unable to delete count by ID "${id}"`;
		return deleted;
	},

	/**
	 * Retrieves a count by ID.
	 *
	 * @param id the ID of the count to get
	 * @return the count, if it exists
	 */
	getOne: async (client, id: string) => {
		return await client.query.countTable.findFirst({
			where: (count, { eq }) => eq(count.id, id),
		});
	},

	/**
	 * Retrieves all counts.
	 *
	 * @param orderBy the structure to order the result by
	 * @param where a where clause to include in the query
	 * @return an array of counts
	 */
	get: async (
		client,
		orderBy: OrderByDefinition<DatabaseCount> = { key: 'startedDate', dir: 'asc' },
		where?: SQL,
	) => {
		return await client
			.select()
			.from(countTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, countTable));
	},

	/**
	 * Inserts a new item count, or updates an existing
	 * entry if it already exists.
	 *
	 * @param count the properties of the item count to create
	 * @return the created or updated item count, or undefined if not successful
	 */
	countItem: async (client, count: z.infer<typeof CreateItemCountSchema>) => {
		const countedDate = nowIso();
		const { batchId, countedQty } = count;

		return await client.transaction(async (tx) => {
			const [upserted] = await tx
				.insert(itemCountTable)
				.values({ ...count, batchId: batchId ?? null, countedDate })
				.onConflictDoUpdate({
					target: [itemCountTable.countId, itemCountTable.itemId, itemCountTable.batchId],
					set: { countedQty, countedDate },
				})
				.returning();

			if (!upserted) throw `Unable to process count of item with ID ${count.itemId}`;

			const [, err] = await CountService.$with(tx).clearDrifts(upserted.countId, upserted.itemId);
			if (err !== null) throw err;

			return upserted;
		});
	},

	/**
	 * Retrieves all the drifts that are affecting
	 * a specific count.
	 *
	 * @param countId the ID of the count to get drifts for
	 * @return the drifts that affect the count
	 */
	getDrifts: async (client, countId: string) => {
		return await client.select().from(countDriftTable).where(eq(countDriftTable.countId, countId));
	},

	/**
	 * Clears drifts affecting a count, or a specific item
	 * in a count.
	 *
	 * @param tx the transaction client in which to clear the drifts
	 * @param countId the ID of the count to clear drifts for
	 * @param itemId the ID of the item to clear drifts for, if omitted, clears all drifts
	 * @return the cleared drifts
	 */
	clearDrifts: async (client, countId: string, itemId?: string) => {
		const where = [eq(countDriftTable.countId, countId)];
		if (itemId) where.push(eq(countDriftTable.itemId, itemId));

		return await client
			.delete(countDriftTable)
			.where(and(...where))
			.returning();
	},

	/**
	 * Returns active count sessions that include a count
	 * of a specific item.
	 *
	 * @param itemId the ID of the item to search with
	 * @return all active counts that have counted the given item
	 */
	getActiveCountsForItem: async (client, itemId: string) => {
		return await client
			.select({ countId: countTable.id })
			.from(countTable)
			.innerJoin(
				itemCountTable,
				and(eq(itemCountTable.countId, countTable.id), eq(itemCountTable.itemId, itemId)),
			)
			.where(eq(countTable.finishedDate, sql`NULL`));
	},

	/**
	 * Handles a drift in quantity of a specific item.
	 *
	 * This will take all active counts who have already counted this item
	 * and mark the count as having drifted by the given amount. If there
	 * is already an existing drift, it will be updated to include
	 * the new drift quantity as well.
	 *
	 * @param tx the transaction client in which to process the drift
	 * @param drift the properties of the drift to process
	 */
	processDrift: async (client, drift: z.infer<typeof CreateCountDriftSchema>) => {
		if (drift.qtyChange === 0) return;

		const [affectedCounts, err] = await CountService.$with(client).getActiveCountsForItem(drift.itemId);
		if (err !== null) throw err;

		const driftDate = nowIso();
		const rows = affectedCounts.map(
			({ countId }): DatabaseCountDrift => ({
				countId,
				driftDate,
				...drift,
			}),
		);

		await client
			.insert(countDriftTable)
			.values(rows)
			.onConflictDoUpdate({
				target: [countDriftTable.countId, countDriftTable.itemId],
				set: {
					driftDate,
					qtyChange: sql`${countDriftTable.qtyChange} + ${drift.qtyChange}`,
				},
			});
	},

	/**
	 * Determines the amount of items that exist, and the amount of
	 * items that have already been counted within a specific count session.
	 *
	 * @param id the ID of the count to get progression for
	 * @param where a where clause to include in the query determining the total item count
	 */
	getProgress: async (client, id: string, where?: SQL) => {
		const [itemsSum] = await client.select({ total: count() }).from(itemTable).where(where);
		const totalItems = asNumber(itemsSum?.total, 0);

		const [countedSum] = await client
			.select({ total: countDistinct(itemCountTable.itemId) })
			.from(itemCountTable)
			.where(eq(itemCountTable.countId, id));
		const countedItems = asNumber(countedSum?.total, 0);

		return { totalItems, totalCounted: countedItems };
	},

	/**
	 * Returns items for a count, with pagination support.

	 * @param id the ID of the count to get items for
	 * @param limit the maximum amount of items to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order the result by, default `'completedCounts'`
	 * @param where a where clause to include in the query
	 */
	getItems: async (
		client,
		id: string,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<DatabaseItem & { completedCounts: number }> = 'completedCounts',
		where?: SQL,
	) => {
		const completedCounts = count(itemCountTable.itemId);

		return await client
			.select({ ...getTableColumns(itemTable), completedCounts })
			.from(itemTable)
			.leftJoin(
				itemCountTable,
				and(eq(itemCountTable.countId, id), eq(itemCountTable.itemId, itemTable.id)),
			)
			.where(where)
			.groupBy(itemTable.id)
			.orderBy(...createOrderByValue(orderBy, { ...getTableColumns(itemTable), completedCounts }))
			.limit(limit)
			.offset(offset);
	},
});
