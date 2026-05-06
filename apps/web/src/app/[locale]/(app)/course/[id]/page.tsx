import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { notFound } from "next/navigation"
import { CourseBuilder } from "./course-builder"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"

import { PublishButton } from "./publish-button"
import { UnpublishButton } from "./unpublish-button"
import { Users } from "lucide-react"
import { CourseEditClientWrapper } from "./course-edit-client"

export default async function CourseEditPage({ 
  params 
}: { 
  params: Promise<{ id: string; locale: Locale }> 
}) {
  const { id, locale } = await params
  const token = await getAccessToken()
  const dict = await getDictionary(locale)
  let course: any
  
  try {
    course = await apiFetch(`/courses/${id}`, { token, cache: "no-store" })
  } catch (error) {
    notFound()
  }

  const hasLessons = course.sections?.some((s: any) => s.lessons?.length > 0)
  const isPublished = course.status === "published"

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/${locale}/course/list`} className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm transition-all hover:shadow">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 line-clamp-1">{course.title}</h1>
            {isPublished && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600 border border-green-200">
                {dict.course_edit.published_badge}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{dict.course_edit.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/course/${id}/enrollments`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
          >
            <Users className="h-4 w-4" />
            {dict.enrollments.btn_view_enrollments}
          </Link>
          {isPublished ? (
            <UnpublishButton courseId={course.id} dictionary={dict.course_edit} />
          ) : (
            <PublishButton courseId={course.id} disabled={!hasLessons} dictionary={dict.course_edit} />
          )}
        </div>
      </div>
      
      <CourseEditClientWrapper 
        course={course} 
        dictionary={dict} 
        locale={locale} 
        isPublished={isPublished} 
        hasLessons={hasLessons}
      />
    </div>
  )
}
