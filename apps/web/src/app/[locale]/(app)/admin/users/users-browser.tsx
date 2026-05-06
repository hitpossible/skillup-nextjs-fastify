"use client"

import { useState, useTransition } from "react"
import {
  Users, Search, UserCheck, UserX, Shield, ShieldOff,
  ChevronLeft, ChevronRight, Plus, MoreHorizontal
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/api"

type FilterTab = "all" | "active" | "inactive"

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

const PAGE_SIZE = 15

export function UsersBrowser({
  users: initialUsers,
  dictionary: d,
  locale,
  token,
}: {
  users: any[]
  dictionary: any
  locale: string
  token: string
}) {
  const [users, setUsers]   = useState(initialUsers)
  const [tab, setTab]       = useState<FilterTab>("all")
  const [search, setSearch] = useState("")
  const [page, setPage]     = useState(1)
  const [pending, startTransition] = useTransition()

  const filtered = users.filter((u) => {
    const matchTab =
      tab === "all" ||
      (tab === "active" && u.isActive) ||
      (tab === "inactive" && !u.isActive)
    const matchSearch =
      search === "" ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleTabChange(id: FilterTab) { setTab(id); setPage(1) }
  function handleSearchChange(val: string) { setSearch(val); setPage(1) }

  async function toggleActive(userId: string, current: boolean) {
    startTransition(async () => {
      try {
        const res = await fetch(
          `${process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"}/users/${userId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ isActive: !current }),
          }
        )
        if (res.ok) {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !current } : u))
        }
      } catch {}
    })
  }

  const TABS = [
    { id: "all" as FilterTab,      label: d.tab_all,      icon: Users },
    { id: "active" as FilterTab,   label: d.tab_active,   icon: UserCheck },
    { id: "inactive" as FilterTab, label: d.tab_inactive, icon: UserX },
  ]

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{d.subtitle}</p>
          </div>
          <Button className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 shrink-0" asChild>
            <a href={`/${locale}/admin/users/create`}>
              <Plus className="mr-2 h-4 w-4" />
              {d.create_user}
            </a>
          </Button>
        </div>

        {/* Tabs */}
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

        {/* Search + count */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-medium text-gray-500 shrink-0">
            {d.total_prefix} <span className="text-gray-900 font-bold">{filtered.length}</span> {d.total_suffix}
          </p>
          <div className="flex-1 sm:max-w-xs ml-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={d.search_placeholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 shadow-sm"
            />
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
              {/* Header row */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>{d.col_name}</span>
                <span>{d.col_email}</span>
                <span>{d.col_roles}</span>
                <span>{d.col_status}</span>
                <span></span>
              </div>

              <div className="divide-y divide-gray-50">
                {paginated.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-rose-50/30 transition-colors"
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {user.avatarUrl ? (
                        <img src={getFullImageUrl(user.avatarUrl)} alt={user.fullName} className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(user.fullName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {new Date(user.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>

                    {/* Roles */}
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-gray-300">—</span>
                      ) : user.roles.map((role: string) => (
                        <Badge
                          key={role}
                          className="rounded-full text-[10px] px-2 py-0 border-transparent bg-red-50 text-red-600 hover:bg-red-50"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        user.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.isActive ? d.status_active : d.status_inactive}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleActive(user.id, user.isActive)}
                        disabled={pending}
                        title={user.isActive ? d.btn_deactivate : d.btn_activate}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-50",
                          user.isActive
                            ? "text-gray-500 border-gray-200 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                            : "text-gray-500 border-gray-200 hover:text-green-600 hover:border-green-200 hover:bg-green-50"
                        )}
                      >
                        {user.isActive ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                        {user.isActive ? d.btn_deactivate : d.btn_activate}
                      </button>
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
