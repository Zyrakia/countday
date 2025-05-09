import { router } from '../trpc';
import { itemRouter } from './item-router';

export const appRouter = router({
	item: itemRouter,
});

export type AppRouter = typeof appRouter;
