import { count, eq, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import {
    batchTable, insertSupplierSchema, itemTable, Supplier, supplierTable, updateSupplierSchema
} from '../db/schema';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

/**
 * Responsible for supplier CRUD logic.
 */
export namespace SupplierService {
	/**
	 * Creates a new supplier.
	 *
	 * @param supplier the properties of the supplier
	 * @return the created supplier, or nothing if the insert didn't occur
	 */
	export async function insert(supplier: z.infer<typeof insertSupplierSchema>) {
		const [inserted] = await db.insert(supplierTable).values(supplier).returning();
		if (inserted) return inserted;
	}

	/**
	 * Updates a supplier based on ID.
	 *
	 * @param id the ID of the supplier to update
	 * @param partial the properties to update on the supplier
	 * @return the updated supplier, or nothing if the update didn't occur
	 */
	export async function update(id: string, partial: z.infer<typeof updateSupplierSchema>) {
		const [updated] = await db
			.update(supplierTable)
			.set(partial)
			.where(eq(supplierTable.id, id))
			.returning();

		if (updated) return updated;
	}

	/**
	 * Deletes a supplier based on an ID.
	 *
	 * This will `null` out the fields on any items or batches that reference
	 * this supplier.
	 *
	 * @param id the ID of the supplier to delete
	 * @return the deleted supplier, or nothing if the deletion didn't occur
	 */
	export async function remove(id: string) {
		const [deleted] = await db
			.delete(supplierTable)
			.where(eq(supplierTable.id, id))
			.returning();

		if (deleted) return deleted;
	}

	/**
	 * Calculates the amount of items and batches that would have
	 * their supplier removed if the associated supplier is deleted.
	 *
	 * @param id the ID of the supplier to check
	 * @return the amount of items and batches that would be affected
	 */
	export async function getDeleteImpact(id: string) {
		const [{ totalItems }] = await db
			.select({ totalItems: count() })
			.from(itemTable)
			.where(eq(itemTable.defaultSupplierId, id));

		const [{ totalBatches }] = await db
			.select({ totalBatches: count() })
			.from(batchTable)
			.where(eq(batchTable.supplierId, id));

		return { totalItems, totalBatches };
	}

	/**
	 * Obtains a supplier based on an ID.
	 *
	 * @param id the ID of the supplier
	 * @return the supplier, or undefined if not found
	 */
	export async function getOne(id: string) {
		return await db.query.supplierTable.findFirst({
			where: (supplier, { eq }) => eq(supplier.id, id),
		});
	}

	/**
	 * Obtains all suppliers.
	 *
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 */
	export async function get(orderBy: OrderByDefinition<Supplier> = 'name', where?: SQL<unknown>) {
		return await db
			.select()
			.from(supplierTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, supplierTable));
	}
}
