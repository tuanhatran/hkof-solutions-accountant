import "./GenerateRentReceiptPage.css";
import { ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { MonthField } from "@/components/ui/MonthField";
import { ErrorState } from "@/components/ui/States";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";
import { ActiveRentReceiptBanner } from "./ActiveRentReceiptBanner";
import { RentReceiptForm } from "./RentReceiptForm";
import { RentReceiptPreviewPane } from "./RentReceiptPreviewPane";
import { RentReceiptResultCard } from "./RentReceiptResultCard";
import { useRentReceiptPage } from "./useRentReceiptPage";

/** Rent receipt generation page. */
export function GenerateRentReceiptPage() {
  const { t } = useTranslation();
  const c = useRentReceiptPage();
  const hasDirectoryError =
    c.persons.isError || c.companies.isError || c.leases.isError;

  return (
    <>
      <PageHeader
        eyebrow={t("rentReceipt.page.eyebrow")}
        title={t("rentReceipt.page.title")}
        description={t("rentReceipt.page.description")}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ReceiptText size={15} />}
              onClick={() => c.navigate("/generer/note-frais")}
            >
              {t("rentReceipt.page.statementButton")}
            </Button>
            <MonthField
              id="quittance-mois"
              label={t("rentReceipt.fields.month")}
              value={c.values.month}
              onChange={c.changeMonth}
              inputProps={c.register("month")}
              error={c.errors.month?.message}
              dataCy="select-mois"
            />
          </>
        }
      />

      {hasDirectoryError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(
              c.leases.error ?? c.persons.error ?? c.companies.error,
            )}
            onRetry={() => {
              void c.persons.refetch();
              void c.companies.refetch();
              void c.leases.refetch();
            }}
          />
        </div>
      ) : null}

      <div className="generate-rent-receipt-page-tabs">
        <ViewTabs
          ariaLabel={t("rentReceipt.page.tabsAriaLabel")}
          idPrefix="rent-receipt-view"
          active={c.mobilePanel}
          onChange={(value) =>
            c.setMobilePanel(value === "apercu" ? "apercu" : "saisie")
          }
          tabs={[
            {
              value: "saisie",
              label: t("rentReceipt.page.inputTab"),
              panelId: "rent-receipt-input-panel",
            },
            {
              value: "apercu",
              label: t("rentReceipt.page.previewTab"),
              updated: Boolean(c.preview.updatedAt),
              className: "flex items-center justify-center gap-2",
              panelId: "rent-receipt-preview-panel",
            },
          ]}
        />
      </div>

      <div className="generate-rent-receipt-page-grid">
        <div
          data-cy="volet-saisie"
          id="rent-receipt-input-panel"
          role={c.mobile ? "tabpanel" : undefined}
          aria-labelledby={
            c.mobile ? "rent-receipt-view-tab-saisie" : undefined
          }
          className={cn(
            "generate-rent-receipt-page-input",
            c.mobile && c.mobilePanel !== "saisie" && "hidden",
          )}
        >
          <ActiveRentReceiptBanner c={c} />
          <RentReceiptResultCard c={c} />
          <RentReceiptForm c={c} />
        </div>

        <RentReceiptPreviewPane
          c={c}
          panel={{
            id: "rent-receipt-preview-panel",
            labelledBy: "rent-receipt-view-tab-apercu",
          }}
        />
      </div>
    </>
  );
}
