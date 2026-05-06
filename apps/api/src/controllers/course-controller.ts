import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateLessonSchema,
  UpdateLessonSchema,
} from "@lms/shared/schemas";
import {
  listCourses,
  getCourseById,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createCourse,
  updateCourse,
  publishCourse,
  unpublishCourse,
  deleteCourse,
  listSections,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  getLesson,
  createVideoQuestion,
  updateVideoQuestion,
  deleteVideoQuestion,
} from "../services/course-service.js";

const IdParam = z.object({ id: z.string().min(1) });
const CourseIdParam = z.object({ courseId: z.string().min(1) });
const SectionIdParam = z.object({ courseId: z.string().min(1), sectionId: z.string().min(1) });
const LessonIdParam = z.object({ courseId: z.string().min(1), sectionId: z.string().min(1), lessonId: z.string().min(1) });

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  search: z.string().optional(),
});

// ── Course handlers ───────────────────────────────────────────────────────────

export async function listCoursesHandler(req: FastifyRequest, reply: FastifyReply) {
  const query = ListQuerySchema.parse(req.query);
  const result = await listCourses(req.server, req.tenantId, query);
  return reply.status(200).send(result);
}

export async function listCategoriesHandler(req: FastifyRequest, reply: FastifyReply) {
  const categories = await listCategories(req.server, req.tenantId);
  return reply.status(200).send(categories);
}

const CategoryBodySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
});
const CategoryIdParam = z.object({ categoryId: z.string().min(1) });

export async function createCategoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const body = CategoryBodySchema.parse(req.body);
  const category = await createCategory(req.server, req.tenantId, body);
  return reply.status(201).send(category);
}

export async function updateCategoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { categoryId } = CategoryIdParam.parse(req.params);
  const body = CategoryBodySchema.partial().parse(req.body);
  const category = await updateCategory(req.server, req.tenantId, BigInt(categoryId), body);
  return reply.status(200).send(category);
}

export async function deleteCategoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { categoryId } = CategoryIdParam.parse(req.params);
  await deleteCategory(req.server, req.tenantId, BigInt(categoryId));
  return reply.status(204).send();
}

export async function getCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const course = await getCourseById(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(course);
}

export async function createCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateCourseSchema.parse(req.body);
  const course = await createCourse(req.server, req.tenantId, req.userId, body);
  return reply.status(201).send(course);
}

export async function updateCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const body = UpdateCourseSchema.parse(req.body);
  const course = await updateCourse(req.server, req.tenantId, BigInt(id), body);
  return reply.status(200).send(course);
}

export async function publishCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const course = await publishCourse(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(course);
}

export async function unpublishCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const course = await unpublishCourse(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(course);
}

export async function deleteCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  await deleteCourse(req.server, req.tenantId, BigInt(id));
  return reply.status(204).send();
}

// ── Section handlers ──────────────────────────────────────────────────────────

export async function listSectionsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId } = CourseIdParam.parse(req.params);
  const sections = await listSections(req.server, req.tenantId, BigInt(courseId));
  return reply.status(200).send(sections);
}

export async function createSectionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId } = CourseIdParam.parse(req.params);
  const body = CreateSectionSchema.parse(req.body);
  const section = await createSection(req.server, req.tenantId, BigInt(courseId), body);
  return reply.status(201).send(section);
}

export async function updateSectionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId } = SectionIdParam.parse(req.params);
  const body = UpdateSectionSchema.parse(req.body);
  const section = await updateSection(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), body);
  return reply.status(200).send(section);
}

export async function deleteSectionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId } = SectionIdParam.parse(req.params);
  await deleteSection(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId));
  return reply.status(204).send();
}

// ── Lesson handlers ───────────────────────────────────────────────────────────

export async function createLessonHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId } = SectionIdParam.parse(req.params);
  const body = CreateLessonSchema.parse(req.body);
  const lesson = await createLesson(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), body);
  return reply.status(201).send(lesson);
}

export async function updateLessonHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId } = LessonIdParam.parse(req.params);
  const body = UpdateLessonSchema.parse(req.body);
  const lesson = await updateLesson(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId), body);
  return reply.status(200).send(lesson);
}

export async function deleteLessonHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId } = LessonIdParam.parse(req.params);
  await deleteLesson(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId));
  return reply.status(204).send();
}

export async function getLessonHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId } = LessonIdParam.parse(req.params);
  const lesson = await getLesson(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId));
  return reply.status(200).send(lesson);
}

// ── Video Question handlers ───────────────────────────────────────────────────

const VideoQuestionIdParam = z.object({
  courseId: z.string().min(1),
  sectionId: z.string().min(1),
  lessonId: z.string().min(1),
  questionId: z.string().min(1),
});

export async function createVideoQuestionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId } = LessonIdParam.parse(req.params);
  const { CreateVideoQuestionSchema } = await import("@lms/shared/schemas");
  const body = CreateVideoQuestionSchema.parse(req.body);
  const vq = await createVideoQuestion(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId), body);
  return reply.status(201).send(vq);
}

export async function updateVideoQuestionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId, questionId } = VideoQuestionIdParam.parse(req.params);
  const { UpdateVideoQuestionSchema } = await import("@lms/shared/schemas");
  const body = UpdateVideoQuestionSchema.parse(req.body);
  const vq = await updateVideoQuestion(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId), BigInt(questionId), body);
  return reply.status(200).send(vq);
}

export async function deleteVideoQuestionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId, questionId } = VideoQuestionIdParam.parse(req.params);
  await deleteVideoQuestion(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId), BigInt(questionId));
  return reply.status(204).send();
}

export async function upsertLessonQuizHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId, sectionId, lessonId } = LessonIdParam.parse(req.params);
  const { UpsertLessonQuizSchema } = await import("@lms/shared/schemas");
  const body = UpsertLessonQuizSchema.parse(req.body);
  const { upsertLessonQuiz } = await import("../services/course-service.js");
  const lesson = await upsertLessonQuiz(req.server, req.tenantId, BigInt(courseId), BigInt(sectionId), BigInt(lessonId), body);
  return reply.status(200).send(lesson);
}
