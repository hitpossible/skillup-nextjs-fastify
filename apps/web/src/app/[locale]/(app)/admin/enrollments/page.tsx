import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { EnrollmentsBrowser } from "./enrollments-browser"

export default async function AdminEnrollmentsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const token = await getAccessToken()
  const dict = await getDictionary(locale)

  let enrollments: any[] = []
  let total = 0
  let courses: any[] = []
  let users: any[] = []

  try {
    const [enrollRes, courseRes, usersRes] = await Promise.all([
      apiFetch<any>("/enrollments/admin?limit=50", { token: token ?? undefined, cache: "no-store" }),
      apiFetch<any>("/courses?limit=100", { token: token ?? undefined, cache: "no-store" }),
      apiFetch<any>("/users?limit=200", { token: token ?? undefined, cache: "no-store" }),
    ])
    enrollments = enrollRes.data ?? []
    total = enrollRes.meta?.total ?? 0
    courses = courseRes.data ?? []
    users = usersRes.data ?? []
  } catch (error) {
    console.error("Failed to fetch enrollments:", error)
  }

  return (
    <EnrollmentsBrowser
      enrollments={enrollments}
      total={total}
      courses={courses}
      users={users}
      dictionary={dict.admin_enrollments}
      locale={locale}
      token={token ?? ""}
    />
  )
}
