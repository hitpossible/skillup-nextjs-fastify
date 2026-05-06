import { z } from "zod";

export const CourseStatusSchema = z.enum(["draft", "published", "archived"]);

export const CreateCourseSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  language: z.string().max(10).default("th"),
  durationMinutes: z.number().int().positive().optional(),
  instructorId: z.string().optional().nullable(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const CreateSectionSchema = z.object({
  title: z.string().min(1).max(500),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateSectionSchema = CreateSectionSchema.partial();

export const LessonTypeSchema = z.enum(["video", "text", "quiz"]);

export const SeekModeSchema = z.enum(["free", "locked"]);

export const CreateLessonSchema = z.object({
  title: z.string().min(1).max(500),
  type: LessonTypeSchema,
  contentUrl: z.string().optional().nullable(),
  durationSeconds: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isFreePreview: z.boolean().default(false),
  seekMode: SeekModeSchema.default("free"),
  attachments: z.any().optional().nullable(),
});

export const UpdateLessonSchema = CreateLessonSchema.partial();

export const CreateVideoQuestionSchema = z.object({
  timestampSeconds: z.number().int().min(0),
  type: z.enum(["multiple_choice", "true_false", "short_answer"]),
  body: z.string().min(1),
  options: z.any().optional(), // Can be array of strings or objects
  correctAnswer: z.any().optional(),
  explanation: z.string().optional().nullable(),
  isBlocking: z.boolean().default(true),
  canSkipAfter: z.number().int().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const UpdateVideoQuestionSchema = CreateVideoQuestionSchema.partial();

export const VideoQuestionResponseSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  timestampSeconds: z.number(),
  type: z.string(),
  body: z.string(),
  options: z.any().nullable(),
  correctAnswer: z.any().nullable(),
  explanation: z.string().nullable(),
  isBlocking: z.boolean(),
  canSkipAfter: z.number().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

export const QuestionSchema = z.object({
  id: z.string().optional(),
  type: z.string().default("multiple_choice"),
  body: z.string(),
  options: z.any().optional(),
  correctAnswer: z.any().optional(),
  points: z.number().int().default(1),
  sortOrder: z.number().int().default(0),
  explanation: z.string().optional().nullable(),
});

export const UpsertLessonQuizSchema = z.object({
  title: z.string(),
  type: z.string().default("graded"),
  passingScore: z.number().int().min(0).max(100).default(60),
  timeLimitSeconds: z.number().int().nullable().optional(),
  maxAttempts: z.number().int().nullable().optional(),
  shuffleQuestions: z.boolean().default(false),
  questions: z.array(QuestionSchema).optional(),
});

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
  attachments: z.any().nullable(),
  videoQuestions: z.array(VideoQuestionResponseSchema).optional(),
  quizzes: z.array(z.any()).optional(),
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
  instructor: z.object({
    id: z.string(),
    fullName: z.string(),
    avatarUrl: z.string().nullable(),
  }).optional(),
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
