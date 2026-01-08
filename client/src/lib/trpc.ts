import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { env } from '@countday/shared';
import type { AppRouter } from '../../../server/src/routers/index';

export const trpcClient = createTRPCProxyClient<AppRouter>({
	links: [httpBatchLink({ url: env.VITE_API_URL })],
});
