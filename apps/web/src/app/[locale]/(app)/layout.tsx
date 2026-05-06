import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { Toaster } from "@/components/ui/toaster";
import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/lib/i18n-config";

export default async function AppLayout({ 
  children,
  params: { locale }
}: { 
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const dict = await getDictionary(locale);

  return (
    <SidebarProvider className="flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-gray-500 hover:text-gray-700" />
          <a href={`/${locale}/dashboard`} className="flex items-center">
            <img 
              src="/logos/skillup-logo.png" 
              alt="SKILLUP Logo" 
              className="h-8 w-auto" 
            />
          </a>
        </div>
        <NavUser dictionary={dict.nav} locale={locale} />
      </header>
      <div className="flex flex-1">
        <AppSidebar dictionary={dict.nav} locale={locale} />
        <SidebarInset>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
