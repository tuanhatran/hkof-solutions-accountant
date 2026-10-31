import "./AgencySection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useAgency } from "@/api/queries";
import type { AgencyRequest } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import {
  isValidSirenSiret,
  sirenOf,
  siretOf,
} from "@/pages/onboarding/useOnboardingState";
import { toast } from "@/state/toasts";

export function AgencySection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: agency, isPending, isError, error, refetch } = useAgency();

  const [name, setName] = useState("");
  const [isPersonal, setIsPersonal] = useState(false);
  const [managerName, setManagerName] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [sirenSiret, setSirenSiret] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (agency) {
      setName(agency.name ?? "");
      setIsPersonal(Boolean(agency.isPersonal));
      setManagerName(agency.managerName ?? "");
      setLegalForm(agency.legalForm ?? "");
      setSirenSiret(agency.siret || agency.siren || "");
      setAddress(agency.address ?? "");
    }
  }, [agency]);

  const saveMutation = useMutation({
    mutationFn: (payload: AgencyRequest) => api.agency.save(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agency });
      toast.success(t("settings.agency.saved"));
    },
    onError: (caught) => {
      toast.error(errorMessage(caught));
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    if (
      !isPersonal &&
      sirenSiret.trim() &&
      !isValidSirenSiret(sirenSiret.trim())
    ) {
      toast.error(t("onboarding.validation.sirenSiret"));
      return;
    }

    const payload: AgencyRequest = {
      name: name.trim(),
      isPersonal,
      managerName: managerName.trim() || null,
      legalForm: isPersonal ? null : legalForm.trim() || null,
      siren: isPersonal ? null : sirenOf(sirenSiret) || null,
      siret: isPersonal ? null : siretOf(sirenSiret),
      address: isPersonal ? null : address.trim() || null,
    };

    saveMutation.mutate(payload);
  }

  if (isPending) {
    return <LoadingState message={t("auth.loading")} />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error ? errorMessage(error) : t("auth.loading")}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <section className="card agency-section" data-cy="agency-section">
      <div className="agency-section-header">
        <div className="agency-section-heading">
          <span className="agency-section-icon" aria-hidden="true">
            <Building2 size={18} />
          </span>
          <div>
            <h2 className="agency-section-title">
              {t("settings.agency.title")}
            </h2>
            <p className="agency-section-description">
              {t("settings.agency.description")}
            </p>
          </div>
        </div>
      </div>

      <form className="agency-form" onSubmit={handleSubmit}>
        <div className="agency-personal-toggle">
          <label className="agency-checkbox-label" htmlFor="agency-is-personal">
            <input
              id="agency-is-personal"
              type="checkbox"
              className="agency-checkbox"
              data-cy="agency-is-personal"
              checked={isPersonal}
              onChange={(e) => setIsPersonal(e.target.checked)}
              aria-describedby="agency-personal-help"
            />
            <span>{t("settings.agency.isPersonal")}</span>
          </label>
          <p id="agency-personal-help" className="agency-checkbox-help">
            {t("settings.agency.isPersonalHelp")}
          </p>
        </div>

        <div className="agency-grid">
          <div>
            <label className="field-label" htmlFor="agency-name">
              {t("settings.agency.name")}
            </label>
            <input
              id="agency-name"
              className="field"
              data-cy="agency-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="agency-manager-name">
              {t("settings.agency.managerName")}
            </label>
            <input
              id="agency-manager-name"
              className="field"
              data-cy="agency-manager-name"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
          </div>

          {!isPersonal ? (
            <>
              <div>
                <label className="field-label" htmlFor="agency-legal-form">
                  {t("settings.agency.legalForm")}
                </label>
                <input
                  id="agency-legal-form"
                  className="field"
                  data-cy="agency-legal-form"
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="agency-siren-siret">
                  {t("settings.agency.sirenSiret")}
                </label>
                <input
                  id="agency-siren-siret"
                  className="field"
                  data-cy="agency-siren-siret"
                  inputMode="numeric"
                  value={sirenSiret}
                  onChange={(e) => setSirenSiret(e.target.value)}
                  aria-describedby="agency-siren-siret-help"
                />
                <p id="agency-siren-siret-help" className="hint">
                  {t("settings.agency.sirenSiretHelp")}
                </p>
              </div>

              <div className="agency-grid-full">
                <label className="field-label" htmlFor="agency-address">
                  {t("settings.agency.address")}
                </label>
                <input
                  id="agency-address"
                  className="field"
                  data-cy="agency-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="agency-actions">
          <Button
            type="submit"
            variant="primary"
            disabled={saveMutation.isPending}
            data-cy="btn-save-agency"
          >
            {saveMutation.isPending
              ? t("settings.agency.saving")
              : t("settings.agency.submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
