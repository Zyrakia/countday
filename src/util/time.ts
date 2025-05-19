/**
 * Returns an ISO string representing the datetime at
 * which the function was called.
 */
export function nowIso() {
	return new Date().toISOString();
}
