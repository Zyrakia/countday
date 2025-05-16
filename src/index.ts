import Fastify from 'fastify';

import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import { env } from './env';
import { appRouter } from './routers';

const server = Fastify();

server.register(fastifyTRPCPlugin, {
	prefix: '/trpc',
	trpcOptions: { router: appRouter, createContext: () => ({}) },
});

server.listen({ port: env.PORT }, () => {
	console.log(`Countday started on port ${env.PORT}`);
});
