import type { FastifyInstance } from "fastify";
import {
  listNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
} from "../controllers/notification-controller.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/", listNotificationsHandler);
  app.patch("/:id", markReadHandler);
  app.post("/read-all", markAllReadHandler);
}
