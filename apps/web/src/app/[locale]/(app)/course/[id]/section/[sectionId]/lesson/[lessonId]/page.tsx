import { apiFetch } from "@/lib/api"
import { getAccessToken } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LessonEditor } from "./lesson-editor"
import { QuizEditor } from "./quiz-editor"
import { getDictionary } from "@/dictionaries/get-dictionary"

export default async function LessonEditPage({ params }: { params: Promise<{ locale: string, id: string, sectionId: string, lessonId: string }> }) {
  const { locale, id, sectionId, lessonId } = await params
  const token = await getAccessToken()
  const dictionary = await getDictionary(locale)
  
  let course: any
  let lesson: any

  try {
    const [courseData, lessonData] = await Promise.all([
      apiFetch(`/courses/${id}`, { token, cache: "no-store" }),
      apiFetch(`/courses/${id}/sections/${sectionId}/lessons/${lessonId}`, { token, cache: "no-store" })
    ])
    course = courseData
    lesson = lessonData
  } catch (error) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link 
          href={`/${locale}/course/${id}`} 
          className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-600 shadow-sm transition-all hover:shadow"
          title={dictionary.lesson_editor.back_to_course}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 line-clamp-1">{lesson.title}</h1>
            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 border border-red-200 uppercase">
              {lesson.type}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            {dictionary.course_list.course}: {course.title}
          </p>
        </div>
      </div>

      {lesson.type === "quiz" ? (
        <QuizEditor
          courseId={id}
          sectionId={sectionId}
          initialLesson={lesson}
          course={course}
          dictionary={dictionary.lesson_editor}
          locale={locale}
        />
      ) : (
        <LessonEditor 
          courseId={id} 
          sectionId={sectionId} 
          initialLesson={lesson} 
          dictionary={dictionary.lesson_editor}
          locale={locale}
        />
      )}
    </div>
  )
}
