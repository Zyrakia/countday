import Fastify from 'fastify';

import { fastifyCors as fastifyCorsPlugin } from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import { serverEnv } from '@countday/shared/env/server';
import { appRouter } from './routers';
import { createContext } from './trpc';

const server = Fastify({
	logger: true,
	routerOptions: { maxParamLength: 5000 },
});

server.register(fastifyCorsPlugin, {});

server.register(fastifyTRPCPlugin, {
	prefix: '/trpc',
	trpcOptions: { router: appRouter, createContext: () => createContext() },
});

server.listen({ port: serverEnv.PORT }, () => {
	console.log(`Countday started on port ${serverEnv.PORT}`);
});
