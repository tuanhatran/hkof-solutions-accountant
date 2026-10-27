import "./SettingsPage.css";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompanySection } from "./CompanySection";

/** Enterprise settings: companies, employees and expense items. */
export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        eyebrow={t("settings.page.eyebrow")}
        title={t("settings.page.title")}
        description={t("settings.page.description")}
      />
      <CompanySection />
    </>
  );
}
