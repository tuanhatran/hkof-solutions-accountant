import "./GenerateRentReceiptPage.css";
import { CalendarDays, ReceiptText } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ActiveRentReceiptBanner } from "./ActiveRentReceiptBanner";
import { RentReceiptForm } from "./RentReceiptForm";
import { RentReceiptPreviewPane } from "./RentReceiptPreviewPane";
import { RentReceiptResultCard } from "./RentReceiptResultCard";
import { useRentReceiptPage } from "./useRentReceiptPage";

/** Rent receipt generation page. */
export function GenerateRentReceiptPage() {
  const c = useRentReceiptPage();
  const hasDirectoryError =
    c.landlords.isError || c.tenants.isError || c.leases.isError;

  return (
    <>
      <PageHeader
        eyebrow="Générer · Quittance"
        title="Quittance de loyer"
        description="Choisissez le mois et le bail : la période et les montants sont pré-remplis depuis le bail actif. Ajustez si besoin, puis générez le document définitif."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ReceiptText size={15} />}
              onClick={() => c.navigate("/generer/note-frais")}
            >
              Note de frais du mois
            </Button>
            <span className="hidden generate-rent-receipt-page-month sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMonth(c.draft.month)}
            </span>
          </>
        }
      />

      {hasDirectoryError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(
              c.leases.error ?? c.tenants.error ?? c.landlords.error,
            )}
            onRetry={() => {
              void c.landlords.refetch();
              void c.tenants.refetch();
              void c.leases.refetch();
            }}
          />
        </div>
      ) : null}

      <div className="generate-rent-receipt-page-tabs">
        <ViewTabs
          ariaLabel="Volets de génération"
          active={c.mobilePanel}
          onChange={(value) =>
            c.setMobilePanel(value === "apercu" ? "apercu" : "saisie")
          }
          tabs={[
            { value: "saisie", label: "Saisie" },
            {
              value: "apercu",
              label: "Aperçu",
              updated: Boolean(c.preview.updatedAt),
              className: "flex items-center justify-center gap-2",
            },
          ]}
        />
      </div>

      <div className="generate-rent-receipt-page-grid">
        <div
          data-cy="volet-saisie"
          className={cn(
            "generate-rent-receipt-page-input",
            c.mobile && c.mobilePanel !== "saisie" && "hidden",
          )}
        >
          <ActiveRentReceiptBanner c={c} />
          <RentReceiptResultCard c={c} />
          <RentReceiptForm c={c} />
        </div>

        <RentReceiptPreviewPane c={c} />
      </div>
    </>
  );
}
