import type { FastifyInstance } from "fastify";
import { submitAttemptHandler } from "../controllers/quiz-controller.js";

export async function quizAttemptRoutes(app: FastifyInstance) {
  app.post("/:id/submit", submitAttemptHandler);
}
