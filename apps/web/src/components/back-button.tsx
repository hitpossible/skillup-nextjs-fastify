"use client"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  fallbackHref: string
  label: string
  className?: string
}

export function BackButton({ fallbackHref, label, className }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = (e: React.MouseEvent) => {
    // If we have history, try going back
    if (window.history.length > 2) {
      e.preventDefault()
      router.back()
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleBack}
      className={cn(
        "text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 font-medium",
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="hidden sm:inline">{label}</span>
    </a>
  )
}
