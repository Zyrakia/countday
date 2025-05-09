import 'dotenv/config';

import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		SERVICE_NAME: z.string(),
		DB_FILENAME: z.string(),
	},
});

export { env };
