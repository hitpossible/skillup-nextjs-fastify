import { getAccessToken, getSession } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { CatalogBrowser } from "./catalog-browser"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"

export default async function CatalogPage({
  params: { locale }
}: {
  params: { locale: Locale }
}) {
  const token = await getAccessToken()
  const session = await getSession()
  const dict = await getDictionary(locale)

  let courses: any[] = []
  let enrolledCourseIds: string[] = []
  let categories: any[] = []

  try {
    const [coursesRes, categoriesRes] = await Promise.all([
      apiFetch<any>("/courses?status=published&limit=100", {
        token: token ?? undefined,
        cache: "no-store",
      }),
      apiFetch<any[]>("/courses/categories", {
        token: token ?? undefined,
        cache: "no-store",
      })
    ])
    
    courses = coursesRes.data || []
    categories = categoriesRes || []

    if (token && session?.sub) {
      const enrollRes = await apiFetch<any>(`/users/${session.sub}/enrollments?limit=100`, {
        token,
        cache: "no-store"
      })
      enrolledCourseIds = enrollRes.data?.map((e: any) => e.courseId) || []
    }
  } catch (error) {
    console.error("Failed to fetch courses catalog:", error)
  }

  const availableCourses = courses.filter(c => {
    const isEnrolled = enrolledCourseIds.includes(c.id.toString()) || enrolledCourseIds.includes(c.id)
    return !isEnrolled
  })

  return <CatalogBrowser courses={availableCourses} categories={categories} dictionary={dict.catalog} locale={locale} />
}
