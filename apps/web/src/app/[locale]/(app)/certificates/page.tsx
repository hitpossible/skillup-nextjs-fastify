import { getAccessToken, getSession } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { CertificatesBrowser } from "./certificates-browser"

export default async function CertificatesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const token = await getAccessToken()
  const session = await getSession()
  if (!session || !token) redirect(`/${locale}/login`)

  const dict = await getDictionary(locale)

  let certificates: any[] = []
  try {
    certificates = await apiFetch<any[]>(`/users/${session.sub}/certificates`, {
      token: token ?? undefined,
      cache: "no-store",
    })
  } catch {}

  return (
    <CertificatesBrowser
      certificates={certificates}
      holderName={session.fullName || session.email?.split("@")[0] || ""}
      dictionary={dict}
      locale={locale}
    />
  )
}
