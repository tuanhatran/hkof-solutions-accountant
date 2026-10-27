import "./LlmSaveBar.css";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Sticky footer with the dirty state and the main save action. */
export function LlmSaveBar({ c }: { c: AdminLlmController }) {
  const { t } = useTranslation();

  return (
    <div className="llm-save-bar">
      <p className="llm-save-bar-status" aria-live="polite">
        {c.isDirty ? t("adminLlm.saveBar.dirty") : t("adminLlm.saveBar.clean")}
      </p>
      <Button
        variant="primary"
        type="submit"
        icon={<Save size={15} />}
        loading={c.save.isPending}
        data-cy="btn-enregistrer-llm-bas"
      >
        {t("adminLlm.saveBar.save")}
      </Button>
    </div>
  );
}
