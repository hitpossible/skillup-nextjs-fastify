"use client"

import { useState, useTransition } from "react"
import { Tag, Plus, Edit2, Trash2, Check, X, BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"
const PAGE_SIZE = 12

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CategoriesBrowser({
  categories: initial,
  dictionary: d,
  locale,
  token,
}: {
  categories: any[]
  dictionary: any
  locale: string
  token: string
}) {
  const [categories, setCategories] = useState(initial)
  const [page, setPage]             = useState(1)
  const [pending, startTransition]  = useTransition()

  // create form
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createSlug, setCreateSlug] = useState("")

  // edit state: categoryId -> { name, slug }
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = categories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleCreate() {
    if (!createName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/courses/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: createName.trim(), slug: createSlug || slugify(createName) }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data?.error?.message ?? d.error_generic); return }
        setCategories(prev => [...prev, data])
        setCreateName(""); setCreateSlug(""); setShowCreate(false)
      } catch { setError(d.error_generic) }
    })
  }

  function startEdit(cat: any) {
    setEditId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); setError(null)
  }

  async function handleUpdate() {
    if (!editId || !editName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/courses/categories/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: editName.trim(), slug: editSlug || slugify(editName) }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data?.error?.message ?? d.error_generic); return }
        setCategories(prev => prev.map(c => c.id === editId ? data : c))
        setEditId(null)
      } catch { setError(d.error_generic) }
    })
  }

  async function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/courses/categories/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { setError(d.error_generic); return }
        setCategories(prev => prev.filter(c => c.id !== id))
        setDeleteId(null)
      } catch { setError(d.error_generic) }
    })
  }

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{d.subtitle}</p>
          </div>
          <Button
            onClick={() => { setShowCreate(v => !v); setError(null) }}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            {d.create_btn}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="rounded-3xl border border-red-100 bg-white shadow-sm p-6 space-y-4">
            <p className="font-semibold text-gray-900">{d.create_title}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.label_name}</label>
                <input
                  value={createName}
                  onChange={e => { setCreateName(e.target.value); setCreateSlug(slugify(e.target.value)) }}
                  placeholder={d.placeholder_name}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.label_slug}</label>
                <input
                  value={createSlug}
                  onChange={e => setCreateSlug(e.target.value)}
                  placeholder="e.g. web-development"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowCreate(false); setCreateName(""); setCreateSlug(""); setError(null) }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {d.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={!createName.trim() || pending}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {d.save}
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <Tag className="h-10 w-10 text-red-300" />
            </div>
            <p className="text-gray-700 font-semibold">{d.empty_title}</p>
            <p className="text-gray-400 text-sm">{d.empty_desc}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5"
                >
                  {editId === cat.id ? (
                    /* Edit inline */
                    <div className="space-y-3">
                      <input
                        value={editName}
                        onChange={e => { setEditName(e.target.value); setEditSlug(slugify(e.target.value)) }}
                        className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 font-semibold"
                        autoFocus
                      />
                      <input
                        value={editSlug}
                        onChange={e => setEditSlug(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-200"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setEditId(null); setError(null) }}
                          className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleUpdate}
                          disabled={pending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {d.save}
                        </button>
                      </div>
                    </div>
                  ) : deleteId === cat.id ? (
                    /* Delete confirm */
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-900">{d.delete_confirm}</p>
                      <p className="text-xs text-gray-500">{d.delete_desc}</p>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          {d.cancel}
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={pending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {d.delete_confirm_btn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal view */
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                          <Tag className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{cat.name}</p>
                          <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{cat.slug}</p>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-full px-3 py-1 border border-gray-100">
                          <BookOpen className="h-3.5 w-3.5" />
                          {cat.courseCount ?? 0} {d.courses_count}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={d.btn_edit}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setDeleteId(cat.id); setError(null) }}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={d.btn_delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
  page: number; totalPages: number; onPageChange: (p: number) => void
}) {
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
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
