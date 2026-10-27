import i18next, { type i18n as I18nInstance } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { en } from "./resources/en";
import { fr } from "./resources/fr";

/** Single localStorage key holding the user's language choice. */
export const LANGUAGE_STORAGE_KEY = "homeofficeexpenses.lang";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveSupportedLanguage(
  language: string | undefined,
): SupportedLanguage {
  return language?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function syncDocumentLanguage(language: string | undefined): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.lang = resolveSupportedLanguage(language);
}

function configureInstance(): I18nInstance {
  const instance = i18next.createInstance();
  instance.use(LanguageDetector).use(initReactI18next);
  void instance.init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: "fr",
    load: "languageOnly",
    initAsync: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });
  instance.on("languageChanged", () => {
    syncDocumentLanguage(instance.resolvedLanguage);
  });
  syncDocumentLanguage(instance.resolvedLanguage);
  return instance;
}

/** Creates an isolated instance, used by tests and the application singleton. */
export function createI18n(): I18nInstance {
  return configureInstance();
}

const i18n = configureInstance();

export default i18n;
