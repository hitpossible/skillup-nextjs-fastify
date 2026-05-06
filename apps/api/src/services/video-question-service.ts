import type { FastifyInstance } from "fastify";
import type { SubmitVideoResponseInput } from "@lms/shared/schemas";
import { AppError } from "../plugins/error-handler.js";

function normaliseAnswer(raw: unknown): string[] {
  if (Array.isArray(raw)) return (raw as unknown[]).map(String);
  if (typeof raw === "string") return [raw];
  return [String(raw)];
}

// ── List video questions for a lesson ────────────────────────────────────────

export async function listVideoQuestions(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  lessonId: bigint
) {
  // tenant isolation — lesson → section → course → tenant
  const lesson = await app.prisma.lesson.findFirst({
    where: { id: lessonId, section: { course: { tenantId } } },
    select: { id: true, type: true, section: { select: { courseId: true } } },
  });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "Lesson not found");
  if (lesson.type !== "video") {
    throw new AppError(422, "NOT_VIDEO_LESSON", "This lesson does not have video questions");
  }

  // business rule #1 — active enrollment check
  const enrollment = await app.prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: lesson.section.courseId,
      status: "active",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!enrollment) {
    throw new AppError(403, "NOT_ENROLLED", "Active enrollment required to access video questions");
  }

  const questions = await app.prisma.videoQuestion.findMany({
    where: { lessonId },
    select: {
      id: true,
      timestampSeconds: true,
      type: true,
      body: true,
      options: true,
      is_blocking: true,
      can_skip_after: true,
      sort_order: true,
    },
    orderBy: { timestampSeconds: "asc" },
  });

  return questions.map((q) => ({
    id: q.id.toString(),
    timestampSeconds: q.timestampSeconds,
    type: q.type,
    body: q.body,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    isBlocking: q.is_blocking,
    canSkipAfter: q.can_skip_after,
    sortOrder: q.sort_order,
  }));
}

// ── Submit video question response (business rule #6 — no max_attempts) ───────

export async function submitVideoResponse(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  lessonId: bigint,
  input: SubmitVideoResponseInput
) {
  const videoQuestionId = BigInt(input.videoQuestionId);

  const vq = await app.prisma.videoQuestion.findFirst({
    where: { id: videoQuestionId, lessonId },
    select: {
      id: true,
      correctAnswer: true,
      explanation: true,
      lesson: { select: { section: { select: { courseId: true, course: { select: { tenantId: true } } } } } },
    },
  });
  if (!vq) throw new AppError(404, "NOT_FOUND", "Video question not found in this lesson");

  // tenant isolation
  if (vq.lesson.section.course.tenantId !== tenantId) {
    throw new AppError(404, "NOT_FOUND", "Video question not found in this lesson");
  }

  const courseId = vq.lesson.section.courseId;

  // business rule #1 — active enrollment required
  const enrollment = await app.prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      status: "active",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!enrollment) {
    throw new AppError(403, "NOT_ENROLLED", "Active enrollment required to answer video questions");
  }

  const correct = normaliseAnswer(vq.correctAnswer);
  const given = normaliseAnswer(input.response);
  const isCorrect =
    correct.length === given.length && correct.every((c) => given.includes(c));

  // business rule #6 — ไม่มี max_attempts: insert ทุกครั้ง (ไม่ upsert)
  await app.prisma.videoQuestionResponse.create({
    data: {
      videoQuestionId,
      userId,
      enrollment_id: enrollment.id,
      response: input.response,
      isCorrect,
    },
  });

  return {
    isCorrect,
    correctAnswer: correct.length === 1 ? correct[0]! : correct,
    explanation: vq.explanation ?? null,
  };
}
