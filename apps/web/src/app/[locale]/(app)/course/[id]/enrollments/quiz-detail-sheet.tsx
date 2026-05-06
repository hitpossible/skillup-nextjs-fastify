"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { CheckCircle2, XCircle, ClipboardList, ChevronDown, ChevronUp } from "lucide-react"

interface QuizAttempt {
  attemptId: string
  attemptNumber: number
  score: number | null
  passed: boolean | null
  submittedAt: string | null
  answers: {
    questionId: string
    questionBody: string
    response: unknown
    options: any
    correctAnswer: unknown
    isCorrect: boolean | null
    score: number | null
    points: number
  }[]
}

interface QuizData {
  quizId: string
  title: string
  passingScore: number | null
  attempts: QuizAttempt[]
}

interface Props {
  open: boolean
  onClose: () => void
  userName: string
  courseId: string
  userId: string
  locale: string
  dictionary: any
}

function parseAnswer(val: unknown): string {
  if (val === null || val === undefined || val === "") return "–"
  if (typeof val === "string") return val
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}

function fmt(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function AttemptBlock({ attempt, d, locale }: { attempt: QuizAttempt; d: any; locale: string }) {
  const [expanded, setExpanded] = useState(attempt.attemptNumber === 1)

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white">
      {/* Attempt header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">
              {d.quiz_detail_attempt} {attempt.attemptNumber}
            </span>
            {attempt.submittedAt && (
              <span className="text-[10px] text-gray-400 sm:hidden">{fmt(attempt.submittedAt, locale)}</span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}>
            {attempt.passed ? (
              <><CheckCircle2 className="h-3 w-3" /> {d.quiz_detail_passed}</>
            ) : (
              <><XCircle className="h-3 w-3" /> {d.quiz_detail_failed}</>
            )}
          </span>
          <span className="text-sm font-black text-gray-900">{attempt.score ?? "–"}%</span>
        </div>
        <div className="flex items-center gap-3">
          {attempt.submittedAt && (
            <span className="text-xs text-gray-400 hidden sm:block">{fmt(attempt.submittedAt, locale)}</span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Answers */}
      {expanded && (
        <div className="divide-y divide-gray-50">
          {attempt.answers.map((ans, i) => (
            <div key={ans.questionId} className="px-5 py-5 hover:bg-gray-50/30 transition-colors">
              {/* Question */}
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-gray-900 flex items-center justify-center text-[11px] font-bold text-white mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[15px] text-gray-900 font-semibold leading-relaxed">{ans.questionBody}</p>
              </div>

              {/* Options list if available */}
              {Array.isArray(ans.options) && ans.options.length > 0 ? (
                <div className="ml-9 space-y-2 mb-4">
                  {ans.options.map((opt: string, optIdx: number) => {
                    const isUserChoice = ans.response === opt;
                    const isCorrect = ans.correctAnswer === opt;
                    
                    let borderClass = "border-gray-100";
                    let bgClass = "bg-white";
                    let textClass = "text-gray-600";
                    let icon = null;

                    if (isUserChoice) {
                      if (ans.isCorrect) {
                        borderClass = "border-green-500 shadow-sm shadow-green-100";
                        bgClass = "bg-green-50";
                        textClass = "text-green-800 font-bold";
                        icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
                      } else {
                        borderClass = "border-red-400";
                        bgClass = "bg-red-50";
                        textClass = "text-red-700 font-bold";
                        icon = <XCircle className="h-4 w-4 text-red-500" />;
                      }
                    } else if (isCorrect) {
                       borderClass = "border-green-200 border-dashed";
                       bgClass = "bg-green-50/30";
                       textClass = "text-green-700 font-medium";
                    }

                    return (
                      <div key={optIdx} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${borderClass} ${bgClass} ${textClass}`}>
                        <div className="flex items-center gap-3">
                           <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-bold shrink-0 ${isUserChoice ? 'bg-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                             {String.fromCharCode(65 + optIdx)}
                           </span>
                           <span>{parseAnswer(opt)}</span>
                        </div>
                        {icon}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Fallback for other types or no options */
                <div className="ml-9 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className={`rounded-xl px-4 py-3 border ${
                    ans.isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{d.quiz_detail_your_answer}</p>
                    <div className="flex items-center gap-2">
                      {ans.isCorrect
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      }
                      <p className="text-sm font-bold text-gray-900">
                        {parseAnswer(ans.response)}
                      </p>
                    </div>
                  </div>

                  {!ans.isCorrect && (
                    <div className="rounded-xl px-4 py-3 bg-green-50 border border-green-200 border-dashed">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{d.quiz_detail_correct_answer}</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <p className="text-sm font-bold text-gray-900">
                          {parseAnswer(ans.correctAnswer)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Points */}
              <div className="ml-9 flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <span className={ans.isCorrect ? "text-green-600" : "text-red-400"}>
                  {ans.score ?? 0} pts
                </span>
                <span className="text-gray-200">|</span>
                <span>Max {ans.points} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function QuizDetailSheet({ open, onClose, userName, courseId, userId, locale, dictionary: d }: Props) {
  const [data, setData] = useState<QuizData[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/courses/${courseId}/enrollments/${userId}/quizzes`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setData([])
      }
    } catch (err) {
      console.error("Failed to load quiz details:", err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      load()
    } else {
      setData(null)
    }
  }, [open, courseId, userId])

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-gray-100">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-red-500" />
            {d.quiz_detail_title}
          </SheetTitle>
          <SheetDescription className="font-medium text-gray-700">{userName}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && data !== null && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ClipboardList className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{d.quiz_detail_no_quiz}</p>
            </div>
          )}

          {!loading && data !== null && data.map(quiz => (
            <div key={quiz.quizId} className="space-y-3">
              {/* Quiz header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">{quiz.title}</h3>
                {quiz.passingScore !== null && (
                  <span className="text-xs text-gray-400">
                    {d.quiz_detail_passing}: {quiz.passingScore}%
                  </span>
                )}
              </div>

              {quiz.attempts.length === 0 ? (
                <p className="text-xs text-gray-400 pl-1">{d.quiz_detail_no_quiz}</p>
              ) : (
                <div className="space-y-2">
                  {quiz.attempts.map(attempt => (
                    <AttemptBlock key={attempt.attemptId} attempt={attempt} d={d} locale={locale} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
