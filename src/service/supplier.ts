import { z } from 'zod';
import {
	batchTable,
	insertSupplierSchema,
	itemTable,
	Supplier,
	supplierTable,
	updateSupplierSchema,
} from '../db/schema';
import { db } from '../db/db';
import { asc, count, desc, eq, like, or, sql, SQL } from 'drizzle-orm';

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
	 * Obtains suppliers in bulk, with pagination support.
	 *
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the key to order by, defaults to `'name'`
	 * @param orderDir the direction in which the `orderBy` should be applied, default `'asc'`
	 * @param where a where statement to include in the query
	 */
	export async function get(
		limit: number,
		offset = 0,
		orderBy: keyof Supplier = 'name',
		orderDir: 'asc' | 'desc' = 'asc',
		where?: SQL<unknown>,
	) {
		const orderCol = supplierTable[orderBy];
		const orderByValue = orderDir === 'asc' ? asc(orderCol) : desc(orderCol);

		const q = db.select().from(supplierTable).orderBy(orderByValue).limit(limit).offset(offset);
		if (where) return await q.where(where);
		else return await q;
	}

	/**
	 * Searches for suppliers by name of supplier or contact.
	 *
	 * @param query the search query, i.e. partial or complete supplier name
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the key to order by, defaults to `'name'`
	 * @param orderDir the direction in which the `orderBy` should be applied, default `'asc'`
	 */
	export async function findByName(
		query: string,
		limit: number,
		offset?: number,
		orderBy?: keyof Supplier,
		orderDir?: 'asc' | 'desc',
	) {
		const queryPattern = `%${query.toLowerCase()}%`;

		return await get(
			limit,
			offset,
			orderBy,
			orderDir,
			or(
				like(sql`LOWER(${supplierTable.name})`, queryPattern),
				like(sql`LOWER(${supplierTable.contactName})`, queryPattern),
			),
		);
	}
}
