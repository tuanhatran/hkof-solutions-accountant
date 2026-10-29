import "./CompanySection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useCompanies } from "@/api/queries";
import type { CompanyDto } from "@/api/types";
import { EmptyState } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ViewTabs, type ViewTab } from "@/components/ui/ViewTabs";
import { EXPENSE_STATEMENT_CONFIGURATION } from "@/pages/templates/templateTypes";
import { TemplatesTab } from "@/pages/templates/TemplatesTab";
import { toast } from "@/state/toasts";
import { CompanyIdentityModal } from "./CompanyIdentityModal";
import { CompanyIdentityView } from "./CompanyIdentityView";
import { CompanyLeaseTab } from "./CompanyLeaseTab";
import { EmployeeSection } from "./EmployeeSection";

/** Company directory: selector plus four tabs with modal-based editing. */
export function CompanySection() {
  const { t } = useTranslation();
  const tabs: ViewTab[] = [
    {
      value: "identification",
      label: t("settings.company.tabs.identification"),
      dataCy: "onglet-entreprise-identification",
      panelId: "company-section-panel",
    },
    {
      value: "bail-frais",
      label: t("settings.company.tabs.leaseExpenses"),
      dataCy: "onglet-entreprise-bail-frais",
      panelId: "company-section-panel",
    },
    {
      value: "salaries",
      label: t("settings.company.tabs.employees"),
      dataCy: "onglet-entreprise-salaries",
      panelId: "company-section-panel",
    },
    {
      value: "templates",
      label: t("settings.company.tabs.templates"),
      dataCy: "onglet-entreprise-templates",
      panelId: "company-section-panel",
    },
  ];
  const queryClient = useQueryClient();
  const companies = useCompanies();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState("identification");
  const [identityTarget, setIdentityTarget] = useState<
    CompanyDto | "new" | null
  >(null);
  const [toDelete, setToDelete] = useState<CompanyDto | null>(null);

  const list = useMemo(() => companies.data ?? [], [companies.data]);
  useEffect(() => {
    if (
      selectedId === null ||
      !list.some((company) => company.id === selectedId)
    ) {
      setSelectedId(list[0]?.id ?? null);
    }
  }, [companies.data, list, selectedId]);
  useEffect(() => {
    setTab("identification");
  }, [selectedId]);

  const selected = list.find((company) => company.id === selectedId) ?? null;

  const closeModals = () => {
    setIdentityTarget(null);
  };

  const remove = useMutation({
    mutationFn: (company: CompanyDto) =>
      api.companies.delete(company.id as number),
    onSuccess: (_deleted, company) => {
      if (selectedId === company.id) {
        setSelectedId(null);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employeesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.signaturesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      closeModals();
      setToDelete(null);
      toast.success(t("settings.company.deleted"));
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return (
    <div className="settings-page-sections">
      <div className="company-section-toolbar">
        {!companies.isError && !companies.isPending && list.length > 0 ? (
          <select
            id="societe-a-configurer"
            aria-label={t("settings.company.selectAria")}
            className="field company-section-select"
            value={selectedId ?? ""}
            onChange={(event) => {
              const nextId =
                event.target.value === "" ? null : Number(event.target.value);
              closeModals();
              setSelectedId(nextId);
            }}
            data-cy="select-company"
          >
            {list.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        ) : null}
        <Button
          variant="primary"
          small
          icon={<Plus size={14} />}
          onClick={() => setIdentityTarget("new")}
          disabled={identityTarget !== null}
          data-cy="btn-new-company"
        >
          {t("settings.company.newCompany")}
        </Button>
        {selected ? (
          <Button
            variant="ghost"
            small
            icon={<Trash2 size={13} />}
            className="text-danger hover:bg-danger-soft"
            onClick={() => setToDelete(selected)}
            data-cy="btn-delete-company"
          >
            {t("settings.company.deleteButton")}
          </Button>
        ) : null}
      </div>
      <div className="company-section-tabs">
        <ViewTabs
          ariaLabel={t("settings.company.tabsAria")}
          idPrefix="company-tabs"
          tabs={tabs}
          active={tab}
          onChange={setTab}
        />
      </div>
      <section className="card company-section">
        {companies.isError ? (
          <div className="card-body">
            <ErrorState
              message={errorMessage(companies.error)}
              onRetry={() => void companies.refetch()}
            />
          </div>
        ) : companies.isPending ? (
          <div className="card-body">
            <LoadingState message={t("settings.company.loading")} />
          </div>
        ) : list.length === 0 && tab !== "templates" ? (
          <div className="card-body">
            <EmptyState
              text={t("settings.company.empty")}
              dataCy="no-company"
            />
          </div>
        ) : null}
        <div
          id="company-section-panel"
          role="tabpanel"
          aria-labelledby={`company-tabs-tab-${tab}`}
          className="company-section-tabpanel"
        >
          {selected && tab === "identification" ? (
            <CompanyIdentityView
              company={selected}
              onEdit={() => setIdentityTarget(selected)}
            />
          ) : null}
          {selected && tab === "bail-frais" ? (
            <CompanyLeaseTab
              key={String(selected.id)}
              company={selected}
              companies={list}
            />
          ) : null}
          {selected && tab === "salaries" ? (
            <EmployeeSection companyId={selected.id as number} />
          ) : null}
          {tab === "templates" ? (
            <TemplatesTab
              configuration={EXPENSE_STATEMENT_CONFIGURATION}
              embedded
            />
          ) : null}
        </div>
      </section>

      {identityTarget !== null ? (
        <CompanyIdentityModal
          key={
            identityTarget === "new"
              ? "new"
              : String(identityTarget.id ?? "unknown")
          }
          open
          company={identityTarget === "new" ? null : identityTarget}
          onClose={() => setIdentityTarget(null)}
          onSaved={(saved) => {
            const wasNew = identityTarget === "new";
            setIdentityTarget(null);
            if (wasNew && saved.id !== undefined) {
              setSelectedId(saved.id);
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        title={t("settings.company.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.company.deleteDialog.message", {
                name:
                  toDelete.name ??
                  t("settings.company.deleteDialog.fallbackName"),
              })
            : ""
        }
        confirmLabel={t("settings.company.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-societe"
      />
    </div>
  );
}
