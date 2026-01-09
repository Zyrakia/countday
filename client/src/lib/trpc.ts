import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { publicEnv } from '@countday/shared/env/public';
import type { AppRouter } from '../../../server/src/routers/index';

export const trpcClient = createTRPCProxyClient<AppRouter>({
	links: [httpBatchLink({ url: publicEnv.VITE_API_URL })],
});
