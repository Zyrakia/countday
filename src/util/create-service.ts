import { stringifyError } from './stringify-error';

type DBClient<C> = {
	transaction<T>(fn: (tx: C) => Promise<T>): Promise<T>;
};

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type Actions<C extends DBClient<unknown>> = Record<string, (client: C, ...args: any[]) => any>;
type MappedActions<C extends DBClient<unknown>, A extends Actions<C>> = {
	[K in keyof A]: A[K] extends (c: C, ...args: infer P) => infer R
		? (...args: P) => Promise<ServiceResult<UnwrapPromise<R>>>
		: never;
};

type Helpers<C extends DBClient<unknown>, A extends Actions<C>> = {
	tx: <T>(fn: (txService: Service<C, A>) => Promise<T>) => Promise<ServiceResult<T>>;
	withClient: <C2 extends C>(client: C2) => Service<C2, A>;
	client: C;
};

export type Service<C extends DBClient<unknown>, A extends Actions<C>> = MappedActions<C, A> &
	Helpers<C, A>;

/**
 * Creates a new service with an initial client.
 *
 * @param client the initial client of the service
 * @param actions the actions that the service exposes
 * @return the created service with mapped actions
 */
export function createService<C extends DBClient<unknown>, A extends Actions<C>>(
	client: C,
	actions: A,
): Service<C, A> {
	const wrap =
		<Args extends any[], R>(fn: (client: C, ...args: Args) => Promise<R> | R) =>
		async (...args: Args): Promise<ServiceResult<R>> => {
			try {
				const data = await fn(client, ...args);
				return { success: true, data };
			} catch (err) {
				return { success: false, error: stringifyError(err) };
			}
		};

	const serviceMethods = Object.fromEntries(
		Object.entries(actions).map(([key, fn]) => [key, wrap(fn as any)]),
	) as MappedActions<C, A>;

	async function tx<T>(fn: (txService: Service<C, A>) => Promise<T>) {
		return client.transaction(async (txClient): Promise<ServiceResult<T>> => {
			const txService = createService(txClient as C, actions);
			try {
				const data = await fn(txService);
				return { success: true, data };
			} catch (err) {
				return { success: false, error: stringifyError(err) };
			}
		});
	}

	function withClient<C2 extends C>(client: C2) {
		return createService(client, actions);
	}

	return {
		...serviceMethods,
		tx,
		withClient,
		client,
	};
}
