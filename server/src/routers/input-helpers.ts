import { z } from 'zod';

/**
 * Default schema for page size limit for all pagination routes.
 */
export const paginationLimit = z.number().min(0).max(50).default(10);

/**
 * Default schema for page start offset for all pagination routes.
 */
export const paginationOffset = z.number().min(0).default(0);

/**
 * Creates a Zod schema that will only allow a valid `OrderBy` definition for the
 * given string keyed object.
 *
 * @param obj the object to create the schema for
 * @return the generated zod schema
 */
export function orderBySchema<K extends string>(obj: Record<K, unknown>) {
	const [firstKey, ...otherKeys] = Object.keys(obj) as K[];
	if (!firstKey) throw 'Cannot create order by schema from empty object';

	const eachKey = z.enum([firstKey, ...otherKeys]).or(
		z.object({
			key: z.enum([firstKey, ...otherKeys]),
			dir: z.enum(['asc', 'desc']),
		}),
	);

	return eachKey.or(z.array(eachKey));
}
