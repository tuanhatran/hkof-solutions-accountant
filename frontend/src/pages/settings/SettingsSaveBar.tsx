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
        <p
          className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger"
          role="alert"
        >
          {errorText}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
        <p className="text-xs text-ink-soft" aria-live="polite">
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
