import { z } from 'zod';
import { lineLimit } from '../utils/line-limit';

export const BatchStatusValues = ['active', 'archived', 'expired'] as const;

export const BatchStatusSchema = z.enum(BatchStatusValues);

export const BatchBaseSchema = z.object({
	id: z.string().min(1, { message: 'ID is required' }),
	itemId: z.string().min(1, { message: 'ID is required' }),
	qty: z.number().min(0, { message: 'Minimum 0' }),
	unitBuyPrice: z.number().min(0, { message: 'Minimum 0' }).optional(),
	status: BatchStatusSchema,
	locationId: z.string().optional(),
	supplierId: z.string().optional(),
	createdDate: z
		.string({ error: 'Date is required' })
		.trim()
		.min(1, { message: 'Date is required' })
		.max(40, { message: 'Maximum 40 characters' })
		.pipe(lineLimit(1)),
	stockoutDate: z
		.string()
		.trim()
		.max(40, { message: 'Maximum 40 characters' })
		.pipe(lineLimit(1))
		.optional(),
	expiryDate: z.string().trim().max(40, { message: 'Maximum 40 characters' }).pipe(lineLimit(1)).optional(),
});

export const CreateBatchSchema = BatchBaseSchema.omit({
	id: true,
	createdDate: true,
	stockoutDate: true,
}).partial({ status: true });
export const UpdateBatchSchema = CreateBatchSchema.partial();

export type Batch = z.infer<typeof BatchBaseSchema>;
export type BatchStatus = z.infer<typeof BatchStatusSchema>;
