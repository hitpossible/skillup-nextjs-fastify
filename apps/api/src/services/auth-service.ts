import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";
import type { JwtSignPayload } from "@lms/shared";
import { AppError } from "../plugins/error-handler.js";

const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_TTL = "30d";

const AD_SERVICE_URL = process.env["AD_SERVICE_URL"] ?? "http://192.168.161.102:9999";

interface AdLoginSuccess {
  message: string;
  passwordStatus: { isExpired: boolean; daysLeft: number; expiryDate: string; warning: string | null };
  user: {
    username: string;
    email: string;
    displayName: string;
    position: string;
    department: string;
    employeeID: string;
  };
}

interface AdLoginFail {
  status: string;
  message: string;
}

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
  username: string,
  password: string
): Promise<{ tokens: TokenPair; user: AuthUser }> {
  // tenant lookup ก่อน — ห้ามรับ tenant_id จาก body (CLAUDE.md)
  const tenant = await app.prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }

  // ยืนยันตัวตนผ่าน AD service
  let adUser: AdLoginSuccess["user"];
  try {
    const res = await fetch(`${AD_SERVICE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as AdLoginFail;
      if (body.status === "INVALID_CREDENTIALS") {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
      }
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }

    const body = await res.json() as AdLoginSuccess;
    adUser = body.user;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(503, "AD_SERVICE_UNAVAILABLE", "Authentication service unavailable");
  }

  const email = adUser.email.toLowerCase();

  // หา user ใน DB — ถ้าไม่มีให้ auto-provision เป็น learner
  let dbUser = await app.prisma.user.findFirst({
    where: { tenantId: tenant.id, email, deletedAt: null },
    include: { userRoles: { include: { role: { select: { name: true } } } } },
  });

  if (!dbUser) {
    const learnerRole = await app.prisma.role.findFirst({
      where: { tenant_id: tenant.id, name: "admin" },
      select: { id: true },
    });
    if (!learnerRole) {
      throw new AppError(500, "ROLE_NOT_FOUND", "Default learner role is not configured for this tenant");
    }

    dbUser = await app.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        full_name: adUser.displayName,
        hashedPassword: null,
        isActive: true,
        userRoles: { create: [{ roleId: learnerRole.id }] },
      },
      include: { userRoles: { include: { role: { select: { name: true } } } } },
    });
  }

  if (!dbUser.isActive) {
    throw new AppError(401, "ACCOUNT_DISABLED", "Your account has been disabled");
  }

  await app.prisma.user.update({
    where: { id: dbUser.id },
    data: { last_login_at: new Date() },
  });

  const roles = dbUser.userRoles.map((ur) => ur.role.name);
  const basePayload: JwtSignPayload = {
    sub: dbUser.id.toString(),
    tenantId: tenant.id.toString(),
    email: dbUser.email,
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
      id: dbUser.id.toString(),
      email: dbUser.email,
      fullName: dbUser.full_name,
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
