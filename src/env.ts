import 'dotenv/config';

import { z } from 'zod';

import { createEnv } from '@t3-oss/env-core';

const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		SERVICE_NAME: z.string(),
		DB_FILENAME: z.string(),
		PORT: z.coerce.number().default(3000),
	},
});

export { env };
