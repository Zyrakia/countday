import { and, asc, count, desc, eq, getTableColumns, like, or, SQL, sql, sum } from 'drizzle-orm';
import { db } from '../db/db';
import {
	BatchStatus,
	batchTable,
	insertItemSchema,
	Item,
	itemFormTable,
	itemTable,
	updateItemSchema,
} from '../db/schema';
import { z } from 'zod';
import { asNumber } from '../util/as-number';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

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
		if (inserted) return inserted;
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

		if (updated) return updated;
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
		if (deleted) return deleted;
	}

	/**
	 * Calculates the amount of batches that would be deleted
	 * when an associated item is deleted.
	 *
	 * @param id the ID of the item to check, does not accept form ID
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
	 * Obtains an item based on an ID or form ID.
	 *
	 * @param idOrFormId the ID of the item to get
	 * @return the item, or undefined if not found
	 */
	export async function getOne(idOrFormId: string) {
		const [res] = await db
			.select({
				...getTableColumns(itemTable),
				formId: itemFormTable.id,
				formQtyMultiplier: itemFormTable.qtyMultiplier,
			})
			.from(itemTable)
			.leftJoin(itemFormTable, eq(itemTable.id, itemFormTable.itemId))
			.where(or(eq(itemTable.id, idOrFormId), eq(itemFormTable.id, idOrFormId)))
			.limit(1);

		if (res) return res;
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
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 * @return an array of items matching the query input
	 */
	export async function get(
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Item> = 'name',
		where?: SQL<unknown>,
	) {
		return await db
			.select()
			.from(itemTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, itemTable))
			.limit(limit)
			.offset(offset);
	}

	/**
	 * Searches for items by name without case sensitivity.
	 *
	 * @param query the search query, i.e. partial or complete item name
	 * @param limit the maximum amount of items to get
	 * @param offset the amount of items to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @return an array of items matching the query input
	 */
	export async function find(
		query: string,
		limit: number,
		offset?: number,
		orderBy?: OrderByDefinition<Item>,
	) {
		const queryTemplate = `%${query.toLowerCase()}%`;

		return await get(
			limit,
			offset,
			orderBy,
			or(
				like(sql`LOWER(${itemTable.name})`, queryTemplate),
				like(sql`LOWER(${itemTable.description})`, queryTemplate),
			),
		);
	}
}
