import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/src/routers/index';
import { env } from '../env';
import { QueryClient } from '@tanstack/svelte-query';
import { createTRPCQueryUtils } from '@trpc/react-query';

export const trpc = createTRPCClient<AppRouter>({
	links: [httpBatchLink({ url: env.VITE_API_URL })],
});

export const queryCleint = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 1000 * 60 },
	},
});

export const trpcQuery = createTRPCQueryUtils({
	client: trpc,
	queryClient: queryCleint,
});
