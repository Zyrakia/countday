import { BatchStatusValues } from '@countday/shared';
import { relations } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v4 as uuid } from 'uuid';

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

export const batchTable = sqliteTable('batch', {
	id: randomIdColumn(),
	itemId: text()
		.references(() => itemTable.id, { onDelete: 'cascade' })
		.notNull(),
	qty: real().notNull(),
	unitBuyPrice: real(),
	status: text('status', { enum: BatchStatusValues }).default('active').notNull(),
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

export const _supplierRelations = relations(supplierTable, ({ many }) => ({
	items: many(itemTable),
	batches: many(batchTable),
}));

export const _locationRelations = relations(locationTable, ({ many }) => ({
	items: many(itemTable),
	batches: many(batchTable),
}));

export const _categoryRelations = relations(categoryTable, ({ many }) => ({
	items: many(itemTable),
}));

export const _itemRelations = relations(itemTable, ({ one, many }) => ({
	category: one(categoryTable, {
		fields: [itemTable.categoryId],
		references: [categoryTable.id],
	}),
	defaultSupplier: one(supplierTable, {
		fields: [itemTable.defaultSupplierId],
		references: [supplierTable.id],
	}),
	defaultLocation: one(locationTable, {
		fields: [itemTable.defaultLocationId],
		references: [locationTable.id],
	}),
	forms: many(itemFormTable),
	batches: many(batchTable),
	itemCounts: many(itemCountTable),
	countDrifts: many(countDriftTable),
}));

export const _itemFormRelations = relations(itemFormTable, ({ one }) => ({
	item: one(itemTable, {
		fields: [itemFormTable.itemId],
		references: [itemTable.id],
	}),
}));

export const _batchRelations = relations(batchTable, ({ one, many }) => ({
	item: one(itemTable, {
		fields: [batchTable.itemId],
		references: [itemTable.id],
	}),
	location: one(locationTable, {
		fields: [batchTable.locationId],
		references: [locationTable.id],
	}),
	supplier: one(supplierTable, {
		fields: [batchTable.supplierId],
		references: [supplierTable.id],
	}),
	itemCounts: many(itemCountTable),
}));

export const _countRelations = relations(countTable, ({ many }) => ({
	itemCounts: many(itemCountTable),
	countDrifts: many(countDriftTable),
}));

export const _itemCountRelations = relations(itemCountTable, ({ one }) => ({
	count: one(countTable, {
		fields: [itemCountTable.countId],
		references: [countTable.id],
	}),
	item: one(itemTable, {
		fields: [itemCountTable.itemId],
		references: [itemTable.id],
	}),
	batch: one(batchTable, {
		fields: [itemCountTable.batchId],
		references: [batchTable.id],
	}),
}));

export const _countDriftRelations = relations(countDriftTable, ({ one }) => ({
	count: one(countTable, {
		fields: [countDriftTable.countId],
		references: [countTable.id],
	}),
	item: one(itemTable, {
		fields: [countDriftTable.itemId],
		references: [itemTable.id],
	}),
}));

export type DatabaseSupplier = InferSelectModel<typeof supplierTable>;
export type DatabaseLocation = InferSelectModel<typeof locationTable>;
export type DatabaseCategory = InferSelectModel<typeof categoryTable>;
export type DatabaseItem = InferSelectModel<typeof itemTable>;
export type DatabaseItemForm = InferSelectModel<typeof itemFormTable>;
export type DatabaseBatch = InferSelectModel<typeof batchTable>;
export type DatabaseCount = InferSelectModel<typeof countTable>;
export type DatabaseItemCount = InferSelectModel<typeof itemCountTable>;
export type DatabaseCountDrift = InferSelectModel<typeof countDriftTable>;
