import { count, eq, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import { batchTable, DatabaseSupplier, itemTable, supplierTable } from '../db/schema';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { CreateSupplierSchema, UpdateSupplierSchema } from '@countday/shared';

/**
 * Responsible for supplier CRUD logic.
 */
export const SupplierService = createService(db, {
	/**
	 * Creates a new supplier.
	 *
	 * @param supplier the properties of the supplier
	 * @return the created supplier
	 */
	insert: async (client, supplier: z.infer<typeof CreateSupplierSchema>) => {
		const [inserted] = await client.insert(supplierTable).values(supplier).returning();
		if (!inserted) throw `Unknown insertion error`;
		return inserted;
	},

	/**
	 * Updates a supplier based on ID.
	 *
	 * @param id the ID of the supplier to update
	 * @param partial the properties to update on the supplier
	 * @return the updated supplier
	 */
	update: async (client, id: string, partial: z.infer<typeof UpdateSupplierSchema>) => {
		const [updated] = await client
			.update(supplierTable)
			.set(partial)
			.where(eq(supplierTable.id, id))
			.returning();

		if (!updated) throw `Unable to update supplier of ID "${id}"`;
		return updated;
	},

	/**
	 * Deletes a supplier based on an ID.
	 *
	 * This will `null` out the fields on any items or batches that reference
	 * this supplier.
	 *
	 * @param id the ID of the supplier to delete
	 * @return the deleted supplier
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client.delete(supplierTable).where(eq(supplierTable.id, id)).returning();

		if (!deleted) throw `Unable to delete supplier of ID "${id}"`;
		return deleted;
	},

	/**
	 * Calculates the amount of items and batches that would have
	 * their supplier removed if the associated supplier is deleted.
	 *
	 * @param id the ID of the supplier to check
	 * @return the amount of items and batches that would be affected
	 */
	getDeleteImpact: async (client, id: string) => {
		const [{ totalItems }] = await client
			.select({ totalItems: count() })
			.from(itemTable)
			.where(eq(itemTable.defaultSupplierId, id));

		const [{ totalBatches }] = await client
			.select({ totalBatches: count() })
			.from(batchTable)
			.where(eq(batchTable.supplierId, id));

		return { totalItems, totalBatches };
	},

	/**
	 * Obtains a supplier based on an ID.
	 *
	 * @param id the ID of the supplier
	 * @return the supplier, or undefined if not found
	 */
	getOne: async (client, id: string) => {
		return await client.query.supplierTable.findFirst({
			where: (supplier, { eq }) => eq(supplier.id, id),
		});
	},

	/**
	 * Obtains all suppliers.
	 *
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 */
	get: async (client, orderBy: OrderByDefinition<DatabaseSupplier> = 'name', where?: SQL<unknown>) => {
		return await client
			.select()
			.from(supplierTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, supplierTable));
	},
});
