import { z } from 'zod';
import { lineLimit } from '../utils/line-limit';

export const ItemBaseSchema = z.object({
	id: z.string().min(1, { message: 'ID is required' }),
	name: z
		.string({ error: 'Name is required' })
		.trim()
		.min(1, { message: 'Name is required' })
		.max(120, { message: 'Maximum 120 characters' })
		.pipe(lineLimit(1)),
	uom: z
		.string({ error: 'UOM is required' })
		.trim()
		.min(1, { message: 'UOM is required' })
		.max(40, { message: 'Maximum 40 characters' })
		.pipe(lineLimit(1)),
	categoryId: z.string().optional(),
	description: z
		.string()
		.trim()
		.max(1000, { message: 'Maximum 1000 characters' })
		.pipe(lineLimit(10))
		.optional(),
	imageUrl: z
		.string()
		.trim()
		.max(2048, { message: 'Maximum 2048 characters' })
		.pipe(lineLimit(1))
		.optional(),
	warningQty: z.number().min(0, { message: 'Minimum 0' }).optional(),
	targetSalePrice: z.number().min(0, { message: 'Minimum 0' }).optional(),
	targetMarginIsPercent: z.boolean().optional(),
	targetMargin: z.number().min(0, { message: 'Minimum 0' }).optional(),
	defaultSupplierId: z.string().optional(),
	defaultLocationId: z.string().optional(),
});

export const CreateItemSchema = ItemBaseSchema.omit({ id: true });
export const UpdateItemSchema = CreateItemSchema.partial();

export const ItemFormBaseSchema = z.object({
	id: z.string().min(1, { message: 'ID is required' }),
	itemId: z.string().min(1, { message: 'ID is required' }),
	qtyMultiplier: z.number().min(0, { message: 'Minimum 0' }),
});

export const CreateItemFormSchema = ItemFormBaseSchema;
export const UpdateItemFormSchema = CreateItemFormSchema.partial();

export type Item = z.infer<typeof ItemBaseSchema>;
export type ItemForm = z.infer<typeof ItemFormBaseSchema>;
