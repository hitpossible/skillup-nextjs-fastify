import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { RATE_LIMIT } from "@lms/shared";

import prismaPlugin from "./plugins/prisma.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import requestIdPlugin from "./plugins/request-id.js";

import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { courseRoutes } from "./routes/courses.js";
import { enrollmentRoutes } from "./routes/enrollments.js";
import { certificateRoutes } from "./routes/certificates.js";
import { quizRoutes } from "./routes/quizzes.js";
import { quizAttemptRoutes } from "./routes/quiz-attempts.js";
import { videoQuestionRoutes } from "./routes/video-questions.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { adminRoutes } from "./routes/admin.js";
import { notificationRoutes } from "./routes/notifications.js";
import { uploadRoutes } from "./routes/upload.js";

const PUBLIC_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/upload/avatar",
  "/api/v1/upload/course-thumbnails",
  "/api/v1/users",
]);

const PUBLIC_PATTERNS = [/^\/api\/v1\/certificates\/verify\//];

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  if (path.startsWith("/public/")) return true;
  return PUBLIC_PATTERNS.some((re) => re.test(path));
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "production" ? "warn" : "info",
    },
    // Fastify genReqId — ใช้ requestIdPlugin แทน
    genReqId: () => `req_${Math.random().toString(36).slice(2, 14)}`,
  });

  // ── Core plugins (ลำดับสำคัญ) ───────────────────────────────────────────
  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);

  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB
  await app.register(staticFiles, {
    root: join(dirname(fileURLToPath(import.meta.url)), "../public"),
    prefix: "/public/",
  });
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
    credentials: true,
  });
  await app.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "dev_secret_change_in_prod_32chars!",
  });
  await app.register(rateLimit, {
    max: RATE_LIMIT.API_MAX,
    timeWindow: RATE_LIMIT.API_WINDOW_MS,
    keyGenerator: (req) =>
      (req.user?.sub as string | undefined) ?? req.ip ?? "unknown",
  });

  // ── Auth hook — ทุก request ยกเว้น public paths ──────────────────────────
  app.addHook("onRequest", async (request, reply) => {
    if (isPublicPath(request.url.split("?")[0] ?? "")) return;

    try {
      await request.jwtVerify();
      request.userId = BigInt(request.user.sub);
      request.tenantId = BigInt(request.user.tenantId);
    } catch {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid token",
          field: null,
          request_id: request.id,
        },
      });
    }
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(courseRoutes, { prefix: "/api/v1/courses" });
  await app.register(enrollmentRoutes, { prefix: "/api/v1/enrollments" });
  await app.register(certificateRoutes, { prefix: "/api/v1/certificates" });
  await app.register(quizRoutes, { prefix: "/api/v1/quizzes" });
  await app.register(quizAttemptRoutes, { prefix: "/api/v1/quiz-attempts" });
  await app.register(videoQuestionRoutes, { prefix: "/api/v1/lessons" });
  await app.register(analyticsRoutes, { prefix: "/api/v1/analytics" });
  await app.register(adminRoutes);
  await app.register(notificationRoutes, { prefix: "/api/v1/notifications" });
  await app.register(uploadRoutes, { prefix: "/api/v1/upload" });

  app.get("/healthz", async () => ({ status: "ok" }));

  return app;
}
