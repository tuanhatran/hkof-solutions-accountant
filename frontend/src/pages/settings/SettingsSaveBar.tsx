import "./SettingsSaveBar.css";
import { Save } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** Submit error, dirty indicator and bottom save button of a settings form. */
export function SettingsSaveBar({
  errorText,
  isDirty,
  isPending,
  submitLabel = "Enregistrer la configuration",
  extraAction = null,
  dataCy = "btn-enregistrer-configuration-bas",
}: {
  errorText: string | null;
  isDirty: boolean;
  isPending: boolean;
  submitLabel?: string;
  extraAction?: ReactNode;
  dataCy?: string;
}) {
  return (
    <>
      {errorText ? (
        <p className="settings-save-bar-error" role="alert">
          {errorText}
        </p>
      ) : null}

      <div className="settings-save-bar">
        <p className="settings-save-bar-status" aria-live="polite">
          {isDirty
            ? "Modifications non enregistrées."
            : "Toutes les valeurs sont à jour."}
        </p>
        <div className="settings-save-bar-actions">
          {extraAction}
          <Button
            variant="primary"
            type="submit"
            icon={<Save size={15} />}
            loading={isPending}
            data-cy={dataCy}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
