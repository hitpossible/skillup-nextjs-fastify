import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { SubmitAttemptSchema } from "@lms/shared/schemas";
import { getQuiz, startAttempt, submitAttempt } from "../services/quiz-service.js";

const IdParam = z.object({ id: z.string().min(1) });

export async function getQuizHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const result = await getQuiz(req.server, req.tenantId, req.userId, BigInt(id));
  return reply.status(200).send(result);
}

export async function startAttemptHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const result = await startAttempt(req.server, req.tenantId, req.userId, BigInt(id));
  return reply.status(201).send(result);
}

export async function submitAttemptHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const body = SubmitAttemptSchema.parse(req.body);
  const result = await submitAttempt(req.server, req.tenantId, req.userId, BigInt(id), body);
  return reply.status(200).send(result);
}
