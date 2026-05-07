"use client"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft,
  PlayCircle, FileText, HelpCircle, Paperclip, Loader2,
  ChevronDown, ChevronUp, BookOpen, Trophy, Lock, ExternalLink, Award
} from "lucide-react"
import { markLessonCompleteAction, saveLessonProgressAction, startQuizAttemptAction, submitQuizAttemptAction, getLastQuizAttemptAction, getCertificateAction } from "./actions"
import { cn } from "@/lib/utils"
import { CertificateModal } from "./certificate-modal"

interface LessonProgress {
  lessonId: string
  status: string
  watchSeconds: number
  completedAt: string | null
}

interface VideoQuestion {
  id: string
  timestampSeconds: number
  body: string
  options: string[]
  correctAnswer: string
  explanation?: string
  isBlocking: boolean
}

interface QuizQuestion {
  id: string
  type: string
  body: string
  options: string[] | null
  points: number
  sortOrder: number
}

interface QuizAttempt {
  attemptId: string
  attemptNumber: number
  startedAt: string
  expiresAt: string | null
  questions: QuizQuestion[]
  showCorrectAnswers?: boolean
  requireAllSections?: boolean
  shuffleQuestions?: boolean
  passingScore?: number
}

interface QuizResult {
  attemptId: string
  attemptNumber: number
  score: number
  passingScore: number
  passed: boolean
  answers: { questionId: string; questionBody?: string; questionType?: string; questionOptions?: string[]; isCorrect: boolean; score: number; response?: string | string[]; correctAnswer: string | string[] | null; explanation: string | null }[]
}

interface Lesson {
  id: string
  title: string
  type: string
  contentUrl: string | null
  durationSeconds: number | null
  isFreePreview: boolean
  seekMode?: string
  quizId?: string | null
  quizRequireAllSections?: boolean
  attachments?: { title: string; url: string }[]
  videoQuestions?: VideoQuestion[]
}

interface Section {
  id: string
  title: string
  lessons: Lesson[]
}

interface Enrollment {
  id: string
  status: string
  progressPercent: number
}

interface CoursePlayerProps {
  course: { id: string; title: string; sections: Section[] }
  enrollment: Enrollment
  initialProgress: LessonProgress[]
  initialLessonId?: string
  dictionary: any
  locale: string
  user?: { sub: string; fullName?: string }
}

export function CoursePlayer({ course, enrollment, initialProgress, initialLessonId, dictionary, locale, user }: CoursePlayerProps) {
  const { toast } = useToast()

  // flatten all lessons
  const allLessons = course.sections.flatMap(s => s.lessons)
  const firstLesson = initialLessonId
    ? allLessons.find(l => l.id === initialLessonId) ?? allLessons[0]
    : allLessons[0]

  const router = useRouter()
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(firstLesson ?? null)

  const selectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson)
    router.replace(`?lesson=${lesson.id}`, { scroll: false })
  }
  const [progress, setProgress] = useState<LessonProgress[]>(initialProgress)
  const [completingLesson, setCompletingLesson] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(course.sections.map(s => s.id)))
  const [activeQuiz, setActiveQuiz] = useState<VideoQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [shownQuizIds, setShownQuizIds] = useState<Set<string>>(new Set())

  // Standalone quiz (quiz-type lesson)
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | string[]>>({})
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [quizStarting, setQuizStarting] = useState(false)
  const [quizSubmitting, setQuizSubmitting] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizSettings, setQuizSettings] = useState<{ showCorrectAnswers: boolean; maxAttempts: number | null } | null>(null)
  const [maxWatchedTime, setMaxWatchedTime] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [certificate, setCertificate] = useState<{ certificateNumber: string; issuedAt: string; course: { title: string } } | null>(null)
  const [certModalOpen, setCertModalOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // YouTube API Handling
  const [ytPlayer, setYtPlayer] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const ytContainerRef = useRef<HTMLDivElement>(null)
  const currentTimeRef = useRef(0)
  const ytPlayerRef = useRef<any>(null)
  const maxWatchedTimeRef = useRef(0)

  const isCompleted = (lessonId: string) => progress.find(p => p.lessonId === lessonId)?.status === "completed"
  const completedCount = allLessons.filter(l => isCompleted(l.id)).length
  const progressPercent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0
  // Ref so interval callbacks always read the latest progress without needing to re-create the interval
  const isCompletedRef = useRef(isCompleted)
  isCompletedRef.current = isCompleted

  // Auto-fetch certificate when course is completed
  useEffect(() => {
    if (progressPercent !== 100 || !user?.sub || certificate) return
    getCertificateAction(user.sub, course.id).then(res => {
      if (res.success && res.certificate) setCertificate(res.certificate)
    })
  }, [progressPercent])

  const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  const ytMatch = currentLesson?.contentUrl?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
  const isYoutubeLesson = !!(ytMatch && ytMatch[2] && ytMatch[2].length === 11)

  // In-video quiz: check timestamp every 500ms (native video only)
  useEffect(() => {
    if (!currentLesson?.videoQuestions?.length) return
    const ytMatch = currentLesson.contentUrl?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
    const isYoutube = ytMatch && ytMatch[2] && ytMatch[2].length === 11
    if (isYoutube || !videoRef.current) return

    const interval = setInterval(() => {
      const video = videoRef.current
      if (!video || video.paused) return
      const t = Math.floor(video.currentTime)
      const quiz = currentLesson.videoQuestions!.find(
        q => Math.abs(q.timestampSeconds - t) <= 1 && !shownQuizIds.has(q.id)
      )
      if (quiz) {
        if (quiz.isBlocking) video.pause()
        setActiveQuiz(quiz)
        setSelectedAnswer(null)
        setQuizAnswered(false)
        setShownQuizIds(prev => new Set([...prev, quiz.id]))
      }
    }, 500)
    return () => clearInterval(interval)
  }, [currentLesson, shownQuizIds])

  // Reset quiz state and maxWatchedTime on lesson change
  useEffect(() => {
    setActiveQuiz(null)
    setSelectedAnswer(null)
    setQuizAnswered(false)
    setShownQuizIds(new Set())
    setYtPlayer(null)
    setDuration(0)
    setQuizAttempt(null)
    setQuizAnswers({})
    setQuizResult(null)
    setQuizQuestions([])
    setQuizSettings(null)

    const savedProgress = progress.find(p => p.lessonId === currentLesson?.id)
    const initialTime = savedProgress?.watchSeconds || 0
    setCurrentTime(initialTime)
    setMaxWatchedTime(initialTime)
    maxWatchedTimeRef.current = initialTime

    const isNativeVideo = !currentLesson?.contentUrl?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})/)
    if (isNativeVideo && videoRef.current) {
      videoRef.current.currentTime = initialTime
    }

    // Auto-load last attempt when revisiting a completed quiz lesson
    if (currentLesson?.type === "quiz" && currentLesson.quizId) {
      const lessonDone = savedProgress?.status === "completed"
      if (lessonDone) {
        getLastQuizAttemptAction(currentLesson.quizId).then(res => {
          if (res.error || !res.result) return
          const r = res.result
          setQuizSettings({ showCorrectAnswers: r.showCorrectAnswers ?? true, maxAttempts: r.maxAttempts ?? null })
          // rebuild quizQuestions and quizAnswers from stored answer data
          const rebuilt: Record<string, string | string[]> = {}
          const rebuiltQuestions: QuizQuestion[] = []
          for (const a of r.answers ?? []) {
            if (a.response != null) rebuilt[a.questionId] = a.response
            if (a.questionBody != null) {
              rebuiltQuestions.push({ id: a.questionId, type: a.questionType ?? "multiple_choice", body: a.questionBody, options: a.questionOptions ?? null, points: 0, sortOrder: 0 })
            }
          }
          setQuizQuestions(rebuiltQuestions)
          setQuizAnswers(rebuilt)
          setQuizResult({
            attemptId: r.attemptId,
            attemptNumber: r.attemptNumber,
            score: r.score,
            passingScore: r.passingScore,
            passed: r.passed,
            answers: r.answers,
          })
        })
      }
    }
  }, [currentLesson?.id])

  // Seek YouTube player to saved position once it's ready
  useEffect(() => {
    if (!ytPlayer) return
    const savedProgress = progress.find(p => p.lessonId === currentLesson?.id)
    const initialTime = savedProgress?.watchSeconds || 0
    if (initialTime > 0) {
      try {
        ytPlayer.seekTo(initialTime, true)
      } catch (err) {
        console.warn("YouTube seek failed:", err)
      }
    }
  }, [ytPlayer])

  // Periodic progress saving (every 5 seconds) — skip if lesson already completed
  useEffect(() => {
    if (!currentLesson) return
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0 && !isCompletedRef.current(currentLesson.id)) {
        saveLessonProgressAction(course.id, enrollment.id, currentLesson.id, Math.floor(currentTimeRef.current))
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      if (currentTimeRef.current > 0 && !isCompletedRef.current(currentLesson.id)) {
        saveLessonProgressAction(course.id, enrollment.id, currentLesson.id, Math.floor(currentTimeRef.current))
      }
    }
  }, [currentLesson?.id, enrollment.id, course.id])

  // Seek lock: prevent seeking forward beyond max watched time
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    
    const now = video.currentTime
    setCurrentTime(now)
    currentTimeRef.current = now

    // Update duration if not set
    if (duration === 0 && video.duration > 0) {
      setDuration(video.duration)
    }

    const isLessonDone = isCompletedRef.current(currentLesson?.id || "")
    if (!currentLesson || currentLesson.seekMode !== "locked" || isLessonDone) return

    if (now > maxWatchedTime + 2) {
      video.currentTime = maxWatchedTime
    } else if (now > maxWatchedTime) {
      setMaxWatchedTime(now)
      maxWatchedTimeRef.current = now
    }
  }

  const handleAnswerQuiz = () => {
    if (!selectedAnswer) return
    setQuizAnswered(true)
  }

  const handleDismissQuiz = () => {
    const wasBlocking = currentLesson?.videoQuestions?.find(q => q.id === activeQuiz?.id)?.isBlocking
    setActiveQuiz(null)
    if (!wasBlocking) return
    if (ytPlayerRef.current?.playVideo) {
      ytPlayerRef.current.playVideo()
    } else if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleMarkComplete = async (watchSecondsAtCompletion?: number) => {
    if (!currentLesson) return
    setCompletingLesson(true)
    const watchSeconds = watchSecondsAtCompletion ?? (currentTimeRef.current > 0 ? Math.floor(currentTimeRef.current) : undefined)
    const res = await markLessonCompleteAction(enrollment.id, currentLesson.id, watchSeconds)
    setCompletingLesson(false)
    if (res.error) {
      toast({ variant: "destructive", title: dictionary.error || "Error", description: res.error })
      return
    }
    setProgress(prev => {
      const existing = prev.find(p => p.lessonId === currentLesson.id)
      if (existing) return prev.map(p => p.lessonId === currentLesson.id ? { ...p, status: "completed" } : p)
      return [...prev, { lessonId: currentLesson.id, status: "completed", watchSeconds: 0, completedAt: new Date().toISOString() }]
    })
    toast({ title: `✅ ${dictionary.completed}!` })
    if (nextLesson) setTimeout(() => selectLesson(nextLesson), 1000)
  }

  const handleMultiSelectToggle = (questionId: string, opt: string) => {
    setQuizAnswers(prev => {
      const current = (prev[questionId] as string[] | undefined) || []
      const updated = current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt]
      return { ...prev, [questionId]: updated }
    })
  }

  const handleStartQuiz = async () => {
    if (!currentLesson?.quizId) return
    setQuizStarting(true)
    const res = await startQuizAttemptAction(currentLesson.quizId)
    setQuizStarting(false)
    if (res.error) {
      toast({ variant: "destructive", title: dictionary.error_quiz || "Error", description: res.error })
      return
    }
    setQuizAttempt(res.attempt)
    setQuizQuestions(res.attempt?.questions || [])
    setQuizSettings({ showCorrectAnswers: res.attempt?.showCorrectAnswers ?? true, maxAttempts: res.attempt?.maxAttempts ?? null })
    setQuizAnswers({})
    setQuizResult(null)
  }

  const handleSubmitQuiz = async () => {
    if (!quizAttempt) return
    const answers = quizAttempt.questions.map(q => ({
      questionId: q.id,
      response: q.type === "multiple_select"
        ? ((quizAnswers[q.id] as string[]) || [])
        : (quizAnswers[q.id] as string) ?? "",
    }))
    setQuizSubmitting(true)
    const res = await submitQuizAttemptAction(quizAttempt.attemptId, answers)
    setQuizSubmitting(false)
    if (res.error) {
      toast({ variant: "destructive", title: dictionary.error_submit || "Error", description: res.error })
      return
    }
    setQuizResult(res.result)
    setQuizAttempt(null)
    if (res.result.passed) {
      await handleMarkComplete()
    }
  }

  // YouTube API Handling
  useEffect(() => {
    if (currentLesson?.type !== "video" || !currentLesson.contentUrl) return

    const ytMatch = currentLesson.contentUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    const ytId = ytMatch && ytMatch[2] && ytMatch[2].length === 11 ? ytMatch[2] : null;
    if (!ytId) return

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !ytContainerRef.current) return

      try {
        // Clear existing content safely
        ytContainerRef.current.innerHTML = '<div id="yt-iframe"></div>'

        const player = new window.YT.Player('yt-iframe', {
          height: '100%',
          width: '100%',
          videoId: ytId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            controls: currentLesson.seekMode === "locked" ? 0 : 1,
            disablekb: currentLesson.seekMode === "locked" ? 1 : 0,
            enablejsapi: 1,
          },
          events: {
            onReady: (e: any) => {
              if (ytContainerRef.current) {
                ytPlayerRef.current = e.target
                setYtPlayer(e.target)
                setDuration(e.target.getDuration())
              }
            },
            onStateChange: (e: any) => {
              if (duration === 0) setDuration(e.target.getDuration())
              // Detect when video ends
              if (e.data === 0) { // 0 is YT.PlayerState.ENDED
                if (!isCompleted(currentLesson.id)) handleMarkComplete(Math.floor(e.target.getDuration()))
              }
            }
          }
        })
        ytPlayerRef.current = player
      } catch (err) {
        console.error("Failed to init YouTube player:", err)
      }
    }

    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script')
      tag.src = "https://www.youtube.com/iframe_api"
      document.body.appendChild(tag)
      const prevOnReady = (window as any).onYouTubeIframeAPIReady
      ;(window as any).onYouTubeIframeAPIReady = () => {
        if (prevOnReady) prevOnReady()
        initPlayer()
      }
    } else {
      initPlayer()
    }

    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }
    }
  }, [currentLesson?.id])

  // Poll for time updates + in-video quiz check (YouTube only)
  useEffect(() => {
    if (!currentLesson || !ytPlayer) return

    const interval = setInterval(() => {
      const player = ytPlayerRef.current
      if (player && player.getCurrentTime) {
        const now = player.getCurrentTime()
        setCurrentTime(now)
        currentTimeRef.current = now

        // Update duration once
        const d = player.getDuration()
        if (d > 0 && duration === 0) setDuration(d)

        // Seek Lock Logic for YouTube
        const isLessonDone = isCompletedRef.current(currentLesson.id)
        if (currentLesson.seekMode === "locked" && !isLessonDone) {
          if (now > maxWatchedTimeRef.current + 2) {
            player.seekTo(maxWatchedTimeRef.current, true)
          } else if (now > maxWatchedTimeRef.current) {
            maxWatchedTimeRef.current = now
            setMaxWatchedTime(now)
          }
        }

        // In-video quiz check for YouTube
        if (currentLesson.videoQuestions?.length) {
          const t = Math.floor(now)
          setShownQuizIds(prev => {
            const quiz = currentLesson.videoQuestions!.find(
              q => Math.abs(q.timestampSeconds - t) <= 1 && !prev.has(q.id)
            )
            if (!quiz) return prev
            if (quiz.isBlocking) player.pauseVideo()
            setActiveQuiz(quiz)
            setSelectedAnswer(null)
            setQuizAnswered(false)
            return new Set([...prev, quiz.id])
          })
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [ytPlayer, currentLesson?.id])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getLessonIcon = (type: string) => {
    if (type === "video") return <PlayCircle className="h-4 w-4 shrink-0" />
    if (type === "quiz") return <HelpCircle className="h-4 w-4 shrink-0" />
    return <FileText className="h-4 w-4 shrink-0" />
  }

  const getFileType = (url: string) => {
    const ext = (url.split("?")[0] ?? url).split(".").pop()?.toLowerCase()
    const map: Record<string, { label: string; bg: string; text: string }> = {
      pdf:  { label: "PDF",  bg: "bg-red-50",    text: "text-red-600" },
      doc:  { label: "DOC",  bg: "bg-blue-50",   text: "text-blue-600" },
      docx: { label: "DOCX", bg: "bg-blue-50",   text: "text-blue-600" },
      ppt:  { label: "PPT",  bg: "bg-orange-50", text: "text-orange-600" },
      pptx: { label: "PPTX", bg: "bg-orange-50", text: "text-orange-600" },
      xls:  { label: "XLS",  bg: "bg-green-50",  text: "text-green-600" },
      xlsx: { label: "XLSX", bg: "bg-green-50",  text: "text-green-600" },
      zip:  { label: "ZIP",  bg: "bg-gray-100",  text: "text-gray-600" },
    }
    return map[ext ?? ""] ?? { label: "FILE", bg: "bg-gray-100", text: "text-gray-500" }
  }

  return (
    <div className="flex h-full bg-gray-50 text-gray-900 overflow-hidden">
      {/* ── Main Content (Left Side) ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        {!currentLesson ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 bg-white m-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">{dictionary.select_lesson || "Select a lesson from the right menu"}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Video Area — hidden for quiz-type lessons */}
            <div className={cn("w-full bg-black flex-shrink-0 relative", currentLesson.type === "quiz" && "hidden")}>
              {currentLesson.type === "video" && currentLesson.contentUrl ? (
                <div className="relative w-full aspect-video mx-auto max-w-6xl overflow-hidden rounded-b-none md:rounded-3xl shadow-2xl">
                  {(() => {
                    const ytMatch = currentLesson.contentUrl!.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                    const ytId = ytMatch && ytMatch[2] && ytMatch[2].length === 11 ? ytMatch[2] : null;

                    if (ytId) {
                      return <div ref={ytContainerRef} className="w-full h-full bg-black" />
                    }

                    if (!currentLesson.contentUrl) return <div className="w-full h-full bg-black flex items-center justify-center text-white">{dictionary.no_video || "No video found"}</div>

                    return (
                      <video
                        ref={videoRef}
                        key={currentLesson.id}
                        src={currentLesson.contentUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleVideoTimeUpdate}
                        onSeeking={handleVideoTimeUpdate}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={(e) => {
                          if (!isCompleted(currentLesson.id)) handleMarkComplete(Math.floor(e.currentTarget.duration))
                        }}
                      />
                    )
                  })()}
                  
                  {/* Seek Lock Badge */}
                  {currentLesson.seekMode === "locked" && (
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                      <Lock className="h-3 w-3" />
                      {dictionary.seek_locked || "Seeking Locked"}
                    </div>
                  )}

                  {/* Custom Progress Bar for Locked Mode — YouTube only (native video has its own controls) */}
                  {currentLesson.seekMode === "locked" && isYoutubeLesson && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                      <div className="flex items-center gap-4 text-white text-xs font-mono mb-2">
                        <span>{formatTime(currentTime)}</span>
                        <div
                          className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                          onClick={(e) => {
                            if (!duration) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                            const target = ratio * duration
                            const isLessonDone = isCompletedRef.current(currentLesson.id)
                            const seekTo = isLessonDone ? target : Math.min(target, maxWatchedTimeRef.current)
                            ytPlayerRef.current?.seekTo(seekTo, true)
                          }}
                        >
                          {/* Watched range indicator */}
                          {!isCompleted(currentLesson.id) && (
                            <div
                              className="absolute inset-y-0 left-0 bg-white/10"
                              style={{ width: `${(maxWatchedTime / (duration || 1)) * 100}%` }}
                            />
                          )}
                          <div
                            className="h-full bg-red-500 transition-all duration-500 ease-linear relative z-10"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  )}

                  {/* In-video Quiz Overlay */}
                  {activeQuiz && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 p-6 backdrop-blur-sm">
                      <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-orange-100 rounded-xl">
                            <HelpCircle className="h-6 w-6 text-orange-600" />
                          </div>
                          <span className="text-lg font-bold text-gray-900">{dictionary.in_video_quiz || "In-video Question"}</span>
                        </div>
                        <p className="text-gray-800 font-medium text-lg mb-6 leading-relaxed">{activeQuiz.body}</p>
                        <div className="space-y-3">
                          {(activeQuiz.options as string[]).map((opt, i) => {
                            let btnClass = "w-full text-left px-5 py-4 rounded-2xl border-2 text-[15px] font-medium transition-all "
                            if (!quizAnswered) {
                              btnClass += selectedAnswer === opt
                                ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            } else {
                              if (opt === activeQuiz.correctAnswer) btnClass += "border-green-500 bg-green-50 text-green-700"
                              else if (opt === selectedAnswer) btnClass += "border-red-500 bg-red-50 text-red-700"
                              else btnClass += "border-gray-200 bg-gray-50 text-gray-400 opacity-60"
                            }
                            return (
                              <button key={i} className={btnClass} onClick={() => !quizAnswered && setSelectedAnswer(opt)}>
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                        {quizAnswered && activeQuiz.explanation && (
                          <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-[15px] text-blue-800 flex gap-3">
                            <div className="shrink-0 text-xl">💡</div>
                            <div className="pt-0.5">{activeQuiz.explanation}</div>
                          </div>
                        )}
                        <div className="mt-8 flex gap-3">
                          {!quizAnswered ? (
                            <Button onClick={handleAnswerQuiz} disabled={!selectedAnswer} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 text-base shadow-sm">
                              {dictionary.submit_answer || "Submit Answer"}
                            </Button>
                          ) : (
                            <Button onClick={handleDismissQuiz} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full h-12 text-base shadow-sm">
                              {dictionary.continue_learning || "Continue"} <ChevronRight className="ml-1 h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video w-full max-w-6xl mx-auto flex items-center justify-center bg-gray-100 border-b border-gray-200">
                  <div className="text-center text-gray-400">
                    {currentLesson.type === "quiz"
                      ? <HelpCircle className="h-20 w-20 mx-auto mb-4 text-gray-300" />
                      : <FileText className="h-20 w-20 mx-auto mb-4 text-gray-300" />}
                    <p className="text-lg font-medium text-gray-500">{currentLesson.type === "quiz" ? dictionary.quiz : dictionary.no_video_desc}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Info */}
            <div className="flex-1 bg-gray-50 px-6 py-8 md:px-12">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Completion Banner */}
                {progressPercent === 100 && (
                  <div className="flex items-center gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-3xl p-6 shadow-sm">
                    <div className="p-3 bg-white rounded-full shadow-sm shrink-0">
                      <Trophy className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg text-green-800 mb-1">🎉 {dictionary.congrats_all_complete}</div>
                      {certificate
                        ? <div className="text-sm font-mono text-green-600/80 font-medium">{certificate.certificateNumber}</div>
                        : <div className="text-sm text-green-600/80 font-medium">{dictionary.cert_issued}</div>
                      }
                    </div>
                    {certificate && (
                      <Button
                        onClick={() => setCertModalOpen(true)}
                        className="shrink-0 rounded-full h-11 px-5 bg-green-600 hover:bg-green-700 text-white shadow-sm font-semibold gap-2"
                      >
                        <Award className="h-4 w-4" />
                        {dictionary.view_certificate || "ดูใบประกาศ"}
                      </Button>
                    )}
                  </div>
                )}

                {/* Title + Nav */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-gray-200">
                  <div>
                    <div className="text-sm font-semibold tracking-wide text-red-500 uppercase mb-2">
                      {course.sections.find(s => s.lessons.some(l => l.id === currentLesson.id))?.title}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">{currentLesson.title}</h1>
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        {getLessonIcon(currentLesson.type)}
                        <span>{currentLesson.type === "video" ? dictionary.video_content : currentLesson.type === "quiz" ? dictionary.quiz : dictionary.document}</span>
                      </div>
                      {currentLesson.durationSeconds && (
                        <div className="flex items-center gap-1.5">
                          <Circle className="h-1.5 w-1.5 fill-current" />
                          <span>{Math.ceil(currentLesson.durationSeconds / 60)} {dictionary.minutes || "min"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 shrink-0">
                    <Button
                      variant="outline"
                      disabled={!prevLesson}
                      onClick={() => prevLesson && selectLesson(prevLesson)}
                      className="rounded-full bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm h-11 px-5"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1.5" /> {dictionary.prev_lesson || "Previous"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!nextLesson}
                      onClick={() => nextLesson && selectLesson(nextLesson)}
                      className="rounded-full bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm h-11 px-5"
                    >
                      {dictionary.next_lesson || "Next"} <ChevronRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Mark Complete — hidden for quiz lessons (completed via quiz submission) */}
                {currentLesson.type !== "quiz" && (
                  <div className="flex items-center gap-4 py-2">
                    {!isCompleted(currentLesson.id) ? (
                      currentLesson.seekMode !== "locked" && (
                        <Button
                          onClick={() => handleMarkComplete()}
                          disabled={completingLesson}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-12 shadow-sm text-[15px] font-medium transition-all"
                        >
                          {completingLesson ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin mr-2.5" />
                              {dictionary.saving_progress || "Saving..."}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-5 w-5 mr-2.5" />
                              {dictionary.mark_complete}
                            </>
                          )}
                        </Button>
                      )
                    ) : (
                      <div className="flex items-center gap-2.5 px-6 py-3 bg-green-50 border border-green-100 rounded-full text-green-700 font-semibold shadow-sm">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{dictionary.completed}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz UI — Udemy/Coursera style: replaces video, lives in scrollable content area */}
                {currentLesson.type === "quiz" && (
                  <div className="space-y-0">
                    {/* Start view */}
                    {!quizAttempt && !quizResult && (() => {
                      const otherLessons = allLessons.filter(l => l.id !== currentLesson.id)
                      const otherCompleted = otherLessons.filter(l => isCompleted(l.id)).length
                      const isLocked = currentLesson.quizRequireAllSections && otherCompleted < otherLessons.length
                      return (
                        <div className="flex flex-col items-center py-16 gap-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                          <div className={cn("p-5 rounded-full", isLocked ? "bg-gray-100" : "bg-red-50")}>
                            {isLocked
                              ? <Lock className="h-12 w-12 text-gray-400" />
                              : <HelpCircle className="h-12 w-12 text-red-500" />}
                          </div>
                          <div className="text-center space-y-2 px-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                              {isLocked
                                ? dictionary.quiz_locked_title || "ยังทำแบบทดสอบไม่ได้"
                                : dictionary.quiz_ready || "Ready for quiz?"}
                            </h2>
                            <p className="text-gray-500">
                              {isLocked
                                ? dictionary.quiz_locked_desc || "ต้องเรียนเนื้อหาทุก lesson ให้จบก่อน จึงจะสามารถทำแบบทดสอบได้"
                                : isCompleted(currentLesson.id)
                                  ? dictionary.quiz_passed_retake || "You passed! You can retake if you want."
                                  : dictionary.quiz_instruction || "Answer all questions and submit."}
                            </p>
                            {isLocked && (
                              <p className="text-sm font-semibold text-gray-400">
                                {dictionary.progress_label || "ความคืบหน้า"}: {otherLessons.length > 0 ? Math.round((otherCompleted / otherLessons.length) * 100) : 0}%
                              </p>
                            )}
                          </div>
                          {!currentLesson.quizId ? (
                            <p className="text-sm text-red-400">{dictionary.no_quiz}</p>
                          ) : isLocked ? null : (
                            <Button
                              onClick={handleStartQuiz}
                              disabled={quizStarting}
                              className="rounded-full px-14 h-14 bg-red-600 hover:bg-red-700 text-white font-bold shadow-md text-lg mt-2"
                            >
                              {quizStarting
                                ? <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                : <HelpCircle className="h-5 w-5 mr-2" />}
                              {isCompleted(currentLesson.id) ? dictionary.retake_quiz : dictionary.start_quiz}
                            </Button>
                          )}
                        </div>
                      )
                    })()}

                    {/* In-progress view */}
                    {quizAttempt && !quizResult && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-semibold text-gray-500">
                          {quizAttempt.questions.filter(q => {
                            if (q.type === "multiple_select") return ((quizAnswers[q.id] as string[]) || []).length > 0
                            return !!quizAnswers[q.id]
                          }).length}/{quizAttempt.questions.length} {dictionary.answered_count}
                          </span>
                          <div className="h-1.5 flex-1 mx-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full transition-all duration-300"
                              style={{ width: `${(Object.keys(quizAnswers).length / quizAttempt.questions.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        {quizAttempt.questions.map((q, idx) => (
                          <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-7 py-5 border-b border-gray-50 bg-gray-50/50">
                              <p className="font-semibold text-gray-900 text-[16px] leading-relaxed">
                                <span className="text-red-500 font-bold mr-2">{dictionary.question_number} {idx + 1}.</span>{q.body}
                              </p>
                              {q.type === "multiple_select" && (
                                <p className="text-xs text-gray-400 mt-1">{dictionary.select_all_that_apply || "เลือกได้มากกว่า 1 ข้อ"}</p>
                              )}
                              {q.type === "short_answer" && (
                                <p className="text-xs text-gray-400 mt-1">{dictionary.short_answer_note || "ผู้สอนจะตรวจคำตอบนี้"}</p>
                              )}
                            </div>

                            {/* true_false */}
                            {q.type === "true_false" && (
                              <div className="p-4 flex gap-3">
                                {["true", "false"].map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                    className={cn(
                                      "flex-1 py-4 rounded-xl border-2 text-[15px] font-bold transition-all",
                                      quizAnswers[q.id] === opt
                                        ? "border-red-500 bg-red-50 text-red-800"
                                        : "border-gray-100 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                  >
                                    {opt === "true" ? (dictionary.true_label || "ถูก ✓") : (dictionary.false_label || "ผิด ✗")}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* multiple_select */}
                            {q.type === "multiple_select" && (
                              <div className="p-4 space-y-2">
                                {(q.options || []).map((opt, i) => {
                                  const selected = ((quizAnswers[q.id] as string[]) || []).includes(opt)
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => handleMultiSelectToggle(q.id, opt)}
                                      className={cn(
                                        "w-full text-left px-5 py-4 rounded-xl border-2 text-[15px] font-medium transition-all flex items-center gap-3",
                                        selected
                                          ? "border-red-500 bg-red-50 text-red-800"
                                          : "border-gray-100 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all",
                                        selected ? "border-red-500 bg-red-500" : "border-gray-300"
                                      )}>
                                        {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                      </div>
                                      {opt}
                                    </button>
                                  )
                                })}
                              </div>
                            )}

                            {/* short_answer */}
                            {q.type === "short_answer" && (
                              <div className="p-4">
                                <textarea
                                  rows={4}
                                  placeholder={dictionary.short_answer_placeholder || "พิมพ์คำตอบของคุณที่นี่..."}
                                  value={(quizAnswers[q.id] as string) || ""}
                                  onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-[15px] resize-none focus:outline-none focus:border-red-400 transition-colors"
                                />
                              </div>
                            )}

                            {/* multiple_choice (default) */}
                            {(q.type === "multiple_choice" || (!q.type)) && q.options && (
                              <div className="p-4 space-y-2">
                                {q.options.map((opt, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                    className={cn(
                                      "w-full text-left px-5 py-4 rounded-xl border-2 text-[15px] font-medium transition-all flex items-center gap-3",
                                      quizAnswers[q.id] === opt
                                        ? "border-red-500 bg-red-50 text-red-800"
                                        : "border-gray-100 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                                      quizAnswers[q.id] === opt ? "border-red-500 bg-red-500" : "border-gray-300"
                                    )}>
                                      {quizAnswers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

<Button
                          onClick={handleSubmitQuiz}
                          disabled={quizSubmitting || quizAttempt.questions.some(q => {
                            if (q.type === "short_answer") return false
                            if (q.type === "multiple_select") return ((quizAnswers[q.id] as string[]) || []).length === 0
                            return !quizAnswers[q.id]
                          })}
                          className="w-full rounded-2xl h-16 bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm text-xl"
                        >
                          {quizSubmitting && <Loader2 className="h-6 w-6 animate-spin mr-2" />}
                          {dictionary.submit_answer || "Submit"}
                        </Button>
                      </div>
                    )}

                    {/* Result view */}
                    {quizResult && (() => {
                      const maxAttemptsReached = quizSettings?.maxAttempts != null && quizResult.attemptNumber >= quizSettings.maxAttempts
                      const circumference = 2 * Math.PI * 52
                      return (
                      <div className="space-y-6">
                        {/* Score card */}
                        <div className={cn(
                          "rounded-3xl overflow-hidden border shadow-sm",
                          quizResult.passed ? "border-green-200" : "border-red-200"
                        )}>
                          {/* Gradient banner */}
                          <div className={cn(
                            "px-8 pt-8 pb-7 text-center",
                            quizResult.passed
                              ? "bg-gradient-to-br from-green-500 to-emerald-600"
                              : "bg-gradient-to-br from-red-500 to-rose-600"
                          )}>
                            {/* SVG Ring progress */}
                            <div className="relative w-32 h-32 mx-auto mb-5">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                                <circle
                                  cx="60" cy="60" r="52"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="10"
                                  strokeLinecap="round"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={circumference * (1 - quizResult.score / 100)}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white leading-none">{quizResult.score}</span>
                                <span className="text-white/70 text-xs font-bold tracking-wide">%</span>
                              </div>
                            </div>

                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2">
                              {quizResult.passed
                                ? <Trophy className="h-5 w-5 text-yellow-300" />
                                : <HelpCircle className="h-5 w-5 text-white/80" />}
                              <span className="text-white font-bold text-[17px]">
                                {quizResult.passed ? dictionary.quiz_passed : dictionary.quiz_failed}
                              </span>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className={cn(
                            "grid grid-cols-3 divide-x",
                            quizResult.passed ? "bg-green-50 divide-green-100 border-t border-green-100" : "bg-red-50 divide-red-100 border-t border-red-100"
                          )}>
                            <div className="text-center px-4 py-4">
                              <div className={cn("text-2xl font-black", quizResult.passed ? "text-green-700" : "text-red-600")}>{quizResult.score}%</div>
                              <div className="text-[11px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wide">{dictionary.your_score || "คะแนน"}</div>
                            </div>
                            <div className="text-center px-4 py-4">
                              <div className="text-2xl font-black text-gray-600">{quizResult.passingScore}%</div>
                              <div className="text-[11px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wide">{dictionary.passing_score || "เกณฑ์ผ่าน"}</div>
                            </div>
                            <div className="text-center px-4 py-4">
                              <div className="text-2xl font-black text-gray-600">
                                {quizResult.attemptNumber}{quizSettings?.maxAttempts != null ? `/${quizSettings.maxAttempts}` : ""}
                              </div>
                              <div className="text-[11px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wide">{dictionary.attempt_used || "ครั้งที่ทำ"}</div>
                            </div>
                          </div>

                          {/* Retake button */}
                          {!quizResult.passed && (
                            <div className="px-8 py-5 bg-white border-t border-gray-100">
                              {maxAttemptsReached ? (
                                <div className="text-center space-y-2">
                                  <p className="text-sm text-gray-400 font-medium">
                                    {dictionary.max_attempts_reached || "คุณทำแบบทดสอบครบกำหนดแล้ว ไม่สามารถทำซ้ำได้อีก"}
                                  </p>
                                  <Button disabled className="rounded-full px-8 h-10 bg-gray-100 text-gray-400 font-semibold cursor-not-allowed">
                                    {dictionary.try_again || "Try Again"}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={handleStartQuiz}
                                  disabled={quizStarting}
                                  className="w-full rounded-2xl h-12 bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
                                >
                                  {quizStarting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                  {dictionary.try_again || "Try Again"}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Answer review */}
                        {quizResult.answers.length > 0 && (
                          <div className="space-y-3">
                            {/* Divider header */}
                            <div className="flex items-center gap-3 px-1 py-1">
                              <div className="h-px flex-1 bg-gray-200" />
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                {dictionary.review_answers || "Review Answers"}
                              </span>
                              <div className="h-px flex-1 bg-gray-200" />
                            </div>

                            {/* Summary counts */}
                            {quizSettings?.showCorrectAnswers !== false && (
                              <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>{quizResult.answers.filter(a => a.isCorrect).length} ถูก</span>
                                </div>
                                <div className="h-4 w-px bg-gray-200" />
                                <div className="flex items-center gap-1.5 text-sm font-bold text-red-500">
                                  <Circle className="h-4 w-4" />
                                  <span>{quizResult.answers.filter(a => !a.isCorrect && (a.questionType ?? "multiple_choice") !== "short_answer").length} ผิด</span>
                                </div>
                                {quizResult.answers.some(a => (a.questionType ?? "") === "short_answer") && (
                                  <>
                                    <div className="h-4 w-px bg-gray-200" />
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                                      <HelpCircle className="h-4 w-4" />
                                      <span>{quizResult.answers.filter(a => (a.questionType ?? "") === "short_answer").length} รอตรวจ</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {quizResult.answers.map((ans, idx) => {
                              const question = quizQuestions.find(q => q.id === ans.questionId)
                              const qType = ans.questionType ?? question?.type ?? "multiple_choice"
                              const isShortAnswer = qType === "short_answer"
                              const showResultColors = quizSettings?.showCorrectAnswers !== false
                              const userAnswer = ans.response ?? quizAnswers[ans.questionId]
                              const selectedArr = Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer as string] : [])
                              const correctArr = ans.correctAnswer
                                ? (Array.isArray(ans.correctAnswer) ? ans.correctAnswer : [ans.correctAnswer as string])
                                : []
                              const options = ans.questionOptions ?? question?.options ?? []
                              const qBody = ans.questionBody || question?.body

                              const optionLabel = (val: string) =>
                                val === "true" ? (dictionary.true_label || "ถูก ✓")
                                : val === "false" ? (dictionary.false_label || "ผิด ✗")
                                : val

                              const getOptionStyle = (opt: string) => {
                                const isSelected = selectedArr.includes(opt)
                                const isCorrectOpt = correctArr.includes(opt)
                                if (!showResultColors) {
                                  return isSelected
                                    ? { wrap: "border-red-500 bg-red-50 text-red-800", indicator: "border-red-500 bg-red-500" }
                                    : { wrap: "border-gray-100 bg-white text-gray-700", indicator: "border-gray-300" }
                                }
                                if (isSelected && isCorrectOpt) return { wrap: "border-green-500 bg-green-50 text-green-800", indicator: "border-green-500 bg-green-500" }
                                if (isSelected && !isCorrectOpt) return { wrap: "border-red-500 bg-red-50 text-red-800", indicator: "border-red-500 bg-red-500" }
                                if (!isSelected && isCorrectOpt) return { wrap: "border-green-400 bg-green-50/50 text-green-700", indicator: "border-green-400 bg-green-400" }
                                return { wrap: "border-gray-100 bg-white text-gray-400 opacity-50", indicator: "border-gray-200" }
                              }

                              return (
                                <div key={ans.questionId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                  {/* Header — same style as in-progress */}
                                  <div className="px-7 py-5 border-b border-gray-50 bg-gray-50/50">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="font-semibold text-gray-900 text-[16px] leading-relaxed">
                                        <span className="text-red-500 font-bold mr-2">{dictionary.question_number} {idx + 1}.</span>{qBody}
                                      </p>
                                      {isShortAnswer ? (
                                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                          <HelpCircle className="h-3 w-3" />
                                          {dictionary.pending_review || "รอตรวจ"}
                                        </span>
                                      ) : showResultColors ? (
                                        ans.isCorrect ? (
                                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                            <CheckCircle2 className="h-3 w-3" /> ถูกต้อง
                                          </span>
                                        ) : (
                                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                            <Circle className="h-3 w-3" /> ผิด
                                          </span>
                                        )
                                      ) : null}
                                    </div>
                                    {qType === "multiple_select" && (
                                      <p className="text-xs text-gray-400 mt-1">{dictionary.select_all_that_apply || "เลือกได้มากกว่า 1 ข้อ"}</p>
                                    )}
                                    {isShortAnswer && (
                                      <p className="text-xs text-gray-400 mt-1">{dictionary.short_answer_note || "ผู้สอนจะตรวจคำตอบนี้"}</p>
                                    )}
                                  </div>

                                  {/* true_false */}
                                  {qType === "true_false" && (
                                    <div className="p-4 flex gap-3">
                                      {["true", "false"].map((opt) => {
                                        const s = getOptionStyle(opt)
                                        return (
                                          <div key={opt} className={cn("flex-1 py-4 rounded-xl border-2 text-[15px] font-bold text-center", s.wrap)}>
                                            {optionLabel(opt)}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  {/* multiple_select */}
                                  {qType === "multiple_select" && (
                                    <div className="p-4 space-y-2">
                                      {options.map((opt, i) => {
                                        const isSelected = selectedArr.includes(opt)
                                        const s = getOptionStyle(opt)
                                        return (
                                          <div key={i} className={cn("w-full text-left px-5 py-4 rounded-xl border-2 text-[15px] font-medium flex items-center gap-3", s.wrap)}>
                                            <div className={cn("w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center", s.indicator)}>
                                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                            </div>
                                            <span className="flex-1">{optionLabel(opt)}</span>
                                            {showResultColors && correctArr.includes(opt) && !isSelected && (
                                              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  {/* short_answer */}
                                  {isShortAnswer && (
                                    <div className="p-4">
                                      <div className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-[15px] text-gray-700 min-h-[80px] bg-gray-50/50">
                                        {(userAnswer as string) || <span className="text-gray-300">—</span>}
                                      </div>
                                    </div>
                                  )}

                                  {/* multiple_choice (default) */}
                                  {(qType === "multiple_choice" || (!qType)) && options.length > 0 && (
                                    <div className="p-4 space-y-2">
                                      {options.map((opt, i) => {
                                        const isSelected = selectedArr.includes(opt)
                                        const s = getOptionStyle(opt)
                                        return (
                                          <div key={i} className={cn("w-full text-left px-5 py-4 rounded-xl border-2 text-[15px] font-medium flex items-center gap-3", s.wrap)}>
                                            <div className={cn("w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center", s.indicator)}>
                                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <span className="flex-1">{optionLabel(opt)}</span>
                                            {showResultColors && correctArr.includes(opt) && !isSelected && (
                                              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  {/* Explanation */}
                                  {ans.explanation && (
                                    <div className="mx-4 mb-4 flex gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                                      <span className="shrink-0 text-base leading-snug">💡</span>
                                      <span className="leading-relaxed">{ans.explanation}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      )
                    })()}
                  </div>
                )}

                {/* Attachments */}
                {currentLesson.attachments && currentLesson.attachments.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-600">{dictionary.attachments || "Attachments"}</span>
                      <span className="ml-auto text-xs font-medium text-gray-400">{currentLesson.attachments.length} {dictionary.files_count}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {currentLesson.attachments.map((att, i) => {
                        const ft = getFileType(att.url)
                        return (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                          >
                            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 tracking-wide", ft.bg, ft.text)}>
                              {ft.label}
                            </div>
                            <span className="flex-1 text-[14px] font-medium text-gray-700 group-hover:text-gray-900 truncate">{att.title}</span>
                            <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Sidebar (Right Side) ────────────────────────────────────────── */}
      <aside className={cn(
        "flex-shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20 transition-[width] duration-300 ease-in-out overflow-hidden",
        sidebarOpen ? "w-96" : "w-12"
      )}>
        {/* Collapsed strip */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {sidebarOpen && (
          <>
            {/* Header */}
            <div className="p-5 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <h2 className="flex-1 font-bold text-[15px] leading-snug line-clamp-2 text-gray-900">{course.title}</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> {completedCount}/{allLessons.length} {dictionary.lessons}</span>
                  <span className="text-red-500">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5 bg-gray-100 [&>[data-slot=indicator]]:bg-red-500 rounded-full" />
              </div>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {course.sections.map((section) => {
                const isOpen = expandedSections.has(section.id)
                const sectionCompleted = section.lessons.filter(l => isCompleted(l.id)).length
                const isSectionDone = sectionCompleted === section.lessons.length && section.lessons.length > 0

                return (
                  <div key={section.id} className="rounded-2xl overflow-hidden mb-1.5 border border-gray-100 bg-white">
                    <button
                      onClick={() => setExpandedSections(prev => {
                        const next = new Set(prev)
                        isOpen ? next.delete(section.id) : next.add(section.id)
                        return next
                      })}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-[14px] font-bold text-gray-800 truncate">{section.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[12px] font-medium text-gray-400">
                          <span>{sectionCompleted}/{section.lessons.length} {dictionary.lessons}</span>
                          {isSectionDone && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-1.5 py-0 h-4 text-[10px]">{dictionary.completed_badge || "Done"}</Badge>}
                        </div>
                      </div>
                      <div className="shrink-0 text-gray-400">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-50 px-2 pb-2 pt-1 space-y-0.5">
                        {section.lessons.map((lesson) => {
                          const done = isCompleted(lesson.id)
                          const active = currentLesson?.id === lesson.id
                          const hasAttachments = (lesson.attachments?.length ?? 0) > 0
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson)}
                              className={cn(
                                "w-full flex items-start gap-3 px-3 py-3 text-left rounded-xl transition-all",
                                active
                                  ? "bg-red-50"
                                  : "hover:bg-gray-50"
                              )}
                            >
                              <div className="mt-0.5 shrink-0">
                                {done
                                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  : <Circle className={cn("h-4 w-4", active ? "text-red-400" : "text-gray-300")} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-[13px] leading-snug line-clamp-2", active ? "font-bold text-red-900" : "font-medium text-gray-700")}>
                                  {lesson.title}
                                </div>
                                <div className={cn("flex items-center gap-1.5 mt-1 text-[11px] font-medium", active ? "text-red-400" : "text-gray-400")}>
                                  {getLessonIcon(lesson.type)}
                                  <span>{lesson.durationSeconds ? `${Math.ceil(lesson.durationSeconds / 60)} ${dictionary.minutes || "min"}` : dictionary.lesson}</span>
                                  {lesson.seekMode === "locked" && <Lock className="h-3 w-3 text-orange-300" />}
                                  {hasAttachments && <Paperclip className="h-3 w-3 ml-auto text-gray-300" />}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Resources for current lesson */}
            {currentLesson?.attachments && currentLesson.attachments.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/50">
                <div className="px-4 pt-4 pb-1 flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{dictionary.lesson_resources || "Lesson Files"}</span>
                </div>
                <div className="px-3 pb-3 space-y-1">
                  {currentLesson.attachments.map((att, i) => {
                    const ft = getFileType(att.url)
                    return (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-100"
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 tracking-wide", ft.bg, ft.text)}>
                          {ft.label}
                        </div>
                        <span className="flex-1 text-[12px] font-medium text-gray-600 group-hover:text-gray-900 truncate">{att.title}</span>
                        <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </aside>

      {certModalOpen && certificate && (
        <CertificateModal
          certificate={certificate}
          holderName={user?.fullName || ""}
          onClose={() => setCertModalOpen(false)}
          dictionary={dictionary}
        />
      )}
    </div>
  )
}
