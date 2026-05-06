"use client"

import { useState, useMemo } from "react"
import {
  Bell, BellOff, CheckCheck, Circle, BookOpen, GraduationCap,
  Award, Info, ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const API = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"
const PAGE_SIZE = 15

type FilterTab = "all" | "unread"

const TYPE_ICON: Record<string, React.ElementType> = {
  enrollment:   GraduationCap,
  course:       BookOpen,
  certificate:  Award,
  system:       Info,
}

const TYPE_COLOR: Record<string, string> = {
  enrollment:  "bg-blue-50 text-blue-500",
  course:      "bg-purple-50 text-purple-500",
  certificate: "bg-amber-50 text-amber-500",
  system:      "bg-gray-100 text-gray-500",
}

function fmtDate(iso: string, locale: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return locale === "th" ? "เมื่อกี้" : "Just now"
  if (diffMin < 60) return locale === "th" ? `${diffMin} นาทีที่แล้ว` : `${diffMin}m ago`
  if (diffHour < 24) return locale === "th" ? `${diffHour} ชั่วโมงที่แล้ว` : `${diffHour}h ago`
  if (diffDay < 7) return locale === "th" ? `${diffDay} วันที่แล้ว` : `${diffDay}d ago`
  return d.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function NotificationsInbox({
  notifications: initial,
  unreadCount: initialUnread,
  dictionary: d,
  locale,
  token,
}: {
  notifications: any[]
  unreadCount: number
  dictionary: any
  locale: string
  token: string
}) {
  const [notifications, setNotifications] = useState(initial)
  const [tab, setTab]   = useState<FilterTab>("all")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() =>
    tab === "unread" ? notifications.filter(n => !n.isRead) : notifications,
    [notifications, tab]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const unreadCount = notifications.filter(n => !n.isRead).length

  async function handleMarkRead(id: string) {
    try {
      const res = await fetch(`${API}/notifications/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      }
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      const res = await fetch(`${API}/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }
    } catch {}
  }

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{d.subtitle}</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm shrink-0"
            >
              <CheckCheck className="h-4 w-4" />
              {d.mark_all_read}
            </button>
          )}
        </div>

        {/* Stats + tabs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm">
            <Bell className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold text-gray-700">
              {unreadCount > 0 ? (
                <><span className="text-red-500">{unreadCount}</span> {d.unread_count_suffix}</>
              ) : d.all_read}
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-white border border-gray-100 shadow-sm">
            {([
              { id: "all" as FilterTab, label: d.tab_all },
              { id: "unread" as FilterTab, label: d.tab_unread },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1) }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                  tab === t.id
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
              <BellOff className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold">{d.empty_title}</p>
            <p className="text-gray-400 text-sm">{d.empty_desc}</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-50">
              {paginated.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Info
                const colorCls = TYPE_COLOR[n.type] ?? TYPE_COLOR.system
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-4 px-6 py-4 transition-colors hover:bg-rose-50/20",
                      !n.isRead && "bg-red-50/30"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", colorCls)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-semibold text-gray-900", !n.isRead && "text-gray-900")}>{n.title}</p>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">{fmtDate(n.createdAt, locale)}</span>
                      </div>
                      {n.body && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                    </div>

                    {/* Unread dot / mark read */}
                    {!n.isRead ? (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title={d.mark_read}
                        className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-300 transition-colors"
                      />
                    ) : (
                      <div className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full bg-gray-100" />
                    )}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={safePage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, i, arr) => (
                    <div key={p} className="flex items-center gap-1.5">
                      {arr[i - 1] && p - arr[i - 1]! > 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all",
                          p === safePage
                            ? "bg-red-500 text-white shadow-md shadow-red-200"
                            : "border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-500 shadow-sm"
                        )}
                      >
                        {p}
                      </button>
                    </div>
                  ))
                }
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={safePage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
