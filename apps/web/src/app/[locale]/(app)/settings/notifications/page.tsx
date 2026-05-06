import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { NotificationsInbox } from "./notifications-inbox"

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const token = await getAccessToken()
  const dict = await getDictionary(locale)

  let notifications: any[] = []
  let unreadCount = 0

  try {
    const res = await apiFetch<any>("/notifications?limit=50", {
      token: token ?? undefined,
      cache: "no-store",
    })
    notifications = res.data ?? []
    unreadCount = res.meta?.unreadCount ?? 0
  } catch {}

  return (
    <NotificationsInbox
      notifications={notifications}
      unreadCount={unreadCount}
      dictionary={dict.settings_notifications}
      locale={locale}
      token={token ?? ""}
    />
  )
}
