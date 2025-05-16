import { and, asc, desc, eq, sql, SQL } from 'drizzle-orm';
import { db } from '../db/db';
import { Batch, BatchStatus, batchTable } from '../db/schema';
import { ItemService } from './item';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';

/**
 * Responsible for CRUD operations relating to stock, such as
 * modifying and querying item stock. This service is not
 * responsible for handling counts or batches.
 */
export namespace StockService {
	/**
	 * Returns batches of a specific item with support
	 * for pagination.
	 *
	 * @param itemId the ID of the item to query for
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'receivedDate'`
	 * @param where a where statement to include in the query
	 * @return all batches matching the query input
	 */
	export async function getBatches(
		itemId: string,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Batch> = 'receivedDate',
		where?: SQL<unknown>,
	) {
		return await db
			.select()
			.from(batchTable)
			.orderBy(...createOrderByValue(orderBy, batchTable))
			.where(and(eq(batchTable.itemId, itemId), where))
			.limit(limit)
			.offset(offset);
	}

	/**
	 * Helper function to build an SQL CASE block for assigning a priority value to each
	 * batch status type, allowing for it to be used in sorting.
	 *
	 * @param order the mapping of batch status type to priority
	 * @return the constructed SQL CASE block
	 */
	function buildBatchPriorityCase(order: Record<BatchStatus, number>) {
		const maxPriority = Math.max(...Object.values(order));
		const whenClauses = Object.entries(order).map(([status, priority]) => {
			return sql`WHEN ${status} THEN ${priority}`;
		});

		return sql`CASE ${sql.join(whenClauses, sql` `)} ELSE ${maxPriority + 1} END`;
	}

	/**
	 * Returns the `x` most important batches of an item for a quick stock overview.
	 *
	 * @param itemId the ID of the item to query for
	 * @param limit the number of batches to retrieve, defaults to `5`
	 * @return the most important batches for a specific item, decided by the system
	 */
	export async function getBatchSummary(itemId: string, limit = 5) {
		const createSortExpression = (status: BatchStatus, expr: SQL) =>
			sql`CASE WHEN ${batchTable.status} = ${status} THEN ${expr} ELSE NULL END`;

		return await db
			.select()
			.from(batchTable)
			.where(eq(batchTable.itemId, itemId))
			.orderBy(
				// Priority by status
				buildBatchPriorityCase({ expired: 1, active: 2, archived: 3 }),

				// Expired batches, most recently expired first, if missing, oldest first
				desc(createSortExpression('expired', sql`${batchTable.expiryDate}`)),

				// Active batches: oldest batches first
				asc(createSortExpression('active', sql`${batchTable.receivedDate}`)),

				// Archived batches: most recently stocked out first, else oldest first
				desc(
					createSortExpression(
						'archived',
						sql`COALESCE(${batchTable.stockoutDate}, ${batchTable.receivedDate})`,
					),
				),
			)

			.limit(limit);
	}

	export async function consume(itemIdOrFormId: string, quantity: number) {
		const item = await ItemService.getOne(itemIdOrFormId);
		if (!item) return;
	}
}
