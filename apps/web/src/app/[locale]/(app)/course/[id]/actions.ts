"use server"

import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createSectionAction(courseId: string, title: string) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections`, {
      method: "POST",
      token,
      body: JSON.stringify({ title, sortOrder: 0 })
    })
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function createLessonAction(courseId: string, sectionId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons`, {
      method: "POST",
      token,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteSectionAction(courseId: string, sectionId: string) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}`, {
      method: "DELETE",
      token,
    })
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteLessonAction(courseId: string, sectionId: string, lessonId: string) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, {
      method: "DELETE",
      token,
    })
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateSectionAction(courseId: string, sectionId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateLessonAction(courseId: string, sectionId: string, lessonId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function publishCourseAction(courseId: string) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/publish`, {
      method: "PATCH",
      token,
    })
    revalidatePath(`/course/${courseId}`)
    revalidatePath(`/course/list`)
    return { success: true }
  } catch (error: any) {
    console.error("[publishCourseAction] Error:", {
      courseId,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    })
    return { error: `[${error?.status ?? "?"}] ${error?.message ?? "Unknown error"}` }
  }
}

export async function unpublishCourseAction(courseId: string) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/unpublish`, {
      method: "PATCH",
      token,
    })
    revalidatePath(`/course/${courseId}`)
    revalidatePath(`/course/list`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateCourseMetadataAction(courseId: string, data: {
  title?: string;
  description?: string;
  categoryId?: string | null;
  thumbnailUrl?: string | null;
  durationMinutes?: number | null;
  instructorId?: string | null;
}) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}`)
    revalidatePath(`/course/list`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
