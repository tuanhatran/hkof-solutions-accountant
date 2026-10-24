import "./SignaturesManager.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useEmployees, useSignatures } from "@/api/queries";
import type { SignatureDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { employeeTitleLabel } from "@/pages/settings/settingsValues";
import { toast } from "@/state/toasts";
import { SignatureCard } from "./SignatureCard";
import { SignatureForm } from "./SignatureForm";

/** Signature images available to the rent receipts and expense statements. */
export function SignaturesManager({ companyId }: { companyId: number | null }) {
  const queryClient = useQueryClient();
  const [employeeFilter, setEmployeeFilter] = useState<number | null>(null);
  const signatures = useSignatures(companyId, employeeFilter);
  const employees = useEmployees(companyId);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SignatureDto | null>(null);

  const remove = useMutation({
    mutationFn: (signature: SignatureDto) =>
      api.signatures.remove(signature.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.signaturesAll,
      });
      setToDelete(null);
      toast.success("Signature supprimée.");
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const list = signatures.data ?? [];
  const employeeRows = employees.data ?? [];
  const ceo = employeeRows.find((employee) => employee.title === "CEO");
  const defaultSignatureId = list.find(
    (signature) =>
      signature.type !== "LANDLORD" && signature.employeeId === ceo?.id,
  )?.id;

  return (
    <section className="card signatures-manager">
      <div className="card-header">
        <div className="signatures-manager-heading">
          <span className="signatures-manager-icon">
            <ImagePlus size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="signatures-manager-title">Signatures</h2>
            <p className="signatures-manager-description">
              Images PNG ou JPEG apposées dans les quittances et les notes de
              frais. 2 Mo maximum, suppression logique uniquement.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          small
          icon={<Plus size={14} />}
          onClick={() => setFormOpen((open) => !open)}
          disabled={formOpen}
          data-cy="btn-ajouter-signature"
        >
          Ajouter une signature
        </Button>
      </div>

      <div className="card-body signatures-manager-body">
        <div className="signatures-manager-filters">
          <label
            htmlFor="signature-filtre-salarie"
            className="signatures-manager-filter-label"
          >
            Filtrer par salarié
          </label>
          <select
            id="signature-filtre-salarie"
            className="field signatures-manager-filter-select"
            value={employeeFilter === null ? "" : String(employeeFilter)}
            onChange={(event) =>
              setEmployeeFilter(
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
            disabled={companyId === null || employeeRows.length === 0}
            data-cy="select-filtre-signature-salarie"
          >
            <option value="">Tous les salariés</option>
            {employeeRows.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName} —{" "}
                {employeeTitleLabel(employee.title)}
              </option>
            ))}
          </select>
        </div>

        {formOpen ? (
          <SignatureForm
            companyId={companyId}
            onClose={() => setFormOpen(false)}
          />
        ) : null}

        {signatures.isError ? (
          <ErrorState
            message={errorMessage(signatures.error)}
            onRetry={() => void signatures.refetch()}
          />
        ) : signatures.isPending ? (
          <LoadingState message="Chargement des signatures…" />
        ) : list.length === 0 ? (
          <p
            className="signatures-manager-empty"
            data-cy="aucune-signature-configuration"
          >
            Aucune signature configurée pour cette société. Ajoutez une image
            PNG ou JPEG pour signer vos documents.
          </p>
        ) : (
          <ul className="signatures-manager-list">
            {list.map((signature) => (
              <SignatureCard
                key={signature.id}
                signature={signature}
                onDelete={setToDelete}
                highlighted={signature.id === defaultSignatureId}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette signature ?"
        message={
          toDelete
            ? `« ${toDelete.name ?? "Cette signature"} » ne sera plus proposée dans les documents. Les documents existants restent inchangés.`
            : ""
        }
        confirmLabel="Supprimer la signature"
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-signature"
      />
    </section>
  );
}
