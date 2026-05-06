import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { UsersBrowser } from "./users-browser"

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const token = await getAccessToken()
  const dict = await getDictionary(locale)
  let users: any[] = []

  try {
    const res = await apiFetch<any>("/users?limit=100", { token: token ?? undefined, cache: "no-store" })
    users = res.data ?? []
  } catch (error) {
    console.error("Failed to fetch users:", error)
  }

  return <UsersBrowser users={users} dictionary={dict.admin_users} locale={locale} token={token ?? ""} />
}
