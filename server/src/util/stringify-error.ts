/**
 * Attempts to convert any thrown value into a string.
 *
 * @param err the thrown value
 * @return a string representation of the value
 */
export function stringifyError(err: unknown) {
	switch (typeof err) {
		case 'string':
			return err;
		case 'object':
			if (err instanceof Error) {
				return `${err.name} - ${err.message}`;
			}
		default:
			try {
				return JSON.stringify(err);
			} catch {
				return 'Unknown error';
			}
	}
}
