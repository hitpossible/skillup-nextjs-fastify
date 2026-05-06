"use client"

import { usePathname } from "next/navigation"
import { i18n } from "@/lib/i18n-config"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

const LOCALES: Record<string, { flag: string; label: string }> = {
  th: { flag: "https://flagcdn.com/w20/th.png", label: "ภาษาไทย" },
  en: { flag: "https://flagcdn.com/w20/gb.png", label: "English" },
}

export function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname()

  const switchLocale = (next: string) => {
    const segments = pathname.split("/")
    segments[1] = next
    window.location.href = segments.join("/")
  }

  const current = LOCALES[locale] ?? { flag: "", label: locale.toUpperCase() }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-9 px-2.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm font-medium">
          {current.flag && <span className="inline-block h-4 w-6 rounded-sm overflow-hidden shrink-0">
            <img src={current.flag} alt={locale} className="h-full w-full object-cover" />
          </span>}
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-40 rounded-2xl bg-white p-1.5 shadow-xl border-gray-100"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        {i18n.locales.map((loc) => {
          const info = LOCALES[loc] ?? { flag: "", label: loc.toUpperCase() }
          const isActive = loc === locale
          return (
            <DropdownMenuItem
              key={loc}
              onSelect={() => switchLocale(loc)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm font-medium transition-colors ${
                isActive
                  ? "bg-red-50 text-red-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {info.flag && <span className="inline-block h-4 w-6 rounded-sm overflow-hidden shrink-0">
                <img src={info.flag} alt={loc} className="h-full w-full object-cover" />
              </span>}
              <span>{info.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
