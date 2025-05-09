import { sqliteTable, text, real, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { v4 as uuid } from 'uuid';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

const randomIdColumn = () =>
	text('id')
		.primaryKey()
		.$default(() => uuid());

export const supplierTable = sqliteTable('supplier', {
	id: randomIdColumn(),
	name: text().notNull(),
	contactName: text(),
	phone: text(),
	email: text(),
});

export const locationTable = sqliteTable('location', {
	id: randomIdColumn(),
	name: text().notNull(),
});

export const categoryTable = sqliteTable('category', {
	id: randomIdColumn(),
	name: text().notNull(),
	description: text(),
});

export const itemTable = sqliteTable('item', {
	id: randomIdColumn(),
	name: text().notNull(),
	categoryId: text().references(() => categoryTable.id),
	uom: text().notNull(),
	description: text(),
	imageUrl: text(),
	targetSalePrice: real(),
	targetMarginPercent: real(),
	targetMarginAmount: real(),
	defaultSupplierId: text().references(() => supplierTable.id),
	defaultLocationId: text().references(() => locationTable.id),
});

export const batchTable = sqliteTable('batch', {
	id: randomIdColumn(),
	itemId: text()
		.references(() => itemTable.id)
		.notNull(),
	qty: integer().notNull(),
	unitBuyPrice: real(),
	status: text().default('active').notNull(),
	locationId: text().references(() => locationTable.id),
	supplierId: text().references(() => supplierTable.id),
	receivedDate: text().notNull(),
	expiryDate: text(),
});

export const countTable = sqliteTable('count', {
	id: randomIdColumn(),
	startedDate: text().notNull(),
	finishedDate: text().notNull(),
});

export const batchCountTable = sqliteTable(
	'batch_count',
	{
		countId: text().references(() => countTable.id),
		itemId: text().references(() => itemTable.id),
		countedQty: integer().notNull(),
		expectedQty: integer().notNull(),
		countedDate: text().notNull(),
	},
	(table) => [primaryKey({ columns: [table.countId, table.itemId] })],
);

export const countDriftTable = sqliteTable('count_drift', {
	countId: text().references(() => countTable.id),
	itemId: text().references(() => itemTable.id),
	qty: integer().notNull(),
	driftDate: text().notNull(),
});

const datetimeRefinement = (v: z.ZodString) => v.datetime();

export const selectSupplierSchema = createSelectSchema(supplierTable);
export const insertSupplierSchema = createInsertSchema(supplierTable).omit({ id: true });
export const updateSupplierSchema = createUpdateSchema(supplierTable).omit({ id: true });

export const selectLocationSchema = createSelectSchema(locationTable);
export const insertLocationSchema = createInsertSchema(locationTable).omit({ id: true });
export const updateLocationSchema = createUpdateSchema(locationTable).omit({ id: true });

export const selectItemSchema = createSelectSchema(itemTable);
export const insertItemSchema = createInsertSchema(itemTable).omit({ id: true });
export const updateItemSchema = createUpdateSchema(itemTable).omit({ id: true });

const batchStatusEnum = z.enum(['active', 'expired', 'archived']);
export const selectBatchSchema = createSelectSchema(batchTable);
export const insertBatchSchema = createInsertSchema(batchTable, {
	status: batchStatusEnum,
	receivedDate: datetimeRefinement,
	expiryDate: datetimeRefinement,
}).omit({ id: true });
export const updateBatchSchema = createUpdateSchema(batchTable, {
	status: batchStatusEnum,
	receivedDate: datetimeRefinement,
	expiryDate: datetimeRefinement,
}).omit({ id: true });

export const selectCountSchema = createSelectSchema(countTable);
export const insertCountSchema = createInsertSchema(countTable, {
	startedDate: datetimeRefinement,
	finishedDate: datetimeRefinement,
}).omit({ id: true });

export const selectBatchCountSchema = createSelectSchema(batchCountTable);
export const insertBatchCountSchema = createInsertSchema(batchCountTable).omit({
	countedDate: true,
	expectedQty: true,
});
export const updateBatchCountSchema = createUpdateSchema(batchCountTable, {}).omit({
	itemId: true,
	countId: true,
	expectedQty: true,
	countedDate: true,
});

export const selectCountDriftSchema = createSelectSchema(countDriftTable, { driftDate: datetimeRefinement });
