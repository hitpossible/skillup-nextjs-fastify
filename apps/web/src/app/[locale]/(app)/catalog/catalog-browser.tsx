"use client"

import { useState } from "react"
import { BookOpen, Globe, Clock, Layers, Search, UserRound, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/api"


export function CatalogBrowser({ courses, categories, dictionary, locale }: { courses: any[], categories: any[], dictionary: any, locale: string }) {
  const [tab, setTab]       = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage]     = useState(1)

  console.log("Catalog courses:", courses)

  const PAGE_SIZE = 12

  const TABS = [
    { id: "all", label: dictionary.all_categories, icon: Layers },
    ...categories.map(c => ({
      id: c.id.toString(),
      label: c.name,
      icon: BookOpen
    }))
  ]

  const filtered = courses.filter(course => {
    const matchTab = tab === "all" || course.category?.id?.toString() === tab
    const matchSearch = course.title.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleTabChange(id: string)    { setTab(id);    setPage(1) }
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
            {locale === "th" ? `เนื้อหาทั้งหมด รวม ` : `Total `}
            <span className="text-gray-900 font-bold">{filtered.length}</span>
            {locale === "th" ? ` เนื้อหา` : ` courses`}
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
          <EmptyCatalog dictionary={dictionary} />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginated.map(course => (
                <CatalogCard key={course.id} course={course} dictionary={dictionary} locale={locale} />
              ))}
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

function CatalogCard({ course, dictionary, locale }: { course: any, dictionary: any, locale: string }) {
  const instructorName = course.instructor?.fullName || "Instructor"
  const instructorAvatar = course.instructor?.avatarUrl || ""

  return (
    <Link
      href={`/${locale}/learn/${course.id}`}
      className="group relative flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden h-[340px]"
    >
      {/* Thumbnail Background */}
      <div className="absolute inset-0 z-0">
        {course.thumbnailUrl ? (
          <img 
            src={getFullImageUrl(course.thumbnailUrl)} 
            alt={course.title} 
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-[2px]" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
      </div>

      {/* Default View */}
      <div className="relative z-10 flex flex-col h-full group-hover:opacity-0 transition-opacity duration-300">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-t-[32px]">
          {course.thumbnailUrl ? (
            <img src={getFullImageUrl(course.thumbnailUrl)} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-red-50">
               <BookOpen className="h-10 w-10 text-red-200" />
            </div>
          )}
        </div>
        <div className="p-5 flex-1 flex flex-col bg-white">
          <h3 className="line-clamp-2 text-base font-bold text-gray-900 leading-tight mb-2">
            {course.title}
          </h3>

          {course.category?.name && (
            <div className="mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-3 py-0.5 rounded-full border border-red-100">
                {course.category.name}
              </span>
            </div>
          )}

          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {instructorAvatar ? (
                  <img src={getFullImageUrl(instructorAvatar)} className="h-full w-full object-cover" alt={instructorName} />
                ) : (
                  <UserRound className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 truncate">
                {instructorName}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
              {course.durationMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {course.durationMinutes} {locale === "th" ? "นาที" : "min"}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {locale === "th" ? "ออนไลน์" : "Online"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover View */}
      <div className="absolute inset-0 z-20 flex flex-col p-8 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/50 backdrop-blur-[6px]">
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col justify-center text-center">
          <h3 className="text-xl font-black text-white leading-snug animate-in fade-in slide-in-from-top-4 duration-500">
            {course.title}
          </h3>
          
          {course.description && (
            <p className="text-[14px] font-medium text-white/90 leading-relaxed line-clamp-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {course.description}
            </p>
          )}
        </div>

        <div className="mt-auto pt-6 animate-in fade-in zoom-in-95 duration-500 delay-150">
          <div className="w-full h-14 rounded-full bg-white flex items-center justify-center shadow-2xl transition-transform active:scale-95">
            <span className="text-lg font-black text-red-500">
              {dictionary.view_detail || "ดูรายละเอียด"}
            </span>
          </div>
        </div>
      </div>

      {/* Badges (Always on top) */}
      <div className="absolute top-4 left-4 z-30 flex flex-wrap gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md text-gray-950 px-3 py-1 rounded-full shadow-sm border border-white/50">
          {course.language === "th" ? "TH" : (course.language?.toUpperCase() || "EN")}
        </span>
      </div>
    </Link>
  )
}

function EmptyCatalog({ dictionary }: { dictionary: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-red-50 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-red-300" />
        </div>
        
      </div>
      <div className="space-y-1.5">
        <p className="text-gray-700 font-semibold text-lg">
          {dictionary.no_courses}
        </p>
      </div>
    </div>
  )
}
