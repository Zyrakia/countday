import { createServerCaller } from '$lib/server/trpc';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const caller = await createServerCaller();
	const items = caller.item.get({});
	return { items };
};
