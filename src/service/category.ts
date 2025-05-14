import { z } from 'zod';
import {
	insertCategorySchema,
	itemTable,
	Category,
	categoryTable,
	updateCategorySchema,
} from '../db/schema';
import { db } from '../db/db';
import { asc, count, desc, eq, like, or, sql, SQL } from 'drizzle-orm';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

/**
 * Responsible for category CRUD logic.
 */
export namespace CategoryService {
	/**
	 * Creates a new category.
	 *
	 * @param category the properties of the category
	 * @return the created category, or nothing if the insert didn't occur
	 */
	export async function insert(category: z.infer<typeof insertCategorySchema>) {
		const [inserted] = await db.insert(categoryTable).values(category).returning();
		if (inserted) return inserted;
	}

	/**
	 * Updates a category based on ID.
	 *
	 * @param id the ID of the category to update
	 * @param partial the properties to update on the category
	 * @return the updated category, or nothing if the update didn't occur
	 */
	export async function update(id: string, partial: z.infer<typeof updateCategorySchema>) {
		const [updated] = await db
			.update(categoryTable)
			.set(partial)
			.where(eq(categoryTable.id, id))
			.returning();

		if (updated) return updated;
	}

	/**
	 * Deletes a category based on an ID.
	 *
	 * This will `null` out the fields on any items that reference
	 * this category.
	 *
	 * @param id the ID of the category to delete
	 * @return the deleted category, or nothing if the deletion didn't occur
	 */
	export async function remove(id: string) {
		const [deleted] = await db
			.delete(categoryTable)
			.where(eq(categoryTable.id, id))
			.returning();

		if (deleted) return deleted;
	}

	/**
	 * Calculates the amount of items that would have
	 * their category removed if the associated category is deleted.
	 *
	 * @param id the ID of the category to check
	 * @return the amount of items that would be affected
	 */
	export async function getDeleteImpact(id: string) {
		const [{ totalItems }] = await db
			.select({ totalItems: count() })
			.from(itemTable)
			.where(eq(itemTable.categoryId, id));

		return totalItems;
	}

	/**
	 * Obtains a category based on an ID.
	 *
	 * @param id the ID of the category
	 * @return the category, or undefined if not found
	 */
	export async function getOne(id: string) {
		return await db.query.categoryTable.findFirst({
			where: (category, { eq }) => eq(category.id, id),
		});
	}

	/**
	 * Obtains all categories.
	 *
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 */
	export async function get(orderBy: OrderByDefinition<Category> = 'name', where?: SQL<unknown>) {
		return await db
			.select()
			.from(categoryTable)
			.orderBy(...createOrderByValue(orderBy, categoryTable))
			.where(where);
	}
}
