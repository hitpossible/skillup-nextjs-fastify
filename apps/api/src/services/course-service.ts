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
  seek_mode: string;
  attachments: any;
  quizzes?: Array<{ id: bigint }>;
  videoQuestions?: Array<{
    id: bigint;
    timestampSeconds: number;
    body: string;
    options: any;
    correctAnswer: any;
    explanation: string | null;
    is_blocking: boolean;
    sort_order: number;
  }>;
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
    seekMode: l.seek_mode,
    attachments: l.attachments,
    quizId: l.quizzes?.[0]?.id.toString() ?? null,
    ...(l.videoQuestions
      ? {
          videoQuestions: l.videoQuestions.map(q => ({
            id: q.id.toString(),
            timestampSeconds: q.timestampSeconds,
            body: q.body,
            options: (q.options ?? []) as string[],
            correctAnswer: q.correctAnswer as string,
            explanation: q.explanation ?? undefined,
            isBlocking: q.is_blocking,
          })),
        }
      : {}),
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
  category?: { id: bigint; name: string; slug: string } | null;
  duration_minutes: number | null;
  published_at: Date | null;
  createdAt: Date;
  users?: { id: bigint; full_name: string; avatar_url: string | null };
  sections?: Parameters<typeof formatSection>[0][];
}) {
  return {
    id: c.id.toString(),
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    status: c.status,
    language: c.language,
    category: c.category ? {
      id: c.category.id.toString(),
      name: c.category.name,
      slug: c.category.slug,
    } : null,
    durationMinutes: c.duration_minutes,
    publishedAt: c.published_at?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    instructor: c.users ? {
      id: c.users.id.toString(),
      fullName: c.users.full_name,
      avatarUrl: c.users.avatar_url,
    } : undefined,
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
  category: {
    select: { id: true, name: true, slug: true }
  },
  duration_minutes: true,
  published_at: true,
  createdAt: true,
  users: {
    select: { id: true, full_name: true, avatar_url: true }
  },
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
  seek_mode: true,
  attachments: true,
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
            select: {
              ...LESSON_SELECT,
              quizzes: { select: { id: true }, take: 1 },
              videoQuestions: {
                select: {
                  id: true,
                  timestampSeconds: true,
                  body: true,
                  options: true,
                  correctAnswer: true,
                  explanation: true,
                  is_blocking: true,
                  sort_order: true,
                },
                orderBy: { sort_order: "asc" },
              },
            },
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

export async function listCategories(app: FastifyInstance, tenantId: bigint) {
  const categories = await app.prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
  return categories.map(c => ({
    id: c.id.toString(),
    name: c.name,
    slug: c.slug,
    courseCount: c._count.courses,
  }));
}

export async function createCategory(
  app: FastifyInstance,
  tenantId: bigint,
  input: { name: string; slug: string }
) {
  const existing = await app.prisma.category.findFirst({
    where: { tenantId, slug: input.slug },
    select: { id: true },
  });
  if (existing) throw new AppError(409, "CATEGORY_SLUG_EXISTS", "A category with this slug already exists");

  const category = await app.prisma.category.create({
    data: { tenantId, name: input.name, slug: input.slug },
  });
  return { id: category.id.toString(), name: category.name, slug: category.slug, courseCount: 0 };
}

export async function updateCategory(
  app: FastifyInstance,
  tenantId: bigint,
  categoryId: bigint,
  input: { name?: string; slug?: string }
) {
  const existing = await app.prisma.category.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Category not found");

  if (input.slug) {
    const slugConflict = await app.prisma.category.findFirst({
      where: { tenantId, slug: input.slug, id: { not: categoryId } },
      select: { id: true },
    });
    if (slugConflict) throw new AppError(409, "CATEGORY_SLUG_EXISTS", "A category with this slug already exists");
  }

  const category = await app.prisma.category.update({
    where: { id: categoryId },
    data: { ...(input.name ? { name: input.name } : {}), ...(input.slug ? { slug: input.slug } : {}) },
    include: { _count: { select: { courses: true } } },
  });
  return { id: category.id.toString(), name: category.name, slug: category.slug, courseCount: category._count.courses };
}

export async function deleteCategory(
  app: FastifyInstance,
  tenantId: bigint,
  categoryId: bigint
) {
  const existing = await app.prisma.category.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Category not found");

  // unlink courses first, then delete
  await app.prisma.$transaction([
    app.prisma.course.updateMany({
      where: { categoryId, tenantId },
      data: { categoryId: null },
    }),
    app.prisma.category.delete({ where: { id: categoryId } }),
  ]);
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
      categoryId: input.categoryId ? BigInt(input.categoryId) : null,
      created_by: input.instructorId ? BigInt(input.instructorId) : createdBy,
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
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId ? BigInt(input.categoryId) : null } : {}),
      ...(input.durationMinutes !== undefined ? { duration_minutes: input.durationMinutes } : {}),
      ...(input.instructorId !== undefined ? { created_by: input.instructorId ? BigInt(input.instructorId) : undefined } : {}),
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
  try {
    const course = await app.prisma.course.findFirst({
      where: { id: courseId, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
    if (course.status === "published") {
      throw new AppError(409, "COURSE_ALREADY_PUBLISHED", "Course is already published");
    }

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
  } catch (error) {
    console.error("publishCourse ERROR:", error);
    throw error;
  }
}

export async function unpublishCourse(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint
) {
  const course = await app.prisma.course.findFirst({
    where: { id: courseId, tenantId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "Course not found");
  if (course.status !== "published") {
    throw new AppError(409, "COURSE_NOT_PUBLISHED", "Course is not published");
  }
  const updated = await app.prisma.course.update({
    where: { id: courseId },
    data: { status: "draft", published_at: null },
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
      seek_mode: input.seekMode ?? "free",
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
      ...(input.seekMode !== undefined ? { seek_mode: input.seekMode } : {}),
      ...(input.attachments !== undefined ? { attachments: input.attachments ?? null } : {}),
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

export async function getLesson(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const lesson = await app.prisma.lesson.findFirst({
    where: { id: lessonId, sectionId },
    select: {
      ...LESSON_SELECT,
      videoQuestions: {
        orderBy: { timestampSeconds: "asc" },
      },
      quizzes: {
        include: {
          questions: { orderBy: { sort_order: "asc" } }
        }
      }
    },
  });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "Lesson not found");

  const formatted = formatLesson(lesson);
  return {
    ...formatted,
    videoQuestions: lesson.videoQuestions?.map((vq: any) => ({
      id: vq.id.toString(),
      lessonId: vq.lessonId.toString(),
      timestampSeconds: vq.timestampSeconds,
      type: vq.type,
      body: vq.body,
      options: vq.options,
      correctAnswer: vq.correctAnswer,
      explanation: vq.explanation,
      isBlocking: vq.is_blocking,
      canSkipAfter: vq.can_skip_after,
      sortOrder: vq.sort_order,
      createdAt: vq.createdAt.toISOString(),
    })),
    quizzes: lesson.quizzes?.map((qz: any) => ({
      id: qz.id.toString(),
      courseId: qz.course_id.toString(),
      lessonId: qz.lessonId?.toString(),
      title: qz.title,
      type: qz.type,
      passingScore: qz.passingScore,
      timeLimitSeconds: qz.time_limit_seconds,
      maxAttempts: qz.maxAttempts,
      shuffleQuestions: qz.shuffle_questions,
      questions: qz.questions?.map((q: any) => ({
        id: q.id.toString(),
        quizId: q.quizId.toString(),
        type: q.type,
        body: q.body,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        sortOrder: q.sort_order,
        explanation: q.explanation,
      })),
    })),
  };
}

// ── Video Questions ───────────────────────────────────────────────────────────

export async function createVideoQuestion(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint,
  input: z.infer<typeof import("@lms/shared/schemas").CreateVideoQuestionSchema>
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const existingLesson = await app.prisma.lesson.findFirst({
    where: { id: lessonId, sectionId },
    select: { id: true },
  });
  if (!existingLesson) throw new AppError(404, "NOT_FOUND", "Lesson not found");

  const vq = await app.prisma.videoQuestion.create({
    data: {
      lessonId,
      timestampSeconds: input.timestampSeconds,
      type: input.type,
      body: input.body,
      options: input.options ?? null,
      correctAnswer: input.correctAnswer ?? null,
      explanation: input.explanation ?? null,
      is_blocking: input.isBlocking,
      can_skip_after: input.canSkipAfter ?? null,
      sort_order: input.sortOrder ?? 0,
    },
  });

  return {
    id: vq.id.toString(),
    lessonId: vq.lessonId.toString(),
    timestampSeconds: vq.timestampSeconds,
    type: vq.type,
    body: vq.body,
    options: vq.options,
    correctAnswer: vq.correctAnswer,
    explanation: vq.explanation,
    isBlocking: vq.is_blocking,
    canSkipAfter: vq.can_skip_after,
    sortOrder: vq.sort_order,
    createdAt: vq.createdAt.toISOString(),
  };
}

export async function updateVideoQuestion(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint,
  questionId: bigint,
  input: z.infer<typeof import("@lms/shared/schemas").UpdateVideoQuestionSchema>
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const existing = await app.prisma.videoQuestion.findFirst({
    where: { id: questionId, lessonId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Video question not found");

  const vq = await app.prisma.videoQuestion.update({
    where: { id: questionId },
    data: {
      ...(input.timestampSeconds !== undefined ? { timestampSeconds: input.timestampSeconds } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.options !== undefined ? { options: input.options ?? null } : {}),
      ...(input.correctAnswer !== undefined ? { correctAnswer: input.correctAnswer ?? null } : {}),
      ...(input.explanation !== undefined ? { explanation: input.explanation ?? null } : {}),
      ...(input.isBlocking !== undefined ? { is_blocking: input.isBlocking } : {}),
      ...(input.canSkipAfter !== undefined ? { can_skip_after: input.canSkipAfter ?? null } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
    },
  });

  return {
    id: vq.id.toString(),
    lessonId: vq.lessonId.toString(),
    timestampSeconds: vq.timestampSeconds,
    type: vq.type,
    body: vq.body,
    options: vq.options,
    correctAnswer: vq.correctAnswer,
    explanation: vq.explanation,
    isBlocking: vq.is_blocking,
    canSkipAfter: vq.can_skip_after,
    sortOrder: vq.sort_order,
    createdAt: vq.createdAt.toISOString(),
  };
}

export async function deleteVideoQuestion(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint,
  questionId: bigint
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const existing = await app.prisma.videoQuestion.findFirst({
    where: { id: questionId, lessonId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Video question not found");
  
  await app.prisma.videoQuestion.delete({ where: { id: questionId } });
}

// ── Lesson Quiz (End-of-lesson Quiz) ───────────────────────────────────────────

export async function upsertLessonQuiz(
  app: FastifyInstance,
  tenantId: bigint,
  courseId: bigint,
  sectionId: bigint,
  lessonId: bigint,
  input: z.infer<typeof import("@lms/shared/schemas").UpsertLessonQuizSchema>
) {
  await assertSectionOwner(app, tenantId, courseId, sectionId);
  const existingLesson = await app.prisma.lesson.findFirst({
    where: { id: lessonId, sectionId },
    select: { id: true },
  });
  if (!existingLesson) throw new AppError(404, "NOT_FOUND", "Lesson not found");

  // Upsert the Quiz
  let quiz = await app.prisma.quiz.findFirst({
    where: { lessonId, course_id: courseId },
  });

  if (quiz) {
    quiz = await app.prisma.quiz.update({
      where: { id: quiz.id },
      data: {
        title: input.title,
        type: input.type,
        passingScore: input.passingScore,
        time_limit_seconds: input.timeLimitSeconds ?? null,
        maxAttempts: input.maxAttempts ?? null,
        shuffle_questions: input.shuffleQuestions,
      },
    });
  } else {
    quiz = await app.prisma.quiz.create({
      data: {
        course_id: courseId,
        lessonId,
        title: input.title,
        type: input.type,
        passingScore: input.passingScore,
        time_limit_seconds: input.timeLimitSeconds ?? null,
        maxAttempts: input.maxAttempts ?? null,
        shuffle_questions: input.shuffleQuestions,
      },
    });
  }

  // Process Questions
  if (input.questions && Array.isArray(input.questions)) {
    // get existing questions to map
    const existingQ = await app.prisma.question.findMany({
      where: { quizId: quiz.id },
    });
    
    const incomingIds = input.questions.map(q => q.id).filter(Boolean);
    
    // delete questions not in incoming
    await app.prisma.question.deleteMany({
      where: {
        quizId: quiz.id,
        ...(incomingIds.length > 0 ? { id: { notIn: incomingIds.map(i => BigInt(i!)) } } : {}),
      },
    });

    // create or update
    for (const q of input.questions) {
      if (q.id) {
        await app.prisma.question.update({
          where: { id: BigInt(q.id) },
          data: {
            type: q.type,
            body: q.body,
            options: q.options ?? null,
            correctAnswer: q.correctAnswer ?? null,
            points: q.points,
            sort_order: q.sortOrder,
            explanation: q.explanation ?? null,
          },
        });
      } else {
        await app.prisma.question.create({
          data: {
            quizId: quiz.id,
            type: q.type,
            body: q.body,
            options: q.options ?? null,
            correctAnswer: q.correctAnswer ?? null,
            points: q.points,
            sort_order: q.sortOrder,
            explanation: q.explanation ?? null,
          },
        });
      }
    }
  }

  return getLesson(app, tenantId, courseId, sectionId, lessonId);
}
