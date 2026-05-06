import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { getSession, getAccessToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkillUp — LMS Platform",
  description: "ระบบจัดการการเรียนรู้สำหรับองค์กร",
  icons: {
    icon: "/logos/skillup-logo-minimal.png",
  },
};

export default async function RootLayout({ 
  children,
  params: { locale },
}: { 
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getSession();
  const token = await getAccessToken();
  let user = session;

  if (session?.sub && token) {
    try {
      // Fetch fresh user data to ensure avatar/fullName are up to date
      const freshUser = await apiFetch<any>(`/users/${session.sub}`, {
        token,
        cache: "no-store",
      });
      if (freshUser) {
        user = { ...session, ...freshUser };
      }
    } catch {
      // Fallback to session data if API fails
    }
  }

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <AuthProvider user={user as any}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
