import "./LanguageSelector.css";
import { useTranslation } from "react-i18next";
import {
  resolveSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: "Français",
  en: "English",
};

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const current = resolveSupportedLanguage(i18n.resolvedLanguage);

  return (
    <div className="language-selector-root">
      <label className="language-selector-label" htmlFor="select-langue">
        {t("common.language")}
      </label>
      <select
        id="select-langue"
        data-cy="select-langue"
        className="language-selector-select"
        value={current}
        onChange={(event) => {
          void i18n.changeLanguage(
            resolveSupportedLanguage(event.target.value),
          );
        }}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {LANGUAGE_NAMES[language]}
          </option>
        ))}
      </select>
    </div>
  );
}
