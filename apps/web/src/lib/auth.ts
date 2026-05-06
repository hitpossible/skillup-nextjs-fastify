import { cookies } from "next/headers";
import { apiFetch } from "./api";

const ACCESS_TOKEN = "access_token";
const REFRESH_TOKEN = "refresh_token";
const TENANT_SLUG = process.env["TENANT_SLUG"] ?? "demo";

import { SessionUser, hasRole } from "./auth-shared";

export { type SessionUser, hasRole };

function decodePayload(token: string): SessionUser | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN)?.value;
  if (!token) return null;
  const user = decodePayload(token);
  if (!user || user.exp * 1000 < Date.now()) return null;
  return user;
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN)?.value ?? null;
}

// hasRole moved to auth-shared.ts

export async function setSession(accessToken: string, refreshToken: string) {
  const user = decodePayload(accessToken);
  const maxAge = user ? Math.max(0, user.exp - Math.floor(Date.now() / 1000)) : 3600;
  const store = await cookies();
  store.set(ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  store.set(REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN);
  store.delete(REFRESH_TOKEN);
}

export async function loginAction(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ tenantSlug: TENANT_SLUG, email, password }),
  });
  await setSession(data.accessToken, data.refreshToken);
}

export async function logoutAction() {
  const token = await getAccessToken();
  if (token) {
    try {
      await apiFetch("/auth/logout", { method: "DELETE", token });
    } catch {}
  }
  await clearSession();
}
