import { getAccessToken, getSession } from "@/lib/auth"
import { apiFetch, ApiError } from "@/lib/api"
import { notFound, redirect } from "next/navigation"
import { CoursePlayer } from "./course-player"
import { EnrollGate } from "./enroll-gate"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"

export default async function LearnCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale, courseId: string }>
  searchParams: Promise<{ lesson?: string }>
}) {
  const { locale, courseId } = await params
  const { lesson: lessonId } = await searchParams
  const token = await getAccessToken()
  const session = await getSession()
  if (!session || !token) redirect(`/${locale}/login`)

  const dict = await getDictionary(locale)

  // Fetch course with full structure
  let course: any
  try {
    course = await apiFetch<any>(`/courses/${courseId}`, { token: token ?? undefined, cache: "no-store" })
  } catch {
    notFound()
  }

  // Fetch enrollment (may not exist yet)
  let enrollment: any = null
  try {
    enrollment = await apiFetch<any>(`/enrollments/my?courseId=${courseId}`, { token: token ?? undefined, cache: "no-store" })
  } catch (e: any) {
    if (!(e instanceof ApiError && e.status === 404)) throw e
  }

  // Not enrolled → show enroll gate
  if (!enrollment) {
    return (
      <div className="bg-white">
        <EnrollGate course={course} dictionary={dict.learn} />
      </div>
    )
  }

  // Fetch lesson progress
  let lessonProgress: any[] = []
  try {
    lessonProgress = await apiFetch<any>(`/enrollments/my/progress?courseId=${courseId}`, { token: token ?? undefined, cache: "no-store" })
  } catch {}

  return (
    <CoursePlayer
      course={course}
      enrollment={enrollment}
      initialProgress={lessonProgress}
      initialLessonId={lessonId}
      dictionary={dict.learn}
      locale={locale}
      user={session}
    />
  )
}
