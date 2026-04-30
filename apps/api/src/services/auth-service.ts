import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";
import type { JwtSignPayload } from "@lms/shared";
import { AppError } from "../plugins/error-handler.js";

const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_TTL = "30d";

function getRefreshSecret(): string {
  return process.env["JWT_REFRESH_SECRET"] ?? "dev_refresh_secret_change_32chars!";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  roles: string[];
}

export async function login(
  app: FastifyInstance,
  tenantSlug: string,
  email: string,
  password: string
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  // tenant lookup ก่อน — ห้ามรับ tenant_id จาก body (CLAUDE.md)
  const tenant = await app.prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const user = await app.prisma.user.findFirst({
    where: { tenantId: tenant.id, email, isActive: true, deletedAt: null },
    include: { userRoles: { include: { role: { select: { name: true } } } } },
  });

  if (!user?.hashedPassword) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  await app.prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  const roles = user.userRoles.map((ur) => ur.role.name);
  const basePayload: JwtSignPayload = {
    sub: user.id.toString(),
    tenantId: tenant.id.toString(),
    email: user.email,
    roles,
    type: "access",
  };

  const accessToken = app.jwt.sign(basePayload, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign(
    { ...basePayload, type: "refresh" },
    getRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  return {
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id.toString(),
      email: user.email,
      fullName: user.full_name,
      tenantId: tenant.id.toString(),
      roles,
    },
  };
}

export async function refresh(
  app: FastifyInstance,
  refreshToken: string
): Promise<TokenPair> {
  let payload: JwtSignPayload & { iat?: number; exp?: number };

  try {
    payload = jwt.verify(refreshToken, getRefreshSecret()) as typeof payload;
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  if (payload.type !== "refresh") {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  // ตรวจว่า user ยังมีอยู่และ active
  const user = await app.prisma.user.findFirst({
    where: {
      id: BigInt(payload.sub),
      tenantId: BigInt(payload.tenantId),
      isActive: true,
      deletedAt: null,
    },
    include: { userRoles: { include: { role: { select: { name: true } } } } },
  });

  if (!user) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  const newPayload: JwtSignPayload = {
    sub: user.id.toString(),
    tenantId: payload.tenantId,
    email: user.email,
    roles,
    type: "access",
  };

  const accessToken = app.jwt.sign(newPayload, { expiresIn: ACCESS_TOKEN_TTL });
  const newRefreshToken = jwt.sign(
    { ...newPayload, type: "refresh" },
    getRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  return { accessToken, refreshToken: newRefreshToken };
}
