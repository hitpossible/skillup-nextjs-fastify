"use client"

import { useState } from "react"
import { BookOpen, PlayCircle, CheckCircle2, Layers, Search, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/api"

type Tab = "all" | "active" | "completed"

export function MyCoursesBrowser({ 
  enrollments, 
  dictionary,
  locale
}: { 
  enrollments: any[];
  dictionary: any;
  locale: string;
}) {
  const [tab, setTab]       = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [page, setPage]     = useState(1)

  const PAGE_SIZE = 12

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "all",       label: dictionary.tab_all,      icon: Layers },
    { id: "active",    label: dictionary.tab_active,   icon: PlayCircle },
    { id: "completed", label: dictionary.tab_completed, icon: CheckCircle2 },
  ]

  const filtered = enrollments.filter(({ course, status, progressPercent }) => {
    if (!course) return false
    const matchTab =
      tab === "all" ||
      (tab === "active"    && status === "active" && progressPercent < 100) ||
      (tab === "completed" && (status === "completed" || progressPercent === 100))
    return matchTab && course.title.toLowerCase().includes(search.toLowerCase())
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleTabChange(id: Tab)       { setTab(id);    setPage(1) }
  function handleSearchChange(val: string){ setSearch(val); setPage(1) }

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{dictionary.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{dictionary.subtitle}</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className="flex flex-col items-center gap-2.5 min-w-[72px] group"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200",
                tab === id
                  ? "bg-red-500 text-white shadow-lg shadow-red-200"
                  : "bg-white text-gray-400 border border-gray-100 hover:border-red-200 hover:text-red-400 shadow-sm"
              )}>
                <Icon className="h-7 w-7" />
              </div>
              <span className={cn(
                "text-xs font-semibold whitespace-nowrap transition-colors",
                tab === id ? "text-red-500" : "text-gray-500 group-hover:text-gray-700"
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Search + count row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-medium text-gray-500 shrink-0">
            {dictionary.total_count_prefix} <span className="text-gray-900 font-bold">{filtered.length}</span> {dictionary.total_count_suffix}
          </p>
          <div className="flex-1 sm:max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={dictionary.search_placeholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Grid or empty */}
        {filtered.length === 0 ? (
          <EmptyMyCourses search={search} tab={tab} dictionary={dictionary} locale={locale} />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginated.map(({ id, status, progressPercent, course }) => {
                if (!course) return null
                const isCompleted = status === "completed" || progressPercent === 100
                return (
                  <MyCourseCard
                    key={id}
                    course={course}
                    progressPercent={progressPercent}
                    isCompleted={isCompleted}
                    dictionary={dictionary}
                    locale={locale}
                  />
                )
              })}
            </div>
            {totalPages > 1 && (
              <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}

      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPageChange }: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (totalPages <= 7) return true
    return p === 1 || p === totalPages || Math.abs(p - page) <= 1
  })

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visiblePages.map((p, i) => {
        const prev = visiblePages[i - 1]
        return (
          <div key={p} className="flex items-center gap-1.5">
            {prev && p - prev > 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
            <button
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all",
                p === page
                  ? "bg-red-500 text-white shadow-md shadow-red-200"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-500 shadow-sm"
              )}
            >
              {p}
            </button>
          </div>
        )
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function MyCourseCard({ course, progressPercent, isCompleted, dictionary, locale }: {
  course: any; progressPercent: number; isCompleted: boolean; dictionary: any; locale: string
}) {
  return (
    <Link
      href={`/${locale}/learn/${course.id}`}
      className="group flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="aspect-[16/9] bg-gray-50 relative overflow-hidden">
        {course.thumbnailUrl ? (
          <img src={getFullImageUrl(course.thumbnailUrl)} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
            < BookOpen className="h-10 w-10 text-red-300" />
          </div>
        )}
        {isCompleted && (
          <div className="absolute inset-0 bg-green-900/50 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white text-green-600 text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="h-4 w-4" /> {dictionary.tab_completed}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="line-clamp-2 text-[15px] font-bold text-gray-900 leading-snug mb-4 group-hover:text-red-600 transition-colors">
          {course.title}
        </h3>
        <div className="mt-auto space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>{dictionary.progress_label}</span>
              <span className="text-gray-800 font-bold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-gray-100 [&>[data-slot=indicator]]:bg-red-500 rounded-full" />
          </div>
          <div className={cn(
            "w-full text-center text-sm font-semibold py-2.5 rounded-full transition-all",
            isCompleted
              ? "bg-gray-50 text-gray-600 border border-gray-200"
              : "bg-red-500 text-white group-hover:bg-red-600"
          )}>
            {isCompleted ? dictionary.review_button : dictionary.continue_button}
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyMyCourses({ search, tab, dictionary, locale }: { search: string; tab: Tab; dictionary: any; locale: string }) {
  const isFiltered = search || tab !== "all"
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-red-50 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-red-300" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white rounded-full border border-gray-100 shadow flex items-center justify-center text-lg">
          {isFiltered ? "🔍" : "📚"}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-gray-700 font-semibold text-lg">
          {isFiltered ? dictionary.empty_search_title : dictionary.empty_courses_title}
        </p>
        <p className="text-gray-400 text-sm">
          {isFiltered
            ? dictionary.empty_search_desc
            : dictionary.empty_courses_desc}
        </p>
      </div>
      {!isFiltered && (
        <Link
          href={`/${locale}/catalog`}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-500 font-semibold rounded-full text-sm transition-colors border border-red-100"
        >
          {dictionary.view_catalog_button} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
