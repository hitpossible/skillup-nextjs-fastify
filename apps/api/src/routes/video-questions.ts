import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { SubmitVideoResponseSchema } from "@lms/shared/schemas";
import { listVideoQuestions, submitVideoResponse } from "../services/video-question-service.js";

const LessonIdParam = z.object({ id: z.string().min(1) });

async function listVideoQuestionsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = LessonIdParam.parse(req.params);
  const result = await listVideoQuestions(req.server, req.tenantId, req.userId, BigInt(id));
  return reply.status(200).send(result);
}

async function submitVideoResponseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = LessonIdParam.parse(req.params);
  const body = SubmitVideoResponseSchema.parse(req.body);
  const result = await submitVideoResponse(req.server, req.tenantId, req.userId, BigInt(id), body);
  return reply.status(200).send(result);
}

export async function videoQuestionRoutes(app: FastifyInstance) {
  app.get("/:id/video-questions", listVideoQuestionsHandler);
  app.post("/:id/video-questions", submitVideoResponseHandler);
}
