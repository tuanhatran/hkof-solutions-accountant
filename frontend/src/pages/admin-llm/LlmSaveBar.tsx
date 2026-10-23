import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Sticky footer with the dirty state and the main save action. */
export function LlmSaveBar({ c }: { c: AdminLlmController }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
      <p className="text-xs text-ink-soft" aria-live="polite">
        {c.isDirty
          ? "Modifications non enregistrées."
          : "Configuration à jour."}
      </p>
      <Button
        variant="primary"
        type="submit"
        icon={<Save size={15} />}
        loading={c.save.isPending}
        data-cy="btn-enregistrer-llm-bas"
      >
        Enregistrer la configuration IA
      </Button>
    </div>
  );
}
