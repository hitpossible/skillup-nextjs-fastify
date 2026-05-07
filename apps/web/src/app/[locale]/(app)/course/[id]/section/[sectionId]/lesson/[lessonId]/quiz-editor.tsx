"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { upsertLessonQuizAction, getLessonAction } from "./actions"
import {
  Loader2, Save, Plus, Trash2, CheckCircle, XCircle, HelpCircle,
  X, Eye, Trophy, CircleDot, ToggleLeft, CheckSquare, AlignLeft, Check, Clock,
  EyeOff, Lock, Copy, ClipboardCopy, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

type QuestionType = "multiple_choice" | "true_false" | "multiple_select" | "short_answer"

const QUESTION_TYPES: { value: QuestionType; icon: React.ReactNode; dictKey: string }[] = [
  { value: "multiple_choice", icon: <CircleDot className="h-3.5 w-3.5" />, dictKey: "lq_type_multiple_choice" },
  { value: "true_false",      icon: <ToggleLeft className="h-3.5 w-3.5" />, dictKey: "lq_type_true_false" },
  { value: "multiple_select", icon: <CheckSquare className="h-3.5 w-3.5" />, dictKey: "lq_type_multiple_select" },
  { value: "short_answer",    icon: <AlignLeft className="h-3.5 w-3.5" />, dictKey: "lq_type_short_answer" },
]

function getDefaultForType(type: QuestionType, sortOrder: number) {
  const base = { id: "", type, body: "", points: 1, sortOrder }
  switch (type) {
    case "multiple_choice": return { ...base, options: ["", ""],        correctAnswer: "" }
    case "true_false":      return { ...base, options: ["true","false"], correctAnswer: "" }
    case "multiple_select": return { ...base, options: ["", ""],        correctAnswer: [] }
    case "short_answer":    return { ...base, options: [],              correctAnswer: "" }
  }
}

function normalizeQuestion(q: any) {
  if (q.type === "multiple_select" && !Array.isArray(q.correctAnswer)) {
    try {
      const parsed = JSON.parse(q.correctAnswer)
      return { ...q, correctAnswer: Array.isArray(parsed) ? parsed : [] }
    } catch {
      return { ...q, correctAnswer: [] }
    }
  }
  if (!q.type) return { ...q, type: "multiple_choice" }
  return q
}

export function QuizEditor({
  courseId,
  sectionId,
  initialLesson,
  course,
  dictionary,
  locale: _locale,
}: {
  courseId: string
  sectionId: string
  initialLesson: any
  course: any
  dictionary: any
  locale: string
}) {
  const quiz = initialLesson.quizzes?.[0] || {
    title: initialLesson.title,
    type: "graded",
    passingScore: 60,
    showCorrectAnswers: true,
    requireAllSections: false,
    questions: [],
  }

  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(quiz.title)
  const [passingScore, setPassingScore] = useState(quiz.passingScore)
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(quiz.shuffleQuestions ?? false)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<boolean>(quiz.showCorrectAnswers ?? true)
  const [requireAllSections, setRequireAllSections] = useState<boolean>(quiz.requireAllSections ?? false)
  const [limitAttempts, setLimitAttempts] = useState<boolean>(quiz.maxAttempts != null)
  const [maxAttempts, setMaxAttempts] = useState<number>(quiz.maxAttempts ?? 3)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [questions, setQuestions] = useState<any[]>((quiz.questions || []).map(normalizeQuestion))

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, any>>({})
  const [previewSubmitted, setPreviewSubmitted] = useState(false)

  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneLoading, setCloneLoading] = useState(false)

  const lessonsWithQuiz = (course?.sections ?? []).flatMap((sec: any) =>
    (sec.lessons ?? [])
      .filter((l: any) => l.quizId && l.id !== initialLesson.id)
      .map((l: any) => ({ ...l, sectionTitle: sec.title }))
  )

  const handleClone = async (lesson: any) => {
    setCloneLoading(true)
    const res = await getLessonAction(courseId, lesson.sectionId, lesson.id)
    setCloneLoading(false)
    if (res.error || !res.data) {
      toast({ variant: "destructive", title: "Error", description: res.error })
      return
    }
    const sourceQuiz = (res.data as any).quizzes?.[0]
    if (!sourceQuiz) return
    setTitle(sourceQuiz.title)
    setPassingScore(sourceQuiz.passingScore)
    setShuffleQuestions(sourceQuiz.shuffleQuestions ?? false)
    setShowCorrectAnswers(sourceQuiz.showCorrectAnswers ?? true)
    setRequireAllSections(sourceQuiz.requireAllSections ?? false)
    setLimitAttempts(sourceQuiz.maxAttempts != null)
    setMaxAttempts(sourceQuiz.maxAttempts ?? 3)
    setQuestions((sourceQuiz.questions ?? []).map((q: any) => normalizeQuestion({ ...q, id: "" })))
    setCloneOpen(false)
    toast({ title: dictionary.lq_clone_success })
  }

  const { toast } = useToast()

  // ─── Preview helpers ───────────────────────────────────────────────────────

  const openPreview = () => {
    setPreviewAnswers({})
    setPreviewSubmitted(false)
    setPreviewOpen(true)
  }

  const handlePreviewSubmit = () => {
    const unanswered = questions.some((q, i) => {
      if (q.type === "short_answer") return false
      if (q.type === "multiple_select") {
        return !previewAnswers[i] || (previewAnswers[i] as string[]).length === 0
      }
      return !previewAnswers[i]
    })
    if (unanswered) {
      toast({ variant: "destructive", title: dictionary.lq_preview_answer_all })
      return
    }
    setPreviewSubmitted(true)
  }

  const isPreviewCorrect = (q: any, i: number): boolean => {
    if (q.type === "short_answer") return false
    if (q.type === "multiple_select") {
      const chosen: string[] = previewAnswers[i] || []
      const correct: string[] = q.correctAnswer || []
      return chosen.length === correct.length && chosen.every((c: string) => correct.includes(c))
    }
    return previewAnswers[i] === q.correctAnswer
  }

  const scorableQuestions = questions.filter(q => q.type !== "short_answer")
  const previewScore = previewSubmitted
    ? scorableQuestions.length === 0
      ? 100
      : Math.round(
          (scorableQuestions.filter((q) => isPreviewCorrect(q, questions.indexOf(q))).length /
            scorableQuestions.length) *
            100
        )
    : 0
  const previewPassed = previewScore >= Number(passingScore)

  // ─── Editor helpers ────────────────────────────────────────────────────────

  const handleAddQuestion = () => {
    setQuestions([...questions, getDefaultForType("multiple_choice", questions.length)])
  }

  const handleDuplicateQuestion = (index: number) => {
    const original = questions[index]
    const duplicate = { ...original, id: "", sortOrder: questions.length }
    setQuestions([...questions, duplicate])
  }

  const handleUpdateQuestion = (index: number, updates: any) => {
    const newQ = [...questions]
    newQ[index] = { ...newQ[index], ...updates }
    setQuestions(newQ)
  }

  const handleTypeChange = (index: number, newType: QuestionType) => {
    const q = questions[index]
    const updates: any = { type: newType }
    if (newType === "true_false") {
      updates.options = ["true", "false"]
      updates.correctAnswer = ""
    } else if (newType === "short_answer") {
      updates.options = []
      updates.correctAnswer = ""
    } else if (newType === "multiple_select") {
      if (q.type !== "multiple_choice" && q.type !== "multiple_select") updates.options = ["", ""]
      updates.correctAnswer = []
    } else if (newType === "multiple_choice") {
      if (q.type !== "multiple_select" && q.type !== "multiple_choice") updates.options = ["", ""]
      updates.correctAnswer = ""
    }
    handleUpdateQuestion(index, updates)
  }

  const confirmDeleteQuestion = () => {
    if (deleteIndex === null) return
    const newQ = [...questions]
    newQ.splice(deleteIndex, 1)
    setQuestions(newQ)
    setDeleteIndex(null)
  }

  const handleSaveQuiz = async () => {
    const qs = [...questions]
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]
      const qLabel = `${dictionary.lq_question_no} ${i + 1}`

      if (!q.body.trim()) {
        return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_empty}` })
      }

      if (q.type === "multiple_choice") {
        const validOpts = q.options.filter((o: string) => o.trim() !== "")
        if (validOpts.length < 2) {
          return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_options}` })
        }
        if (!q.correctAnswer) {
          return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_correct}` })
        }
        qs[i] = { ...q, options: validOpts }
      } else if (q.type === "true_false") {
        if (!q.correctAnswer) {
          return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_correct}` })
        }
      } else if (q.type === "multiple_select") {
        const validOpts = q.options.filter((o: string) => o.trim() !== "")
        if (validOpts.length < 2) {
          return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_options}` })
        }
        const validCorrect = (Array.isArray(q.correctAnswer) ? q.correctAnswer : []).filter((a: string) => validOpts.includes(a))
        if (validCorrect.length === 0) {
          return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_correct_multi}` })
        }
        qs[i] = { ...q, options: validOpts, correctAnswer: validCorrect }
      }
      // short_answer: body only
    }

    setLoading(true)
    const res = await upsertLessonQuizAction(courseId, sectionId, initialLesson.id, {
      title,
      type: "graded",
      passingScore: Number(passingScore) || 60,
      timeLimitSeconds: null,
      maxAttempts: limitAttempts ? Math.max(1, maxAttempts) : null,
      shuffleQuestions,
      showCorrectAnswers,
      requireAllSections,
      questions: qs,
    })
    setLoading(false)

    if (res.error) {
      toast({ variant: "destructive", title: "Error", description: res.error })
    } else {
      toast({ title: dictionary.save_success })
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz settings */}
      <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
        <CardHeader className="bg-red-50/30 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <HelpCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{dictionary.lq_title}</CardTitle>
              <CardDescription className="mt-0.5">{dictionary.lq_desc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{dictionary.lq_quiz_name}</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 focus:border-red-500 focus:ring-red-500" />
            </div>
            <div>
              <Label>{dictionary.lq_passing_score}</Label>
              <Input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(e.target.value)} className="mt-1.5 focus:border-red-500 focus:ring-red-500" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-1 divide-y divide-gray-50">
            {[
              {
                icon: <CircleDot className="h-4 w-4 text-purple-500" />,
                iconBg: "bg-purple-50",
                label: dictionary.lq_shuffle_questions,
                desc: dictionary.lq_shuffle_questions_desc,
                value: shuffleQuestions,
                onChange: setShuffleQuestions,
              },
              {
                icon: <Eye className="h-4 w-4 text-blue-500" />,
                iconBg: "bg-blue-50",
                label: dictionary.lq_show_correct_answers,
                desc: dictionary.lq_show_correct_answers_desc,
                value: showCorrectAnswers,
                onChange: setShowCorrectAnswers,
              },
              {
                icon: <Lock className="h-4 w-4 text-amber-500" />,
                iconBg: "bg-amber-50",
                label: dictionary.lq_require_all_sections,
                desc: dictionary.lq_require_all_sections_desc,
                value: requireAllSections,
                onChange: setRequireAllSections,
              },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center gap-3 py-3">
                <div className={cn("p-2 rounded-xl shrink-0", row.iconBg)}>{row.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{row.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{row.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => row.onChange(!row.value)}
                  className={cn(
                    "relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
                    row.value ? "bg-red-500" : "bg-gray-200"
                  )}
                  role="switch"
                  aria-checked={row.value}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                    row.value ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            ))}

            {/* Max attempts row — toggle + conditional number input */}
            <div className="flex items-center gap-3 py-3">
              <div className="p-2 rounded-xl shrink-0 bg-green-50">
                <RefreshCw className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{dictionary.lq_limit_attempts ?? "จำกัดจำนวนครั้งที่ทำได้"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{dictionary.lq_limit_attempts_desc ?? "ปิด = ทำได้ไม่จำกัดครั้ง"}</p>
              </div>
              {limitAttempts && (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    type="button"
                    onClick={() => setMaxAttempts(v => Math.max(1, v - 1))}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-base font-bold"
                  >−</button>
                  <span className="w-8 text-center text-sm font-bold text-gray-800">{maxAttempts}</span>
                  <button
                    type="button"
                    onClick={() => setMaxAttempts(v => v + 1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-base font-bold"
                  >+</button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setLimitAttempts(v => !v)}
                className={cn(
                  "relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
                  limitAttempts ? "bg-red-500" : "bg-gray-200"
                )}
                role="switch"
                aria-checked={limitAttempts}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  limitAttempts ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qIndex) => {
          const labels = ["A", "B", "C", "D", "E"]
          return (
            <Card key={qIndex} className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="px-5 py-4 bg-gradient-to-br from-red-50/60 to-orange-50/30 border-b border-gray-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-red-600">{qIndex + 1}</span>
                  </div>
                  <CardTitle className="text-sm font-semibold text-gray-700">{dictionary.lq_question_no} {qIndex + 1}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicateQuestion(qIndex)} className="h-7 w-7 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteIndex(qIndex)} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* Type selector */}
                <div className="flex gap-1.5 flex-wrap">
                  {QUESTION_TYPES.map(qt => (
                    <button
                      key={qt.value}
                      onClick={() => handleTypeChange(qIndex, qt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        q.type === qt.value
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {qt.icon}
                      {dictionary[qt.dictKey]}
                    </button>
                  ))}
                </div>

                {/* Question body */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {dictionary.quiz_question}
                  </Label>
                  <textarea
                    value={q.body}
                    onChange={e => handleUpdateQuestion(qIndex, { body: e.target.value })}
                    placeholder={dictionary.quiz_question_placeholder}
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors placeholder:text-muted-foreground"
                  />
                </div>

                {/* ── Multiple Choice ─────────────────────────────────── */}
                {q.type === "multiple_choice" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {dictionary.quiz_options}
                      </Label>
                      <p className="text-xs text-slate-400">{dictionary.quiz_correct_hint}</p>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt: string, oIndex: number) => {
                        const isCorrect = q.correctAnswer === opt && opt !== ""
                        return (
                          <div
                            key={oIndex}
                            onClick={() => { if (opt) handleUpdateQuestion(qIndex, { correctAnswer: opt }) }}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                              isCorrect ? "border-green-400 bg-green-50/50" : "border-gray-100 bg-white hover:border-gray-200"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isCorrect ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                            }`}>
                              {labels[oIndex] ?? oIndex + 1}
                            </div>
                            <Input
                              value={opt}
                              onChange={e => {
                                const newOpts = [...q.options]
                                newOpts[oIndex] = e.target.value
                                const newCorrect = q.correctAnswer === opt ? e.target.value : q.correctAnswer
                                handleUpdateQuestion(qIndex, { options: newOpts, correctAnswer: newCorrect })
                              }}
                              onClick={e => e.stopPropagation()}
                              placeholder={`${dictionary.quiz_option_placeholder} ${oIndex + 1}`}
                              className={`h-8 border-0 shadow-none p-0 text-sm focus-visible:ring-0 bg-transparent flex-1 ${isCorrect ? "text-green-800 placeholder:text-green-400" : ""}`}
                            />
                            {q.options.length > 2 && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  const newOpts = [...q.options]
                                  newOpts.splice(oIndex, 1)
                                  const newCorrect = q.correctAnswer === opt ? "" : q.correctAnswer
                                  handleUpdateQuestion(qIndex, { options: newOpts, correctAnswer: newCorrect })
                                }}
                                className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded-md shrink-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {q.options.length < 5 && (
                        <button
                          onClick={() => handleUpdateQuestion(qIndex, { options: [...q.options, ""] })}
                          className="w-full flex items-center justify-center gap-1.5 h-9 text-xs text-slate-400 hover:text-red-500 border-2 border-dashed border-slate-200 hover:border-red-200 rounded-xl transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {dictionary.quiz_add_option}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── True / False ────────────────────────────────────── */}
                {q.type === "true_false" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {dictionary.quiz_options}
                    </Label>
                    <div className="flex gap-3">
                      {[
                        { value: "true",  label: dictionary.lq_true,  Icon: CheckCircle, active: "border-green-400 bg-green-50", activeText: "text-green-700", activeIcon: "text-green-500" },
                        { value: "false", label: dictionary.lq_false, Icon: XCircle,     active: "border-red-400 bg-red-50",   activeText: "text-red-700",   activeIcon: "text-red-400" },
                      ].map(({ value, label, Icon, active, activeText, activeIcon }) => {
                        const selected = q.correctAnswer === value
                        return (
                          <button
                            key={value}
                            onClick={() => handleUpdateQuestion(qIndex, { correctAnswer: value })}
                            className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all ${
                              selected ? active : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Icon className={`h-7 w-7 transition-colors ${selected ? activeIcon : "text-gray-300"}`} />
                            <span className={`text-sm font-semibold transition-colors ${selected ? activeText : "text-gray-400"}`}>
                              {label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Multiple Select ─────────────────────────────────── */}
                {q.type === "multiple_select" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {dictionary.quiz_options}
                      </Label>
                      <p className="text-xs text-slate-400">{dictionary.lq_select_multiple_hint}</p>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt: string, oIndex: number) => {
                        const correctArr: string[] = Array.isArray(q.correctAnswer) ? q.correctAnswer : []
                        const isCorrect = opt !== "" && correctArr.includes(opt)
                        const toggleCorrect = () => {
                          if (!opt) return
                          const updated = isCorrect
                            ? correctArr.filter((a: string) => a !== opt)
                            : [...correctArr, opt]
                          handleUpdateQuestion(qIndex, { correctAnswer: updated })
                        }
                        return (
                          <div
                            key={oIndex}
                            onClick={toggleCorrect}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                              isCorrect ? "border-green-400 bg-green-50/50" : "border-gray-100 bg-white hover:border-gray-200"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isCorrect ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"
                            }`}>
                              {isCorrect && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isCorrect ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                            }`}>
                              {labels[oIndex] ?? oIndex + 1}
                            </div>
                            <Input
                              value={opt}
                              onChange={e => {
                                const newOpts = [...q.options]
                                const oldVal = newOpts[oIndex]
                                newOpts[oIndex] = e.target.value
                                const newCorrect = correctArr.map((a: string) => a === oldVal ? e.target.value : a)
                                handleUpdateQuestion(qIndex, { options: newOpts, correctAnswer: newCorrect })
                              }}
                              onClick={e => e.stopPropagation()}
                              placeholder={`${dictionary.quiz_option_placeholder} ${oIndex + 1}`}
                              className={`h-8 border-0 shadow-none p-0 text-sm focus-visible:ring-0 bg-transparent flex-1 ${isCorrect ? "text-green-800 placeholder:text-green-400" : ""}`}
                            />
                            {q.options.length > 2 && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  const newOpts = [...q.options]
                                  newOpts.splice(oIndex, 1)
                                  const newCorrect = correctArr.filter((a: string) => a !== opt)
                                  handleUpdateQuestion(qIndex, { options: newOpts, correctAnswer: newCorrect })
                                }}
                                className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded-md shrink-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {q.options.length < 5 && (
                        <button
                          onClick={() => handleUpdateQuestion(qIndex, { options: [...q.options, ""] })}
                          className="w-full flex items-center justify-center gap-1.5 h-9 text-xs text-slate-400 hover:text-red-500 border-2 border-dashed border-slate-200 hover:border-red-200 rounded-xl transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {dictionary.quiz_add_option}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Short Answer ────────────────────────────────────── */}
                {q.type === "short_answer" && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-700">{dictionary.lq_short_answer_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        <Button onClick={handleAddQuestion} className="w-full bg-white border border-dashed border-red-300 text-red-700 hover:bg-red-50 h-12 rounded-xl transition-all">
          <Plus className="h-4 w-4 mr-2" /> {dictionary.lq_add_question}
        </Button>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openPreview}
            disabled={questions.length === 0}
            className="rounded-full px-6 h-12 border-red-200 text-red-600 hover:bg-red-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {dictionary.lq_preview}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCloneOpen(true)}
            className="rounded-full px-6 h-12 border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <ClipboardCopy className="h-4 w-4 mr-2" />
            {dictionary.lq_clone_btn}
          </Button>
        </div>
        <Button onClick={handleSaveQuiz} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 h-12 shadow-md">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {dictionary.lq_save}
        </Button>
      </div>

      {/* ── Preview Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-gray-100">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-red-500" />
              {dictionary.lq_preview_title}
            </SheetTitle>
            <SheetDescription>{dictionary.lq_preview_desc}</SheetDescription>
          </SheetHeader>

          {previewSubmitted ? (
            <div className="mt-8 space-y-6">
              {/* Score result */}
              <div className={`rounded-2xl p-6 text-center ${previewPassed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex justify-center mb-3">
                  {previewPassed
                    ? <Trophy className="h-10 w-10 text-green-500" />
                    : <XCircle className="h-10 w-10 text-red-400" />}
                </div>
                <p className={`text-2xl font-bold ${previewPassed ? "text-green-700" : "text-red-600"}`}>
                  {previewPassed ? dictionary.lq_preview_passed : dictionary.lq_preview_failed}
                </p>
                <p className="text-4xl font-black mt-1 mb-1">{previewScore}%</p>
                <p className="text-sm text-gray-500">{dictionary.lq_preview_passing_required}: {passingScore}%</p>
              </div>

              {/* Per-question review */}
              {showCorrectAnswers && <div className="space-y-4">
                {questions.map((q, i) => {
                  const labels = ["A", "B", "C", "D", "E"]

                  if (q.type === "short_answer") {
                    return (
                      <div key={i} className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-sm font-medium text-gray-800">{q.body}</p>
                        </div>
                        <div className="ml-6 p-3 bg-white rounded-lg border border-amber-100 text-sm text-gray-600 min-h-[2.5rem]">
                          {previewAnswers[i] || <span className="text-gray-400">—</span>}
                        </div>
                        <p className="ml-6 mt-2 text-xs font-medium text-amber-600">{dictionary.lq_manual_grading_badge}</p>
                      </div>
                    )
                  }

                  const correct = isPreviewCorrect(q, i)

                  if (q.type === "true_false") {
                    return (
                      <div key={i} className={`rounded-xl border-2 p-4 ${correct ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"}`}>
                        <div className="flex items-start gap-2 mb-3">
                          {correct ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
                          <p className="text-sm font-medium text-gray-800">{q.body}</p>
                        </div>
                        <div className="flex gap-2 ml-6">
                          {["true", "false"].map(val => {
                            const isRight = q.correctAnswer === val
                            const isChosen = previewAnswers[i] === val
                            const label = val === "true" ? dictionary.lq_true : dictionary.lq_false
                            return (
                              <div key={val} className={`flex-1 py-2 px-3 rounded-lg text-sm text-center font-medium ${
                                isRight ? "bg-green-100 text-green-800"
                                : isChosen ? "bg-red-100 text-red-700"
                                : "text-gray-400"
                              }`}>
                                {label}
                                {isRight && <CheckCircle className="h-3.5 w-3.5 inline ml-1 text-green-500" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  if (q.type === "multiple_select") {
                    const chosen: string[] = previewAnswers[i] || []
                    const correctArr: string[] = q.correctAnswer || []
                    return (
                      <div key={i} className={`rounded-xl border-2 p-4 ${correct ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"}`}>
                        <div className="flex items-start gap-2 mb-3">
                          {correct ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
                          <p className="text-sm font-medium text-gray-800">{q.body}</p>
                        </div>
                        <div className="space-y-1.5 ml-6">
                          {q.options.map((opt: string, oi: number) => {
                            const isRight = correctArr.includes(opt)
                            const isChosen = chosen.includes(opt)
                            return (
                              <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                isRight ? "bg-green-100 text-green-800 font-medium"
                                : isChosen ? "bg-red-100 text-red-700"
                                : "text-gray-500"
                              }`}>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                  isRight ? "border-green-500 bg-green-500" : isChosen ? "border-red-400" : "border-gray-300"
                                }`}>
                                  {isRight && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <span className="text-xs font-bold w-4">{labels[oi]}</span>
                                {opt}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  // multiple_choice
                  return (
                    <div key={i} className={`rounded-xl border-2 p-4 ${correct ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"}`}>
                      <div className="flex items-start gap-2 mb-3">
                        {correct ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
                        <p className="text-sm font-medium text-gray-800">{q.body}</p>
                      </div>
                      <div className="space-y-1.5 ml-6">
                        {q.options.map((opt: string, oi: number) => {
                          const isChosen = previewAnswers[i] === opt
                          const isRight = q.correctAnswer === opt
                          return (
                            <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                              isRight ? "bg-green-100 text-green-800 font-medium"
                              : isChosen ? "bg-red-100 text-red-700"
                              : "text-gray-500"
                            }`}>
                              <span className="text-xs font-bold w-4">{labels[oi]}</span>
                              {opt}
                              {isRight && <CheckCircle className="h-3.5 w-3.5 ml-auto text-green-500" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>}

              {/* Per-question review — only shown if showCorrectAnswers is on */}
              {!showCorrectAnswers && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                  <EyeOff className="h-4 w-4 shrink-0" />
                  {dictionary.lq_preview_answers_hidden}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => { setPreviewAnswers({}); setPreviewSubmitted(false) }}>
                  {dictionary.lq_preview_retry}
                </Button>
                <Button className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={() => setPreviewOpen(false)}>
                  {dictionary.lq_preview_close}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {questions.map((q, i) => {
                const labels = ["A", "B", "C", "D", "E"]
                return (
                  <div key={i} className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-red-50/60 to-orange-50/30 border-b border-gray-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-red-600">{i + 1}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{q.body}</p>
                    </div>

                    <div className="p-3 space-y-2">
                      {/* multiple_choice */}
                      {q.type === "multiple_choice" && q.options.map((opt: string, oi: number) => {
                        const selected = previewAnswers[i] === opt
                        return (
                          <button key={oi} onClick={() => setPreviewAnswers(prev => ({ ...prev, [i]: opt }))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                              selected ? "border-red-400 bg-red-50 text-red-800 font-medium" : "border-gray-100 hover:border-gray-200 text-gray-700"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                              {labels[oi]}
                            </div>
                            {opt}
                          </button>
                        )
                      })}

                      {/* true_false */}
                      {q.type === "true_false" && (
                        <div className="flex gap-2">
                          {["true", "false"].map(val => {
                            const selected = previewAnswers[i] === val
                            const label = val === "true" ? dictionary.lq_true : dictionary.lq_false
                            return (
                              <button key={val} onClick={() => setPreviewAnswers(prev => ({ ...prev, [i]: val }))}
                                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                  selected ? "border-red-400 bg-red-50 text-red-800" : "border-gray-100 hover:border-gray-200 text-gray-600"
                                }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* multiple_select */}
                      {q.type === "multiple_select" && q.options.map((opt: string, oi: number) => {
                        const chosen: string[] = previewAnswers[i] || []
                        const selected = chosen.includes(opt)
                        return (
                          <button key={oi}
                            onClick={() => {
                              const updated = selected ? chosen.filter(a => a !== opt) : [...chosen, opt]
                              setPreviewAnswers(prev => ({ ...prev, [i]: updated }))
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                              selected ? "border-red-400 bg-red-50 text-red-800 font-medium" : "border-gray-100 hover:border-gray-200 text-gray-700"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "border-red-500 bg-red-500" : "border-gray-300"}`}>
                              {selected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                              {labels[oi]}
                            </div>
                            {opt}
                          </button>
                        )
                      })}

                      {/* short_answer */}
                      {q.type === "short_answer" && (
                        <textarea
                          value={previewAnswers[i] || ""}
                          onChange={e => setPreviewAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder={dictionary.lq_short_answer_placeholder}
                          rows={3}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors placeholder:text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>
                )
              })}

              <Button onClick={handlePreviewSubmit} className="w-full bg-red-500 hover:bg-red-600 text-white rounded-full h-12 mt-2">
                {dictionary.lq_preview_submit}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Clone Sheet ───────────────────────────────────────────────────── */}
      <Sheet open={cloneOpen} onOpenChange={setCloneOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-gray-100">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ClipboardCopy className="h-5 w-5 text-gray-500" />
              {dictionary.lq_clone_title}
            </SheetTitle>
            <SheetDescription>{dictionary.lq_clone_desc}</SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-2">
            {lessonsWithQuiz.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{dictionary.lq_clone_no_quizzes}</p>
            ) : (
              lessonsWithQuiz.map((lesson: any) => (
                <button
                  key={lesson.id}
                  disabled={cloneLoading}
                  onClick={() => handleClone(lesson)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/40 text-left transition-all disabled:opacity-50"
                >
                  <div className="p-1.5 bg-red-100 rounded-lg shrink-0 mt-0.5">
                    <HelpCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{lesson.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.sectionTitle}</p>
                  </div>
                  {cloneLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto shrink-0 mt-0.5" />}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dictionary.lq_delete_confirm}</AlertDialogTitle>
            <AlertDialogDescription>{dictionary.lq_delete_confirm_desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dictionary.lq_cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion} className="bg-red-600 hover:bg-red-700">
              {dictionary.lq_delete_btn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
