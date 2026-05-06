"use server"

import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function updateLessonDetailsAction(courseId: string, sectionId: string, lessonId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, {
      method: "PATCH",
      token: token ?? undefined,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}/section/${sectionId}/lesson/${lessonId}`)
    revalidatePath(`/course/${courseId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function createVideoQuestionAction(courseId: string, sectionId: string, lessonId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/questions`, {
      method: "POST",
      token: token ?? undefined,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}/section/${sectionId}/lesson/${lessonId}`)
    return { success: true }
  } catch (error: any) {
    console.error("createVideoQuestionAction ERROR:", error)
    return { error: error.message }
  }
}

export async function updateVideoQuestionAction(courseId: string, sectionId: string, lessonId: string, questionId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/questions/${questionId}`, {
      method: "PATCH",
      token: token ?? undefined,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}/section/${sectionId}/lesson/${lessonId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteVideoQuestionAction(courseId: string, sectionId: string, lessonId: string, questionId: string) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/questions/${questionId}`, {
      method: "DELETE",
      token: token ?? undefined,
    })
    revalidatePath(`/course/${courseId}/section/${sectionId}/lesson/${lessonId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function upsertLessonQuizAction(courseId: string, sectionId: string, lessonId: string, data: any) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/quiz`, {
      method: "PUT",
      token: token ?? undefined,
      body: JSON.stringify(data)
    })
    revalidatePath(`/course/${courseId}/section/${sectionId}/lesson/${lessonId}`)
    return { success: true }
  } catch (error: any) {
    console.error("upsertLessonQuizAction ERROR:", error)
    return { error: error.message }
  }
}
