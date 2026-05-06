import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { CreateUserInput, UpdateUserInput } from "@lms/shared/schemas";
import { parsePagination } from "@lms/shared";
import { AppError } from "../plugins/error-handler.js";

const USER_SELECT = {
  id: true,
  email: true,
  full_name: true,
  avatar_url: true,
  locale: true,
  isActive: true,
  notificationPrefs: true,
  createdAt: true,
  userRoles: { select: { role: { select: { name: true } } } },
} as const;

function formatUser(
  u: {
    id: bigint;
    email: string;
    full_name: string;
    avatar_url: string | null;
    locale: string;
    isActive: boolean;
    notificationPrefs: unknown;
    createdAt: Date;
    userRoles: { role: { name: string } }[];
  }
) {
  return {
    id: u.id.toString(),
    email: u.email,
    fullName: u.full_name,
    avatarUrl: u.avatar_url,
    locale: u.locale,
    isActive: u.isActive,
    notificationPrefs: u.notificationPrefs ?? null,
    roles: u.userRoles.map((ur) => ur.role.name),
    createdAt: u.createdAt.toISOString(),
  };
}

export async function listUsers(
  app: FastifyInstance,
  tenantId: bigint,
  query: { page?: number | undefined; limit?: number | undefined; search?: string | undefined; isActive?: boolean | undefined }
) {
  const { page, limit, skip } = parsePagination(query);

  const where = {
    tenantId,
    deletedAt: null,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search } },
            { full_name: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    app.prisma.user.count({ where }),
    app.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: users.map(formatUser),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUserById(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint
) {
  const user = await app.prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: USER_SELECT,
  });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  return formatUser(user);
}

export async function createUser(
  app: FastifyInstance,
  tenantId: bigint,
  input: CreateUserInput
) {
  // ตรวจ roles ว่ามีอยู่และอยู่ใน tenant เดียวกัน
  const roleIds = input.roleIds.map((id) => BigInt(id));
  const roles = await app.prisma.role.findMany({
    where: { id: { in: roleIds }, tenant_id: tenantId },
    select: { id: true },
  });
  if (roles.length !== roleIds.length) {
    throw new AppError(400, "INVALID_ROLE", "One or more role IDs are invalid");
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await app.prisma.user.create({
    data: {
      tenantId,
      email: input.email,
      hashedPassword,
      full_name: input.fullName,
      locale: input.locale ?? "th",
      isActive: true,
      userRoles: {
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
    select: USER_SELECT,
  });

  return formatUser(user);
}

export async function updateUser(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint,
  input: UpdateUserInput
) {
  const existing = await app.prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "User not found");

  // Build update payload — avoid spread with optional undefined values (exactOptionalPropertyTypes)
  const data: Record<string, unknown> = {};
  if (input.fullName !== undefined) data["full_name"] = input.fullName;
  if (input.locale !== undefined) data["locale"] = input.locale;
  if (input.isActive !== undefined) data["isActive"] = input.isActive;
  if (input.avatarUrl !== undefined) data["avatar_url"] = input.avatarUrl;
  if (input.notificationPrefs !== undefined) data["notificationPrefs"] = input.notificationPrefs;

  const user = await app.prisma.user.update({
    where: { id: userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
    select: USER_SELECT,
  });

  return formatUser(user);
}

export async function deleteUser(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint
) {
  const existing = await app.prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "User not found");

  const now = new Date();

  // soft delete cascade: user + enrollments (business rule #7)
  // ห้ามแตะ audit_logs, certificates, quiz_attempts
  await app.prisma.$transaction([
    app.prisma.enrollment.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: now },
    }),
    app.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: now },
    }),
  ]);
}
