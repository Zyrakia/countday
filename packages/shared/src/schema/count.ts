import { z } from 'zod';

export const ItemCountBaseSchema = z.object({
	countId: z.string().min(1, { message: 'ID is required' }),
	itemId: z.string().min(1, { message: 'ID is required' }),
	batchId: z.string().optional(),
	countedQty: z.number().min(0, { message: 'Minimum 0' }),
	countedDate: z.string().min(1, { message: 'Date is required' }),
});

export const CreateItemCountSchema = ItemCountBaseSchema.omit({ countedDate: true });
export const UpdateItemCountSchema = CreateItemCountSchema.partial();

export type ItemCount = z.infer<typeof ItemCountBaseSchema>;

export const CountDriftBaseSchema = z.object({
	itemId: z.string().min(1, { message: 'ID is required' }),
	qtyChange: z.number(),
	driftDate: z.string().min(1, { message: 'Date is required' }),
});

export const CreateCountDriftSchema = CountDriftBaseSchema.omit({ driftDate: true });
export const UpdateCountDriftSchema = CreateCountDriftSchema.partial();

export type CountDrift = z.infer<typeof CountDriftBaseSchema>;
