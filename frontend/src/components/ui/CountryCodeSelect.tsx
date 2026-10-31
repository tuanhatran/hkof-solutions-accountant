import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export interface CountryCodeOption {
  code: string;
  country: string;
  i18nKey: string;
}

export const COUNTRY_CODES: readonly CountryCodeOption[] = [
  { code: "+33", country: "FR", i18nKey: "onboarding.profile.countries.fr" },
  { code: "+32", country: "BE", i18nKey: "onboarding.profile.countries.be" },
  { code: "+41", country: "CH", i18nKey: "onboarding.profile.countries.ch" },
  { code: "+34", country: "ES", i18nKey: "onboarding.profile.countries.es" },
  { code: "+44", country: "GB", i18nKey: "onboarding.profile.countries.gb" },
  { code: "+1", country: "US", i18nKey: "onboarding.profile.countries.us" },
] as const;

export interface CountryCodeSelectProps {
  id?: string;
  value?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  className?: string;
  "data-cy"?: string;
  "aria-label"?: string;
}

/**
 * Country dial code selector defaulting to +33 (France),
 * supporting international country dial codes (+32, +41, +34, +44, +1).
 */
export function CountryCodeSelect({
  id,
  value = "+33",
  onChange,
  disabled,
  className,
  "data-cy": dataCy,
  "aria-label": ariaLabel,
}: CountryCodeSelectProps) {
  const { t } = useTranslation();

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel ?? t("onboarding.profile.phoneCountryAria")}
      data-cy={dataCy}
      className={cn(
        "field mt-0 w-auto shrink-0 cursor-pointer bg-surface",
        className,
      )}
    >
      {COUNTRY_CODES.map((item) => (
        <option key={item.code} value={item.code}>
          {t(item.i18nKey)}
        </option>
      ))}
    </select>
  );
}
