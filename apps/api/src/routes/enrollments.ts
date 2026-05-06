import type { FastifyInstance } from "fastify";
import {
  createEnrollmentHandler,
  adminEnrollHandler,
  listAllEnrollmentsHandler,
  adminUpdateEnrollmentHandler,
  adminRevokeEnrollmentHandler,
  updateProgressHandler,
  getMyEnrollmentForCourseHandler,
  getMyLessonProgressHandler,
} from "../controllers/enrollment-controller.js";

export async function enrollmentRoutes(app: FastifyInstance) {
  app.post("/", createEnrollmentHandler);
  app.post("/admin", adminEnrollHandler);
  app.get("/admin", listAllEnrollmentsHandler);
  app.patch("/:id/admin", adminUpdateEnrollmentHandler);
  app.delete("/:id/admin", adminRevokeEnrollmentHandler);
  app.patch("/:id/progress", updateProgressHandler);
  // GET /enrollments/my?courseId=xxx  → ดึง enrollment ของ user ที่ login
  app.get("/my", getMyEnrollmentForCourseHandler);
  // GET /enrollments/my/progress?courseId=xxx → ดึง lesson progress ทั้งหมด
  app.get("/my/progress", getMyLessonProgressHandler);
}
