/**
 * Returns any value as an array. If the value is not already an array,
 * it will be wrapped in an array, otherwise, the original value is returned.
 *
 * @param value the value to return as an array
 * @return the value as an array
 */
export function asArray<T extends unknown>(value: T | T[]) {
	return Array.isArray(value) ? value : [value];
}
