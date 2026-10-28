import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { downloadBlob, errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useCompanies,
  useLeases,
  usePersons,
  useSignatures,
  useTemplates,
} from "@/api/queries";
import type { RentReceiptDto } from "@/api/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { periodOfMonth } from "@/lib/dates";
import { formatEUR, formatMonth, parseAmount } from "@/lib/format";
import {
  parseTenantKey,
  rentReceiptSchema,
  tenantKeyFromLease,
  type RentReceiptFormValues,
} from "@/lib/validation";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import { requestFromValues } from "./rentReceiptRequest";

/** Option of the tenant select: a natural person or a company. */
export interface TenantOption {
  value: string;
  label: string;
}

/**
 * Controller for the rent receipt page: lease selection, form, preview and
 * generation.
 */
export function useRentReceiptPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useRentReceiptDraft();
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"saisie" | "apercu">("saisie");
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [result, setResult] = useState<RentReceiptDto | null>(null);
  const [chosenSignatureId, setChosenSignatureId] = useState<number | null>(
    null,
  );

  const persons = usePersons();
  const companies = useCompanies();
  const leases = useLeases();
  const templates = useTemplates("RENT_RECEIPT");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<RentReceiptFormValues>({
    resolver: zodResolver(rentReceiptSchema),
    mode: "onChange",
    defaultValues: {
      month: draft.month,
      landlordId: draft.landlordId === null ? "" : String(draft.landlordId),
      tenantKey: draft.tenantKey ?? "",
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      rentExclCharges: draft.rentExclCharges,
      charges: draft.charges,
      paymentDate: draft.paymentDate,
      issueDate: draft.issueDate,
    },
  });

  const values = watch();
  const validation = rentReceiptSchema.safeParse(values);

  const selectedLandlordId = values.landlordId
    ? Number(values.landlordId)
    : null;
  const {
    tenantId: selectedTenantId,
    tenantCompanyId: selectedTenantCompanyId,
  } = parseTenantKey(values.tenantKey ?? "");
  const selectedTenantKey = values.tenantKey ?? "";

  const leaseRows = leases.data ?? [];
  const selectedLease =
    leaseRows.find(
      (lease) =>
        lease.landlordId !== undefined &&
        String(lease.landlordId) === values.landlordId &&
        tenantKeyFromLease(lease) === selectedTenantKey &&
        selectedTenantKey !== "",
    ) ?? null;

  // A rent receipt takes its company from the lease only: a person lease has none.
  const receiptCompanyId = selectedLease?.companyId ?? null;
  const companyName = selectedLease?.companyName ?? null;
  const activeRentReceipt = useActiveRentReceipt(
    draft.month,
    receiptCompanyId,
    selectedLandlordId,
    selectedTenantId,
    selectedTenantCompanyId,
  );

  // Signatures belong to the selected landlord only: no cross-person fallback.
  const signatures = useSignatures(selectedLandlordId);
  const availableSignatures = signatures.data ?? [];
  const chosenSignatureAvailable = availableSignatures.some(
    (candidate) => candidate.id === chosenSignatureId,
  );
  const selectedSignatureId = chosenSignatureAvailable
    ? chosenSignatureId
    : (availableSignatures[0]?.id ?? null);
  const signatureAvailable = availableSignatures.length > 0;
  const landlordWithoutSignature =
    selectedLandlordId !== null &&
    !signatures.isPending &&
    !signatures.isError &&
    !signatureAvailable;

  useEffect(() => {
    setChosenSignatureId(null);
  }, [selectedLandlordId]);

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.active) ?? null;
  const selectedModel = draft.templateId ?? activeModel?.id ?? null;
  const personRows = persons.data ?? [];
  const companyRows = companies.data ?? [];
  const personTenantOptions: TenantOption[] = personRows
    .filter((person) => person.id !== undefined)
    .map((person) => ({
      value: `person:${person.id}`,
      label: person.name ?? t("rentReceipt.tenantOptions.personFallback"),
    }));
  const companyTenantOptions: TenantOption[] = companyRows
    .filter((company) => company.id !== undefined)
    .map((company) => ({
      value: `company:${company.id}`,
      label: company.name ?? t("rentReceipt.tenantOptions.companyFallback"),
    }));
  // Without a full pair the hook falls back to the month-scoped query, whose
  // receipt belongs to no identifiable pair: never surface it on this page.
  const pairSelected = selectedLandlordId !== null && selectedTenantKey !== "";
  const activePairReceipt = pairSelected
    ? (activeRentReceipt.data ?? null)
    : null;
  const request =
    validation.success && selectedLease
      ? requestFromValues(
          validation.data,
          selectedModel,
          selectedSignatureId,
          receiptCompanyId,
        )
      : null;
  const signature = JSON.stringify(request ?? values);

  const preview = usePdfPreview(
    (signal) =>
      request
        ? api.rentReceipts.preview(request, signal)
        : Promise.reject(
            new DOMException("Formulaire incomplet", "AbortError"),
          ),
    signature,
    {
      active:
        validation.success && signatureAvailable && selectedLease !== null,
      debounceMs: 400,
    },
  );

  useEffect(() => {
    if (leases.isPending || leases.isError || draft.initialized) {
      return;
    }
    const candidates = leases.data ?? [];
    const matching =
      candidates.find(
        (lease) =>
          lease.landlordId === draft.landlordId &&
          tenantKeyFromLease(lease) === draft.tenantKey,
      ) ?? (candidates.length === 1 ? candidates[0] : null);
    if (!matching) {
      return;
    }
    draft.initializeFromLease(matching);
    setValue(
      "landlordId",
      matching.landlordId === undefined ? "" : String(matching.landlordId),
      { shouldValidate: true },
    );
    setValue("tenantKey", tenantKeyFromLease(matching), {
      shouldValidate: true,
    });
    setValue("rentExclCharges", matching.rentExclCharges ?? "", {
      shouldValidate: true,
    });
    setValue("charges", matching.charges ?? "", { shouldValidate: true });
    // Auto-selection must only happen once, when the lease directory loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leases.data, leases.isPending, leases.isError, draft.initialized]);

  const estimatedTotal = (() => {
    const rent = parseAmount(values.rentExclCharges) ?? "0";
    const costs = parseAmount(values.charges) ?? "0";
    return formatEUR(Number(rent) + Number(costs));
  })();

  async function runGeneration(submittedValues: RentReceiptFormValues) {
    if (!validation.success) {
      return;
    }
    const requestBody = requestFromValues(
      submittedValues,
      selectedModel,
      selectedSignatureId,
      receiptCompanyId,
    );
    setGenerationInProgress(true);
    try {
      const rentReceipt = await api.rentReceipts.create(requestBody);
      setResult(rentReceipt);
      draft.markGenerated();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rentReceiptsAll,
      });
      toast.success(
        t("rentReceipt.toasts.generated", {
          month: formatMonth(submittedValues.month),
          version: rentReceipt.version ?? 1,
        }),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  function submit(submittedValues: RentReceiptFormValues) {
    // Unlimited ACTIVE receipts: every generation creates a new one, no dialog.
    void runGeneration(submittedValues);
  }

  async function downloadRentReceipt(rentReceipt: RentReceiptDto) {
    if (!rentReceipt.id) {
      return;
    }
    try {
      const reply = await api.rentReceipts.pdf(rentReceipt.id);
      downloadBlob(
        reply.blob,
        reply.fileName ?? `quittance_${rentReceipt.month ?? draft.month}.pdf`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function goToStatement() {
    const month = result?.month ?? draft.month;
    useStatementDraft.getState().changeMonth(month);
    navigate("/generer/note-frais");
  }

  function selectPair(nextLandlordId: string, nextTenantKey: string) {
    setValue("landlordId", nextLandlordId, { shouldValidate: true });
    setValue("tenantKey", nextTenantKey, { shouldValidate: true });
    const landlordId = nextLandlordId ? Number(nextLandlordId) : null;
    const lease =
      leaseRows.find(
        (candidate) =>
          String(candidate.landlordId ?? "") === nextLandlordId &&
          tenantKeyFromLease(candidate) === nextTenantKey,
      ) ?? null;
    draft.selectPair(landlordId, nextTenantKey || null, lease);
    if (lease) {
      setValue("rentExclCharges", lease.rentExclCharges ?? "", {
        shouldValidate: true,
      });
      setValue("charges", lease.charges ?? "", { shouldValidate: true });
    }
  }

  function resumeLease() {
    if (!selectedLease) {
      return;
    }
    draft.resumeFromLease(selectedLease);
    setValue("rentExclCharges", selectedLease.rentExclCharges ?? "", {
      shouldValidate: true,
    });
    setValue("charges", selectedLease.charges ?? "", {
      shouldValidate: true,
    });
    toast.info(t("rentReceipt.toasts.amountsResumed"));
  }

  function changeMonth(value: string) {
    if (!value) {
      return;
    }
    draft.changeMonth(value);
    const period = periodOfMonth(value);
    setValue("periodStart", period.start, { shouldValidate: true });
    setValue("periodEnd", period.end, { shouldValidate: true });
  }

  const activeVersion = activePairReceipt?.version;
  const displayedTotal = result
    ? formatEUR(result.total)
    : activePairReceipt
      ? formatEUR(activePairReceipt.total)
      : null;

  return {
    navigate,
    draft,
    mobile,
    mobilePanel,
    setMobilePanel,
    persons,
    companies,
    leases,
    templates,
    signatures,
    register,
    handleSubmit,
    errors,
    isValid,
    values,
    selectedLease,
    leaseRows,
    companyName,
    personRows,
    companyRows,
    personTenantOptions,
    companyTenantOptions,
    models,
    selectedModel,
    availableSignatures,
    selectedSignatureId,
    setChosenSignatureId,
    signatureAvailable,
    landlordWithoutSignature,
    activeRentReceipt,
    activePairReceipt,
    activeVersion,
    displayedTotal,
    estimatedTotal,
    preview,
    validation,
    result,
    generationInProgress,
    submit,
    downloadRentReceipt,
    goToStatement,
    resumeLease,
    changeMonth,
    selectPair,
  };
}

export type RentReceiptController = ReturnType<typeof useRentReceiptPage>;
