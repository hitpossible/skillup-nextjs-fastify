"use client"

import { useState, useMemo, useTransition } from "react"
import {
  Users, Search, CheckCircle2, BookOpen, ShieldOff,
  ShieldCheck, Trash2, ChevronLeft, ChevronRight, CalendarClock,
  X, Check, Layers, PlayCircle, Ban, AlertCircle, UserPlus, ChevronDown,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/api"

const API = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"
const PAGE_SIZE = 15

type StatusTab = "all" | "active" | "completed" | "suspended" | "expired"

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  expired:   "bg-gray-100 text-gray-500 border-gray-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
}

function fmt(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function EnrollmentsBrowser({
  enrollments: initial,
  total: initialTotal,
  courses,
  users,
  dictionary: d,
  locale,
  token,
}: {
  enrollments: any[]
  total: number
  courses: any[]
  users: any[]
  dictionary: any
  locale: string
  token: string
}) {
  const [enrollments, setEnrollments] = useState(initial)
  const [tab, setTab]       = useState<StatusTab>("all")
  const [search, setSearch] = useState("")
  const [courseId, setCourseId] = useState("")
  const [page, setPage]     = useState(1)
  const [pending, startTransition] = useTransition()

  // expiry editor state
  const [expiryId, setExpiryId]     = useState<string | null>(null)
  const [expiryValue, setExpiryValue] = useState("")

  // revoke confirm state
  const [revokeId, setRevokeId] = useState<string | null>(null)

  // add enrollment form state
  const [showAdd, setShowAdd]       = useState(false)
  const [addUserId, setAddUserId]   = useState("")
  const [addCourseId, setAddCourseId] = useState("")
  const [addExpiry, setAddExpiry]   = useState("")
  const [addError, setAddError]     = useState("")
  const [addLoading, setAddLoading] = useState(false)

  const TABS: { id: StatusTab; label: string; icon: React.ElementType }[] = [
    { id: "all",       label: d.tab_all,       icon: Layers },
    { id: "active",    label: d.tab_active,    icon: PlayCircle },
    { id: "completed", label: d.tab_completed, icon: CheckCircle2 },
    { id: "suspended", label: d.tab_suspended, icon: Ban },
    { id: "expired",   label: d.tab_expired,   icon: AlertCircle },
  ]

  const filtered = useMemo(() => {
    return enrollments.filter(e => {
      const matchTab = tab === "all" || e.status === tab
      const matchCourse = !courseId || e.courseId === courseId
      const q = search.toLowerCase()
      const matchSearch = !q ||
        e.user?.fullName?.toLowerCase().includes(q) ||
        e.user?.email?.toLowerCase().includes(q) ||
        e.course?.title?.toLowerCase().includes(q)
      return matchTab && matchCourse && matchSearch
    })
  }, [enrollments, tab, courseId, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleTabChange(id: StatusTab) { setTab(id); setPage(1) }
  function handleSearchChange(val: string) { setSearch(val); setPage(1) }
  function handleCourseChange(val: string) { setCourseId(val); setPage(1) }

  async function handleStatusChange(enrollmentId: string, status: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/enrollments/${enrollmentId}/admin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status }),
        })
        if (res.ok) {
          const data = await res.json()
          setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, ...data } : e))
        }
      } catch {}
    })
  }

  async function handleExpiryUpdate(enrollmentId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/enrollments/${enrollmentId}/admin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ expiresAt: expiryValue ? new Date(expiryValue).toISOString() : null }),
        })
        if (res.ok) {
          const data = await res.json()
          setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, ...data } : e))
        }
        setExpiryId(null)
      } catch {}
    })
  }

  async function handleRevoke(enrollmentId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/enrollments/${enrollmentId}/admin`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          setEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
          setRevokeId(null)
        }
      } catch {}
    })
  }

  async function handleAddEnrollment(e: React.FormEvent) {
    e.preventDefault()
    if (!addUserId || !addCourseId) return
    setAddError("")
    setAddLoading(true)
    try {
      const res = await fetch(`${API}/enrollments/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: addUserId,
          courseId: addCourseId,
          expiresAt: addExpiry ? new Date(addExpiry).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setAddError(json?.error?.message ?? d.add_error_generic)
        return
      }
      setShowAdd(false)
      setAddUserId("")
      setAddCourseId("")
      setAddExpiry("")
      window.location.reload()
    } catch {
      setAddError(d.add_error_generic)
    } finally {
      setAddLoading(false)
    }
  }

  const stats = useMemo(() => ({
    total:     enrollments.length,
    active:    enrollments.filter(e => e.status === "active").length,
    completed: enrollments.filter(e => e.status === "completed").length,
    suspended: enrollments.filter(e => e.status === "suspended").length,
  }), [enrollments])

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{d.subtitle}</p>
          </div>
          <button
            onClick={() => { setShowAdd(v => !v); setAddError("") }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm shrink-0",
              showAdd
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-red-500 text-white hover:bg-red-600 shadow-red-200"
            )}
          >
            {showAdd ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {showAdd ? d.add_cancel : d.btn_add_enrollment}
          </button>
        </div>

        {/* Add enrollment panel */}
        {showAdd && (
          <div className="rounded-3xl border border-red-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50">
                <UserPlus className="h-4 w-4 text-red-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">{d.add_form_title}</h2>
            </div>
            <form onSubmit={handleAddEnrollment} className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* User */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.add_user_label}</label>
                  <div className="relative">
                    <select
                      required
                      value={addUserId}
                      onChange={e => setAddUserId(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                    >
                      <option value="">{d.add_user_placeholder}</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Course */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.add_course_label}</label>
                  <div className="relative">
                    <select
                      required
                      value={addCourseId}
                      onChange={e => setAddCourseId(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                    >
                      <option value="">{d.add_course_placeholder}</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Expiry */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.add_expiry_label}</label>
                  <input
                    type="date"
                    value={addExpiry}
                    onChange={e => setAddExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                  />
                </div>
              </div>

              {addError && (
                <p className="mt-3 text-sm text-red-500 font-medium">{addError}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={addLoading || !addUserId || !addCourseId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-4 w-4" />
                  {addLoading ? d.add_submitting : d.add_submit}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddError("") }}
                  className="px-4 py-2.5 rounded-full border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {d.add_cancel}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: d.stat_total,     value: stats.total,     icon: Users,        color: "text-blue-500",   bg: "bg-blue-50" },
            { label: d.stat_active,    value: stats.active,    icon: PlayCircle,   color: "text-indigo-500", bg: "bg-indigo-50" },
            { label: d.stat_completed, value: stats.completed, icon: CheckCircle2, color: "text-green-500",  bg: "bg-green-50" },
            { label: d.stat_suspended, value: stats.suspended, icon: Ban,          color: "text-red-400",    bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className={cn("p-2.5 rounded-xl shrink-0", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status tabs */}
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

        {/* Search + course filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <p className="text-sm font-medium text-gray-500 shrink-0 self-center">
            {d.total_prefix} <span className="text-gray-900 font-bold">{filtered.length}</span> {d.total_suffix}
          </p>
          <div className="flex flex-1 gap-3 ml-auto sm:max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={d.search_placeholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 shadow-sm"
              />
            </div>
            <select
              value={courseId}
              onChange={e => handleCourseChange(e.target.value)}
              className="pl-4 pr-8 py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 shadow-sm"
            >
              <option value="">{d.filter_all_courses}</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <Users className="h-10 w-10 text-red-300" />
            </div>
            <p className="text-gray-700 font-semibold">{d.empty_title}</p>
            <p className="text-gray-400 text-sm">{d.empty_desc}</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr_1fr] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>{d.col_user}</span>
                <span>{d.col_course}</span>
                <span>{d.col_status}</span>
                <span>{d.col_progress}</span>
                <span>{d.col_expiry}</span>
                <span className="text-right">{d.col_actions}</span>
              </div>

              <div className="divide-y divide-gray-50">
                {paginated.map(e => (
                  <div key={e.id} className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-rose-50/30 transition-colors">

                    {/* User */}
                    <div className="flex items-center gap-3 min-w-0">
                      {e.user?.avatarUrl ? (
                        <img src={getFullImageUrl(e.user.avatarUrl)} className="h-9 w-9 rounded-full object-cover shrink-0" alt={e.user.fullName} />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(e.user?.fullName ?? "?")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{e.user?.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{e.user?.email}</p>
                      </div>
                    </div>

                    {/* Course */}
                    <div className="flex items-center gap-2 min-w-0">
                      {e.course?.thumbnailUrl ? (
                        <img src={getFullImageUrl(e.course.thumbnailUrl)} className="h-8 w-12 rounded-lg object-cover shrink-0" alt={e.course.title} />
                      ) : (
                        <div className="h-8 w-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4 text-red-300" />
                        </div>
                      )}
                      <p className="text-sm text-gray-700 font-medium truncate">{e.course?.title}</p>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        STATUS_STYLE[e.status] ?? STATUS_STYLE.active
                      )}>
                        {d[`status_${e.status}`] ?? e.status}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{e.progressPercent}%</span>
                        <span className="text-gray-400">{fmt(e.enrolledAt, locale)}</span>
                      </div>
                      <Progress value={e.progressPercent} className="h-1.5 bg-gray-100 [&>[data-slot=indicator]]:bg-red-500 rounded-full" />
                    </div>

                    {/* Expiry */}
                    <div>
                      {expiryId === e.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={expiryValue}
                            onChange={ev => setExpiryValue(ev.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-300 w-28"
                          />
                          <button onClick={() => handleExpiryUpdate(e.id)} disabled={pending}
                            className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                            <Check className="h-3 w-3" />
                          </button>
                          <button onClick={() => setExpiryId(null)}
                            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setExpiryId(e.id)
                            setExpiryValue(e.expiresAt ? e.expiresAt.slice(0, 10) : "")
                          }}
                          className="group flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          <span>{e.expiresAt ? fmt(e.expiresAt, locale) : <span className="text-gray-300 group-hover:text-red-300">{d.no_expiry}</span>}</span>
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {revokeId === e.id ? (
                        <>
                          <button onClick={() => handleRevoke(e.id)} disabled={pending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                            <Trash2 className="h-3 w-3" />
                            {d.confirm_revoke}
                          </button>
                          <button onClick={() => setRevokeId(null)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {e.status === "active" || e.status === "completed" ? (
                            <button
                              onClick={() => handleStatusChange(e.id, "suspended")}
                              disabled={pending}
                              title={d.btn_suspend}
                              className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          ) : e.status === "suspended" ? (
                            <button
                              onClick={() => handleStatusChange(e.id, "active")}
                              disabled={pending}
                              title={d.btn_reactivate}
                              className="p-1.5 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors disabled:opacity-50"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => setRevokeId(e.id)}
                            title={d.btn_revoke}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                ))}
              </div>
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
  page: number; totalPages: number; onPageChange: (p: number) => void
}) {
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => {
    if (totalPages <= 7) return true
    return p === 1 || p === totalPages || Math.abs(p - page) <= 1
  })
  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {visiblePages.map((p, i) => {
        const prev = visiblePages[i - 1]
        return (
          <div key={p} className="flex items-center gap-1.5">
            {prev && p - prev > 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
            <button onClick={() => onPageChange(p)}
              className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all",
                p === page ? "bg-red-500 text-white shadow-md shadow-red-200" : "border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-500 shadow-sm")}>
              {p}
            </button>
          </div>
        )
      })}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
