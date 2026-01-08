import { z } from 'zod';
import { supplierTable } from '../db/schema';
import { insertSupplierSchema, updateSupplierSchema } from '../schemas';
import { SupplierService } from '../service/supplier';
import { publicProcedure, router } from '../trpc';
import { orderBySchema } from './input-helpers';
import { getTableColumns } from 'drizzle-orm';

export const supplierRouter = router({
	insert: publicProcedure.input(insertSupplierSchema).mutation(async ({ input }) => {
		const [supplier, err] = await SupplierService.insert(input);
		if (err) throw new Error('Failed to insert supplier.', { cause: err });
		return supplier;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateSupplierSchema }))
		.mutation(async ({ input }) => {
			const [supplier, err] = await SupplierService.update(input.id, input.partial);
			if (err) throw new Error('Failed to update supplier.', { cause: err });
			return supplier;
		}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [supplier, err] = await SupplierService.remove(id);
		if (err) throw new Error('Failed to delete supplier.', { cause: err });
		return supplier;
	}),

	getDeleteImpact: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [impact, err] = await SupplierService.getDeleteImpact(id);
		if (err) throw new Error('Failed to get supplier delete impact.', { cause: err });
		return impact;
	}),

	getOne: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [supplier, err] = await SupplierService.getOne(id);
		if (err) throw new Error('Failed to obtain supplier.', { cause: err });
		return supplier;
	}),

	get: publicProcedure
		.input(
			z.object({
				orderBy: orderBySchema(getTableColumns(supplierTable)).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [suppliers, err] = await SupplierService.get(input.orderBy);
			if (err) throw new Error('Failed to obtain suppliers.', { cause: err });
			return suppliers;
		}),
});
