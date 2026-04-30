import { z } from "zod";

export const CourseStatusSchema = z.enum(["draft", "published", "archived"]);

export const CreateCourseSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  language: z.string().max(10).default("th"),
  durationMinutes: z.number().int().positive().optional(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const CreateSectionSchema = z.object({
  title: z.string().min(1).max(500),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateSectionSchema = CreateSectionSchema.partial();

export const LessonTypeSchema = z.enum(["video", "text", "quiz"]);

export const CreateLessonSchema = z.object({
  title: z.string().min(1).max(500),
  type: LessonTypeSchema,
  contentUrl: z.string().url().optional().nullable(),
  durationSeconds: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isFreePreview: z.boolean().default(false),
});

export const UpdateLessonSchema = CreateLessonSchema.partial();

export const LessonResponseSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  title: z.string(),
  type: LessonTypeSchema,
  contentUrl: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  sortOrder: z.number(),
  isFreePreview: z.boolean(),
  hasIvQuestions: z.boolean(),
});

export const SectionResponseSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  sortOrder: z.number(),
  lessons: z.array(LessonResponseSchema).optional(),
});

export const CourseResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  status: CourseStatusSchema,
  language: z.string(),
  durationMinutes: z.number().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  sections: z.array(SectionResponseSchema).optional(),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;
export type CourseStatus = z.infer<typeof CourseStatusSchema>;
export type LessonType = z.infer<typeof LessonTypeSchema>;
export type CourseResponse = z.infer<typeof CourseResponseSchema>;
export type LessonResponse = z.infer<typeof LessonResponseSchema>;
