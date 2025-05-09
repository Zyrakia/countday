import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers';
import { env } from './env';

const server = Fastify();

server.register(fastifyTRPCPlugin, {
	prefix: '/trpc',
	trpcOptions: { router: appRouter, createContext: () => ({}) },
});

server.listen({ port: env.PORT }, () => {
	console.log(`Countday started on port ${env.PORT}`);
});
