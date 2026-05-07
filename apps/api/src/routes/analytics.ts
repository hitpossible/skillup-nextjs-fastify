import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getCourseAnalytics, getUserReport, getLeaderboard, getCourseEnrollments, getUserQuizDetail, updateQuizAnswerScore } from "../services/analytics-service.js";

const IdParam = z.object({ id: z.string().min(1) });

async function courseAnalyticsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const result = await getCourseAnalytics(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(result);
}

async function userReportHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const result = await getUserReport(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(result);
}

async function leaderboardHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = await getLeaderboard(req.server, req.tenantId, 3);
  return reply.status(200).send(result);
}

async function courseEnrollmentsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const result = await getCourseEnrollments(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(result);
}

async function userQuizDetailHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id, userId } = z.object({ id: z.string(), userId: z.string() }).parse(req.params);
  const result = await getUserQuizDetail(req.server, req.tenantId, BigInt(id), BigInt(userId));
  return reply.status(200).send(result);
}

async function updateQuizAnswerScoreHandler(req: FastifyRequest, reply: FastifyReply) {
  const { attemptId, questionId } = z.object({ attemptId: z.string(), questionId: z.string() }).parse(req.params);
  const { score } = z.object({ score: z.number().min(0) }).parse(req.body);
  const result = await updateQuizAnswerScore(req.server, req.tenantId, BigInt(attemptId), BigInt(questionId), score);
  return reply.status(200).send(result);
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/courses/:id", courseAnalyticsHandler);
  app.get("/courses/:id/enrollments", courseEnrollmentsHandler);
  app.get("/courses/:id/enrollments/:userId/quizzes", userQuizDetailHandler);
  app.patch("/quiz-attempts/:attemptId/questions/:questionId/score", updateQuizAnswerScoreHandler);
  app.get("/users/:id/report", userReportHandler);
  app.get("/leaderboard", leaderboardHandler);
}
