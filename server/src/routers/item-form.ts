import { z } from 'zod';
import { insertItemFormSchema, updateItemFormSchema } from '../db/schema';
import { ItemFormService } from '../service/item-form';
import { publicProcedure, router } from '../trpc';

export const itemFormRouter = router({
	insert: publicProcedure.input(insertItemFormSchema).mutation(async ({ input }) => {
		const [form, err] = await ItemFormService.insert(input);
		if (err) throw new Error('Failed to insert item form.', { cause: err });
		return form;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateItemFormSchema }))
		.mutation(async ({ input }) => {
			const [form, err] = await ItemFormService.update(input.id, input.partial);
			if (err) throw new Error('Failed to update item form.', { cause: err });
			return form;
		}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [form, err] = await ItemFormService.remove(id);
		if (err) throw new Error('Failed to delete item form.', { cause: err });
		return form;
	}),

	getFromItem: publicProcedure.input(z.string()).query(async ({ input: itemId }) => {
		const [forms, err] = await ItemFormService.getFromItem(itemId);
		if (err) throw new Error('Failed to get item forms by item ID.', { cause: err });
		return forms;
	}),
});
