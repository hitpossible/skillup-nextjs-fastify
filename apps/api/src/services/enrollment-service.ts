import type { FastifyInstance } from "fastify";
import type { CreateEnrollmentInput, UpdateProgressInput } from "@lms/shared/schemas";
import { parsePagination } from "@lms/shared";
import { AppError } from "../plugins/error-handler.js";
import { issueCertificate } from "./certificate-service.js";

function formatEnrollment(e: {
  id: bigint;
  userId: bigint;
  courseId: bigint;
  status: string;
  progressPercent: { toNumber(): number } | null;
  enrolled_at: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  course?: { id: bigint; title: string; thumbnailUrl: string | null };
}) {
  return {
    id: e.id.toString(),
    userId: e.userId.toString(),
    courseId: e.courseId.toString(),
    status: e.status,
    progressPercent: e.progressPercent?.toNumber() ?? 0,
    enrolledAt: e.enrolled_at.toISOString(),
    completedAt: e.completedAt?.toISOString() ?? null,
    expiresAt: e.expiresAt?.toISOString() ?? null,
    ...(e.course
      ? {
          course: {
            id: e.course.id.toString(),
            title: e.course.title,
            thumbnailUrl: e.course.thumbnailUrl,
          },
        }
      : {}),
  };
}

// ── Enroll ────────────────────────────────────────────────────────────────────

export async function createEnrollment(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  input: CreateEnrollmentInput
) {
  const courseId = BigInt(input.courseId);

  // tenant isolation — course ต้องอยู่ใน tenant เดียวกัน (CLAUDE.md rule #8)
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
  if (course.status !== "published") {
    throw new AppError(422, "COURSE_NOT_PUBLISHED", "Cannot enroll in a course that is not published");
  }

  // ตรวจ enroll ซ้ำ
  const existing = await app.prisma.enrollment.findFirst({
    where: { userId, courseId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (existing) {
    throw new AppError(409, "ENROLLMENT_ALREADY_EXISTS", "User is already enrolled in this course");
  }

  const enrollment = await app.prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: "active",
      source: input.source ?? "organic",
      coupon_code: input.couponCode ?? null,
    },
    select: {
      id: true, userId: true, courseId: true, status: true,
      progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
      course: { select: { id: true, title: true, thumbnailUrl: true } },
    },
  });

  return formatEnrollment(enrollment);
}

// ── Admin enroll (bypass published check) ─────────────────────────────────────

export async function adminCreateEnrollment(
  app: FastifyInstance,
  tenantId: bigint,
  input: { userId: string; courseId: string; expiresAt?: string | null }
) {
  const userId = BigInt(input.userId);
  const courseId = BigInt(input.courseId);

  const [course, user] = await Promise.all([
    app.prisma.course.findFirst({
      where: { id: courseId, tenantId, deletedAt: null },
      select: { id: true },
    }),
    app.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

  const existing = await app.prisma.enrollment.findFirst({
    where: { userId, courseId, deletedAt: null },
    select: { id: true },
  });
  if (existing) throw new AppError(409, "ENROLLMENT_ALREADY_EXISTS", "User is already enrolled in this course");

  const enrollment = await app.prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: "active",
      source: "admin",
      ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
    },
    select: {
      id: true, userId: true, courseId: true, status: true,
      progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
      course: { select: { id: true, title: true, thumbnailUrl: true } },
    },
  });
  return formatEnrollment(enrollment);
}

// ── Admin list all enrollments ────────────────────────────────────────────────

export async function listAllEnrollments(
  app: FastifyInstance,
  tenantId: bigint,
  query: {
    page?: number;
    limit?: number;
    status?: string;
    courseId?: string;
    search?: string;
  }
) {
  const { page, limit, skip } = parsePagination(query);

  const where: any = {
    deletedAt: null,
    course: { tenantId },
    ...(query.status ? { status: query.status } : {}),
    ...(query.courseId ? { courseId: BigInt(query.courseId) } : {}),
    ...(query.search
      ? {
          OR: [
            { user: { full_name: { contains: query.search } } },
            { user: { email: { contains: query.search } } },
            { course: { title: { contains: query.search } } },
          ],
        }
      : {}),
  };

  const [total, enrollments] = await Promise.all([
    app.prisma.enrollment.count({ where }),
    app.prisma.enrollment.findMany({
      where,
      select: {
        id: true, userId: true, courseId: true, status: true,
        progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
        user: { select: { id: true, full_name: true, email: true, avatar_url: true } },
        course: { select: { id: true, title: true, thumbnailUrl: true } },
      },
      orderBy: { enrolled_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: enrollments.map(e => ({
      ...formatEnrollment(e),
      user: {
        id: e.user.id.toString(),
        fullName: e.user.full_name,
        email: e.user.email,
        avatarUrl: e.user.avatar_url,
      },
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Admin update enrollment (status / expiresAt) ──────────────────────────────

export async function adminUpdateEnrollment(
  app: FastifyInstance,
  tenantId: bigint,
  enrollmentId: bigint,
  input: { status?: string; expiresAt?: string | null }
) {
  const enrollment = await app.prisma.enrollment.findFirst({
    where: { id: enrollmentId, deletedAt: null, course: { tenantId } },
    select: { id: true },
  });
  if (!enrollment) throw new AppError(404, "NOT_FOUND", "Enrollment not found");

  const updated = await app.prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
    },
    select: {
      id: true, userId: true, courseId: true, status: true,
      progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
      user: { select: { id: true, full_name: true, email: true, avatar_url: true } },
      course: { select: { id: true, title: true, thumbnailUrl: true } },
    },
  });

  return {
    ...formatEnrollment(updated),
    user: {
      id: updated.user.id.toString(),
      fullName: updated.user.full_name,
      email: updated.user.email,
      avatarUrl: updated.user.avatar_url,
    },
  };
}

// ── Admin revoke (soft delete) ────────────────────────────────────────────────

export async function adminRevokeEnrollment(
  app: FastifyInstance,
  tenantId: bigint,
  enrollmentId: bigint
) {
  const enrollment = await app.prisma.enrollment.findFirst({
    where: { id: enrollmentId, deletedAt: null, course: { tenantId } },
    select: { id: true },
  });
  if (!enrollment) throw new AppError(404, "NOT_FOUND", "Enrollment not found");
  await app.prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { deletedAt: new Date() },
  });
}

// ── List enrollments ──────────────────────────────────────────────────────────

export async function listUserEnrollments(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  query: { page?: number | undefined; limit?: number | undefined; status?: string | undefined }
) {
  // tenant isolation
  const user = await app.prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

  const { page, limit, skip } = parsePagination(query);
  const where = {
    userId,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, enrollments] = await Promise.all([
    app.prisma.enrollment.count({ where }),
    app.prisma.enrollment.findMany({
      where,
      select: {
        id: true, userId: true, courseId: true, status: true,
        progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
        course: { select: { id: true, title: true, thumbnailUrl: true } },
      },
      orderBy: { enrolled_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: enrollments.map(formatEnrollment),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Update progress ───────────────────────────────────────────────────────────

export async function updateProgress(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  enrollmentId: bigint,
  input: UpdateProgressInput
) {
  const lessonId = BigInt(input.lessonId);

  // ดึง enrollment พร้อม tenant isolation ผ่าน course
  const enrollment = await app.prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      userId,
      deletedAt: null,
      course: { tenantId },
    },
    select: {
      id: true, userId: true, courseId: true, status: true,
      progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
    },
  });
  if (!enrollment) throw new AppError(404, "NOT_FOUND", "Enrollment not found");

  // business rule #1 — ตรวจว่า enrollment ยัง active
  if (enrollment.status !== "active") {
    throw new AppError(422, "ENROLLMENT_NOT_ACTIVE", "Enrollment is not active");
  }
  if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
    throw new AppError(422, "ENROLLMENT_EXPIRED", "Enrollment has expired");
  }

  // ตรวจว่า lesson อยู่ใน course นี้
  const lesson = await app.prisma.lesson.findFirst({
    where: { id: lessonId, section: { courseId: enrollment.courseId } },
    select: { id: true },
  });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "Lesson not found in this course");

  // upsert lesson_progress
  const isCompleted = input.status === "completed";
  await app.prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      status: input.status,
      ...(input.watchSeconds !== undefined ? { watch_seconds: input.watchSeconds } : {}),
      ...(isCompleted ? { completedAt: new Date() } : {}),
    },
    create: {
      userId,
      lessonId,
      status: input.status,
      watch_seconds: input.watchSeconds ?? 0,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  // business rule #3 — คำนวณ progress_percent ใหม่
  const [completedCount, totalCount] = await Promise.all([
    app.prisma.lessonProgress.count({
      where: { userId, lesson: { section: { courseId: enrollment.courseId } }, status: "completed" },
    }),
    app.prisma.lesson.count({
      where: { section: { courseId: enrollment.courseId } },
    }),
  ]);

  const progressPercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  // business rule #4 — auto-complete เมื่อ 100%
  const isComplete = progressPercent === 100;
  const updatedEnrollment = await app.prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPercent,
      ...(isComplete ? { status: "completed", completedAt: new Date() } : {}),
    },
    select: {
      id: true, userId: true, courseId: true, status: true,
      progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
    },
  });

  // business rule #5 — auto-issue certificate เมื่อ complete
  if (isComplete) {
    await issueCertificate(app, userId, enrollment.courseId);
  }

  return formatEnrollment(updatedEnrollment);
}
