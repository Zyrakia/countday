import { AnyColumn, asc, desc, SQLWrapper } from 'drizzle-orm';

import { asArray } from './as-array';
import { z } from 'zod';

type ArrayOrSingle<T> = T | T[];

/**
 * Represents the structure of the possible inputs
 * for an `orderBy` build of a certain type.
 */
export type OrderByDefinition<T extends Record<string, any>> = ArrayOrSingle<
	| keyof T
	| {
			key: keyof T;
			dir: 'asc' | 'desc';
	  }
>;

/**
 * Creates an array of SQL statements that can be used in a query `orderBy`.
 *
 * The statements will be in the same order as the input.
 *
 * @param input the definition input for keys and their direction, if no direction is specified, the default is ascending.
 * @param table the table to map the input keys against, to build the SQL statements
 */
export function createOrderByValue<T extends Record<string, unknown>>(
	input: OrderByDefinition<T>,
	table: { [K in keyof T]: AnyColumn | SQLWrapper },
) {
	if (!input) return [];

	const seen = new Set<keyof T>();
	const orderStatements = [];
	for (const col of asArray(input)) {
		const isDirSpecified = typeof col === 'object';
		const key = isDirSpecified ? col.key : col;
		const dir = isDirSpecified ? col.dir : 'asc';

		if (seen.has(key)) continue;
		seen.add(key);

		const sql = dir === 'asc' ? asc(table[key]) : desc(table[key]);
		orderStatements.push(sql);
	}

	return orderStatements;
}
