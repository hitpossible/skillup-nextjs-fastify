import type { FastifyInstance } from "fastify";
import type { SubmitAttemptInput } from "@lms/shared/schemas";
import { AppError } from "../plugins/error-handler.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseAnswer(raw: unknown): string[] {
  if (Array.isArray(raw)) return (raw as unknown[]).map(String);
  if (typeof raw === "string") return [raw];
  return [String(raw)];
}

function formatQuestion(q: {
  id: bigint;
  type: string;
  body: string;
  options: unknown;
  points: number;
  sort_order: number;
}) {
  return {
    id: q.id.toString(),
    type: q.type,
    body: q.body,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    points: q.points,
    sortOrder: q.sort_order,
  };
}

// ── Get quiz detail ───────────────────────────────────────────────────────────

export async function getQuiz(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  quizId: bigint
) {
  const quiz = await app.prisma.quiz.findFirst({
    where: { id: quizId, courses: { tenantId } },
    select: {
      id: true,
      course_id: true,
      lessonId: true,
      title: true,
      type: true,
      passingScore: true,
      maxAttempts: true,
      time_limit_seconds: true,
      shuffle_questions: true,
      questions: {
        select: { id: true, type: true, body: true, options: true, points: true, sort_order: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });
  if (!quiz) throw new AppError(404, "NOT_FOUND", "Quiz not found");

  // business rule #1 — verify active enrollment
  const enrollment = await app.prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: quiz.course_id,
      status: "active",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!enrollment) {
    throw new AppError(403, "NOT_ENROLLED", "Active enrollment required to access this quiz");
  }

  const attemptsUsed = await app.prisma.quizAttempt.count({
    where: { userId, quizId, submittedAt: { not: null } },
  });

  return {
    id: quiz.id.toString(),
    courseId: quiz.course_id.toString(),
    lessonId: quiz.lessonId?.toString() ?? null,
    title: quiz.title,
    type: quiz.type,
    passingScore: quiz.passingScore,
    maxAttempts: quiz.maxAttempts,
    timeLimitSeconds: quiz.time_limit_seconds,
    shuffleQuestions: quiz.shuffle_questions,
    attemptsUsed,
    questions: quiz.questions.map(formatQuestion),
  };
}

// ── Start attempt ─────────────────────────────────────────────────────────────

export async function startAttempt(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  quizId: bigint
) {
  const quiz = await app.prisma.quiz.findFirst({
    where: { id: quizId, courses: { tenantId } },
    select: {
      id: true,
      course_id: true,
      maxAttempts: true,
      time_limit_seconds: true,
      shuffle_questions: true,
      questions: {
        select: { id: true, type: true, body: true, options: true, points: true, sort_order: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });
  if (!quiz) throw new AppError(404, "NOT_FOUND", "Quiz not found");

  // business rule #1
  const enrollment = await app.prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: quiz.course_id,
      status: "active",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!enrollment) {
    throw new AppError(403, "NOT_ENROLLED", "Active enrollment required to start a quiz");
  }

  // business rule #2 — max_attempts check
  if (quiz.maxAttempts !== null) {
    const submitted = await app.prisma.quizAttempt.count({
      where: { userId, quizId, submittedAt: { not: null } },
    });
    if (submitted >= quiz.maxAttempts) {
      throw new AppError(422, "MAX_ATTEMPTS_REACHED", "Maximum number of attempts reached");
    }
  }

  // block concurrent in-progress attempt
  const inProgress = await app.prisma.quizAttempt.findFirst({
    where: { userId, quizId, submittedAt: null },
    select: { id: true },
  });
  if (inProgress) {
    throw new AppError(409, "ATTEMPT_IN_PROGRESS", "An unsubmitted attempt already exists");
  }

  const lastAttempt = await app.prisma.quizAttempt.findFirst({
    where: { userId, quizId },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

  const expiresAt = quiz.time_limit_seconds
    ? new Date(Date.now() + quiz.time_limit_seconds * 1000)
    : null;

  const attempt = await app.prisma.quizAttempt.create({
    data: { quizId, userId, attemptNumber, expires_at: expiresAt },
    select: { id: true, attemptNumber: true, startedAt: true, expires_at: true },
  });

  let questions = quiz.questions.map(formatQuestion);
  if (quiz.shuffle_questions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  return {
    attemptId: attempt.id.toString(),
    attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expires_at?.toISOString() ?? null,
    questions,
  };
}

// ── Submit attempt ────────────────────────────────────────────────────────────

export async function submitAttempt(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  attemptId: bigint,
  input: SubmitAttemptInput
) {
  const attempt = await app.prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      quizId: true,
      attemptNumber: true,
      submittedAt: true,
      expires_at: true,
      quiz: {
        select: {
          course_id: true,
          passingScore: true,
          courses: { select: { tenantId: true } },
          questions: {
            select: {
              id: true,
              type: true,
              correctAnswer: true,
              points: true,
              explanation: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) throw new AppError(404, "NOT_FOUND", "Attempt not found");

  // tenant isolation
  if (attempt.quiz.courses.tenantId !== tenantId) {
    throw new AppError(404, "NOT_FOUND", "Attempt not found");
  }

  if (attempt.submittedAt) {
    throw new AppError(409, "ATTEMPT_ALREADY_SUBMITTED", "This attempt has already been submitted");
  }

  if (attempt.expires_at && attempt.expires_at < new Date()) {
    throw new AppError(422, "ATTEMPT_EXPIRED", "This attempt has expired");
  }

  const questionMap = new Map(
    attempt.quiz.questions.map((q) => [q.id.toString(), q])
  );

  let totalScore = 0;
  let totalPoints = 0;

  const answerRows: {
    attemptId: bigint;
    questionId: bigint;
    response: string | string[];
    isCorrect: boolean;
    score: number;
  }[] = [];

  const answerResults: {
    questionId: string;
    isCorrect: boolean;
    score: number;
    correctAnswer: string | string[];
    explanation: string | null;
  }[] = [];

  for (const ans of input.answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    const correct = normaliseAnswer(question.correctAnswer);
    const given = normaliseAnswer(ans.response);

    const isCorrect =
      correct.length === given.length &&
      correct.every((c) => given.includes(c));

    const score = isCorrect ? question.points : 0;
    totalScore += score;
    totalPoints += question.points;

    answerRows.push({
      attemptId: attempt.id,
      questionId: question.id,
      response: ans.response,
      isCorrect,
      score,
    });

    answerResults.push({
      questionId: ans.questionId,
      isCorrect,
      score,
      // security rule — send correctAnswer only after submit
      correctAnswer: correct.length === 1 ? correct[0]! : correct,
      explanation: question.explanation ?? null,
    });
  }

  const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const passed = scorePercent >= attempt.quiz.passingScore;
  const submittedAt = new Date();

  await app.prisma.$transaction([
    app.prisma.quizAnswer.createMany({ data: answerRows }),
    app.prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { score: scorePercent, passed, submittedAt },
    }),
  ]);

  return {
    attemptId: attempt.id.toString(),
    attemptNumber: attempt.attemptNumber,
    score: scorePercent,
    passingScore: attempt.quiz.passingScore,
    passed,
    submittedAt: submittedAt.toISOString(),
    answers: answerResults,
  };
}
