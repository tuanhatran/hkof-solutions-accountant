import type { SettingsDto } from "@/api/types";
import type { SettingsFormValues } from "@/lib/validation";

export const PERIODICITIES = [
  { value: "MONTHLY", label: "Mensuelle" },
  { value: "BIMONTHLY", label: "Bimestrielle" },
  { value: "ANNUAL", label: "Annuelle" },
] as const;

export type Periodicity = (typeof PERIODICITIES)[number]["value"];

/** Formats an API decimal string for a French decimal input. */
export function decimalFormatter(value: string | undefined): string {
  return value ? value.replace(".", ",") : "";
}

/** Maps the API settings to the React Hook Form values. */
export function valuesFromSettings(
  settings: SettingsDto | undefined,
): SettingsFormValues {
  return {
    companyName: settings?.companyName ?? "",
    legalForm: settings?.legalForm ?? "",
    siren: settings?.siren ?? "",
    companyAddress: settings?.companyAddress ?? "",
    managerName: settings?.managerName ?? "",
    homeAddress: settings?.homeAddress ?? "",
    totalArea: decimalFormatter(settings?.totalArea),
    businessArea: decimalFormatter(settings?.businessArea),
    issuePlace: settings?.issuePlace ?? "",
  };
}
