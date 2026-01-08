import { count, eq, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import { DatabaseCategory, categoryTable, itemTable } from '../db/schema';
import { insertCategorySchema, updateCategorySchema } from '../schemas';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

/**
 * Responsible for category CRUD logic.
 */
export const CategoryService = createService(db, {
	/**
	 * Creates a new category.
	 *
	 * @param category the properties of the category
	 * @return the created category
	 */
	insert: async (client, category: z.infer<typeof insertCategorySchema>) => {
		const [inserted] = await client.insert(categoryTable).values(category).returning();
		if (!inserted) throw `Unknown insertion error`;
		return inserted;
	},

	/**
	 * Updates a category based on ID.
	 *
	 * @param id the ID of the category to update
	 * @param partial the properties to update on the category
	 * @return the updated category
	 */
	update: async (client, id: string, partial: z.infer<typeof updateCategorySchema>) => {
		const [updated] = await client
			.update(categoryTable)
			.set(partial)
			.where(eq(categoryTable.id, id))
			.returning();

		if (!updated) throw `Unable to update category by ID "${id}"`;
		return updated;
	},

	/**
	 * Deletes a category based on an ID.
	 *
	 * This will `null` out the fields on any items that reference
	 * this category.
	 *
	 * @param id the ID of the category to delete
	 * @return the deleted category
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client
			.delete(categoryTable)
			.where(eq(categoryTable.id, id))
			.returning();

		if (!deleted) throw `Unable to delete cateogry by ID "${id}"`;
		return deleted;
	},

	/**
	 * Calculates the amount of items that would have
	 * their category removed if the associated category is deleted.
	 *
	 * @param id the ID of the category to check
	 * @return the amount of items that would be affected
	 */
	getDeleteImpact: async (client, id: string) => {
		const [{ totalItems }] = await client
			.select({ totalItems: count() })
			.from(itemTable)
			.where(eq(itemTable.categoryId, id));

		return totalItems;
	},

	/**
	 * Obtains a category based on an ID.
	 *
	 * @param id the ID of the category
	 * @return the category, or undefined if not found
	 */
	getOne: async (client, id: string) => {
		return await client.query.categoryTable.findFirst({
			where: (category, { eq }) => eq(category.id, id),
		});
	},

	/**
	 * Obtains all categories.
	 *
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 */
get: async (
	client,
	orderBy: OrderByDefinition<DatabaseCategory> = 'name',
	where?: SQL<unknown>,
) => {
		return await client
			.select()
			.from(categoryTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, categoryTable));
	},
});
