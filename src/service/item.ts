import { and, asc, count, desc, eq, getTableColumns, like, SQL, sql, sum } from 'drizzle-orm';
import { db } from '../db/db';
import {
	BatchStatus,
	batchTable,
	insertItemSchema,
	Item,
	itemTable,
	updateItemSchema,
} from '../db/schema';
import { z } from 'zod';
import { asNumber } from '../util/as-number';

/**
 * Responsible for item CRUD logic.
 */
export namespace ItemService {
	/**
	 * Creates a new item.
	 *
	 * @param item the properties of the item
	 * @return the created item, or nothing if the insert didn't occur
	 */
	export async function insert(item: z.infer<typeof insertItemSchema>) {
		const [inserted] = await db.insert(itemTable).values(item).returning();
		return inserted;
	}

	/**
	 * Updates an item based on an ID.
	 *
	 * @param id the ID of the item to update
	 * @param partial the properties to update on the item
	 * @return the updated item, or nothing if the update didn't occur
	 */
	export async function update(id: string, partial: z.infer<typeof updateItemSchema>) {
		const [updated] = await db
			.update(itemTable)
			.set(partial)
			.where(eq(itemTable.id, id))
			.returning();

		return updated;
	}

	/**
	 * Delete an item based on an ID.
	 *
	 * This will delete the item, all associated batches or counts.
	 *
	 * @param id the ID of the item to delete
	 * @return the deleted item, or nothing if the deletion didn't occur
	 */
	export async function remove(id: string) {
		const [deleted] = await db.delete(itemTable).where(eq(itemTable.id, id)).returning();
		return deleted;
	}

	/**
	 * Calculates the amount of batches that would be deleted
	 * when an associated item is deleted.
	 *
	 * @param id the ID of the item to check
	 * @return the amount of batches that would be deleted
	 */
	export async function getDeleteImpact(id: string) {
		const [{ total }] = await db
			.select({ total: count() })
			.from(batchTable)
			.where(eq(batchTable.itemId, id));

		return total;
	}

	/**
	 * Obtains an item based on an ID.
	 *
	 * @param id the ID of the item to get
	 * @return the item, or undefined if not found
	 */
	export async function getOne(id: string) {
		return await db.query.itemTable.findFirst({
			where: (item, { eq }) => eq(item.id, id),
		});
	}

	/**
	 * Calculates the total active quantity of an item based on it's ID.
	 *
	 * @param id the ID of the item
	 * @return the total active quantity the item has, or 0 by default
	 */
	export async function getActiveQuantity(id: string) {
		const [{ qty }] = await db
			.select({ qty: sum(batchTable.qty) })
			.from(batchTable)
			.where(and(eq(batchTable.itemId, id), eq(batchTable.status, 'active')));

		return asNumber(qty, 0);
	}

	/**
	 * Obtains an item and it's current active quantity.
	 *
	 * @param id the ID of the item to get
	 * @return the item with it's total quantity calculated
	 */
	export async function getWithActiveQty(id: string) {
		const item = await getOne(id);
		if (!item) return;

		return { ...item, totalQty: await getActiveQuantity(id) };
	}

	/**
	 * Obtains items in bulk, with pagination support.
	 *
	 * Included in each item result is the total quantity
	 * that the item has of a certain type, by default
	 * the active quantity.
	 *
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the key to order by, defaults to `'totalQty'`
	 * @param orderDir the direction in which the `orderBy` should be applied, default `'asc'`
	 * @param quantityType the type of quantity to include in the result, default `'active'`
	 * @param where a where statement to include in the query
	 */
	export async function getWithQuantity(
		limit: number,
		offset = 0,
		orderBy: keyof Item | 'totalQty' = 'totalQty',
		orderDir: 'asc' | 'desc' = 'asc',
		quantityType: BatchStatus = 'active',
		where?: SQL<unknown>,
	) {
		const totalQtyCol = sum(batchTable.qty);
		const orderCol = orderBy === 'totalQty' ? totalQtyCol : itemTable[orderBy];
		const orderByValue = orderDir === 'asc' ? asc(orderCol) : desc(orderCol);

		const q = db
			.select({ ...getTableColumns(itemTable), totalQty: totalQtyCol })
			.from(itemTable)
			.leftJoin(
				batchTable,
				and(eq(batchTable.itemId, itemTable.id), eq(batchTable.status, quantityType)),
			)
			.groupBy(itemTable.id)
			.orderBy(orderByValue)
			.limit(limit)
			.offset(offset);

		let res;
		if (where) res = await q.where(where);
		else res = await q;

		return res.map((v) => ({ ...v, totalQty: asNumber(v.totalQty, 0) }));
	}

	/**
	 * Searches for items by name without case sensitivity.
	 *
	 * @param query the search query, i.e. partial or complete item name
	 * @param limit the maximum amount of items to get
	 * @param offset the amount of items to skip, default `0`
	 * @param orderBy the key to order by, defaults to `'totalQty'`
	 * @param orderDir the direction in which the `orderBy` should be applied, default `'asc'`
	 * @param quantityType the type of quantity to include in the result, default `'active'`
	 * @return an array of items matching the query input
	 */
	export async function findByNameWithQuantity(
		query: string,
		limit: number,
		offset?: number,
		orderBy?: keyof Item,
		orderDir?: 'asc' | 'desc',
		quantityType?: BatchStatus,
	) {
		return await getWithQuantity(
			limit,
			offset,
			orderBy,
			orderDir,
			quantityType,
			like(sql`LOWER(${itemTable.name})`, `%${query.toLowerCase()}%`),
		);
	}
}
