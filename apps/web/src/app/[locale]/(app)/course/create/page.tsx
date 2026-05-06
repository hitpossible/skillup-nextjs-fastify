import { CreateCourseForm } from "./create-form"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"

export default async function CreateCoursePage({
  params: { locale }
}: {
  params: { locale: Locale }
}) {
  const dict = await getDictionary(locale)
  
  return (
    <div className="py-6">
      <CreateCourseForm dictionary={dict.course_create} langDictionary={dict.learn} locale={locale} />
    </div>
  )
}
