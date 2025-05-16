import { count, eq, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import {
    batchTable, insertLocationSchema, itemTable, Location, locationTable, updateLocationSchema
} from '../db/schema';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

/**
 * Responsible for location CRUD logic.
 */
export namespace LocationService {
	/**
	 * Creates a new location.
	 *
	 * @param location the properties of the location
	 * @return the created location, or nothing if the insert didn't occur
	 */
	export async function insert(location: z.infer<typeof insertLocationSchema>) {
		const [inserted] = await db.insert(locationTable).values(location).returning();
		if (inserted) return inserted;
	}

	/**
	 * Updates a location based on ID.
	 *
	 * @param id the ID of the location to update
	 * @param partial the properties to update on the location
	 * @return the updated location, or nothing if the update didn't occur
	 */
	export async function update(id: string, partial: z.infer<typeof updateLocationSchema>) {
		const [updated] = await db
			.update(locationTable)
			.set(partial)
			.where(eq(locationTable.id, id))
			.returning();

		if (updated) return updated;
	}

	/**
	 * Deletes a location based on an ID.
	 *
	 * This will `null` out the fields on any items or batches that reference
	 * this location.
	 *
	 * @param id the ID of the location to delete
	 * @return the deleted location, or nothing if the deletion didn't occur
	 */
	export async function remove(id: string) {
		const [deleted] = await db
			.delete(locationTable)
			.where(eq(locationTable.id, id))
			.returning();

		if (deleted) return deleted;
	}

	/**
	 * Calculates the amount of items and batches that would have
	 * their location removed if the associated location is deleted.
	 *
	 * @param id the ID of the location to check
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
	 * Obtains a location based on an ID.
	 *
	 * @param id the ID of the location
	 * @return the location, or undefined if not found
	 */
	export async function getOne(id: string) {
		return await db.query.locationTable.findFirst({
			where: (location, { eq }) => eq(location.id, id),
		});
	}

	/**
	 * Obtains all locations.
	 *
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 */
	export async function get(orderBy: OrderByDefinition<Location> = 'name', where?: SQL<unknown>) {
		return await db
			.select()
			.from(locationTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, locationTable));
	}
}
