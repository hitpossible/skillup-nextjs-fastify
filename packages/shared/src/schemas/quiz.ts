import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "single_choice",
  "multiple_choice",
  "true_false",
]);

// ── Quiz ─────────────────────────────────────────────────────────────────────

export const QuizResponseSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  lessonId: z.string().nullable(),
  title: z.string(),
  type: z.enum(["graded", "practice"]),
  passingScore: z.number(),
  maxAttempts: z.number().nullable(),
  timeLimitSeconds: z.number().nullable(),
  shuffleQuestions: z.boolean(),
  attemptsUsed: z.number(),
});

// ── Questions (ไม่ส่ง correctAnswer ถึง client ก่อน submit) ─────────────────

export const QuestionClientSchema = z.object({
  id: z.string(),
  type: QuestionTypeSchema,
  body: z.string(),
  options: z.array(z.string()).nullable(),
  points: z.number(),
  sortOrder: z.number(),
});

// ── Attempt ──────────────────────────────────────────────────────────────────

export const StartAttemptResponseSchema = z.object({
  attemptId: z.string(),
  attemptNumber: z.number(),
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  questions: z.array(QuestionClientSchema),
});

// ── Submit ───────────────────────────────────────────────────────────────────

export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1),
  // รองรับทั้ง single (string) และ multiple (array)
  response: z.union([z.string(), z.array(z.string())]),
});

export const SubmitAttemptSchema = z.object({
  answers: z.array(SubmitAnswerSchema).min(1),
});

export const AttemptResultSchema = z.object({
  attemptId: z.string(),
  attemptNumber: z.number(),
  score: z.number(),
  passingScore: z.number(),
  passed: z.boolean(),
  submittedAt: z.string().datetime(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      isCorrect: z.boolean(),
      score: z.number(),
      correctAnswer: z.union([z.string(), z.array(z.string())]),
      explanation: z.string().nullable(),
    })
  ),
});

// ── Video Questions ───────────────────────────────────────────────────────────

export const VideoQuestionClientSchema = z.object({
  id: z.string(),
  timestampSeconds: z.number(),
  type: QuestionTypeSchema,
  body: z.string(),
  options: z.array(z.string()).nullable(),
  isBlocking: z.boolean(),
  canSkipAfter: z.number().nullable(),
  sortOrder: z.number(),
});

export const SubmitVideoResponseSchema = z.object({
  videoQuestionId: z.string().min(1),
  response: z.union([z.string(), z.array(z.string())]),
});

export const VideoResponseResultSchema = z.object({
  isCorrect: z.boolean(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().nullable(),
});

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type QuizResponse = z.infer<typeof QuizResponseSchema>;
export type QuestionClient = z.infer<typeof QuestionClientSchema>;
export type StartAttemptResponse = z.infer<typeof StartAttemptResponseSchema>;
export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
export type AttemptResult = z.infer<typeof AttemptResultSchema>;
export type VideoQuestionClient = z.infer<typeof VideoQuestionClientSchema>;
export type SubmitVideoResponseInput = z.infer<typeof SubmitVideoResponseSchema>;
export type VideoResponseResult = z.infer<typeof VideoResponseResultSchema>;
