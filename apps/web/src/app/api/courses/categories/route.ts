import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET() {
  const token = await getAccessToken() ?? undefined
  try {
    const data = await apiFetch("/courses/categories", { token, cache: "no-store" })
    return NextResponse.json(data)
  } catch (err) {
    console.error("Failed to fetch categories:", err)
    return NextResponse.json([], { status: 200 })
  }
}
