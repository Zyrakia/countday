import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { publicEnv } from '@countday/shared/env/public';
import type { AppRouter } from '../../../server/src/routers/index';

const baseUrl = publicEnv.VITE_API_URL;
const trpcUrl = baseUrl.endsWith('/trpc') ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/trpc`;

export const trpcClient = createTRPCProxyClient<AppRouter>({
	links: [httpBatchLink({ url: trpcUrl })],
});
