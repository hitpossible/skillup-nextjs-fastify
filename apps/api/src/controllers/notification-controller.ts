import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification-service.js";

const IdParamSchema = z.object({ id: z.string().min(1) });

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export async function listNotificationsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = ListQuerySchema.parse(request.query);
  const result = await listNotifications(request.server, request.userId, query);
  return reply.status(200).send(result);
}

export async function markReadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = IdParamSchema.parse(request.params);
  const result = await markNotificationRead(
    request.server,
    request.userId,
    BigInt(id)
  );
  if (!result) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Notification not found", field: null, request_id: request.id } });
  return reply.status(200).send(result);
}

export async function markAllReadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = await markAllNotificationsRead(request.server, request.userId);
  return reply.status(200).send(result);
}
