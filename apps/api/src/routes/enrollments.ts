import type { FastifyInstance } from "fastify";

export async function enrollmentRoutes(app: FastifyInstance) {
  app.post("/", async (_request, reply) => {
    return reply.status(501).send({ error: { code: "NOT_IMPLEMENTED", message: "TODO", field: null, request_id: "" } });
  });

  app.patch("/:id/progress", async (_request, reply) => {
    return reply.status(501).send({ error: { code: "NOT_IMPLEMENTED", message: "TODO", field: null, request_id: "" } });
  });
}
