import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { notFound } from "next/navigation"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { EnrollmentTable } from "./enrollment-table"

export default async function CourseEnrollmentsPage({
  params,
}: {
  params: Promise<{ id: string; locale: Locale }>
}) {
  const { id, locale } = await params
  const token = await getAccessToken() ?? undefined
  const dict = await getDictionary(locale)
  const d = dict.enrollments

  let data: any
  try {
    data = await apiFetch(`/analytics/courses/${id}/enrollments`, {
      token,
      cache: "no-store",
    })
  } catch {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/${locale}/course/${id}`}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm transition-all hover:shadow shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <Users className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-600">{d.title}</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{data.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{d.subtitle}</p>
        </div>
      </div>

      <EnrollmentTable
        enrollments={data.enrollments}
        total={data.total}
        dictionary={d}
        locale={locale}
        courseId={id}
        token={token}
      />
    </div>
  )
}
