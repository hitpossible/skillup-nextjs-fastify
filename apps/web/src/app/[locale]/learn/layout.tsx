import { NavUser } from "@/components/nav-user";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/lib/i18n-config";
import { LearnHeader } from "./learn-header";

export default async function LearnLayout({ 
  children,
  params: { locale }
}: { 
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-col h-screen bg-white">
      <LearnHeader dict={dict} locale={locale} />
      <main className="flex-1 overflow-auto">{children}</main>
      <Toaster />
    </div>
  );
}
