import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import type { CompanyLookupDto } from "@/api/types";
import { Button } from "@/components/ui/Button";

/**
 * SIREN lookup used by a company lease. It may resolve a company owned by another
 * account; only its public legal identity is shown, never its private data.
 */
export function CompanySirenLookup({
  linked,
  onLinked,
}: {
  linked: CompanyLookupDto | null;
  onLinked: (company: CompanyLookupDto) => void;
}) {
  const { t } = useTranslation();
  const [siren, setSiren] = useState(linked?.siren ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSiren(linked?.siren ?? "");
    setError(null);
  }, [linked?.siren]);

  async function search() {
    setPending(true);
    setError(null);
    try {
      onLinked(await api.companies.lookup(siren.trim()));
    } catch (lookupError) {
      setError(errorMessage(lookupError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="lease-form-company-lookup sm:col-span-2">
      <label
        htmlFor="bail-locataire-siren"
        className="lease-form-company-lookup-label"
      >
        {t("settings.lease.form.companySiren")}
      </label>
      <div className="lease-form-company-lookup-row">
        <input
          id="bail-locataire-siren"
          className="field"
          value={siren}
          placeholder={t("settings.lease.form.companySirenPlaceholder")}
          onChange={(event) => setSiren(event.target.value)}
          data-cy="input-company-siren"
        />
        <Button
          variant="ghost"
          small
          loading={pending}
          disabled={siren.trim() === ""}
          onClick={() => void search()}
          data-cy="btn-lookup-company"
        >
          {t("settings.lease.form.companyLookup")}
        </Button>
      </div>
      <p className="lease-form-company-lookup-hint">
        {t("settings.lease.form.companyLookupHint")}
      </p>
      {error ? (
        <p
          className="lease-form-company-lookup-error"
          role="alert"
          data-cy="company-lookup-error"
        >
          {error}
        </p>
      ) : null}
      {linked ? (
        <div
          className="lease-form-company-public"
          data-cy="company-lookup-result"
        >
          <p className="lease-form-company-public-name">{linked.name}</p>
          <p className="lease-form-company-public-line">
            {t("settings.lease.form.companyLookupSiren")} :{" "}
            {linked.siren ?? "—"}
            {" · "}
            {t("settings.lease.form.companyLookupLegalForm")} :{" "}
            {linked.legalForm ?? "—"}
          </p>
          <p className="lease-form-company-public-line">
            {t("settings.lease.form.companyLookupAddress")} :{" "}
            {linked.address ?? "—"}
          </p>
          <p className="lease-form-company-public-line">
            {t("settings.lease.form.companyLookupManager")} :{" "}
            {linked.managerName ?? "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
