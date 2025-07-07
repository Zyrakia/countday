import { z } from 'zod';
import { insertLocationSchema, updateLocationSchema, locationTable } from '../db/schema';
import { LocationService } from '../service/location';
import { publicProcedure, router } from '../trpc';
import { orderBySchema } from './input-helpers';
import { getTableColumns } from 'drizzle-orm';

export const locationRouter = router({
	insert: publicProcedure.input(insertLocationSchema).mutation(async ({ input }) => {
		const [location, err] = await LocationService.insert(input);
		if (err) throw new Error('Failed to insert location.', { cause: err });
		return location;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateLocationSchema }))
		.mutation(async ({ input }) => {
			const [location, err] = await LocationService.update(input.id, input.partial);
			if (err) throw new Error('Failed to update location.', { cause: err });
			return location;
		}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [location, err] = await LocationService.remove(id);
		if (err) throw new Error('Failed to delete location.', { cause: err });
		return location;
	}),

	getDeleteImpact: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [impact, err] = await LocationService.getDeleteImpact(id);
		if (err) throw new Error('Failed to get location delete impact.', { cause: err });
		return impact;
	}),

	getOne: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [location, err] = await LocationService.getOne(id);
		if (err) throw new Error('Failed to obtain location.', { cause: err });
		return location;
	}),

	get: publicProcedure
		.input(
			z.object({
				orderBy: orderBySchema(getTableColumns(locationTable)).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [locations, err] = await LocationService.get(input.orderBy);
			if (err) throw new Error('Failed to obtain locations.', { cause: err });
			return locations;
		}),
});
