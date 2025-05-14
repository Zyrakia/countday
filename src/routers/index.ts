import { router } from '../trpc';
import { categoryRouter } from './category-router';

export const appRouter = router({
	category: categoryRouter,
});

export type AppRouter = typeof appRouter;
