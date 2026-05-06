import { getSession, getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { AccountForm } from "./account-form"

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const session = await getSession()
  const token = await getAccessToken()
  const dict = await getDictionary(locale)

  let user: any = null
  if (session?.sub) {
    try {
      user = await apiFetch<any>(`/users/${session.sub}`, {
        token: token ?? undefined,
        cache: "no-store",
      })
    } catch {}
  }

  return (
    <AccountForm
      user={user}
      userId={session?.sub ?? ""}
      dictionary={dict.settings_account}
      locale={locale}
      token={token ?? ""}
    />
  )
}
