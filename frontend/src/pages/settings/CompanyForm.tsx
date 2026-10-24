import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useLeases } from "@/api/queries";
import type { CompanyDto, CompanyRequest } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { parseAmount } from "@/lib/format";
import { companySchema, type CompanyFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { SettingsCompanySection } from "./SettingsCompanySection";
import { SettingsLeaseSection } from "./SettingsLeaseSection";
import { SettingsSaveBar } from "./SettingsSaveBar";
import { valuesFromCompany } from "./settingsValues";

/** Create or update form of a company and its optional lease link. */
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
  const leases = useLeases();
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
  const leaseList = useMemo(() => leases.data ?? [], [leases.data]);
  const selectedLease = useMemo(
    () =>
      leaseList.find((lease) => String(lease.id) === values.leaseId) ?? null,
    [leaseList, values.leaseId],
  );
  const displayedProRata = useMemo(() => {
    const proArea = parseAmount(selectedLease?.businessArea ?? "");
    const totalArea = parseAmount(selectedLease?.totalArea ?? "");
    if (proArea === null || totalArea === null || Number(totalArea) <= 0) {
      return null;
    }
    return (Number(proArea) / Number(totalArea)) * 100;
  }, [selectedLease]);

  const save = useMutation({
    mutationFn: (submitted: CompanyFormValues) => {
      const requestBody: CompanyRequest = {
        name: submitted.name.trim(),
        legalForm: submitted.legalForm.trim(),
        siren: submitted.siren.trim(),
        address: submitted.address.trim(),
        managerName: submitted.managerName.trim(),
        leaseId: submitted.leaseId === "" ? null : Number(submitted.leaseId),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
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
      <SettingsLeaseSection
        register={register}
        errors={errors}
        leases={leaseList}
        selectedLease={selectedLease}
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
