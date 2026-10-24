import "./SettingsSaveBar.css";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Submit error, dirty indicator and bottom save button of the settings form. */
export function SettingsSaveBar({
  errorText,
  isDirty,
  isPending,
}: {
  errorText: string | null;
  isDirty: boolean;
  isPending: boolean;
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
        <Button
          variant="primary"
          type="submit"
          icon={<Save size={15} />}
          loading={isPending}
          data-cy="btn-enregistrer-configuration-bas"
        >
          Enregistrer la configuration
        </Button>
      </div>
    </>
  );
}
