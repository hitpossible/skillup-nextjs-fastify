import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; userId: string }> }
) {
  const { courseId, userId } = await params
  const token = await getAccessToken() ?? undefined

  try {
    const data = await apiFetch(
      `/analytics/courses/${courseId}/enrollments/${userId}/quizzes`,
      { token, cache: "no-store" }
    )
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
