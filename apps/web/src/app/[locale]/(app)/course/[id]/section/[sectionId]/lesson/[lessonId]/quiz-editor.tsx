"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { upsertLessonQuizAction } from "./actions"
import { Loader2, Save, Plus, Trash2, CheckCircle, XCircle, HelpCircle, X, Eye, Trophy } from "lucide-react"
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

export function QuizEditor({ 
  courseId,
  sectionId,
  initialLesson,
  dictionary,
  locale: _locale
}: { 
  courseId: string,
  sectionId: string,
  initialLesson: any,
  dictionary: any,
  locale: string
}) {
  const quiz = initialLesson.quizzes?.[0] || {
    title: initialLesson.title,
    type: "graded",
    passingScore: 60,
    timeLimitSeconds: 0,
    maxAttempts: 0,
    shuffleQuestions: false,
    questions: []
  }

  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(quiz.title)
  const [passingScore, setPassingScore] = useState(quiz.passingScore)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [questions, setQuestions] = useState<any[]>(quiz.questions || [])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, string>>({})
  const [previewSubmitted, setPreviewSubmitted] = useState(false)

  const { toast } = useToast()

  const openPreview = () => {
    setPreviewAnswers({})
    setPreviewSubmitted(false)
    setPreviewOpen(true)
  }

  const handlePreviewSubmit = () => {
    const unanswered = questions.some((_, i) => !previewAnswers[i])
    if (unanswered) {
      toast({ variant: "destructive", title: dictionary.lq_preview_answer_all })
      return
    }
    setPreviewSubmitted(true)
  }

  const previewScore = previewSubmitted
    ? Math.round(
        (questions.filter((q, i) => previewAnswers[i] === q.correctAnswer).length /
          questions.length) *
          100
      )
    : 0
  const previewPassed = previewScore >= Number(passingScore)

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: "", // empty id means new question
        type: "multiple_choice",
        body: "",
        options: ["", ""],
        correctAnswer: "",
        points: 1,
        sortOrder: questions.length
      }
    ])
  }

  const handleUpdateQuestion = (index: number, updates: any) => {
    const newQ = [...questions]
    newQ[index] = { ...newQ[index], ...updates }
    setQuestions(newQ)
  }

  const confirmDeleteQuestion = () => {
    if (deleteIndex === null) return
    const newQ = [...questions]
    newQ.splice(deleteIndex, 1)
    setQuestions(newQ)
    setDeleteIndex(null)
  }

  const handleSaveQuiz = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qLabel = `${dictionary.lq_question_no} ${i + 1}`
      if (!q.body.trim()) {
        return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_empty}` })
      }
      const validOpts = q.options.filter((o: string) => o.trim() !== "")
      if (validOpts.length < 2) {
        return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_options}` })
      }
      if (!q.correctAnswer) {
        return toast({ variant: "destructive", title: dictionary.incomplete_info, description: `${qLabel}: ${dictionary.lq_validation_correct}` })
      }
      q.options = validOpts
    }

    setLoading(true)
    const res = await upsertLessonQuizAction(courseId, sectionId, initialLesson.id, {
      title,
      type: "graded",
      passingScore: Number(passingScore) || 60,
      timeLimitSeconds: null,
      maxAttempts: null,
      shuffleQuestions: false,
      questions
    })
    setLoading(false)

    if (res.error) {
      toast({ variant: "destructive", title: "Error", description: res.error })
    } else {
      toast({ title: dictionary.save_success })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <CardContent className="p-6 space-y-4">
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
        </CardContent>
      </Card>

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
                <Button variant="ghost" size="icon" onClick={() => setDeleteIndex(qIndex)} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
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

                {/* Options */}
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
                            isCorrect
                              ? "border-green-400 bg-green-50/50"
                              : "border-gray-100 bg-white hover:border-gray-200"
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
              </CardContent>
            </Card>
          )
        })}

        <Button onClick={handleAddQuestion} className="w-full bg-white border border-dashed border-red-300 text-red-700 hover:bg-red-50 h-12 rounded-xl transition-all">
          <Plus className="h-4 w-4 mr-2" /> {dictionary.lq_add_question}
        </Button>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={openPreview}
          disabled={questions.length === 0}
          className="rounded-full px-6 h-12 border-red-200 text-red-600 hover:bg-red-50"
        >
          <Eye className="h-4 w-4 mr-2" />
          {dictionary.lq_preview}
        </Button>
        <Button onClick={handleSaveQuiz} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 h-12 shadow-md">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {dictionary.lq_save}
        </Button>
      </div>

      {/* Quiz Preview Sheet */}
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
                    : <XCircle className="h-10 w-10 text-red-400" />
                  }
                </div>
                <p className={`text-2xl font-bold ${previewPassed ? "text-green-700" : "text-red-600"}`}>
                  {previewPassed ? dictionary.lq_preview_passed : dictionary.lq_preview_failed}
                </p>
                <p className="text-4xl font-black mt-1 mb-1">{previewScore}%</p>
                <p className="text-sm text-gray-500">
                  {dictionary.lq_preview_passing_required}: {passingScore}%
                </p>
              </div>

              {/* Per-question review */}
              <div className="space-y-4">
                {questions.map((q, i) => {
                  const labels = ["A", "B", "C", "D", "E"]
                  const isCorrect = previewAnswers[i] === q.correctAnswer
                  return (
                    <div key={i} className={`rounded-xl border-2 p-4 ${isCorrect ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"}`}>
                      <div className="flex items-start gap-2 mb-3">
                        {isCorrect
                          ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        }
                        <p className="text-sm font-medium text-gray-800">{q.body}</p>
                      </div>
                      <div className="space-y-1.5 ml-6">
                        {q.options.map((opt: string, oi: number) => {
                          const isChosen = previewAnswers[i] === opt
                          const isRight = q.correctAnswer === opt
                          return (
                            <div
                              key={oi}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                isRight ? "bg-green-100 text-green-800 font-medium"
                                : isChosen ? "bg-red-100 text-red-700"
                                : "text-gray-500"
                              }`}
                            >
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
              </div>

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
                      {q.options.map((opt: string, oi: number) => {
                        const selected = previewAnswers[i] === opt
                        return (
                          <button
                            key={oi}
                            onClick={() => setPreviewAnswers(prev => ({ ...prev, [i]: opt }))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                              selected
                                ? "border-red-400 bg-red-50 text-red-800 font-medium"
                                : "border-gray-100 hover:border-gray-200 text-gray-700"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              selected ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"
                            }`}>
                              {labels[oi]}
                            </div>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <Button
                onClick={handlePreviewSubmit}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-full h-12 mt-2"
              >
                {dictionary.lq_preview_submit}
              </Button>
            </div>
          )}
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
