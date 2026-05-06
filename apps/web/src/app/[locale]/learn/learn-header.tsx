"use client"

import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"

interface LearnHeaderProps {
  dict: any
  locale: string
}

export function LearnHeader({ dict, locale }: LearnHeaderProps) {
  const pathname = usePathname()
  
  // Logic: 
  // If we are at the root of a course learn page (no lesson specified in URL often means Enroll Gate or just started)
  // we might want to go back to catalog. 
  // But a better indicator is if they are actually enrolled. 
  // Since we don't have enrollment status here easily, we can use history.back() or check the referrer.
  
  const handleBack = (e: React.MouseEvent) => {
    if (window.history.length > 2) {
      e.preventDefault()
      window.history.back()
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-6">
        <a 
          href={`/${locale}/my-courses`}
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">
            {dict.learn.back_to_catalog}
          </span>
        </a>
        <div className="h-6 w-px bg-gray-200"></div>
        <Link href={`/${locale}/dashboard`} className="flex items-center">
          <img 
            src="/logos/skillup-logo.png" 
            alt="SKILLUP Logo" 
            className="h-8 w-auto" 
          />
        </Link>
      </div>
      <NavUser dictionary={dict.nav} locale={locale} />
    </header>
  )
}
