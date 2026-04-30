import { z } from "zod";

export const EnrollmentStatusSchema = z.enum([
  "active",
  "completed",
  "expired",
  "suspended",
]);

export const CreateEnrollmentSchema = z.object({
  courseId: z.string().min(1),
  source: z.enum(["organic", "assigned", "coupon"]).default("organic"),
  couponCode: z.string().max(100).optional(),
});

export const UpdateProgressSchema = z.object({
  lessonId: z.string().min(1),
  watchSeconds: z.number().int().min(0).optional(),
  status: z.enum(["in_progress", "completed"]),
});

export const EnrollmentResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  courseId: z.string(),
  status: EnrollmentStatusSchema,
  progressPercent: z.number(),
  enrolledAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  course: z
    .object({
      id: z.string(),
      title: z.string(),
      thumbnailUrl: z.string().nullable(),
    })
    .optional(),
});

export const CertificateResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  courseId: z.string(),
  certificateNumber: z.string(),
  pdfUrl: z.string().nullable(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  course: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .optional(),
});

export type CreateEnrollmentInput = z.infer<typeof CreateEnrollmentSchema>;
export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;
export type EnrollmentResponse = z.infer<typeof EnrollmentResponseSchema>;
export type CertificateResponse = z.infer<typeof CertificateResponseSchema>;
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;
