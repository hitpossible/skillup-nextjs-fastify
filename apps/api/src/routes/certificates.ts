import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyCertificate } from "../services/certificate-service.js";
import { AppError } from "../plugins/error-handler.js";

export async function certificateRoutes(app: FastifyInstance) {
  // public endpoint — ไม่ต้องการ token (CLAUDE.md)
  app.get("/verify/:number", async (request, reply) => {
    const { number } = z.object({ number: z.string().min(1) }).parse(request.params);
    const result = await verifyCertificate(app, number);
    if (!result) throw new AppError(404, "NOT_FOUND", "Certificate not found");
    return reply.status(200).send(result);
  });
}
