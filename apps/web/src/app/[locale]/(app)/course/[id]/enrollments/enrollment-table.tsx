"use client"

import { useState, useMemo, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Search, Users, CheckCircle2, BookOpen, TrendingUp, ClipboardList, UserPlus, X, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { QuizDetailSheet } from "./quiz-detail-sheet"

const API = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"

interface EnrollmentEntry {
  id: string
  userId: string
  name: string
  email: string
  status: string
  progressPercent: number
  enrolledAt: string
  completedAt: string | null
  quizStats: {
    totalAttempts: number
    passedCount: number
    bestScore: number | null
  }
}

interface Props {
  enrollments: EnrollmentEntry[]
  total: number
  dictionary: any
  locale: string
  courseId: string
  token?: string
}

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
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export function EnrollmentTable({ enrollments: initialEnrollments, total: initialTotal, dictionary: d, locale, courseId, token }: Props) {
  const [enrollments, setEnrollments] = useState(initialEnrollments)
  const [total, setTotal]             = useState(initialTotal)
  const [search, setSearch]           = useState("")
  const [filter, setFilter]           = useState<"all" | "active" | "completed">("all")
  const [quizSheet, setQuizSheet]     = useState<{ userId: string; name: string } | null>(null)

  // enroll user dialog
  const [showEnroll, setShowEnroll]   = useState(false)
  const [enrollUserId, setEnrollUserId] = useState("")
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrollPending, startEnrollTransition] = useTransition()

  async function handleAdminEnroll() {
    if (!enrollUserId.trim()) return
    setEnrollError(null)
    startEnrollTransition(async () => {
      try {
        const res = await fetch(`${API}/enrollments/admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: enrollUserId.trim(), courseId }),
        })
        const data = await res.json()
        if (!res.ok) { setEnrollError(data?.error?.message ?? d.enroll_error_generic); return }
        // reload page to reflect new enrollment
        window.location.reload()
      } catch { setEnrollError(d.enroll_error_generic) }
    })
  }

  const filtered = useMemo(() => {
    return enrollments.filter(e => {
      const matchSearch =
        search === "" ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
      const matchFilter =
        filter === "all" || e.status === filter
      return matchSearch && matchFilter
    })
  }, [enrollments, search, filter])

  const stats = useMemo(() => ({
    total,
    active: enrollments.filter(e => e.status === "active").length,
    completed: enrollments.filter(e => e.status === "completed").length,
    avgProgress: enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollments.length)
      : 0,
  }), [enrollments, total])

  const STAT_CARDS = [
    { label: d.stat_total,        value: stats.total,        icon: Users,        color: "text-blue-500",   bg: "bg-blue-50" },
    { label: d.stat_active,       value: stats.active,       icon: BookOpen,     color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: d.stat_completed,    value: stats.completed,    icon: CheckCircle2, color: "text-green-500",  bg: "bg-green-50" },
    { label: d.stat_avg_progress, value: `${stats.avgProgress}%`, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50" },
  ]

  return (
    <>
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <Card key={s.label} className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.bg} shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enroll user dialog */}
      {showEnroll && (
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">{d.enroll_dialog_title}</p>
          <p className="text-xs text-gray-500">{d.enroll_dialog_desc}</p>
          {enrollError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{enrollError}</p>
          )}
          <div className="flex gap-2">
            <input
              value={enrollUserId}
              onChange={e => { setEnrollUserId(e.target.value); setEnrollError(null) }}
              placeholder={d.enroll_user_id_placeholder}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
            />
            <button
              onClick={handleAdminEnroll}
              disabled={!enrollUserId.trim() || enrollPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {d.enroll_confirm_btn}
            </button>
            <button
              onClick={() => { setShowEnroll(false); setEnrollUserId(""); setEnrollError(null) }}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={d.search_placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-gray-200 focus:border-red-400 focus:ring-red-400"
          />
        </div>
        <button
          onClick={() => { setShowEnroll(v => !v); setEnrollError(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          {d.enroll_btn}
        </button>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "active", "completed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? d.filter_all : f === "active" ? d.filter_active : d.filter_completed}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-200 bg-gray-50">
          <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">{d.empty_title}</p>
          <p className="text-sm text-gray-400 mt-1">{d.empty_desc}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>{d.col_student}</span>
            <span>{d.col_status}</span>
            <span>{d.col_progress}</span>
            <span>{d.col_enrolled}</span>
            <span>{d.col_quiz}</span>
            <span></span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50 bg-white">
            {filtered.map(e => (
              <div
                key={e.id}
                className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-gray-50/60 transition-colors"
              >
                {/* Student */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(e.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.name}</p>
                    <p className="text-xs text-gray-400 truncate">{e.email}</p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[e.status] ?? STATUS_STYLE.active}`}>
                    {d[`status_${e.status}`] ?? e.status}
                  </span>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{e.progressPercent}%</span>
                    {e.completedAt && (
                      <span className="text-xs text-gray-400">{fmt(e.completedAt, locale)}</span>
                    )}
                  </div>
                  <Progress
                    value={e.progressPercent}
                    className="h-1.5 bg-gray-100 [&>[data-slot=indicator]]:bg-red-500"
                  />
                </div>

                {/* Enrolled date */}
                <div className="text-sm text-gray-500">{fmt(e.enrolledAt, locale)}</div>

                {/* Quiz stats */}
                <div>
                  {e.quizStats.totalAttempts === 0 ? (
                    <span className="text-xs text-gray-400">{d.quiz_no_attempt}</span>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${e.quizStats.bestScore !== null && e.quizStats.bestScore >= 60 ? "text-green-600" : "text-red-500"}`}>
                          {e.quizStats.bestScore ?? "–"}%
                        </span>
                        {e.quizStats.passedCount > 0 && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {e.quizStats.totalAttempts} {d.col_attempts}
                        {e.quizStats.passedCount > 0 && ` · ${e.quizStats.passedCount} ${d.quiz_passed}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quiz detail button */}
                <button
                  onClick={() => setQuizSheet({ userId: e.userId, name: e.name })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200 whitespace-nowrap"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {d.btn_view_quiz}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {quizSheet && (
      <QuizDetailSheet
        open={!!quizSheet}
        onClose={() => setQuizSheet(null)}
        userName={quizSheet.name}
        courseId={courseId}
        userId={quizSheet.userId}
        locale={locale}
        dictionary={d}
      />
    )}
    </>
  )
}
