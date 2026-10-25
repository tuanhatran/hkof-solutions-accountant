import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { CompanyDto, CompanyRequest } from "@/api/types";
import { companySchema, type CompanyFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { valuesFromCompany } from "./settingsValues";

interface CompanyFormApi {
  form: UseFormReturn<CompanyFormValues>;
  save: UseMutationResult<CompanyDto, Error, CompanyRequest>;
  /** Builds the trimmed CompanyRequest and sends create/update. */
  saveCompany: (
    values: CompanyFormValues,
    onSuccess?: (payload: CompanyDto) => void,
  ) => void;
  /** Seeds the companiesAll cache with a freshly created company. */
  notifyCreated: (payload: CompanyDto) => void;
}

/**
 * React Hook Form + Zod + mutation logic shared by the company identity and
 * lease modals. It never calls `setActiveCompany`: the caller decides what a
 * saved company means for the selection.
 */
export function useCompanyForm(company: CompanyDto | null): CompanyFormApi {
  const queryClient = useQueryClient();
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    mode: "onChange",
    defaultValues: valuesFromCompany(company ?? undefined),
  });

  const notifyCreated = useCallback(
    (payload: CompanyDto) => {
      if (payload.id === undefined) {
        return;
      }
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
    },
    [queryClient],
  );

  const save = useMutation({
    mutationFn: (requestBody: CompanyRequest) =>
      company?.id
        ? api.companies.update(company.id, requestBody)
        : api.companies.create(requestBody),
    onSuccess: (payload) => {
      if (!company?.id) {
        notifyCreated(payload);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      if (payload.id !== undefined) {
        queryClient.setQueryData(queryKeys.company(payload.id), payload);
      }
      form.reset(valuesFromCompany(payload));
      toast.success(
        company
          ? "Société enregistrée. Les prochains documents utiliseront ces valeurs."
          : "Société créée.",
      );
    },
  });

  const saveCompany = useCallback(
    (values: CompanyFormValues, onSuccess?: (payload: CompanyDto) => void) => {
      const requestBody: CompanyRequest = {
        name: values.name.trim(),
        legalForm: values.legalForm.trim(),
        siren: values.siren.trim(),
        address: values.address.trim(),
        managerName: values.managerName.trim(),
        leaseId: values.leaseId === "" ? null : Number(values.leaseId),
        issuePlace: values.issuePlace.trim(),
      };
      save.mutate(requestBody, {
        // Forward only the payload: mutate would also pass variables/context.
        onSuccess: (payload) => onSuccess?.(payload),
      });
    },
    [save],
  );

  return { form, save, saveCompany, notifyCreated };
}
