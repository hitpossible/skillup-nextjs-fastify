"use client"

import { useState } from "react"
import {
  Bell, GraduationCap, BookOpen, Award, Info,
  Check, AlertCircle, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const API = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"

const DEFAULT_PREFS = {
  enrollment:   true,
  courseUpdate: true,
  certificate:  true,
  system:       true,
}

type Prefs = typeof DEFAULT_PREFS

interface PrefItem {
  key: keyof Prefs
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

const PREF_ITEMS: PrefItem[] = [
  { key: "enrollment",   icon: GraduationCap, iconBg: "bg-blue-50",   iconColor: "text-blue-500"   },
  { key: "courseUpdate", icon: BookOpen,      iconBg: "bg-purple-50", iconColor: "text-purple-500" },
  { key: "certificate",  icon: Award,         iconBg: "bg-amber-50",  iconColor: "text-amber-500"  },
  { key: "system",       icon: Info,          iconBg: "bg-gray-100",  iconColor: "text-gray-500"   },
]

export function NotificationPrefsForm({
  userId,
  prefs: initial,
  dictionary: d,
  token,
}: {
  userId: string
  prefs: Partial<Prefs> | null
  dictionary: any
  token: string
}) {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, ...initial })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  function toggle(key: keyof Prefs) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setStatus("idle")
  }

  async function handleSave() {
    setLoading(true)
    setStatus("idle")
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationPrefs: prefs }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json?.error?.message ?? d.error_generic)
        setStatus("error")
      } else {
        setStatus("success")
        setTimeout(() => setStatus("idle"), 3000)
      }
    } catch {
      setErrorMsg(d.error_generic)
      setStatus("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-50">
            <Bell className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{d.subtitle}</p>
          </div>
        </div>

        {/* Toggle list */}
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-50">
          {PREF_ITEMS.map(({ key, icon: Icon, iconBg, iconColor }) => (
            <div key={key} className="flex items-center gap-4 px-6 py-5">
              <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{d[`label_${key}`]}</p>
                <p className="text-xs text-gray-400 mt-0.5">{d[`desc_${key}`]}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  "relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
                  prefs[key] ? "bg-red-500" : "bg-gray-200"
                )}
                role="switch"
                aria-checked={prefs[key]}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  prefs[key] ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          ))}
        </div>

        {/* Feedback */}
        {status === "success" && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
            <Check className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-700 font-medium">{d.success_message}</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {loading ? d.saving : d.save}
        </button>

      </div>
    </div>
  )
}
