import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET() {
  const token = await getAccessToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch users with a high limit to ensure we see enough potential instructors
    const data = await apiFetch("/users?limit=100", { token, cache: "no-store" })
    return NextResponse.json(data)
  } catch (err) {
    console.error("Failed to fetch users:", err)
    return NextResponse.json({ data: [], meta: {} }, { status: 200 })
  }
}
