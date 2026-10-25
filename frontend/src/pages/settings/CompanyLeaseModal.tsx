import "./CompanyLeaseModal.css";
import { useMemo } from "react";
import { errorMessage } from "@/api/client";
import type { CompanyDto, LeaseDto } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { formatPercentage, parseAmount } from "@/lib/format";
import { useCompanyForm } from "./useCompanyForm";

/**
 * Modal linking (or unlinking) the lease of a company. Identity fields are not
 * editable here: the full current identity payload is resent untouched.
 */
export function CompanyLeaseModal({
  open,
  company,
  leases,
  onClose,
  onSaved,
}: {
  open: boolean;
  company: CompanyDto;
  leases: LeaseDto[];
  onClose: () => void;
  onSaved: (company: CompanyDto) => void;
}) {
  const { form, save, saveCompany } = useCompanyForm(company);
  const leaseId = form.watch("leaseId");

  const selectedLease = useMemo(
    () => leases.find((lease) => String(lease.id) === leaseId) ?? null,
    [leases, leaseId],
  );
  const displayedProRata = useMemo(() => {
    const proArea = parseAmount(selectedLease?.businessArea ?? "");
    const totalArea = parseAmount(selectedLease?.totalArea ?? "");
    if (proArea === null || totalArea === null || Number(totalArea) <= 0) {
      return null;
    }
    return (Number(proArea) / Number(totalArea)) * 100;
  }, [selectedLease]);

  return (
    <FormModal
      open={open}
      title="Modifier le bail de la société"
      onClose={onClose}
      onSubmit={form.handleSubmit((values) => {
        saveCompany(values, onSaved);
      })}
      formDataCy="formulaire-bail-societe"
      submitDataCy="btn-enregistrer-bail-societe"
      pending={save.isPending}
      error={save.isError ? errorMessage(save.error) : null}
      formClassName="company-lease-modal-form"
    >
      <FieldGroup
        id="param-bail-societe"
        label="Bail de la société"
        error={form.formState.errors.leaseId?.message}
        help="Facultatif : une société peut ne pas avoir de bail."
      >
        <select
          id="param-bail-societe"
          className={cn(
            "field",
            form.formState.errors.leaseId && "field-error",
          )}
          {...form.register("leaseId")}
          data-cy="select-bail-societe"
        >
          <option value="">Aucun bail</option>
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.propertyAddress ?? "Bail sans adresse"}
            </option>
          ))}
        </select>
      </FieldGroup>

      <div className="company-lease-modal-prorata">
        <p className="company-lease-modal-prorata-label">Prorata indicatif</p>
        <p
          className="company-lease-modal-prorata-value"
          data-cy="prorata-indicatif"
        >
          {displayedProRata === null ? "—" : formatPercentage(displayedProRata)}
        </p>
        <p className="company-lease-modal-prorata-note">
          Calculé et arrondi côté backend à l’enregistrement.
        </p>
      </div>
    </FormModal>
  );
}
