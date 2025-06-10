import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: import.meta.env,
	clientPrefix: 'VITE_',
	client: {
		VITE_API_URL: z.string(),
	},
});

export { env };
