import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { CompanyDto, CompanyRequest } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { parseAmount } from "@/lib/format";
import { companySchema, type CompanyFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { SettingsCompanySection } from "./SettingsCompanySection";
import { SettingsHomeSection } from "./SettingsHomeSection";
import { SettingsSaveBar } from "./SettingsSaveBar";
import { valuesFromCompany } from "./settingsValues";

/** Create or update form of a company, with its home-office data. */
export function CompanyForm({
  company,
  onSaved,
  onClose,
}: {
  company: CompanyDto | null;
  onSaved?: (company: CompanyDto) => void;
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    mode: "onChange",
    defaultValues: valuesFromCompany(company ?? undefined),
  });

  const values = watch();
  const displayedProRata = useMemo(() => {
    const proArea = parseAmount(values.businessArea);
    const totalArea = parseAmount(values.totalArea);
    if (proArea === null || totalArea === null || Number(totalArea) <= 0) {
      return null;
    }
    return (Number(proArea) / Number(totalArea)) * 100;
  }, [values.businessArea, values.totalArea]);

  const save = useMutation({
    mutationFn: (submitted: CompanyFormValues) => {
      const requestBody: CompanyRequest = {
        name: submitted.name.trim(),
        legalForm: submitted.legalForm.trim(),
        siren: submitted.siren.trim(),
        address: submitted.address.trim(),
        managerName: submitted.managerName.trim(),
        homeAddress: submitted.homeAddress.trim(),
        totalArea: parseAmount(submitted.totalArea) ?? undefined,
        businessArea: parseAmount(submitted.businessArea) ?? undefined,
        issuePlace: submitted.issuePlace.trim(),
      };
      return company?.id
        ? api.companies.update(company.id, requestBody)
        : api.companies.create(requestBody);
    },
    onSuccess: (payload) => {
      if (!company?.id && payload.id !== undefined) {
        // Keep the active company stable: the switcher reconciles against this list,
        // and the refetch below is asynchronous.
        queryClient.setQueryData<CompanyDto[]>(
          queryKeys.companiesAll,
          (current) => {
            if (!current) {
              return [payload];
            }
            return current.some((candidate) => candidate.id === payload.id)
              ? current
              : [...current, payload];
          },
        );
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      if (payload.id !== undefined) {
        queryClient.setQueryData(queryKeys.company(payload.id), payload);
      }
      reset(valuesFromCompany(payload));
      toast.success(
        company
          ? "Société enregistrée. Les prochains documents utiliseront ces valeurs."
          : "Société créée.",
      );
      onSaved?.(payload);
    },
  });

  return (
    <form
      id={company?.id ? `form-societe-${company.id}` : "form-societe"}
      className="settings-page-form"
      onSubmit={handleSubmit((submitted) => save.mutate(submitted))}
      noValidate
      data-cy="formulaire-societe"
    >
      <SettingsCompanySection register={register} errors={errors} />
      <SettingsHomeSection
        register={register}
        errors={errors}
        displayedProRata={displayedProRata}
      />
      <SettingsSaveBar
        errorText={save.isError ? errorMessage(save.error) : null}
        isDirty={isDirty || company === null}
        isPending={save.isPending}
        submitLabel={
          company === null ? "Créer la société" : "Enregistrer la configuration"
        }
        extraAction={
          company === null && onClose ? (
            <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
              Annuler
            </Button>
          ) : null
        }
      />
    </form>
  );
}
