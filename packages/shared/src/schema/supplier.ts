import { z } from 'zod';
import { lineLimit } from '../utils/line-limit';

export const SupplierBaseSchema = z.object({
	id: z.string().min(1, { message: 'ID is required' }),
	name: z
		.string({ error: 'Name is required' })
		.trim()
		.min(1, { message: 'Name is required' })
		.max(120, { message: 'Maximum 120 characters' })
		.pipe(lineLimit(1)),
	contactName: z
		.string()
		.trim()
		.max(120, { message: 'Maximum 120 characters' })
		.pipe(lineLimit(1))
		.optional(),
	phone: z
		.string()
		.trim()
		.max(50, { message: 'Maximum 50 characters' })
		.pipe(lineLimit(1))
		.optional(),
	email: z
		.string()
		.trim()
		.max(254, { message: 'Maximum 254 characters' })
		.pipe(lineLimit(1))
		.optional(),
});

export const CreateSupplierSchema = SupplierBaseSchema.omit({ id: true });
export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export type Supplier = z.infer<typeof SupplierBaseSchema>;
