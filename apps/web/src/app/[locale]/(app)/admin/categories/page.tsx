import { getAccessToken } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/get-dictionary"
import { Locale } from "@/lib/i18n-config"
import { CategoriesBrowser } from "./categories-browser"

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const token = await getAccessToken()
  const dict = await getDictionary(locale)
  let categories: any[] = []

  try {
    categories = await apiFetch<any[]>("/courses/categories", { token: token ?? undefined, cache: "no-store" })
  } catch (error) {
    console.error("Failed to fetch categories:", error)
  }

  return <CategoriesBrowser categories={categories} dictionary={dict.admin_categories} locale={locale} token={token ?? ""} />
}
