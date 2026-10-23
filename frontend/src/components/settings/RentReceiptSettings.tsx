import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LandlordSection } from "./LandlordSection";
import { LeaseSection } from "./LeaseSection";
import { TenantSection } from "./TenantSection";
import { useRentReceiptSettings } from "./useRentReceiptSettings";

/** Landlords, tenants and leases directory used by the rent receipts. */
export function RentReceiptSettings() {
  const c = useRentReceiptSettings();

  return (
    <div className="space-y-6">
      <LandlordSection c={c} />
      <TenantSection c={c} />
      <LeaseSection c={c} />

      <ConfirmDialog
        open={c.landlordToDelete !== null}
        title="Supprimer ce bailleur ?"
        message={
          c.landlordToDelete
            ? `« ${c.landlordToDelete.name ?? "Ce bailleur"} » ne sera plus proposé. Un bailleur utilisé par un bail actif ne peut pas être supprimé.`
            : ""
        }
        confirmLabel="Supprimer le bailleur"
        variant="danger"
        onConfirm={() => {
          if (c.landlordToDelete) {
            c.removeLandlord.mutate(c.landlordToDelete);
          }
        }}
        onCancel={() => c.setLandlordToDelete(null)}
        dataCy="dialogue-supprimer-bailleur"
      />

      <ConfirmDialog
        open={c.tenantToDelete !== null}
        title="Supprimer ce locataire ?"
        message={
          c.tenantToDelete
            ? `« ${c.tenantToDelete.name ?? "Ce locataire"} » ne sera plus proposé. Un locataire utilisé par un bail actif ne peut pas être supprimé.`
            : ""
        }
        confirmLabel="Supprimer le locataire"
        variant="danger"
        onConfirm={() => {
          if (c.tenantToDelete) {
            c.removeTenant.mutate(c.tenantToDelete);
          }
        }}
        onCancel={() => c.setTenantToDelete(null)}
        dataCy="dialogue-supprimer-locataire"
      />

      <ConfirmDialog
        open={c.leaseToDelete !== null}
        title="Supprimer ce bail ?"
        message={
          c.leaseToDelete
            ? `Le bail de « ${c.leaseToDelete.tenantName ?? "ce locataire"} » ne sera plus proposé lors de la génération. Les quittances existantes restent inchangées.`
            : ""
        }
        confirmLabel="Supprimer le bail"
        variant="danger"
        onConfirm={() => {
          if (c.leaseToDelete) {
            c.removeLease.mutate(c.leaseToDelete);
          }
        }}
        onCancel={() => c.setLeaseToDelete(null)}
        dataCy="dialogue-supprimer-bail"
      />
    </div>
  );
}
