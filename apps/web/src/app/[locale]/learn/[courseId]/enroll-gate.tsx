"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  BookOpen,
  Clock,
  Globe,
  PlayCircle,
  ChevronDown,
  Video,
  FileText,
  LayoutList,
  UserRound,
  BadgeCheck,
  Lock,
  Sparkles,
} from "lucide-react"
import { enrollCourseAction } from "./actions"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/api"

export function EnrollGate({ course, dictionary }: { course: any; dictionary: any }) {
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(
    [course.sections?.[0]?.id].filter(Boolean)
  )

  const router = useRouter()
  const { toast } = useToast()

  const lessons = course.sections?.flatMap((section: any) => section.lessons ?? []) ?? []
  const totalLessons = lessons.length
  const totalDuration = course.durationMinutes
  const totalSections = course.sections?.length ?? 0

  const totalVideos = lessons.filter((lesson: any) => lesson.type === "video").length
  const totalDocuments = lessons.filter((lesson: any) => lesson.type === "document").length
  const totalQuizzes = lessons.filter((lesson: any) => lesson.type === "quiz").length

  const instructorName = course.instructor?.fullName || dictionary.default_instructor || "Instructor"
  const instructorAvatar = course.instructor?.avatarUrl || ""

  const price =
    course.priceText ||
    course.price ||
    dictionary.course_price ||
    "฿249"

  const fullPrice =
    course.fullPriceText ||
    course.fullPrice ||
    "฿1,900"

  const lifetimePrice =
    course.lifetimePriceText ||
    course.lifetimePrice ||
    "฿1,499"

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleEnroll = async () => {
    setLoading(true)
    const res = await enrollCourseAction(course.id)
    setLoading(false)

    if (res.error) {
      toast({
        variant: "destructive",
        title: dictionary.error_enroll || "Error",
        description: res.error,
      })
      return
    }

    toast({ title: dictionary.enroll_success || "Success! 🎉" })
    router.refresh()
  }

  const formatDuration = (minutes?: number | string) => {
    if (!minutes) return ""
    const value = Number(minutes)
    if (Number.isNaN(value)) return String(minutes)

    const hours = Math.floor(value / 60)
    const mins = value % 60

    if (hours <= 0) return `${mins} ${dictionary.minutes || "นาที"}`
    if (mins <= 0) return `${hours} ${dictionary.hours || "ชั่วโมง"}`

    return `${hours} ${dictionary.hours || "ชั่วโมง"} ${mins} ${dictionary.minutes || "นาที"}`
  }

  const formatLessonDuration = (lesson: any) => {
    const minutes = lesson.durationMinutes ?? lesson.duration ?? lesson.durationText
    if (!minutes) return ""
    return formatDuration(minutes)
  }

  const getLessonIcon = (lesson: any) => {
    if (lesson.type === "video") return <Video className="h-4 w-4" />
    if (lesson.type === "quiz") return <LayoutList className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getLessonTypeLabel = (lesson: any) => {
    if (lesson.type === "video") return dictionary.video || "วิดีโอ"
    if (lesson.type === "quiz") return dictionary.quiz || "แบบทดสอบ"
    return dictionary.document || "เอกสาร"
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:px-12">
        {/* Hero Card */}
        <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white px-6 py-7 shadow-[0_12px_36px_rgba(15,23,42,0.12)] sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-500">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-white shadow-sm">
              <BookOpen className="h-4 w-4" />
              {dictionary.online_course || "คอร์สออนไลน์"}
            </div>

            {course.code && (
              <>
                <span className="text-gray-300">|</span>
                <span>{course.code}</span>
              </>
            )}

            {totalDuration && (
              <>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(totalDuration)}
                </span>
              </>
            )}

            {course.language && (
              <>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  {course.language === "th"
                    ? dictionary.language_th || "Thai"
                    : course.language === "en"
                      ? dictionary.language_en || "English"
                      : course.language.toUpperCase()}
                </span>
              </>
            )}
          </div>

          <h1 className="mt-6 max-w-5xl text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl lg:text-[38px]">
            {course.title}
          </h1>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-red-100 to-blue-100 ring-2 ring-white">
              {instructorAvatar ? (
                <img
                  src={getFullImageUrl(instructorAvatar)}
                  alt={instructorName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  <UserRound className="h-6 w-6" />
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-500">
                {dictionary.instructor || "ผู้สอน"}
              </div>
              <div className="text-base font-bold text-gray-700">{instructorName}</div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Main Content */}
          <main className="min-w-0 space-y-10">

            {/* Description */}
            <section className="space-y-5">
              <h2 className="text-2xl font-black text-gray-950">
                {dictionary.description || "คำอธิบาย"}
              </h2>

              {course.description ? (
                <div className="max-w-4xl whitespace-pre-line text-base font-medium leading-relaxed text-gray-700">
                  {course.description}
                </div>
              ) : (
                <p className="max-w-4xl text-base font-medium leading-relaxed text-gray-600">
                  {dictionary.no_description ||
                    "หลักสูตรนี้ออกแบบมาเพื่อช่วยให้ผู้เรียนเข้าใจเนื้อหาได้ง่าย เรียนรู้ได้อย่างเป็นระบบ และสามารถนำไปใช้งานได้จริง"}
                </p>
              )}
            </section>

            {/* Course Content */}
            <section className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-gray-950">
                  {dictionary.course_content || "เนื้อหาในหลักสูตร"}
                </h2>

              </div>

              <div className="flex flex-wrap gap-3">
                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-300 bg-white px-6 text-sm font-bold text-gray-400">
                  <Video className="h-5 w-5" />
                  {totalVideos} {dictionary.videos || "วิดีโอ"}
                </div>

                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-300 bg-white px-6 text-sm font-bold text-gray-400">
                  <FileText className="h-5 w-5" />
                  {totalDocuments} {dictionary.documents || "เอกสาร"}
                </div>

                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-300 bg-white px-6 text-sm font-bold text-gray-400">
                  <LayoutList className="h-5 w-5" />
                  {totalQuizzes} {dictionary.quizzes || "แบบทดสอบ"}
                </div>
              </div>

              <div className="space-y-7">
                {course.sections?.map((section: any, sectionIndex: number) => {
                  const isExpanded = expandedSections.includes(section.id)
                  const sectionLessons = section.lessons ?? []

                  const sectionDuration = sectionLessons.reduce((sum: number, lesson: any) => {
                    const duration = Number(lesson.durationMinutes ?? lesson.duration ?? 0)
                    return sum + (Number.isNaN(duration) ? 0 : duration)
                  }, 0)

                  return (
                    <article
                      key={section.id}
                      className="overflow-hidden rounded-[26px] border border-gray-200 bg-gray-50 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="flex w-full items-center justify-between gap-4 bg-[#3d3f44] px-6 py-5 text-left text-white transition hover:bg-[#33353a] sm:px-8"
                      >
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold sm:text-lg">
                            {section.title}
                          </h3>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 text-xs font-bold sm:text-sm">
                          <span>
                            {sectionLessons.length} {dictionary.lessons || "สื่อการสอน"}
                          </span>
  
                          {sectionDuration > 0 && (
                            <span className="hidden items-center gap-1.5 sm:inline-flex">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(sectionDuration)}
                            </span>
                          )}

                          <ChevronDown
                            className={cn(
                              "h-5 w-5 transition-transform duration-300",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </button>

                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          isExpanded ? "max-h-[1200px]" : "max-h-0"
                        )}
                      >
                        <div className="divide-y divide-gray-100 bg-gray-50">
                          {sectionLessons.length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm font-semibold text-gray-400">
                              {dictionary.no_lessons || "ยังไม่มีเนื้อหาในส่วนนี้"}
                            </div>
                          ) : (
                            sectionLessons.map((lesson: any, lessonIndex: number) => {
                              const isLocked = !lesson.isFreePreview && !course.isEnrolled
                              const duration = formatLessonDuration(lesson)

                              return (
                                <div
                                  key={lesson.id}
                                  className={cn(
                                    "flex items-center justify-between gap-5 px-6 py-6 transition sm:px-8",
                                    isLocked
                                      ? "text-gray-300"
                                      : "bg-white/30 text-gray-950 hover:bg-white"
                                  )}
                                >
                                  <div className="flex min-w-0 items-start gap-4">
                                    <div
                                      className={cn(
                                        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                        isLocked
                                          ? "text-gray-200"
                                          : lesson.type === "video"
                                            ? "text-green-500"
                                            : lesson.type === "quiz"
                                              ? "text-red-500"
                                              : "text-gray-400"
                                      )}
                                    >
                                      {isLocked ? <Lock className="h-4 w-4" /> : getLessonIcon(lesson)}
                                    </div>

                                    <div className="min-w-0">
                                      <div
                                        className={cn(
                                          "truncate text-[15px] font-bold leading-tight",
                                          isLocked ? "text-gray-300" : "text-gray-950"
                                        )}
                                      >
                                        {lesson.title}
                                      </div>

                                      <div
                                        className={cn(
                                          "mt-1 text-xs font-semibold",
                                          isLocked ? "text-gray-300" : "text-gray-400"
                                        )}
                                      >
                                        {getLessonTypeLabel(lesson)}
                                        {duration && ` (${duration})`}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {lesson.isFreePreview ? (
                                      <span className="text-lg font-black text-gray-950">
                                        {dictionary.preview || "ดูตัวอย่าง"}
                                      </span>
                                    ) : isLocked ? (
                                      <span className="hidden rounded-full bg-gray-100 px-4 py-2 text-xs font-black text-gray-300 sm:inline-flex">
                                        {dictionary.locked || "Locked"}
                                      </span>
                                    ) : (
                                      <BadgeCheck className="h-5 w-5 text-green-500" />
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </main>

          {/* Price Card */}
          <aside className="lg:sticky lg:top-10">
            <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="p-7 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-950">
                    {dictionary.enroll_title || "ลงทะเบียนเรียน"}
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                    {dictionary.enroll_description || "เข้าถึงเนื้อหาทั้งหมดและเริ่มเรียนรู้ได้ทันที"}
                  </p>
                </div>

                <Button
                  onClick={handleEnroll}
                  disabled={loading}
                  className="h-14 w-full rounded-full bg-red-500 text-lg font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {dictionary.enrolling || "Processing..."}
                    </>
                  ) : (
                    dictionary.enroll_now || "ลงทะเบียนเรียน"
                  )}
                </Button>
                
                <p className="text-center text-xs font-bold text-gray-400">
                  {dictionary.free_enrollment || "คอร์สนี้เปิดให้เรียนฟรี"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}