"use client"

import { useState, useEffect, useRef } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { createCourseAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { getFullImageUrl } from "@/lib/api"

const initialState = { error: "" }

function SubmitButton({ dictionary }: { dictionary: any }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {dictionary.creating}
        </>
      ) : (
        dictionary.submit
      )}
    </Button>
  )
}

export function CreateCourseForm({ 
  dictionary, 
  langDictionary, 
  locale 
}: { 
  dictionary: any; 
  langDictionary: any; 
  locale: string 
}) {
  const [state, formAction] = useFormState(createCourseAction, initialState)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([])
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch categories
    fetch('/api/courses/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => setCategories([]))

    // Fetch users for instructor selection
    fetch('/api/users')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users')
        return res.json()
      })
      .then(data => {
        console.log("Users fetched:", data)
        setUsers(data.data || [])
      })
      .catch(err => {
        console.error("User fetch error:", err)
        setUsers([])
      })
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const apiBase = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1").replace(/\/v1\/?$/, "")
      const res = await fetch(`${apiBase}/v1/upload/course-thumbnails`, { 
        method: "POST", 
        body: formData 
      })
      const data = await res.json()
      if (data.url) {
        setThumbnailUrl(data.url)
      }
    } catch (err) {
      console.error("Upload failed:", err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveThumbnail = async () => {
    if (thumbnailUrl && thumbnailUrl.startsWith("/uploads/")) {
      await fetch("/api/upload", { 
        method: "DELETE", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ url: thumbnailUrl }) 
      })
    }
    setThumbnailUrl(null)
  }

  return (
    <form action={formAction}>
      <Card className="border-gray-200 shadow-sm max-w-2xl mx-auto rounded-[24px]">
        <CardHeader className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href={`/${locale}/course/list`} className="text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <CardTitle className="text-2xl font-bold">{dictionary.title}</CardTitle>
          </div>
          <CardDescription className="ml-9">{dictionary.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6 ml-9">
          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
              {state.error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-gray-900">
              {dictionary.label_name} <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              placeholder={dictionary.placeholder_name}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-900">
              {dictionary.label_description}
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full flex rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
              placeholder={dictionary.placeholder_description}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="categoryId" className="text-sm font-medium text-gray-900">
                {dictionary.label_category}
              </label>
              <select
                id="categoryId"
                name="categoryId"
                className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
              >
                <option value="">{dictionary.placeholder_category}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="instructorId" className="text-sm font-medium text-gray-900">
                {dictionary.label_instructor || "ผู้สอน"}
              </label>
              <select
                id="instructorId"
                name="instructorId"
                className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
              >
                <option value="">{dictionary.placeholder_instructor || "เลือกผู้สอน"}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                {dictionary.label_thumbnail}
              </label>
              
              <div 
                className="relative aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group hover:border-red-200 transition-colors cursor-pointer"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {thumbnailUrl ? (
                  <>
                    <img 
                      src={getFullImageUrl(thumbnailUrl)} 
                      alt="Thumbnail Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {dictionary.upload_button}
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-white hover:bg-red-500/50 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveThumbnail()
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {dictionary.remove_button}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="mx-auto w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mb-2">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 text-red-500 animate-spin" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-600">{dictionary.upload_button}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{dictionary.help_thumbnail}</p>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleUpload} 
                  className="hidden" 
                />
                <input type="hidden" name="thumbnailUrl" value={thumbnailUrl || ""} />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="durationMinutes" className="text-sm font-medium text-gray-900">
                {dictionary.label_duration}
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min="0"
                className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                placeholder={dictionary.placeholder_duration}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 bg-gray-50/50 flex justify-end gap-3 rounded-b-[24px] border-t border-gray-100">
          <Button type="button" variant="ghost" asChild className="rounded-full px-6">
            <Link href={`/${locale}/course/list`}>{dictionary.cancel}</Link>
          </Button>
          <SubmitButton dictionary={dictionary} />
        </CardFooter>
      </Card>
    </form>
  )
}
