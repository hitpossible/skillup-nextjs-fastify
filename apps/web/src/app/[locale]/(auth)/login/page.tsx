import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/lib/i18n-config";

export const metadata = { title: "เข้าสู่ระบบ — SkillUp" };

export default async function LoginPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(`/${locale}/dashboard`);

  const { error } = await searchParams;
  const dict = await getDictionary(locale);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-white p-6 md:p-10 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[20%] left-[-5%] w-[400px] h-[400px] bg-red-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="flex w-full max-w-[480px] flex-col gap-6 z-10">
        <LoginForm error={error === "1"} dictionary={dict.auth} locale={locale} />
      </div>

      <footer className="mt-8 text-center text-[10px] text-muted-foreground/50 tracking-wider">
        © 2025 SKILLUP CO., LTD. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
