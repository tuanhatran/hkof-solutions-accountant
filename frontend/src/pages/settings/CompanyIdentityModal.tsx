import { errorMessage } from "@/api/client";
import type { CompanyDto } from "@/api/types";
import { FormModal } from "@/components/ui/FormModal";
import { SettingsCompanySection } from "./SettingsCompanySection";
import { useCompanyForm } from "./useCompanyForm";

/**
 * Create/update modal of the company identity. The lease link is edited from
 * the "Baux & Frais" tab, so this modal never shows a lease field.
 */
export function CompanyIdentityModal({
  open,
  company,
  onClose,
  onSaved,
}: {
  open: boolean;
  company: CompanyDto | null;
  onClose: () => void;
  onSaved: (company: CompanyDto) => void;
}) {
  const { form, save, saveCompany } = useCompanyForm(company);

  return (
    <FormModal
      open={open}
      wide
      title={company === null ? "Nouvelle société" : "Modifier la société"}
      onClose={onClose}
      onSubmit={form.handleSubmit((values) => {
        saveCompany(values, onSaved);
      })}
      formDataCy="formulaire-societe"
      submitDataCy="btn-enregistrer-configuration-bas"
      pending={save.isPending}
      error={save.isError ? errorMessage(save.error) : null}
      formClassName="settings-page-form"
    >
      <SettingsCompanySection
        register={form.register}
        errors={form.formState.errors}
      />
    </FormModal>
  );
}
