import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ attemptId: string; questionId: string }> }
) {
  const { attemptId, questionId } = await params
  const token = await getAccessToken() ?? undefined
  const body = await req.json()

  try {
    const data = await apiFetch(
      `/analytics/quiz-attempts/${attemptId}/questions/${questionId}/score`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }
    )
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update score" },
      { status: err.status || 500 }
    )
  }
}
