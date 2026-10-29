import { getLocales } from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

// French is the fallback for any device language other than English (ADR 0007).
export function pickLanguage(deviceLanguage: string | null): "en" | "fr" {
  return deviceLanguage === "en" ? "en" : "fr";
}

const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: pickLanguage(getLocales()[0].languageCode),
  fallbackLng: "fr",
  interpolation: { escapeValue: false }, // React already escapes text
});

// Typed keys: tsc rejects t("a.typo").
declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

export default i18n;
