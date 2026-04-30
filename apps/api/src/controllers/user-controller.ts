import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CreateUserSchema, UpdateUserSchema } from "@lms/shared/schemas";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../services/user-service.js";

const IdParamSchema = z.object({ id: z.string().min(1) });

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export async function listUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = ListQuerySchema.parse(request.query);
  const result = await listUsers(request.server, request.tenantId, query);
  return reply.status(200).send(result);
}

export async function getUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = IdParamSchema.parse(request.params);
  const user = await getUserById(request.server, request.tenantId, BigInt(id));
  return reply.status(200).send(user);
}

export async function createUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = CreateUserSchema.parse(request.body);
  const user = await createUser(request.server, request.tenantId, body);
  return reply.status(201).send(user);
}

export async function updateUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = IdParamSchema.parse(request.params);
  const body = UpdateUserSchema.parse(request.body);
  const user = await updateUser(
    request.server,
    request.tenantId,
    BigInt(id),
    body
  );
  return reply.status(200).send(user);
}

export async function deleteUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = IdParamSchema.parse(request.params);
  await deleteUser(request.server, request.tenantId, BigInt(id));
  return reply.status(204).send();
}
