import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CreateEnrollmentSchema, UpdateProgressSchema } from "@lms/shared/schemas";
import {
  createEnrollment,
  adminCreateEnrollment,
  listAllEnrollments,
  adminUpdateEnrollment,
  adminRevokeEnrollment,
  listUserEnrollments,
  updateProgress,
} from "../services/enrollment-service.js";
import { listCertificates } from "../services/certificate-service.js";

const IdParam = z.object({ id: z.string().min(1) });
const UserIdParam = z.object({ id: z.string().min(1) });
const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(["active", "completed", "expired", "suspended"]).optional(),
});

export async function createEnrollmentHandler(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateEnrollmentSchema.parse(req.body);
  const enrollment = await createEnrollment(req.server, req.tenantId, req.userId, body);
  return reply.status(201).send(enrollment);
}

export async function listAllEnrollmentsHandler(req: FastifyRequest, reply: FastifyReply) {
  const query = z.object({
    page:     z.coerce.number().int().positive().optional(),
    limit:    z.coerce.number().int().positive().optional(),
    status:   z.enum(["active", "completed", "expired", "suspended"]).optional(),
    courseId: z.string().optional(),
    search:   z.string().optional(),
  }).parse(req.query);
  const result = await listAllEnrollments(req.server, req.tenantId, query);
  return reply.status(200).send(result);
}

export async function adminUpdateEnrollmentHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const body = z.object({
    status:    z.enum(["active", "completed", "expired", "suspended"]).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  }).parse(req.body);
  const enrollment = await adminUpdateEnrollment(req.server, req.tenantId, BigInt(id), body);
  return reply.status(200).send(enrollment);
}

export async function adminRevokeEnrollmentHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  await adminRevokeEnrollment(req.server, req.tenantId, BigInt(id));
  return reply.status(204).send();
}

export async function adminEnrollHandler(req: FastifyRequest, reply: FastifyReply) {
  const body = z.object({
    userId: z.string().min(1),
    courseId: z.string().min(1),
    expiresAt: z.string().datetime().optional().nullable(),
  }).parse(req.body);
  const enrollment = await adminCreateEnrollment(req.server, req.tenantId, body);
  return reply.status(201).send(enrollment);
}

export async function updateProgressHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = IdParam.parse(req.params);
  const body = UpdateProgressSchema.parse(req.body);
  const enrollment = await updateProgress(req.server, req.tenantId, req.userId, BigInt(id), body);
  return reply.status(200).send(enrollment);
}

export async function getMyEnrollmentForCourseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId } = z.object({ courseId: z.string().min(1) }).parse(req.query);
  const enrollment = await req.server.prisma.enrollment.findFirst({
    where: { userId: req.userId, courseId: BigInt(courseId), deletedAt: null },
    select: {
      id: true, userId: true, courseId: true, status: true,
      progressPercent: true, enrolled_at: true, completedAt: true, expiresAt: true,
    },
  });
  if (!enrollment) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Enrollment not found" } });
  return reply.status(200).send({
    id: enrollment.id.toString(),
    userId: enrollment.userId.toString(),
    courseId: enrollment.courseId.toString(),
    status: enrollment.status,
    progressPercent: enrollment.progressPercent?.toNumber() ?? 0,
    enrolledAt: enrollment.enrolled_at.toISOString(),
    completedAt: enrollment.completedAt?.toISOString() ?? null,
  });
}

export async function getMyLessonProgressHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId } = z.object({ courseId: z.string().min(1) }).parse(req.query);
  const progressList = await req.server.prisma.lessonProgress.findMany({
    where: {
      userId: req.userId,
      lesson: { section: { courseId: BigInt(courseId) } },
    },
    select: { lessonId: true, status: true, watch_seconds: true, completedAt: true },
  });
  return reply.status(200).send(progressList.map(p => ({
    lessonId: p.lessonId.toString(),
    status: p.status,
    watchSeconds: p.watch_seconds,
    completedAt: p.completedAt?.toISOString() ?? null,
  })));
}

export async function listUserEnrollmentsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = UserIdParam.parse(req.params);
  const query = ListQuerySchema.parse(req.query);
  const result = await listUserEnrollments(req.server, req.tenantId, BigInt(id), query);
  return reply.status(200).send(result);
}

export async function listUserCertificatesHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = UserIdParam.parse(req.params);
  const certs = await listCertificates(req.server, req.tenantId, BigInt(id));
  return reply.status(200).send(certs);
}
