import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { LoginSchema, RefreshTokenSchema } from "@lms/shared/schemas";
import { login, refresh } from "../services/auth-service.js";

const LoginBodySchema = LoginSchema.extend({
  tenantSlug: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/login
  app.post("/login", async (request, reply) => {
    const body = LoginBodySchema.parse(request.body);
    const result = await login(app, body.tenantSlug, body.email, body.password);
    return reply.status(200).send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
    });
  });

  // POST /api/v1/auth/refresh
  app.post("/refresh", async (request, reply) => {
    const { refreshToken } = RefreshTokenSchema.parse(request.body);
    const tokens = await refresh(app, refreshToken);
    return reply.status(200).send(tokens);
  });

  // DELETE /api/v1/auth/logout
  // stateless JWT — client ลบ token เอง
  // TODO: เพิ่ม Redis blacklist ถ้าต้องการ revoke ทันที
  app.delete("/logout", async (_request, reply) => {
    return reply.status(204).send();
  });
}
