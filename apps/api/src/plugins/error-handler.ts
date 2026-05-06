import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@lms/db";
import { ERROR_CODES } from "@lms/shared";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly field: string | null = null
  ) {
    super(message);
    this.name = "AppError";
  }
}

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    // Zod validation error — ใช้ name check แทน instanceof เพื่อรองรับ cross-package zod
    if (error instanceof ZodError || error.name === "ZodError") {
      const zodErr = error as unknown as ZodError;
      const first = zodErr.errors?.[0];
      return reply.status(400).send({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: first?.message ?? "Validation error",
          field: first?.path.join(".") ?? null,
          request_id: request.id,
        },
      });
    }

    // Application error (thrown intentionally by services)
    if (error instanceof AppError || error.name === "AppError") {
      const appErr = error as AppError;
      return reply.status(appErr.statusCode).send({
        error: {
          code: appErr.code,
          message: appErr.message,
          field: appErr.field,
          request_id: request.id,
        },
      });
    }

    // Prisma unique constraint
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const meta = error.meta as Record<string, unknown> | undefined;
        const field =
          (meta?.["target"] as string[] | undefined)?.[0] ?? null;
        return reply.status(409).send({
          error: {
            code: "DUPLICATE_ENTRY",
            message: "A record with this value already exists",
            field,
            request_id: request.id,
          },
        });
      }

      if (error.code === "P2025") {
        return reply.status(404).send({
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: "Record not found",
            field: null,
            request_id: request.id,
          },
        });
      }
    }

    // Fastify validation (JSON schema)
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: error.message,
          field: null,
          request_id: request.id,
        },
      });
    }

    // JWT errors
    if (error.statusCode === 401) {
      return reply.status(401).send({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Unauthorized",
          field: null,
          request_id: request.id,
        },
      });
    }

    // Unhandled — log and return 500
    app.log.error({ err: error, requestId: request.id }, "Unhandled error");
    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        field: null,
        request_id: request.id,
      },
    });
  });
});
