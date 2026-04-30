import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  const { sub, tenantId } = request.user;
  request.userId = BigInt(sub);
  request.tenantId = BigInt(tenantId);
  done();
}
