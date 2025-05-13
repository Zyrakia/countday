import { z } from 'zod';
import {
	batchTable,
	insertLocationSchema,
	itemTable,
	Location,
	locationTable,
	updateLocationSchema,
} from '../db/schema';
import { db } from '../db/db';
import { asc, count, desc, eq, like, or, sql, SQL } from 'drizzle-orm';

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
	 * Obtains locations in bulk, with pagination support.
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
		orderBy: keyof Location = 'name',
		orderDir: 'asc' | 'desc' = 'asc',
		where?: SQL<unknown>,
	) {
		const orderCol = locationTable[orderBy];
		const orderByValue = orderDir === 'asc' ? asc(orderCol) : desc(orderCol);

		const q = db.select().from(locationTable).orderBy(orderByValue).limit(limit).offset(offset);
		if (where) return await q.where(where);
		else return await q;
	}

	/**
	 * Searches for locations by name.
	 *
	 * @param query the search query, i.e. partial or complete location name
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the key to order by, defaults to `'name'`
	 * @param orderDir the direction in which the `orderBy` should be applied, default `'asc'`
	 */
	export async function findByName(
		query: string,
		limit: number,
		offset?: number,
		orderBy?: keyof Location,
		orderDir?: 'asc' | 'desc',
	) {
		const queryPattern = `%${query.toLowerCase()}%`;

		return await get(
			limit,
			offset,
			orderBy,
			orderDir,
			like(sql`LOWER(${locationTable.name})`, queryPattern),
		);
	}
}
