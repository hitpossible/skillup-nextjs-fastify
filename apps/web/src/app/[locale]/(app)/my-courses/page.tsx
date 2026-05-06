import { getAccessToken, getSession } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"
import { MyCoursesBrowser } from "./my-courses-browser"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"

export default async function MyCoursesPage({
  params: { locale }
}: {
  params: { locale: Locale }
}) {
  const token = await getAccessToken()
  const session = await getSession()
  if (!session || !token) redirect(`/${locale}/login`)

  const dict = await getDictionary(locale)

  let enrollments: any[] = []
  try {
    const res = await apiFetch<any>(`/users/${session.sub}/enrollments?limit=100`, {
      token: token ?? undefined,
      cache: "no-store",
    })
    enrollments = res.data || []
  } catch (error) {
    console.error("Failed to fetch my courses:", error)
  }

  return <MyCoursesBrowser enrollments={enrollments} dictionary={dict.my_courses} locale={locale} />
}
