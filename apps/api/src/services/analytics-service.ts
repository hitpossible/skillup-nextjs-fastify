import type { FastifyInstance } from "fastify";
import { AppError } from "../plugins/error-handler.js";

// ── Course analytics ──────────────────────────────────────────────────────────

export async function getCourseAnalytics(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");

  const [totalEnrollments, activeEnrollments, completedEnrollments] = await Promise.all([
    app.prisma.enrollment.count({ where: { courseId, deletedAt: null } }),
    app.prisma.enrollment.count({ where: { courseId, status: "active", deletedAt: null } }),
    app.prisma.enrollment.count({ where: { courseId, status: "completed", deletedAt: null } }),
  ]);

  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  // avg progress across all active+completed enrollments
  const progressAgg = await app.prisma.enrollment.aggregate({
    where: { courseId, deletedAt: null, status: { in: ["active", "completed"] } },
    _avg: { progressPercent: true },
  });
  const avgProgress = progressAgg._avg.progressPercent
    ? Number(progressAgg._avg.progressPercent.toFixed(1))
    : 0;

  // avg quiz score across all submitted attempts in this course
  const scoreAgg = await app.prisma.quizAttempt.aggregate({
    where: { quiz: { course_id: courseId }, submittedAt: { not: null } },
    _avg: { score: true },
  });
  const avgQuizScore = scoreAgg._avg.score
    ? Math.round(scoreAgg._avg.score)
    : null;

  const totalLessons = await app.prisma.lesson.count({
    where: { section: { courseId } },
  });

  return {
    courseId: course.id.toString(),
    title: course.title,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    completionRate,
    avgProgress,
    avgQuizScore,
    totalLessons,
  };
}

// ── User quiz detail for a course (admin/instructor view) ────────────────────

export async function getUserQuizDetail(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  userId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");

  const quizzes = await app.prisma.quiz.findMany({
    where: { course_id: courseId },
    select: {
      id: true,
      title: true,
      passingScore: true,
      questions: {
        select: { id: true, type: true, body: true, options: true, correctAnswer: true, points: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  if (quizzes.length === 0) return [];

  const attempts = await app.prisma.quizAttempt.findMany({
    where: {
      userId,
      quizId: { in: quizzes.map((q) => q.id) },
      submittedAt: { not: null },
    },
    include: {
      answers: {
        select: {
          questionId: true,
          response: true,
          isCorrect: true,
          score: true,
        },
      },
    },
    orderBy: [{ quizId: "asc" }, { attemptNumber: "asc" }],
  });

  const questionMap = new Map(
    quizzes.flatMap((q) => q.questions.map((qn) => [qn.id.toString(), qn]))
  );

  const attemptsByQuiz = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const key = a.quizId.toString();
    if (!attemptsByQuiz.has(key)) attemptsByQuiz.set(key, []);
    attemptsByQuiz.get(key)!.push(a);
  }

  return quizzes.map((quiz) => ({
    quizId: quiz.id.toString(),
    title: quiz.title,
    passingScore: quiz.passingScore,
    attempts: (attemptsByQuiz.get(quiz.id.toString()) ?? []).map((attempt) => ({
      attemptId: attempt.id.toString(),
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      answers: attempt.answers.map((ans) => {
        const q = questionMap.get(ans.questionId.toString());
        return {
          questionId: ans.questionId.toString(),
          questionBody: q?.body ?? "",
          response: ans.response,
          options: q?.options,
          type: q?.type,
          correctAnswer: q?.correctAnswer,
          isCorrect: ans.isCorrect,
          score: ans.score,
          points: q?.points ?? 1,
        };
      }),
    })),
  }));
}

// ── Course enrollments (admin/instructor view) ────────────────────────────────

export async function getCourseEnrollments(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");

  const enrollments = await app.prisma.enrollment.findMany({
    where: { courseId, deletedAt: null },
    include: {
      user: { select: { id: true, full_name: true, email: true } },
    },
    orderBy: { enrolled_at: "desc" },
  });

  const userIds = enrollments.map((e) => e.userId);

  const attempts =
    userIds.length > 0
      ? await app.prisma.quizAttempt.findMany({
          where: {
            userId: { in: userIds },
            submittedAt: { not: null },
            quiz: { course_id: courseId },
          },
          select: {
            userId: true,
            score: true,
            passed: true,
            attemptNumber: true,
            quiz: { select: { title: true } },
          },
        })
      : [];

  const attemptsByUser = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const key = a.userId.toString();
    if (!attemptsByUser.has(key)) attemptsByUser.set(key, []);
    attemptsByUser.get(key)!.push(a);
  }

  return {
    courseId: course.id.toString(),
    title: course.title,
    total: enrollments.length,
    enrollments: enrollments.map((e) => {
      const userAttempts = attemptsByUser.get(e.userId.toString()) ?? [];
      const scores = userAttempts.map((a) => a.score ?? 0);
      return {
        id: e.id.toString(),
        userId: e.userId.toString(),
        name: e.user.full_name || e.user.email.split("@")[0],
        email: e.user.email,
        status: e.status,
        progressPercent: e.progressPercent?.toNumber() ?? 0,
        enrolledAt: e.enrolled_at.toISOString(),
        completedAt: e.completedAt?.toISOString() ?? null,
        quizStats: {
          totalAttempts: userAttempts.length,
          passedCount: userAttempts.filter((a) => a.passed).length,
          bestScore: scores.length > 0 ? Math.max(...scores) : null,
        },
      };
    }),
  };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(
  app: FastifyInstance,
  tenantId: bigint,
  limit: number = 3
) {
  const grouped = await app.prisma.enrollment.groupBy({
    by: ["userId"],
    where: { status: "completed", deletedAt: null, user: { tenantId } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const userIds = grouped.map((g) => g.userId);
  const users = await app.prisma.user.findMany({
    where: { id: { in: userIds }, tenantId, deletedAt: null },
    select: { id: true, full_name: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id.toString(), u]));

  return grouped.map((g, i) => {
    const user = userMap.get(g.userId.toString());
    return {
      rank: i + 1,
      userId: g.userId.toString(),
      name: user?.full_name || user?.email?.split("@")[0] || "Unknown",
      completedCourses: g._count.id,
    };
  });
}

// ── User analytics report ─────────────────────────────────────────────────────

export async function getUserReport(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint
) {
  const user = await app.prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true, full_name: true, email: true },
  });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

  const [totalEnrollments, completedEnrollments, certificates] = await Promise.all([
    app.prisma.enrollment.count({ where: { userId, deletedAt: null } }),
    app.prisma.enrollment.count({ where: { userId, status: "completed", deletedAt: null } }),
    app.prisma.certificate.count({ where: { userId } }),
  ]);

  const progressAgg = await app.prisma.enrollment.aggregate({
    where: { userId, deletedAt: null },
    _avg: { progressPercent: true },
  });
  const avgProgress = progressAgg._avg.progressPercent
    ? Number(progressAgg._avg.progressPercent.toFixed(1))
    : 0;

  // quiz performance
  const attempts = await app.prisma.quizAttempt.findMany({
    where: { userId, submittedAt: { not: null } },
    select: { score: true, passed: true },
  });
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const avgQuizScore =
    totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / totalAttempts)
      : null;

  // per-course breakdown
  const enrollments = await app.prisma.enrollment.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      status: true,
      progressPercent: true,
      enrolled_at: true,
      completedAt: true,
      course: { select: { id: true, title: true } },
    },
    orderBy: { enrolled_at: "desc" },
  });

  return {
    userId: user.id.toString(),
    name: user.full_name,
    email: user.email,
    totalEnrollments,
    completedEnrollments,
    certificates,
    avgProgress,
    quizStats: {
      totalAttempts,
      passedAttempts,
      avgScore: avgQuizScore,
    },
    courses: enrollments.map((e) => ({
      courseId: e.course.id.toString(),
      title: e.course.title,
      status: e.status,
      progressPercent: e.progressPercent?.toNumber() ?? 0,
      enrolledAt: e.enrolled_at.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
    })),
  };
}

// ── Update quiz answer score (instructor manual grading) ──────────────────────

export async function updateQuizAnswerScore(
  app: FastifyInstance,
  tenantId: bigint,
  attemptId: bigint,
  questionId: bigint,
  score: number
) {
  const answer = await app.prisma.quizAnswer.findFirst({
    where: {
      attemptId,
      questionId,
      attempt: {
        quiz: {
          courses: { tenantId },
        },
      },
    },
    include: {
      question: { select: { points: true } },
      attempt: {
        select: {
          quiz: { select: { passingScore: true } },
        },
      },
    },
  });

  if (!answer) throw new AppError(404, "NOT_FOUND", "Answer not found");

  // Validate score against max points
  const maxPoints = answer.question.points;
  if (score < 0 || score > maxPoints) {
    throw new AppError(422, "INVALID_SCORE", `Score must be between 0 and ${maxPoints}`);
  }

  // Update this answer
  await app.prisma.quizAnswer.update({
    where: { id: answer.id },
    data: {
      score,
      isCorrect: score === maxPoints, // If they get full marks, mark as correct
    },
  });

  // Recalculate total score for the attempt
  const allAnswers = await app.prisma.quizAnswer.findMany({
    where: { attemptId },
    include: { question: { select: { points: true } } },
  });

  let totalScore = 0;
  let totalPoints = 0;
  for (const a of allAnswers) {
    totalScore += a.score ?? 0;
    totalPoints += a.question.points;
  }

  const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const passed = scorePercent >= (answer.attempt.quiz.passingScore ?? 60);

  await app.prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { score: scorePercent, passed },
  });

  return {
    attemptId: attemptId.toString(),
    newScore: scorePercent,
    passed,
  };
}
