import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";

export default fp(async function requestIdPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    if (!request.id) {
      (request as unknown as Record<string, unknown>)["id"] =
        `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    }
  });

  app.addHook("onSend", async (request, reply) => {
    void reply.header("x-request-id", request.id);
  });
});
