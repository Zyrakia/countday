import { router } from '../trpc';

import { batchRouter } from './batch';
import { categoryRouter } from './category';
import { countRouter } from './count';
import { itemFormRouter } from './item-form';
import { itemRouter } from './item';
import { locationRouter } from './location';
import { stockRouter } from './stock';
import { supplierRouter } from './supplier';

export const appRouter = router({
	batch: batchRouter,
	category: categoryRouter,
	count: countRouter,
	itemForm: itemFormRouter,
	item: itemRouter,
	location: locationRouter,
	stock: stockRouter,
	supplier: supplierRouter,
});

export type AppRouter = typeof appRouter;
