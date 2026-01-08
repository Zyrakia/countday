import { appRouter } from '../../../../server/src/routers';
import { createContext } from '../../../../server/src/trpc';

export const createServerCaller = async () => {
	const ctx = await createContext();
	return appRouter.createCaller(ctx);
};
