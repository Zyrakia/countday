import { z } from 'zod';

/**
 * Creates a schema that validates the maximum number of lines
 * in a given string, using Windows/Unix newline support.
 *
 * @param maxLines the maximum number of allowed lines
 * @param maxLines the maximum number of allowed lines
 * @return a schema that enforces the line limit
 */
export function lineLimit(maxLines: number) {
	const suffix = maxLines === 1 ? 'line' : 'lines';
	const message = `Maximum ${maxLines} ${suffix}`;
	return z.string().refine((value) => value.split(/\r?\n/).length <= maxLines, { message });
}
