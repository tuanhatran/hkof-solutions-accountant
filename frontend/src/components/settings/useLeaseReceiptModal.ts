import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { downloadBlob, errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useSignatures, useTemplates } from "@/api/queries";
import type { LeaseDto, RentReceiptDto, RentReceiptRequest } from "@/api/types";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { currentMonth, periodOfMonth } from "@/lib/dates";
import { formatMonth } from "@/lib/format";
import {
  rentReceiptSchema,
  tenantKeyFromLease,
  type RentReceiptFormValues,
} from "@/lib/validation";
import { requestFromValues } from "@/pages/rent-receipt/rentReceiptRequest";
import { toast } from "@/state/toasts";
import { decimalFormatter } from "./settingsMoney";

/**
 * Controller of the rent receipt modal opened from one lease row. The month
 * drives the read-only period, the amounts stay editable and the backend
 * remains the only source of the generated total.
 */
export function useLeaseReceiptModal(leaseRow: LeaseDto) {
  const queryClient = useQueryClient();
  const templates = useTemplates("RENT_RECEIPT");
  const signatures = useSignatures(leaseRow.landlordId ?? null);
  const template =
    (templates.data ?? []).find((candidate) => candidate.active) ?? null;
  const signatureId = signatures.data?.[0]?.id ?? null;
  const [result, setResult] = useState<RentReceiptDto | null>(null);

  const [initialMonth] = useState(currentMonth);
  const initialPeriod = periodOfMonth(initialMonth);
  const form = useForm<RentReceiptFormValues>({
    resolver: zodResolver(rentReceiptSchema),
    mode: "onChange",
    defaultValues: {
      month: initialMonth,
      landlordId:
        leaseRow.landlordId === undefined ? "" : String(leaseRow.landlordId),
      tenantKey: tenantKeyFromLease(leaseRow),
      periodStart: initialPeriod.start,
      periodEnd: initialPeriod.end,
      rentExclCharges: decimalFormatter(leaseRow.rentExclCharges),
      charges: decimalFormatter(leaseRow.charges),
      paymentDate: "",
      issueDate: "",
    },
  });

  const values = form.watch();
  const validation = rentReceiptSchema.safeParse(values);
  const request = validation.success
    ? requestFromValues(
        validation.data,
        template?.id ?? null,
        signatureId,
        leaseRow.companyId ?? null,
      )
    : null;
  const preview = usePdfPreview(
    (signal) =>
      request
        ? api.rentReceipts.preview(request, signal)
        : Promise.reject(
            new DOMException("Formulaire incomplet", "AbortError"),
          ),
    JSON.stringify(request ?? values),
    {
      active: validation.success && signatureId !== null,
      debounceMs: 400,
    },
  );

  function changeMonth(month: string) {
    if (!month) {
      return;
    }
    const period = periodOfMonth(month);
    form.setValue("month", month, { shouldValidate: true });
    form.setValue("periodStart", period.start, { shouldValidate: true });
    form.setValue("periodEnd", period.end, { shouldValidate: true });
  }

  const generate = useMutation({
    mutationFn: (requestBody: RentReceiptRequest) =>
      api.rentReceipts.create(requestBody),
    onSuccess: async (rentReceipt) => {
      setResult(rentReceipt);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rentReceiptsAll,
      });
      toast.success(
        `Quittance de ${formatMonth(rentReceipt.month ?? values.month)} générée en version ${rentReceipt.version ?? 1}.`,
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const submit = form.handleSubmit((submitted) => {
    const parsed = rentReceiptSchema.safeParse(submitted);
    if (!parsed.success) {
      return;
    }
    generate.mutate(
      requestFromValues(
        parsed.data,
        template?.id ?? null,
        signatureId,
        leaseRow.companyId ?? null,
      ),
    );
  });

  async function download(rentReceipt: RentReceiptDto) {
    if (!rentReceipt.id) {
      return;
    }
    try {
      const reply = await api.rentReceipts.pdf(rentReceipt.id);
      downloadBlob(
        reply.blob,
        reply.fileName ?? `quittance_${rentReceipt.month ?? values.month}.pdf`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return {
    register: form.register,
    errors: form.formState.errors,
    values,
    preview,
    changeMonth,
    result,
    submit,
    generate,
    generationDisabled:
      !validation.success || signatureId === null || generate.isPending,
    download,
  };
}
