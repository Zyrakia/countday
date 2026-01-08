import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { staleTime: 1000 * 60, enabled: browser },
		},
	});

	return { queryClient };
};
