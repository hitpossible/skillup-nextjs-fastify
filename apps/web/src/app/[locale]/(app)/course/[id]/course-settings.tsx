"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload, X, Image as ImageIcon, Save, CheckCircle2 } from "lucide-react"
import { updateCourseMetadataAction } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { getFullImageUrl } from "@/lib/api"

export function CourseSettings({ 
  course, 
  dictionary, 
  locale 
}: { 
  course: any; 
  dictionary: any; 
  locale: string 
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([])
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(course.thumbnailUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Form fields
  const [title, setTitle] = useState(course.title || "")
  const [description, setDescription] = useState(course.description || "")
  const [categoryId, setCategoryId] = useState(course.category?.id || "")
  const [durationMinutes, setDurationMinutes] = useState(course.durationMinutes || "")
  const [instructorId, setInstructorId] = useState(course.instructor?.id || "")

  useEffect(() => {
    fetch('/api/courses/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => setCategories([]))

    fetch('/api/users')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users')
        return res.json()
      })
      .then(data => {
        console.log("Users fetched (settings):", data)
        setUsers(data.data || [])
      })
      .catch(err => {
        console.error("User fetch error (settings):", err)
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
      // Use the backend upload endpoint instead of the local one
      const apiBase = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1").replace(/\/v1\/?$/, "")
      const res = await fetch(`${apiBase}/v1/upload/course-thumbnails`, { 
        method: "POST", 
        body: formData,
        // In a real app, we'd need the token here, but the backend is currently open for /public paths
        // and we might need to add this to public paths if needed.
      })
      const data = await res.json()
      if (data.url) {
        setThumbnailUrl(data.url)
      }
    } catch (err) {
      console.error("Upload failed:", err)
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnailUrl(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: dictionary.toast_title_required, variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const result = await updateCourseMetadataAction(course.id, {
        title,
        description,
        categoryId: categoryId || null,
        thumbnailUrl: thumbnailUrl || null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes.toString()) : null,
        instructorId: instructorId || null,
      })

      if (result.success) {
        toast({ 
          title: dictionary.toast_updated_success,
          description: <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> {dictionary.toast_updated_desc}</div>
        })
      } else {
        toast({ title: result.error || "Failed to update", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: err.message || "Failed to update", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-gray-200 shadow-sm rounded-[24px] overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50 bg-gray-50/30">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            {dictionary.settings_title}
          </CardTitle>
          <CardDescription>{dictionary.settings_desc}</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Thumbnail */}
            <div className="md:col-span-1 space-y-3">
              <label className="text-sm font-bold text-gray-700">
                {dictionary.label_thumbnail}
              </label>
              <div 
                className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group hover:border-red-200 transition-all cursor-pointer shadow-inner"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {thumbnailUrl ? (
                  <>
                    <img 
                      src={getFullImageUrl(thumbnailUrl)} 
                      alt="Thumbnail Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-white bg-white/20 hover:bg-white/40 rounded-full"
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
                        className="text-white bg-red-500/50 hover:bg-red-500 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveThumbnail()
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="mx-auto w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-3">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-500">{dictionary.upload_button}</p>
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
              </div>
            </div>

            {/* Right: Basic Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-bold text-gray-700">
                  {dictionary.label_name} <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all shadow-sm"
                  placeholder={dictionary.placeholder_name}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="categoryId" className="text-sm font-bold text-gray-700">
                    {dictionary.label_category}
                  </label>
                  <select
                    id="categoryId"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="">{dictionary.placeholder_category}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="durationMinutes" className="text-sm font-bold text-gray-700">
                    {dictionary.label_duration}
                  </label>
                  <input
                    id="durationMinutes"
                    type="number"
                    min="0"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all shadow-sm"
                    placeholder={dictionary.placeholder_duration}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="instructorId" className="text-sm font-bold text-gray-700">
                  {dictionary.label_instructor || "ผู้สอน"}
                </label>
                <select
                  id="instructorId"
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  className="w-full flex h-11 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all shadow-sm cursor-pointer"
                >
                  <option value="">{dictionary.placeholder_instructor || "เลือกผู้สอน"}</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-bold text-gray-700">
                  {dictionary.label_description}
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full flex rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all shadow-sm resize-none"
                  placeholder={dictionary.placeholder_description}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 bg-gray-50/30 border-t border-gray-100 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-10 h-12 text-base font-bold shadow-lg shadow-red-100 active:scale-95 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {dictionary.builder_saving || "Saving..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {dictionary.builder_save || "Save Changes"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

import { Settings } from "lucide-react"
