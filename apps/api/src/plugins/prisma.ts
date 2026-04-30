import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { prisma } from "@lms/db";

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

export default fp(async function prismaPlugin(app: FastifyInstance) {
  await prisma.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
