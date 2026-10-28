import "./CompanySwitcher.css";
import { useTranslation } from "react-i18next";
import { useCompanies } from "@/api/queries";
import { useCompanyStore } from "@/state/company";

/** Persistent "Société active" selector shown in the top context bar. */
export function CompanySwitcher() {
  const { t } = useTranslation();
  const companies = useCompanies();
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);

  if (companies.isPending || companies.isError) {
    return null;
  }
  const list = companies.data ?? [];
  if (list.length === 0 || activeCompanyId === null) {
    return null;
  }

  return (
    <div className="company-switcher">
      <label className="company-switcher-label" htmlFor="select-societe-active">
        {t("shell.activeCompany")}
      </label>
      <select
        id="select-societe-active"
        data-cy="select-societe-active"
        className="company-switcher-select"
        value={activeCompanyId}
        onChange={(event) => setActiveCompany(Number(event.target.value))}
      >
        {list.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
