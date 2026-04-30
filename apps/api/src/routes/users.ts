import type { FastifyInstance } from "fastify";
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from "../controllers/user-controller.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/", listUsersHandler);
  app.post("/", createUserHandler);
  app.get("/:id", getUserHandler);
  app.patch("/:id", updateUserHandler);
  app.delete("/:id", deleteUserHandler);

  // stub endpoints ที่จะ implement ใน step 7
  app.get("/:id/enrollments", async (_request, reply) => {
    return reply.status(501).send({ error: { code: "NOT_IMPLEMENTED", message: "TODO: step 7", field: null, request_id: "" } });
  });
  app.get("/:id/certificates", async (_request, reply) => {
    return reply.status(501).send({ error: { code: "NOT_IMPLEMENTED", message: "TODO: step 7", field: null, request_id: "" } });
  });
}
