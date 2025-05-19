import { stringifyError } from './stringify-error';

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type Actions<C> = Record<string, (client: C, ...args: any[]) => any>;

type MappedActions<C, A extends Actions<C>> = {
	[K in keyof A]: A[K] extends (c: C, ...args: infer P) => infer R
		? (...args: P) => Promise<ServiceResult<UnwrapPromise<R>>>
		: never;
};

type Helpers<C, A extends Actions<C>> = {
	/**
	 * Creates a new service that mirrors the actions of the current service,
	 * but performs all actions on a new client.
	 *
	 * @param client the new client of the service
	 * @return the mirroring service with a new client
	 */
	$with: <C2 extends C>(client: C2) => Service<C2, A>;
};

export type Service<C extends unknown, A extends Actions<C>> = MappedActions<C, A> & Helpers<C, A>;

/**
 * Creates a new service with an initial client.
 *
 * @param client the initial client of the service
 * @param actions the actions that the service exposes
 * @return the created service with mapped actions
 */
export function createService<C extends unknown, A extends Actions<C>>(
	client: C,
	actions: A,
): Service<C, A> {
	const wrap = <Args extends any[], R>(fn: (client: C, ...args: Args) => Promise<R> | R) => {
		return async (...args: Args): Promise<ServiceResult<R>> => {
			try {
				const data = await fn(client, ...args);
				return { success: true, data };
			} catch (err) {
				return { success: false, error: stringifyError(err) };
			}
		};
	};

	const serviceMethods = Object.fromEntries(
		Object.entries(actions).map(([key, action]) => [key, wrap(action)]),
	) as MappedActions<C, A>;

	return {
		...serviceMethods,
		$with: <C2 extends C>(newClient: C2) => {
			return createService(newClient, actions);
		},
	};
}
