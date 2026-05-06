"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Globe, Camera, Check, AlertCircle, Loader2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/api"

const API = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1"



function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function AccountForm({
  user,
  userId,
  dictionary: d,
  locale,
  token,
}: {
  user: any
  userId: string
  dictionary: any
  locale: string
  token: string
}) {
  const router = useRouter()
  const [fullName, setFullName]       = useState(user?.fullName ?? "")
  const [avatarUrl, setAvatarUrl]     = useState<string>(user?.avatarUrl ?? "")
  const [previewUrl, setPreviewUrl]   = useState<string>(getFullImageUrl(user?.avatarUrl))
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [userLocale, setUserLocale]   = useState(user?.locale ?? locale)
  const [loading, setLoading]         = useState(false)
  const [status, setStatus]           = useState<"idle" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg]       = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync state with user prop when it changes (e.g. after save or initial load)
  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? "")
      setAvatarUrl(user.avatarUrl ?? "")
      setPreviewUrl(getFullImageUrl(user.avatarUrl))
      setUserLocale(user.locale ?? locale)
    }
  }, [user, locale])

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // local preview
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setUploadingAvatar(true)

    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`${API}/upload/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message ?? "Upload failed")
      }
      
      const json = await res.json()
      setAvatarUrl(json.url)
      setPreviewUrl(getFullImageUrl(json.url))
    } catch (err: any) {
      // revert preview on failure
      setPreviewUrl(avatarUrl || user?.avatarUrl || "")
      setErrorMsg(err.message || d.error_generic)
      setStatus("error")
    } finally {
      setUploadingAvatar(false)
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleRemoveAvatar() {
    setPreviewUrl("")
    setAvatarUrl("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus("idle")
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          avatarUrl: avatarUrl || null,
          locale: userLocale,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json?.error?.message ?? d.error_generic)
        setStatus("error")
      } else {
        setStatus("success")
        router.refresh()
        setTimeout(() => setStatus("idle"), 3000)
      }
    } catch {
      setErrorMsg(d.error_generic)
      setStatus("error")
    } finally {
      setLoading(false)
    }
  }

  const displayName = fullName || user?.fullName || "?"

  return (
    <div className="min-h-screen -m-6 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40">
      <div className="px-8 py-10 max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{d.subtitle}</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">

          {/* Avatar section */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-50 flex items-center gap-6">
            {/* Avatar with upload overlay */}
            <div className="relative shrink-0 group">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={displayName}
                  key={previewUrl}
                  className="h-20 w-20 rounded-2xl object-cover border border-gray-100 shadow-sm"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = ""
                    setPreviewUrl("")
                  }}
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-red-100 to-rose-200 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-red-500">{getInitials(displayName)}</span>
                </div>
              )}

              {/* Upload overlay on hover */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
              >
                {uploadingAvatar
                  ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                  : <Camera className="h-6 w-6 text-white" />
                }
              </button>

              {/* Remove button */}
              {previewUrl && !uploadingAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-lg truncate">{displayName}</p>
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {user?.roles?.map((r: string) => (
                  <span key={r} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">{r}</span>
                ))}
              </div>
              {/* Upload hint */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadingAvatar ? d.uploading_avatar : d.upload_avatar_hint}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <User className="h-3.5 w-3.5" />
                {d.label_full_name}
              </label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={d.placeholder_full_name}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 focus:bg-white transition-colors"
              />
            </div>

            {/* Language */}
            {/* <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <Globe className="h-3.5 w-3.5" />
                {d.label_language}
              </label>
              <div className="flex gap-3">
                {[
                  { value: "th", label: d.lang_th, flag: "🇹🇭" },
                  { value: "en", label: d.lang_en, flag: "🇬🇧" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUserLocale(opt.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                      userLocale === opt.value
                        ? "border-red-300 bg-red-50 text-red-600 shadow-sm"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-white hover:border-gray-300"
                    )}
                  >
                    <span>{opt.flag}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div> */}

            {/* Status feedback */}
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

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || uploadingAvatar}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {loading ? d.saving : d.save}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
