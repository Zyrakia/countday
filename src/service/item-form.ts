import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/db';
import { itemFormTable, insertItemFormSchema, updateItemFormSchema } from '../db/schema';

/**
 * Responsible for most CRUD operations relating to item forms.
 *
 * The item service can also be used to retrieve items by a form ID. This
 * service is mostly used to manage only forms, not their related items.
 */
export namespace ItemFormService {
	/**
	 * Creates a new item form.
	 *
	 * @param form the properties of the item form
	 * @return the created form, or nothing if the insert didn't occur
	 */
	export async function insert(form: z.infer<typeof insertItemFormSchema>) {
		const [inserted] = await db.insert(itemFormTable).values(form).returning();
		if (inserted) return inserted;
	}

	/**
	 * Updates a form based on ID.
	 *
	 * @param id the ID of the form to update
	 * @param partial the properties to update on the form
	 * @return the updated form, or nothing if the update didn't occur
	 */
	export async function update(id: string, partial: z.infer<typeof updateItemFormSchema>) {
		const [updated] = await db
			.update(itemFormTable)
			.set(partial)
			.where(eq(itemFormTable.id, id))
			.returning();

		if (updated) return updated;
	}

	/**
	 * Deletes a form based on an ID.
	 *
	 * @param id the ID of the form to delete
	 * @return the deleted form, or nothing if the deletion didn't occur
	 */
	export async function remove(id: string) {
		const [deleted] = await db
			.delete(itemFormTable)
			.where(eq(itemFormTable.id, id))
			.returning();

		if (deleted) return deleted;
	}

	/**
	 * Returns all the forms that are representing an item based
	 * on the ID of that item.
	 *
	 * @param itemId the ID of the item to query
	 * @return all the forms that represent the given item
	 */
	export async function getFromItem(itemId: string) {
		return await db.query.itemFormTable.findMany({
			where: (form, { eq }) => eq(form.itemId, itemId),
		});
	}
}
