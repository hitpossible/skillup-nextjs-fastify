import type { JwtPayload, JwtSignPayload } from "@lms/shared";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtSignPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    tenantId: bigint;
    userId: bigint;
  }
}
