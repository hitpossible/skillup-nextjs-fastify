import type { FastifyInstance } from "fastify";
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from "../controllers/user-controller.js";
import {
  listUserEnrollmentsHandler,
  listUserCertificatesHandler,
} from "../controllers/enrollment-controller.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/", listUsersHandler);
  app.post("/", createUserHandler);
  app.get("/:id", getUserHandler);
  app.patch("/:id", updateUserHandler);
  app.delete("/:id", deleteUserHandler);

  app.get("/:id/enrollments", listUserEnrollmentsHandler);
  app.get("/:id/certificates", listUserCertificatesHandler);
}
