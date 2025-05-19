import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { v4 as uuid } from 'uuid';
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
	uom: text().notNull(),
	categoryId: text().references(() => categoryTable.id, { onDelete: 'set null' }),
	description: text(),
	imageUrl: text(),
	warningQty: real(),
	targetSalePrice: real(),
	targetMarginIsPercent: integer({ mode: 'boolean' }).notNull().default(true),
	targetMargin: real(),
	defaultSupplierId: text().references(() => supplierTable.id, { onDelete: 'set null' }),
	defaultLocationId: text().references(() => locationTable.id, { onDelete: 'set null' }),
});

export const itemFormTable = sqliteTable('item_form', {
	id: text().primaryKey(),
	itemId: text()
		.references(() => itemTable.id, { onDelete: 'cascade' })
		.notNull(),
	qtyMultiplier: real().notNull(),
});

const batchStatusValues = ['active', 'archived', 'expired'] as const;
export type BatchStatus = (typeof batchStatusValues)[number];

export const batchTable = sqliteTable('batch', {
	id: randomIdColumn(),
	itemId: text()
		.references(() => itemTable.id, { onDelete: 'cascade' })
		.notNull(),
	qty: real().notNull(),
	unitBuyPrice: real(),
	status: text('status', { enum: batchStatusValues }).default('active').notNull(),
	locationId: text().references(() => locationTable.id, { onDelete: 'set null' }),
	supplierId: text().references(() => supplierTable.id, { onDelete: 'set null' }),
	createdDate: text().notNull(),
	stockoutDate: text(),
	expiryDate: text(),
});

export const countTable = sqliteTable('count', {
	id: randomIdColumn(),
	startedDate: text().notNull(),
	finishedDate: text(),
});

export const itemCountTable = sqliteTable(
	'item_count',
	{
		countId: text()
			.references(() => countTable.id, { onDelete: 'cascade' })
			.notNull(),
		itemId: text()
			.references(() => itemTable.id, { onDelete: 'cascade' })
			.notNull(),
		batchId: text().references(() => batchTable.id, { onDelete: 'cascade' }),
		countedQty: real().notNull(),
		countedDate: text().notNull(),
	},
	(table) => [primaryKey({ columns: [table.countId, table.itemId, table.batchId] })],
);

export const countDriftTable = sqliteTable(
	'count_drift',
	{
		countId: text()
			.references(() => countTable.id, { onDelete: 'cascade' })
			.notNull(),
		itemId: text()
			.references(() => itemTable.id, { onDelete: 'cascade' })
			.notNull(),
		qtyChange: real().notNull(),
		driftDate: text().notNull(),
	},
	(table) => [primaryKey({ columns: [table.countId, table.itemId] })],
);

const dtRefinement = (v: z.ZodString) => v.datetime();
const optionalDtRefinement = (v: z.ZodString) => dtRefinement(v).optional();

export const selectSupplierSchema = createSelectSchema(supplierTable);
export const insertSupplierSchema = createInsertSchema(supplierTable).omit({ id: true });
export const updateSupplierSchema = createUpdateSchema(supplierTable).omit({ id: true });

export const selectLocationSchema = createSelectSchema(locationTable);
export const insertLocationSchema = createInsertSchema(locationTable).omit({ id: true });
export const updateLocationSchema = createUpdateSchema(locationTable).omit({ id: true });

export const selectCategorySchema = createSelectSchema(categoryTable);
export const insertCategorySchema = createInsertSchema(categoryTable).omit({ id: true });
export const updateCategorySchema = createUpdateSchema(categoryTable).omit({ id: true });

export const selectItemSchema = createSelectSchema(itemTable);
export const insertItemSchema = createInsertSchema(itemTable).omit({ id: true });
export const updateItemSchema = createUpdateSchema(itemTable).omit({ id: true });

export const selectItemFormSchema = createSelectSchema(itemFormTable);
export const insertItemFormSchema = createInsertSchema(itemFormTable);
export const updateItemFormSchema = createUpdateSchema(itemFormTable);

export const selectBatchSchema = createSelectSchema(batchTable);
export const insertBatchSchema = createInsertSchema(batchTable, {
	expiryDate: optionalDtRefinement,
}).omit({ id: true, createdDate: true, stockoutDate: true });
export const updateBatchSchema = createUpdateSchema(batchTable, {
	expiryDate: optionalDtRefinement,
}).omit({ id: true, itemId: true, createdDate: true, stockoutDate: true });

export const selectCountSchema = createSelectSchema(countTable);

export const selectItemCountSchema = createSelectSchema(itemCountTable);
export const insertItemCountSchema = createInsertSchema(itemCountTable).omit({ countedDate: true });
export const updateItemCountSchema = createUpdateSchema(itemCountTable).omit({
	itemId: true,
	countId: true,
	countedDate: true,
	batchId: true,
});

export const selectCountDriftSchema = createSelectSchema(countDriftTable);
export const insertCountDriftSchema = createInsertSchema(countDriftTable).omit({
	driftDate: true,
	countId: true,
});
export const updateCountDriftSchema = createUpdateSchema(countDriftTable).omit({
	countId: true,
	driftDate: true,
	itemId: true,
});

export type Supplier = z.infer<typeof selectSupplierSchema>;
export type Location = z.infer<typeof selectLocationSchema>;
export type Category = z.infer<typeof selectCategorySchema>;
export type Item = z.infer<typeof selectItemSchema>;
export type ItemForm = z.infer<typeof selectItemFormSchema>;
export type Batch = z.infer<typeof selectBatchSchema>;
export type Count = z.infer<typeof selectCountSchema>;
export type ItemCount = z.infer<typeof selectItemCountSchema>;
export type CountDrift = z.infer<typeof selectCountDriftSchema>;
