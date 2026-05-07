"use server"

import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function enrollCourseAction(courseId: string) {
  const token = await getAccessToken()
  try {
    const enrollment = await apiFetch(`/enrollments`, {
      method: "POST",
      token: token ?? undefined,
      body: JSON.stringify({ courseId, source: "organic" }),
    })
    revalidatePath(`/learn/${courseId}`)
    return { success: true, enrollment }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function markLessonCompleteAction(enrollmentId: string, lessonId: string, watchSeconds?: number) {
  const token = await getAccessToken()
  try {
    const enrollment = await apiFetch(`/enrollments/${enrollmentId}/progress`, {
      method: "PATCH",
      token: token ?? undefined,
      body: JSON.stringify({ lessonId, status: "completed", ...(watchSeconds !== undefined ? { watchSeconds } : {}) }),
    })
    return { success: true, enrollment }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function startQuizAttemptAction(quizId: string) {
  const token = await getAccessToken()
  try {
    const attempt = await apiFetch<any>(`/quizzes/${quizId}/attempts`, {
      method: "POST",
      token: token ?? undefined,
      body: JSON.stringify({}),
    })
    return { success: true, attempt }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function submitQuizAttemptAction(attemptId: string, answers: { questionId: string; response: string | string[] }[]) {
  const token = await getAccessToken()
  try {
    const result = await apiFetch<any>(`/quiz-attempts/${attemptId}/submit`, {
      method: "POST",
      token: token ?? undefined,
      body: JSON.stringify({ answers }),
    })
    return { success: true, result }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getLastQuizAttemptAction(quizId: string) {
  const token = await getAccessToken()
  try {
    const result = await apiFetch<any>(`/quizzes/${quizId}/attempts/last`, {
      token: token ?? undefined,
      cache: "no-store",
    })
    return { success: true, result }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getCertificateAction(userId: string, courseId: string) {
  const token = await getAccessToken()
  try {
    const certs = await apiFetch<any[]>(`/users/${userId}/certificates`, {
      token: token ?? undefined,
      cache: "no-store",
    })
    const cert = certs.find(c => c.courseId === courseId) ?? null
    return { success: true, certificate: cert }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveLessonProgressAction(courseId: string, enrollmentId: string, lessonId: string, watchSeconds: number) {
  const token = await getAccessToken()
  try {
    await apiFetch(`/enrollments/${enrollmentId}/progress`, {
      method: "PATCH",
      token: token ?? undefined,
      body: JSON.stringify({ lessonId, status: "in_progress", watchSeconds }),
    })
    // Removed revalidatePath to prevent video player disruption
    return { success: true }
  } catch (error: any) {
    console.error("saveLessonProgressAction ERROR:", error)
    return { error: error.message }
  }
}
