import "./ExpenseItemFormFrame.css";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";

/**
 * Frame of the expense item form: a plain inline form with the same
 * Annuler/Valider footer inside the expenses dialog (no portal, so the dialog
 * stays the only window), or the historical FormModal elsewhere.
 */
export function ExpenseItemFormFrame({
  title,
  embedded,
  error,
  pending,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  embedded: boolean;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  if (embedded) {
    return (
      <form
        className="expense-item-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
        aria-label={title}
        data-cy="formulaire-poste"
      >
        {error ? (
          <p className="expense-item-form-error" role="alert">
            {error}
          </p>
        ) : null}
        {children}
        <div className="expense-item-form-actions">
          <Button
            variant="secondary"
            small
            onClick={onClose}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            small
            type="submit"
            loading={pending}
            data-cy="btn-enregistrer-poste"
          >
            {t("common.validate")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <FormModal
      open
      wide
      title={title}
      onClose={onClose}
      onSubmit={onSubmit}
      formDataCy="formulaire-poste"
      submitDataCy="btn-enregistrer-poste"
      pending={pending}
      error={error}
      formClassName="expense-item-form"
    >
      {children}
    </FormModal>
  );
}
