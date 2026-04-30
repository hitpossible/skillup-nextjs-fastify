import type { FastifyInstance } from "fastify";
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CreateSectionInput,
  CreateLessonInput,
  UpdateLessonInput,
} from "@lms/shared/schemas";
import { UpdateSectionSchema } from "@lms/shared/schemas";
import { parsePagination } from "@lms/shared";
import { AppError } from "../plugins/error-handler.js";
import type { z } from "zod";

type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;

// ── Formatters ────────────────────────────────────────────────────────────────

function formatLesson(l: {
  id: bigint;
  sectionId: bigint;
  title: string;
  type: string;
  content_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_free_preview: boolean;
  has_iv_questions: boolean;
}) {
  return {
    id: l.id.toString(),
    sectionId: l.sectionId.toString(),
    title: l.title,
    type: l.type,
    contentUrl: l.content_url,
    durationSeconds: l.duration_seconds,
    sortOrder: l.sort_order,
    isFreePreview: l.is_free_preview,
    hasIvQuestions: l.has_iv_questions,
  };
}

function formatSection(s: {
  id: bigint;
  courseId: bigint;
  title: string;
  sort_order: number;
  lessons?: Parameters<typeof formatLesson>[0][];
}) {
  return {
    id: s.id.toString(),
    courseId: s.courseId.toString(),
    title: s.title,
    sortOrder: s.sort_order,
    ...(s.lessons ? { lessons: s.lessons.map(formatLesson) } : {}),
  };
}

function formatCourse(c: {
  id: bigint;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: string;
  language: string;
  duration_minutes: number | null;
  published_at: Date | null;
  createdAt: Date;
  sections?: Parameters<typeof formatSection>[0][];
}) {
  return {
    id: c.id.toString(),
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    status: c.status,
    language: c.language,
    durationMinutes: c.duration_minutes,
    publishedAt: c.published_at?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    ...(c.sections ? { sections: c.sections.map(formatSection) } : {}),
  };
}

const COURSE_SELECT = {
  id: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  status: true,
  language: true,
  duration_minutes: true,
  published_at: true,
  createdAt: true,
} as const;

const SECTION_SELECT = {
  id: true,
  courseId: true,
  title: true,
  sort_order: true,
} as const;

const LESSON_SELECT = {
  id: true,
  sectionId: true,
  title: true,
  type: true,
  content_url: true,
  duration_seconds: true,
  sort_order: true,
  is_free_preview: true,
  has_iv_questions: true,
} as const;

// ── Course ────────────────────────────────────────────────────────────────────

export async function listCourses(
  app: FastifyInstance,
  tenantId: bigint,
  query: {
    page?: number | undefined;
    limit?: number | undefined;
    status?: string | undefined;
    search?: string | undefined;
  }
) {
  const { page, limit, skip } = parsePagination(query);
  const where = {
    tenantId,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { title: { contains: query.search } } : {}),
  };

  const [total, courses] = await Promise.all([
    app.prisma.course.count({ where }),
    app.prisma.course.findMany({
      where,
      select: COURSE_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: courses.map(formatCourse),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCourseById(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: {
      ...COURSE_SELECT,
      sections: {
        select: {
          ...SECTION_SELECT,
          lessons: {
            select: LESSON_SELECT,
            orderBy: { sort_order: "asc" },
          },
        },
        orderBy: { sort_order: "asc" },
      },
    },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
  return formatCourse(course);
}

export async function createCourse(
  app: FastifyInstance,
  tenantId: bigint,
  createdBy: bigint,
  input: CreateCourseInput
) {
  const course = await app.prisma.course.create({
    data: {
      tenantId,
      created_by: createdBy,
      title: input.title,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      language: input.language ?? "th",
      duration_minutes: input.durationMinutes ?? null,
      status: "draft",
    },
    select: COURSE_SELECT,
  });
  return formatCourse(course);
}

export async function updateCourse(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  input: UpdateCourseInput
) {
  const existing = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Course not found");
  if (existing.status === "archived") {
    throw new AppError(422, "COURSE_ARCHIVED", "Cannot edit an archived course");
  }

  const course = await app.prisma.course.update({
    where: { id: courseId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.durationMinutes !== undefined ? { duration_minutes: input.durationMinutes } : {}),
    },
    select: COURSE_SELECT,
  });
  return formatCourse(course);
}

export async function publishCourse(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
  if (course.status === "published") {
    throw new AppError(409, "COURSE_ALREADY_PUBLISHED", "Course is already published");
  }

  // ต้องมี lesson อย่างน้อย 1 ก่อน publish
  const lessonCount = await app.prisma.lesson.count({
    where: { section: { courseId } },
  });
  if (lessonCount === 0) {
    throw new AppError(422, "COURSE_NO_LESSONS", "Course must have at least one lesson before publishing");
  }

  const updated = await app.prisma.course.update({
    where: { id: courseId },
    data: { status: "published", published_at: new Date() },
    select: COURSE_SELECT,
  });
  return formatCourse(updated);
}

export async function deleteCourse(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const existing = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Course not found");
  await app.prisma.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date() },
  });
}

// ── Sections ──────────────────────────────────────────────────────────────────

async function assertCourseOwner(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
}

export async function listSections(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  await assertCourseOwner(app, tenantId, courseId);
  const sections = await app.prisma.courseSection.findMany({
    where: { courseId },
    select: {
      ...SECTION_SELECT,
      lessons: { select: LESSON_SELECT, orderBy: { sort_order: "asc" } },
    },
    orderBy: { sort_order: "asc" },
  });
  return sections.map(formatSection);
}

export async function createSection(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  input: CreateSectionInput
) {
  await assertCourseOwner(app, tenantId, courseId);
  const section = await app.prisma.courseSection.create({
    data: { courseId, title: input.title, sort_order: input.sortOrder ?? 0 },
    select: SECTION_SELECT,
  });
  return formatSection(section);
}

export async function updateSection(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  input: UpdateSectionInput
) {
  await assertCourseOwner(app, tenantId, courseId);
  const existing = await app.prisma.courseSection.findFirst({
    where: { id: sectionId, courseId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Section not found");
  const section = await app.prisma.courseSection.update({
    where: { id: sectionId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
    },
    select: SECTION_SELECT,
  });
  return formatSection(section);
}

export async function deleteSection(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint
) {
  await assertCourseOwner(app, tenantId, courseId);
  const existing = await app.prisma.courseSection.findFirst({
    where: { id: sectionId, courseId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Section not found");
  // cascade delete lessons อัตโนมัติ (onDelete: Cascade ใน schema)
  await app.prisma.courseSection.delete({ where: { id: sectionId } });
}

// ── Lessons ───────────────────────────────────────────────────────────────────

async function assertSectionOwner(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint
) {
  await assertCourseOwner(app, tenantId, courseId);
  const section = await app.prisma.courseSection.findFirst({
    where: { id: sectionId, courseId },
    select: { id: true },
  });
  if (!section) throw new AppError(404, "NOT_FOUND", "Section not found");
}

export async function createLesson(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  input: CreateLessonInput
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const lesson = await app.prisma.lesson.create({
    data: {
      sectionId,
      title: input.title,
      type: input.type,
      content_url: input.contentUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      sort_order: input.sortOrder ?? 0,
      is_free_preview: input.isFreePreview ?? false,
    },
    select: LESSON_SELECT,
  });
  return formatLesson(lesson);
}

export async function updateLesson(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint,
  input: UpdateLessonInput
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const existing = await app.prisma.lesson.findFirst({
    where: { id: lessonId, sectionId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Lesson not found");
  const lesson = await app.prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.contentUrl !== undefined ? { content_url: input.contentUrl } : {}),
      ...(input.durationSeconds !== undefined ? { duration_seconds: input.durationSeconds } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
      ...(input.isFreePreview !== undefined ? { is_free_preview: input.isFreePreview } : {}),
    },
    select: LESSON_SELECT,
  });
  return formatLesson(lesson);
}

export async function deleteLesson(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const existing = await app.prisma.lesson.findFirst({
    where: { id: lessonId, sectionId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Lesson not found");
  await app.prisma.lesson.delete({ where: { id: lessonId } });
}
