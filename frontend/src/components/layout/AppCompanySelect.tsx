import "./AppCompanySelect.css";
import { useEffect, useId } from "react";
import { useCompanies } from "@/api/queries";
import { resolveActiveCompanyId, useCompanyStore } from "@/state/company";

export function AppCompanySelect() {
  const selectId = useId();
  const companies = useCompanies();
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);

  useEffect(() => {
    if (!companies.isSuccess) {
      return;
    }
    const resolved = resolveActiveCompanyId(activeCompanyId, companies.data);
    if (resolved !== activeCompanyId) {
      setActiveCompany(resolved);
    }
  }, [companies.isSuccess, companies.data, activeCompanyId, setActiveCompany]);

  if (companies.isPending) {
    return <p className="app-company-select-empty">Chargement des sociétés…</p>;
  }
  if (companies.isError) {
    return (
      <p role="alert" className="app-company-select-empty">
        Impossible de charger les sociétés.
      </p>
    );
  }
  const list = companies.data ?? [];
  if (list.length === 0) {
    return (
      <p className="app-company-select-empty">
        Aucune société configurée. Ajoutez-en une dans Configuration.
      </p>
    );
  }

  return (
    <div className="app-company-select">
      <label htmlFor={selectId} className="app-company-select-label">
        Société active
      </label>
      <select
        id={selectId}
        className="app-company-select-field"
        value={activeCompanyId === null ? "" : String(activeCompanyId)}
        onChange={(event) =>
          setActiveCompany(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
        data-cy="select-societe-active"
      >
        {activeCompanyId === null ? (
          <option value="">Sélectionnez une société</option>
        ) : null}
        {list.map((company) => (
          <option key={String(company.id)} value={String(company.id)}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
