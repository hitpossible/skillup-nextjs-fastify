"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth-shared";

interface AuthContextValue {
  user: SessionUser | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null });

export function AuthProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
