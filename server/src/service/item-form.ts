import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import { itemFormTable } from '../db/schema';
import { insertItemFormSchema, updateItemFormSchema } from '../schemas';
import { createService } from '../util/create-service';

/**
 * Responsible for most CRUD operations relating to item forms.
 *
 * The item service can also be used to retrieve items by a form ID. This
 * service is mostly used to manage only forms, not their related items.
 */
export const ItemFormService = createService(db, {
	/**
	 * Creates a new item form.
	 *
	 * @param form the properties of the item form
	 * @return the created form
	 */
	insert: async (client, form: z.infer<typeof insertItemFormSchema>) => {
		const [inserted] = await client.insert(itemFormTable).values(form).returning();
		if (!inserted) throw `Unknown insertion error`;
		return inserted;
	},

	/**
	 * Updates a form based on ID.
	 *
	 * @param id the ID of the form to update
	 * @param partial the properties to update on the form`
	 * @return the updated form
	 */
	update: async (client, id: string, partial: z.infer<typeof updateItemFormSchema>) => {
		const [updated] = await client
			.update(itemFormTable)
			.set(partial)
			.where(eq(itemFormTable.id, id))
			.returning();

		if (!updated) throw `Unable to update item form of ID "${id}"`;
		return updated;
	},

	/**
	 * Deletes a form based on an ID.
	 *
	 * @param id the ID of the form to delete
	 * @return the deleted form
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client
			.delete(itemFormTable)
			.where(eq(itemFormTable.id, id))
			.returning();

		if (!deleted) throw `Unable to delete item form of ID "${id}"`;
		return deleted;
	},

	/**
	 * Returns all the forms that are representing an item based
	 * on the ID of that item.
	 *
	 * @param itemId the ID of the item to query
	 * @return all the forms that represent the given item
	 */
	getFromItem: async (client, itemId: string) => {
		return await client.query.itemFormTable.findMany({
			where: (form, { eq }) => eq(form.itemId, itemId),
		});
	},
});
