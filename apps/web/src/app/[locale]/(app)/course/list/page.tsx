import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { CourseListBrowser } from "./course-list-browser"

interface Course {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  status: string
  language: string
  durationMinutes: number | null
  category?: { name: string } | null
  publishedAt: string | null
  createdAt: string
}

interface ListCoursesResponse {
  data: Course[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default async function CourseListPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const token = await getAccessToken()
  const dict = await getDictionary(locale)
  let courses: Course[] = []

  try {
    const res = await apiFetch<ListCoursesResponse>("/courses", { token: token ?? undefined })
    courses = res.data
  } catch (error) {
    console.error("Failed to fetch courses:", error)
  }

  return <CourseListBrowser courses={courses} dictionary={dict.course_list} locale={locale} />
}
