import { count, eq, getTableColumns, like, or, SQL, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import {
	batchTable,
	insertItemSchema,
	Item,
	itemFormTable,
	itemTable,
	updateItemSchema,
} from '../db/schema';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

/**
 * Responsible for item CRUD logic.
 */
export const ItemService = createService(db, {
	/**
	 * Creates a new item.
	 *
	 * @param item the properties of the item
	 * @return the created item
	 */
	insert: async (client, item: z.infer<typeof insertItemSchema>) => {
		const [inserted] = await client.insert(itemTable).values(item).returning();
		if (!inserted) throw `Unknown insertion error`;
		return inserted;
	},

	/**
	 * Updates an item based on an ID.
	 *
	 * @param id the ID of the item to update
	 * @param partial the properties to update on the item
	 * @return the updated item
	 */
	update: async (client, id: string, partial: z.infer<typeof updateItemSchema>) => {
		const [updated] = await client
			.update(itemTable)
			.set(partial)
			.where(eq(itemTable.id, id))
			.returning();

		if (!updated) throw `Unable to update item by ID "${id}"`;
		return updated;
	},

	/**
	 * Delete an item based on an ID.
	 *
	 * This will delete the item, all associated batches or counts.
	 *
	 * @param id the ID of the item to delete
	 * @return the deleted item
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client.delete(itemTable).where(eq(itemTable.id, id)).returning();
		if (!deleted) throw `Unable to delete item by ID "${id}"`;
		return deleted;
	},

	/**
	 * Calculates the amount of batches that would be deleted
	 * when an associated item is deleted.
	 *
	 * @param id the ID of the item to check, does not accept form ID
	 * @return the amount of batches that would be deleted
	 */
	getDeleteImpact: async (client, id: string) => {
		const [{ total }] = await client
			.select({ total: count() })
			.from(batchTable)
			.where(eq(batchTable.itemId, id));
		return total;
	},

	/**
	 * Obtains an item based on an ID or form ID.
	 *
	 * @param idOrFormId the ID of the item to get
	 * @return the item, or undefined if not found
	 */
	getOne: async (client, idOrFormId: string) => {
		const [res] = await client
			.select({
				...getTableColumns(itemTable),
				formId: itemFormTable.id,
				formQtyMultiplier: itemFormTable.qtyMultiplier,
			})
			.from(itemTable)
			.leftJoin(itemFormTable, eq(itemTable.id, itemFormTable.itemId))
			.where(or(eq(itemTable.id, idOrFormId), eq(itemFormTable.id, idOrFormId)))
			.limit(1);

		if (!res) throw `Unable to retrieve item by ID or form ID "${idOrFormId}"`;
		return res;
	},

	/**
	 * Obtains items in bulk, with pagination support.
	 *
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 * @return an array of items matching the query input
	 */
	get: async (
		client,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Item> = 'name',
		where?: SQL<unknown>,
	) => {
		return await client
			.select()
			.from(itemTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, itemTable))
			.limit(limit)
			.offset(offset);
	},

	/**
	 * Searches for items by name without case sensitivity.
	 *
	 * @param query the search query, i.e. partial or complete item name
	 * @param limit the maximum amount of items to get
	 * @param offset the amount of items to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @return an array of items matching the query input
	 */
	find: async (
		client,
		query: string,
		limit: number,
		offset?: number,
		orderBy?: OrderByDefinition<Item>,
	) => {
		const queryTemplate = `%${query.toLowerCase()}%`;

		const [items, err] = await ItemService.$with(client).get(
			limit,
			offset,
			orderBy,
			or(
				like(sql`LOWER(${itemTable.name})`, queryTemplate),
				like(sql`LOWER(${itemTable.description})`, queryTemplate),
			),
		);

		if (err !== null) throw err;
		return items;
	},
});
