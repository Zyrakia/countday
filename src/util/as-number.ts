/**
 * Converts any value into a number, if possible, otherwise
 * returns the specified default value.
 *
 * Conversion is not possible if the value is either `undefined`, `null` or the conversion results is `NaN`.
 *
 * @param value the value to convert into a number
 * @param def the default value to use if conversion is not possible
 * @return the value as a number, or the default
 */
export function asNumber(value: unknown, def: number) {
	let valueToConvert;
	if (value === undefined || value === null) valueToConvert = def;
	else valueToConvert = value;

	const converted = Number(valueToConvert);
	return isNaN(converted) ? def : converted;
}
