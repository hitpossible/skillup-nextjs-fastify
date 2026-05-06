"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { updateLessonDetailsAction, createVideoQuestionAction, updateVideoQuestionAction, deleteVideoQuestionAction } from "./actions"
import { Loader2, Save, Plus, Trash2, Clock, CheckCircle, Video, ListTree, Upload, FileText, X, Lock, Unlock, ShieldCheck, CirclePlay, AlarmClock, Pencil } from "lucide-react"

export function LessonEditor({ 
  courseId, 
  sectionId, 
  initialLesson,
  dictionary,
  locale
}: { 
  courseId: string, 
  sectionId: string, 
  initialLesson: any,
  dictionary: any,
  locale: string
}) {
  const [lesson, setLesson] = useState(initialLesson)
  const [loading, setLoading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl || "")
  const [title, setTitle] = useState(lesson.title || "")
  const [seekMode, setSeekMode] = useState<"free" | "locked">(lesson.seekMode || "free")
  const [attachments, setAttachments] = useState<{title: string, url: string}[]>(lesson.attachments || [])
  
  // Quiz states
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [quizTimeStr, setQuizTimeStr] = useState("00:00")
  const [quizBody, setQuizBody] = useState("")
  const [quizOptions, setQuizOptions] = useState(["", ""])
  const [quizCorrectIdx, setQuizCorrectIdx] = useState(0)
  
  const videoInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const isLocalUpload = (url: string) => url.startsWith("/uploads/")

  const deleteLocalFile = async (url: string) => {
    if (!isLocalUpload(url)) return
    await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
  }

  const handleSaveDetails = async () => {
    setLoading(true)
    const res = await updateLessonDetailsAction(courseId, sectionId, initialLesson.id, {
      title,
      contentUrl: contentUrl.trim() || null,
      seekMode,
      attachments
    })
    setLoading(false)
    if (res.error) {
      toast({ variant: "destructive", title: "Error", description: res.error })
    } else {
      toast({ title: dictionary.save_success, description: dictionary.save_success_desc })
    }
  }

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", title: dictionary.invalid_file, description: dictionary.invalid_video_desc })
      return
    }

    setUploadingVideo(true)
    const prevUrl = contentUrl
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        await deleteLocalFile(prevUrl)
        setContentUrl(data.url)
        toast({ title: dictionary.save_success })
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: dictionary.upload_error, description: err.message })
    } finally {
      setUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ""
    }
  }

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAttachment(true)
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        setAttachments([...attachments, { title: file.name, url: data.url }])
        toast({ title: dictionary.save_success })
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "อัปโหลดล้มเหลว", description: err.message })
    } finally {
      setUploadingAttachment(false)
      if (attachmentInputRef.current) attachmentInputRef.current.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    const att = attachments[index]
    if (att) deleteLocalFile(att.url)
    const newAtt = [...attachments]
    newAtt.splice(index, 1)
    setAttachments(newAtt)
  }

  const timeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(":")
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0")
    const s = (sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const openEditSheet = (q: any) => {
    setEditingQuizId(q.id)
    setQuizTimeStr(formatSeconds(q.timestampSeconds))
    setQuizBody(q.body)
    setQuizOptions(q.options ?? ["", ""])
    const correctIdx = (q.options ?? []).indexOf(q.correctAnswer)
    setQuizCorrectIdx(correctIdx >= 0 ? correctIdx : 0)
    setSheetOpen(true)
  }

  const resetQuizForm = () => {
    setEditingQuizId(null)
    setQuizBody("")
    setQuizOptions(["", ""])
    setQuizTimeStr("00:00")
    setQuizCorrectIdx(0)
  }

  const handleSaveQuiz = async () => {
    const seconds = timeToSeconds(quizTimeStr)
    const validOptions = quizOptions.filter(o => o.trim() !== "")
    if (!quizBody.trim() || validOptions.length < 2) {
      toast({ variant: "destructive", title: dictionary.incomplete_info, description: dictionary.incomplete_quiz_desc })
      return
    }

    const payload = {
      timestampSeconds: seconds,
      type: "multiple_choice",
      body: quizBody,
      options: validOptions,
      correctAnswer: validOptions[quizCorrectIdx],
      isBlocking: true
    }

    setLoading(true)
    const res = editingQuizId
      ? await updateVideoQuestionAction(courseId, sectionId, initialLesson.id, editingQuizId, payload)
      : await createVideoQuestionAction(courseId, sectionId, initialLesson.id, payload)

    if (res.error) {
      toast({ variant: "destructive", title: "Error", description: res.error })
    } else {
      toast({ title: dictionary.save_success })
      setSheetOpen(false)
      resetQuizForm()
    }
    setLoading(false)
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm(dictionary.quiz_delete_confirm)) return
    setLoading(true)
    await deleteVideoQuestionAction(courseId, sectionId, initialLesson.id, quizId)
    toast({ title: dictionary.save_success })
    setLoading(false)
  }

  const sortedQuestions = [...(initialLesson.videoQuestions || [])].sort((a: any, b: any) => a.timestampSeconds - b.timestampSeconds)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* ── Left Column: Video & Settings ── */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
          {contentUrl ? (
            <div className="aspect-video bg-black relative flex items-center justify-center group">
              {contentUrl.includes('youtube.com') || contentUrl.includes('youtu.be') ? (
                <iframe 
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${contentUrl.split(/v=|youtu\.be\//)[1]?.split('&')[0]}?rel=0`} 
                  allowFullScreen
                />
              ) : (
                <video src={contentUrl} controls className="w-full h-full" />
              )}
            </div>
          ) : (
            <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-400 border-b border-gray-100">
              <Video className="h-12 w-12 mb-3 text-slate-300" />
              <p>{dictionary.video_not_set}</p>
            </div>
          )}

          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-gray-700">{dictionary.lesson_title}</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 h-11 focus:border-red-500 focus:ring-red-500" />
              </div>
              <div>
                <Label htmlFor="url" className="text-gray-700">{dictionary.video_url}</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input 
                    id="url" 
                    value={contentUrl} 
                    onChange={e => setContentUrl(e.target.value)} 
                    placeholder={dictionary.video_placeholder} 
                    className="h-11 flex-1 focus:border-red-500 focus:ring-red-500" 
                    disabled={contentUrl !== "" && !contentUrl.includes('youtube.com') && !contentUrl.includes('youtu.be')}
                  />
                  {contentUrl !== "" && !contentUrl.includes('youtube.com') && !contentUrl.includes('youtu.be') && (
                    <Button variant="ghost" onClick={() => { deleteLocalFile(contentUrl); setContentUrl("") }} className="h-11 px-3 text-red-500 hover:bg-red-50">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <input type="file" ref={videoInputRef} accept="video/*" onChange={handleUploadVideo} className="hidden" />
                  <Button variant="outline" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} className="h-11 px-4 border-red-200 text-red-600 hover:bg-red-50">
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploadingVideo ? dictionary.uploading : dictionary.upload_video}
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-700">{dictionary.resources}</Label>
                  <input type="file" ref={attachmentInputRef} onChange={handleUploadAttachment} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => attachmentInputRef.current?.click()} disabled={uploadingAttachment} className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50">
                    {uploadingAttachment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                    {uploadingAttachment ? dictionary.uploading : dictionary.add_resource}
                  </Button>
                </div>
                
                {attachments.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">{dictionary.no_resources}</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-red-50/30 border border-red-100 rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{att.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeAttachment(idx)} className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                {/* Seek Mode Toggle */}
                <div className="mb-4">
                  <Label className="text-gray-700 font-medium flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-gray-500" />
                    {dictionary.seek_control}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSeekMode("free")}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        seekMode === "free"
                          ? "border-green-500 bg-green-50 text-green-800"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${seekMode === "free" ? "bg-green-100" : "bg-gray-100"}`}>
                        <Unlock className={`h-4 w-4 ${seekMode === "free" ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{dictionary.seek_free}</div>
                        <div className="text-xs opacity-70">{dictionary.seek_free_desc}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeekMode("locked")}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        seekMode === "locked"
                          ? "border-red-500 bg-red-50 text-red-800"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${seekMode === "locked" ? "bg-red-100" : "bg-gray-100"}`}>
                        <Lock className={`h-4 w-4 ${seekMode === "locked" ? "text-red-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{dictionary.seek_locked}</div>
                        <div className="text-xs opacity-70">{dictionary.seek_locked_desc}</div>
                      </div>
                    </button>
                  </div>
                </div>

                <Button onClick={handleSaveDetails} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 h-11 w-full sm:w-auto">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {dictionary.save_lesson}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Right Column: Interactive Quizzes ── */}
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-sm border-gray-100 h-full flex flex-col">
          <CardHeader className="bg-gradient-to-br from-red-50/60 to-orange-50/30 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-100 rounded-xl">
                <CirclePlay className="h-4.5 w-4.5 text-red-600" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <CardTitle className="text-base leading-tight">{dictionary.quiz_title}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{sortedQuestions.length} {dictionary.quiz_count}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{dictionary.quiz_desc}</p>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-0">
              {sortedQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <AlarmClock className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">{dictionary.no_quizzes}</p>
                  <p className="text-xs text-slate-400 mt-1">{dictionary.quiz_desc}</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline connector line */}
                  <div className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-red-200 via-red-100 to-transparent" />

                  <div className="space-y-3">
                    {sortedQuestions.map((q: any, idx: number) => (
                      <div key={q.id} className="flex gap-3 group">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-red-200 flex items-center justify-center shadow-sm group-hover:border-red-400 transition-colors">
                          <span className="text-[10px] font-bold text-red-500">{String(idx + 1).padStart(2, "0")}</span>
                        </div>

                        {/* Quiz card */}
                        <div className="flex-1 pb-3">
                          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-red-100 transition-all group-hover:translate-x-0.5 duration-150">
                            <div className="flex items-start justify-between mb-2">
                              <div className="inline-flex items-center gap-1 bg-red-50 border border-red-100 rounded-md px-2 py-0.5">
                                <Clock className="h-3 w-3 text-red-400" />
                                <span className="text-xs font-mono font-semibold text-red-600">{formatSeconds(q.timestampSeconds)}</span>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditSheet(q)}
                                  className="h-6 w-6 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteQuiz(q.id)}
                                  className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 mb-2.5">{q.body}</p>

                            <div className="space-y-1">
                              {q.options?.map((opt: string, i: number) => {
                                const labels = ["A", "B", "C", "D", "E"]
                                const isCorrect = opt === q.correctAnswer
                                return (
                                  <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${isCorrect ? "bg-green-50 border border-green-200 text-green-800" : "bg-slate-50 text-slate-500"}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isCorrect ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                                      {labels[i] ?? i + 1}
                                    </span>
                                    <span className="leading-tight">{opt}</span>
                                    {isCorrect && <CheckCircle className="h-3 w-3 text-green-500 ml-auto flex-shrink-0" />}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <div className="shrink-0 p-4 border-t border-gray-100">
            <Button
              onClick={() => setSheetOpen(true)}
              className="w-full h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              {dictionary.add_quiz}
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Add Quiz Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); if (!open) resetQuizForm() }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b border-gray-100 bg-gradient-to-br from-red-50/60 to-orange-50/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <CirclePlay className="h-4.5 w-4.5 text-red-600" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <SheetTitle className="text-base">{editingQuizId ? dictionary.quiz_edit_title : dictionary.add_quiz}</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">{dictionary.quiz_desc}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Timestamp */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {dictionary.quiz_timestamp}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  value={quizTimeStr}
                  onChange={e => setQuizTimeStr(e.target.value)}
                  placeholder="01:30"
                  className="h-11 font-mono text-lg text-center focus:border-red-400 focus:ring-red-400 flex-1"
                />
                <div className="text-xs text-slate-400 text-center leading-tight">
                  <span className="block font-semibold text-slate-600 text-sm">{quizTimeStr || "00:00"}</span>
                  <span>MM:SS</span>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {dictionary.quiz_question}
              </Label>
              <textarea
                value={quizBody}
                onChange={e => setQuizBody(e.target.value)}
                placeholder={dictionary.quiz_question_placeholder}
                rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors placeholder:text-muted-foreground"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {dictionary.quiz_options}
              </Label>
              <p className="text-xs text-slate-400">{dictionary.quiz_correct_hint}</p>
              <div className="space-y-2">
                {quizOptions.map((opt, i) => {
                  const labels = ["A", "B", "C", "D", "E"]
                  const isCorrect = quizCorrectIdx === i
                  return (
                    <div
                      key={i}
                      onClick={() => setQuizCorrectIdx(i)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isCorrect
                          ? "border-green-400 bg-green-50/50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                        isCorrect ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {labels[i] ?? i + 1}
                      </div>
                      <Input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...quizOptions]
                          newOpts[i] = e.target.value
                          setQuizOptions(newOpts)
                        }}
                        onClick={e => e.stopPropagation()}
                        placeholder={`${dictionary.quiz_option_placeholder} ${i + 1}`}
                        className={`h-8 border-0 shadow-none p-0 text-sm focus-visible:ring-0 bg-transparent flex-1 ${isCorrect ? "text-green-800 placeholder:text-green-400" : ""}`}
                      />
                      {quizOptions.length > 2 && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            const newOpts = quizOptions.filter((_, idx) => idx !== i)
                            setQuizOptions(newOpts)
                            if (quizCorrectIdx >= newOpts.length) setQuizCorrectIdx(0)
                          }}
                          className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded-md flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}

                {quizOptions.length < 5 && (
                  <button
                    onClick={() => setQuizOptions([...quizOptions, ""])}
                    className="w-full flex items-center justify-center gap-1.5 h-9 text-xs text-slate-400 hover:text-red-500 border-2 border-dashed border-slate-200 hover:border-red-200 rounded-xl transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {dictionary.quiz_add_option}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fixed footer */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-2">
            <Button
              onClick={handleSaveQuiz}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white h-11 rounded-xl font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {editingQuizId ? dictionary.quiz_update : dictionary.quiz_save}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" className="h-11 px-5 rounded-xl">
                {dictionary.quiz_cancel}
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
