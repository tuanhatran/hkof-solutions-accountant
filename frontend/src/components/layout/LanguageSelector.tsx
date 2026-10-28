import "./LanguageSelector.css";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import {
  resolveSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

const LANGUAGE_KEYS: Record<SupportedLanguage, string> = {
  fr: "common.languages.fr",
  en: "common.languages.en",
};

/** Two-state FR/EN language toggle of the application header. */
export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const current = resolveSupportedLanguage(i18n.resolvedLanguage);

  return (
    <div
      className="language-selector-root"
      role="group"
      aria-label={t("common.language")}
      data-cy="select-langue"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          className={cn(
            "language-selector-option",
            current === language && "language-selector-option-active",
          )}
          aria-pressed={current === language}
          onClick={() => {
            void i18n.changeLanguage(language);
          }}
        >
          {t(LANGUAGE_KEYS[language])}
        </button>
      ))}
    </div>
  );
}
