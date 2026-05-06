export interface SessionUser {
  sub: string;
  tenantId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string | null;
  roles: string[];
  exp: number;
}

export function hasRole(user: SessionUser | null, ...roles: string[]): boolean {
  return roles.some((r) => user?.roles.includes(r)) ?? false;
}
