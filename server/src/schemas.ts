import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

import {
	batchTable,
	categoryTable,
	countDriftTable,
	countTable,
	itemCountTable,
	itemFormTable,
	itemTable,
	locationTable,
	supplierTable,
} from './db/schema';

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
export const updateItemFormSchema = createUpdateSchema(itemFormTable).omit({
	id: true,
	itemId: true,
});

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
