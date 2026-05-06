"use server"

import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createCourseAction(prevState: any, formData: FormData) {
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const categoryId = formData.get("categoryId") as string
  const thumbnailUrl = formData.get("thumbnailUrl") as string
  const durationStr = formData.get("durationMinutes") as string
  const durationMinutes = durationStr ? parseInt(durationStr) : undefined
  const instructorId = formData.get("instructorId") as string

  if (!title || title.trim() === "") {
    return { error: "กรุณาระบุชื่อคอร์สเรียน" }
  }

  const token = await getAccessToken()
  let course: any
  try {
    course = await apiFetch("/courses", {
      method: "POST",
      token,
      body: JSON.stringify({
        title: title.trim(),
        description: description?.trim() || undefined,
        categoryId: categoryId || undefined,
        thumbnailUrl: thumbnailUrl?.trim() || undefined,
        instructorId: instructorId || undefined,
        language: "th",
        durationMinutes,
      }),
    })
  } catch (err: any) {
    return { error: err.message || "เกิดข้อผิดพลาดในการสร้างคอร์ส" }
  }
  
  revalidatePath("/course/list")
  redirect(`/course/${course.id}`)
}
