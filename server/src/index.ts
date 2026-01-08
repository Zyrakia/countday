import Fastify from 'fastify';

import { fastifyCors as fastifyCordsPlugin } from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import { env } from '@countday/shared';
import { appRouter } from './routers';
import { createContext } from './trpc';

const server = Fastify({
	logger: true,
	routerOptions: { maxParamLength: 5000 },
});

server.register(fastifyCordsPlugin, {});

server.register(fastifyTRPCPlugin, {
	prefix: '/trpc',
	trpcOptions: { router: appRouter, createContext: () => createContext() },
});

server.listen({ port: env.PORT }, () => {
	console.log(`Countday started on port ${env.PORT}`);
});
