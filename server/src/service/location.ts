import { count, eq, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import { batchTable, DatabaseLocation, itemTable, locationTable } from '../db/schema';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { CreateLocationSchema, UpdateLocationSchema } from '@countday/shared';

/**
 * Responsible for location CRUD logic.
 */
export const LocationService = createService(db, {
	/**
	 * Creates a new location.
	 *
	 * @param location the properties of the location
	 * @return the created location
	 */
	insert: async (client, location: z.infer<typeof CreateLocationSchema>) => {
		const [inserted] = await client.insert(locationTable).values(location).returning();
		if (!inserted) throw `Unknown insertion error`;
		return inserted;
	},

	/**
	 * Updates a location based on ID.
	 *
	 * @param id the ID of the location to update
	 * @param partial the properties to update on the location
	 * @return the updated location
	 */
	update: async (client, id: string, partial: z.infer<typeof UpdateLocationSchema>) => {
		const [updated] = await client
			.update(locationTable)
			.set(partial)
			.where(eq(locationTable.id, id))
			.returning();

		if (!updated) throw `Unable to update location of ID "${id}"`;
		return updated;
	},

	/**
	 * Deletes a location based on an ID.
	 *
	 * This will `null` out the fields on any items or batches that reference
	 * this location.
	 *
	 * @param id the ID of the location to delete
	 * @return the deleted location
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client.delete(locationTable).where(eq(locationTable.id, id)).returning();

		if (!deleted) throw `Unable to delete location of ID "${id}"`;
		return deleted;
	},

	/**
	 * Calculates the amount of items and batches that would have
	 * their location removed if the associated location is deleted.
	 *
	 * @param id the ID of the location to check
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
	 * Obtains a location based on an ID.
	 *
	 * @param id the ID of the location
	 * @return the location, or undefined if not found
	 */
	getOne: async (client, id: string) => {
		return await client.query.locationTable.findFirst({
			where: (location, { eq }) => eq(location.id, id),
		});
	},

	/**
	 * Obtains all locations.
	 *
	 * @param orderBy the structure to order by, defaults to `'name'`
	 * @param where a where statement to include in the query
	 */
	get: async (client, orderBy: OrderByDefinition<DatabaseLocation> = 'name', where?: SQL<unknown>) => {
		return await client
			.select()
			.from(locationTable)
			.where(where)
			.orderBy(...createOrderByValue(orderBy, locationTable));
	},
});
