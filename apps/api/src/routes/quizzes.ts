import type { FastifyInstance } from "fastify";
import { getQuizHandler, startAttemptHandler, getLastAttemptHandler } from "../controllers/quiz-controller.js";

export async function quizRoutes(app: FastifyInstance) {
  app.get("/:id", getQuizHandler);
  app.post("/:id/attempts", startAttemptHandler);
  app.get("/:id/attempts/last", getLastAttemptHandler);
}
