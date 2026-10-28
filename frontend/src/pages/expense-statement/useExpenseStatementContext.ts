import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  useActiveStatement,
  useCompanies,
  useEmployees,
  useExpenseItems,
  useLeases,
  useRentReceipts,
  useSavedStatementDraft,
  useSignatures,
  useTemplates,
} from "@/api/queries";
import type { ExpenseItemDto, RentReceiptDto } from "@/api/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { orderLinesByExpenseItem, type DraftLine } from "@/lib/lines";
import { draftScopeKey, useStatementDraft } from "@/state/statementDraft";
import type {
  ExpenseStatementPageOptions,
  ExpenseStatementRentReceiptSource,
} from "./expenseStatementTypes";

const NO_LINES: DraftLine[] = [];

/**
 * Draft, company, lease, query and signature session shared by every concern of
 * the expense statement controller. The company selection is page-local: no
 * global store, a single company auto-selected, several companies requiring an
 * explicit choice. Nothing here mutates the draft.
 */
export function useExpenseStatementContext(
  options: ExpenseStatementPageOptions,
) {
  const draftStore = options.draft ?? useStatementDraft;
  const draft = useStore(draftStore);
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"input" | "preview">("input");

  const month = draft.month;
  const companies = useCompanies();
  const companyRows = useMemo(() => companies.data ?? [], [companies.data]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    options.companyId ?? options.initialCompanyId ?? null,
  );

  // Keep the local selection valid: a locked scoped company stays, a company
  // that disappeared is forgotten, and a lone company is selected automatically.
  useEffect(() => {
    if (!companies.isSuccess) {
      return;
    }
    const ids = companyRows
      .map((company) => company.id)
      .filter((id): id is number => typeof id === "number");
    if (options.companyId !== undefined) {
      setSelectedCompanyId(options.companyId);
      return;
    }
    setSelectedCompanyId((current) => {
      if (current !== null && ids.includes(current)) {
        return current;
      }
      return ids.length === 1 ? ids[0]! : null;
    });
  }, [companies.isSuccess, companyRows, options.companyId]);

  const activeCompanyId = selectedCompanyId;
  function selectCompany(companyId: number | null) {
    if (options.companyId !== undefined) {
      return;
    }
    setSelectedCompanyId(companyId);
  }

  // The draft is scoped by company and lease: switching either reads another
  // bucket. A company without a lease keeps an inert, unscoped bucket that the
  // page never submits.
  const leasesQuery = useLeases();
  const companyLeases = useMemo(
    () =>
      (leasesQuery.data ?? []).filter(
        (lease) => lease.companyId === activeCompanyId,
      ),
    [leasesQuery.data, activeCompanyId],
  );
  const [selectedLeaseId, setSelectedLeaseId] = useState<number | null>(
    options.leaseId ?? null,
  );

  // Keep the lease selection valid: a locked scoped lease stays, a lease that
  // no longer belongs to the company is forgotten, and a lone lease is selected
  // automatically. Several leases require an explicit choice.
  useEffect(() => {
    if (leasesQuery.data === undefined) {
      return;
    }
    const ids = companyLeases
      .map((lease) => lease.id)
      .filter((id): id is number => typeof id === "number");
    if (options.leaseId !== undefined) {
      setSelectedLeaseId(options.leaseId);
      return;
    }
    setSelectedLeaseId((current) => {
      if (current !== null && ids.includes(current)) {
        return current;
      }
      return ids.length === 1 ? ids[0]! : null;
    });
  }, [leasesQuery.data, companyLeases, options.leaseId]);

  function selectLease(leaseId: number | null) {
    if (options.leaseId !== undefined) {
      return;
    }
    setSelectedLeaseId(leaseId);
  }

  useEffect(() => {
    const store = draftStore.getState();
    if (store.companyId !== activeCompanyId) {
      store.selectCompany(activeCompanyId);
    }
  }, [draftStore, activeCompanyId]);
  useEffect(() => {
    const store = draftStore.getState();
    if (store.leaseId !== selectedLeaseId) {
      store.selectLease(selectedLeaseId);
    }
  }, [draftStore, selectedLeaseId]);

  const leaseSelectionRequired =
    companies.isSuccess &&
    activeCompanyId !== null &&
    leasesQuery.data !== undefined &&
    companyLeases.length > 1 &&
    selectedLeaseId === null;

  const scope = draftScopeKey(activeCompanyId, month, selectedLeaseId);
  const lines = draft.linesByMonth[scope] ?? NO_LINES;
  const savedDraft = useSavedStatementDraft(
    options.draft === undefined ? activeCompanyId : null,
    month,
    selectedLeaseId,
  );
  const hydratedScope = useRef<string | null>(null);

  // Only the global /generer page reloads the saved draft; scoped editors used by
  // modals keep their own isolated state and never read the generation draft.
  useEffect(() => {
    const saved = savedDraft.data;
    if (options.draft !== undefined || !saved || saved.id === undefined) {
      return;
    }
    const companyId = saved.companyId ?? activeCompanyId;
    const savedMonth = saved.month ?? month;
    const savedLeaseId = saved.leaseId ?? null;
    const savedScope = draftScopeKey(companyId, savedMonth, savedLeaseId);
    // The refetch after a save returns the row just written: hydrating it would
    // overwrite the edits made while the PUT then GET round-trip was in flight,
    // and re-keying the lines would break an open line edit.
    if (draftStore.getState().draftIdByMonth[savedScope] === saved.id) {
      return;
    }
    const scope = `${companyId}|${savedMonth}|${savedLeaseId}|${saved.id}`;
    if (hydratedScope.current === scope) {
      return;
    }
    hydratedScope.current = scope;
    draftStore.getState().loadFromServerDraft(saved);
  }, [
    savedDraft.data,
    options.draft,
    draftStore,
    activeCompanyId,
    month,
    selectedLeaseId,
  ]);

  const activeCompany =
    companyRows.find((company) => company.id === activeCompanyId) ?? null;
  const companySelectionRequired =
    companies.isSuccess && activeCompanyId === null && companyRows.length > 1;
  const selectedLease =
    companyLeases.find((lease) => lease.id === selectedLeaseId) ?? null;

  // Every company-scoped request carries the active company; a null id disables them.
  const expenseItemsQuery = useExpenseItems(
    selectedLeaseId === null ? null : activeCompanyId,
    false,
    selectedLeaseId,
  );
  const templates = useTemplates("EXPENSE_STATEMENT");
  // The month list is server-ordered (version then id, descending): its first
  // row is the newest receipt and the default selection.
  const rentReceiptsQuery = useRentReceipts(
    options.rentReceipt || selectedLeaseId === null ? null : activeCompanyId,
    month,
  );
  const [chosenRentReceiptId, setChosenRentReceiptId] = useState<number | null>(
    null,
  );
  useEffect(() => {
    setChosenRentReceiptId(null);
  }, [activeCompanyId, month, selectedLeaseId, selectedLease]);
  const rentReceiptCandidates = useMemo<RentReceiptDto[]>(() => {
    if (options.rentReceipt) {
      return options.rentReceipt.data ? [options.rentReceipt.data] : [];
    }
    const receipts = rentReceiptsQuery.data ?? [];
    // A company-month list mixes every lease of the company: keep only the
    // receipts the page lease can produce (same landlord, then tenant company
    // for a company lease or tenant person for a person lease). Without a
    // selected lease nothing can be proposed.
    if (selectedLease === null) {
      return [];
    }
    return receipts.filter(
      (receipt) =>
        receipt.landlordId === selectedLease.landlordId &&
        (selectedLease.companyLease
          ? receipt.tenantCompanyId === selectedLease.companyId
          : receipt.tenantId === selectedLease.tenantId),
    );
  }, [options.rentReceipt, rentReceiptsQuery.data, selectedLease]);
  const selectedRentReceipt =
    rentReceiptCandidates.find(
      (candidate) => candidate.id === chosenRentReceiptId,
    ) ??
    rentReceiptCandidates[0] ??
    null;
  const rentReceipt: ExpenseStatementRentReceiptSource =
    options.rentReceipt ?? {
      data: selectedRentReceipt,
      isPending: rentReceiptsQuery.isPending,
    };
  function selectRentReceipt(rentReceiptId: number) {
    setChosenRentReceiptId(rentReceiptId);
  }
  const activeStatement = useActiveStatement(
    activeCompanyId,
    month,
    selectedLeaseId,
  );
  const employees = useEmployees(activeCompanyId);

  // The statement uses the company CEO's signature. The backend resolves the
  // lowest-id CEO, so mirror it here instead of relying on the list order.
  const ceo = useMemo(() => {
    const candidates = (employees.data ?? []).filter(
      (employee) => employee.title === "CEO",
    );
    return candidates.sort((a, b) => Number(a.id) - Number(b.id))[0] ?? null;
  }, [employees.data]);
  const signatures = useSignatures(ceo?.id ?? null);

  const signatureList = signatures.data ?? [];
  const [chosenSignatureId, setChosenSignatureId] = useState<number | null>(
    null,
  );
  const chosenSignatureAvailable = signatureList.some(
    (candidate) => candidate.id === chosenSignatureId,
  );
  const selectedSignatureId = chosenSignatureAvailable
    ? chosenSignatureId
    : (signatureList[0]?.id ?? null);
  const signatureAvailable = ceo !== null && signatureList.length > 0;

  const expenseItems = useMemo<ExpenseItemDto[]>(
    () =>
      [...(expenseItemsQuery.data ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [expenseItemsQuery.data],
  );
  const expenseItemByCode = useMemo(
    () =>
      new Map(
        expenseItems.map((expenseItem) => [
          expenseItem.code ?? "",
          expenseItem,
        ]),
      ),
    [expenseItems],
  );

  // The draft bucket is already company-scoped; the item filter additionally drops
  // a line whose poste no longer exists for this company.
  const companyLines = useMemo(
    () =>
      expenseItemsQuery.data
        ? lines.filter((line) => expenseItemByCode.has(line.itemCode))
        : lines,
    [lines, expenseItemByCode, expenseItemsQuery.data],
  );

  // The backend returns calculation lines in the configured order; the table and
  // the submitted requests must use that same order so `calculation.lines[index]`
  // keeps matching its row. The draft itself is never reordered.
  const orderedLines = useMemo(
    () => orderLinesByExpenseItem(companyLines, expenseItems),
    [companyLines, expenseItems],
  );

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.active) ?? null;
  const selectedTemplate =
    draft.templatesByMonth[scope] ?? activeModel?.id ?? null;
  const complete = draft.completeByMonth[scope] ?? true;

  return {
    draftStore,
    draft,
    mobile,
    mobilePanel,
    setMobilePanel,
    month,
    companies,
    activeCompany,
    activeCompanyId,
    companySelectionRequired,
    selectCompany,
    leasesQuery,
    companyLeases,
    selectedLease,
    selectedLeaseId,
    selectLease,
    leaseSelectionRequired,
    leaseLocked: options.leaseId !== undefined,
    expenseItemsQuery,
    templates,
    rentReceipt,
    rentReceiptCandidates,
    selectedRentReceiptId: selectedRentReceipt?.id ?? null,
    selectRentReceipt,
    activeStatement,
    savedDraft,
    signatures,
    employees,
    ceo,
    signatureList,
    selectedSignatureId,
    setChosenSignatureId,
    signatureAvailable,
    expenseItems,
    expenseItemByCode,
    companyLines,
    orderedLines,
    models,
    activeModel,
    selectedTemplate,
    complete,
  };
}

export type ExpenseStatementContext = ReturnType<
  typeof useExpenseStatementContext
>;
