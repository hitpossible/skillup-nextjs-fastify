import "server-only";
import type { Locale } from "@/lib/i18n-config";

const dictionaries = {
  en: () => import("./en.json").then((module) => module.default),
  th: () => import("./th.json").then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]?.() ?? dictionaries.th();
};
