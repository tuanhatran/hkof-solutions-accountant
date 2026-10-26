import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import {
  useActiveRentReceipt,
  useActiveStatement,
  useCompanies,
  useEmployees,
  useExpenseItems,
  useSignatures,
  useTemplates,
} from "@/api/queries";
import type { ExpenseItemDto } from "@/api/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { orderLinesByExpenseItem, type DraftLine } from "@/lib/lines";
import { resolveActiveCompanyId, useCompanyStore } from "@/state/company";
import { useStatementDraft } from "@/state/statementDraft";
import type {
  ExpenseStatementPageOptions,
  ExpenseStatementRentReceiptSource,
} from "./expenseStatementTypes";

const NO_LINES: DraftLine[] = [];

/**
 * Draft, company, lease, query and signature session shared by every concern of
 * the expense statement controller. Nothing here mutates the draft; the scoped
 * options keep the global store and navigation untouched.
 */
export function useExpenseStatementContext(
  options: ExpenseStatementPageOptions,
) {
  const draftStore = options.draft ?? useStatementDraft;
  const draft = useStore(draftStore);
  const lines = useMemo(
    () => draft.linesByMonth[draft.month] ?? NO_LINES,
    [draft.linesByMonth, draft.month],
  );
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"input" | "preview">("input");

  const month = draft.month;
  const scoped = options.companyId !== undefined;
  const companies = useCompanies();
  const storedCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);
  const resolvedCompanyId = useMemo(
    () => resolveActiveCompanyId(storedCompanyId, companies.data),
    [storedCompanyId, companies.data],
  );
  useEffect(() => {
    if (!scoped && resolvedCompanyId !== storedCompanyId) {
      setActiveCompany(resolvedCompanyId);
    }
  }, [scoped, resolvedCompanyId, storedCompanyId, setActiveCompany]);
  const activeCompanyId = options.companyId ?? resolvedCompanyId;
  const activeCompany =
    (companies.data ?? []).find((company) => company.id === activeCompanyId) ??
    null;
  // Statements and postes are scoped to the active company's derived lease.
  // A company without a lease keeps the historical unscoped behaviour.
  const selectedLeaseId =
    options.leaseId !== undefined
      ? options.leaseId
      : (activeCompany?.leaseId ?? null);

  // Every company-scoped request carries the active company; a null id disables them.
  const expenseItemsQuery = useExpenseItems(
    activeCompanyId,
    false,
    selectedLeaseId,
  );
  const templates = useTemplates("EXPENSE_STATEMENT");
  const activeRentReceiptQuery = useActiveRentReceipt(month, activeCompanyId);
  const rentReceipt: ExpenseStatementRentReceiptSource =
    options.rentReceipt ?? activeRentReceiptQuery;
  const activeStatement = useActiveStatement(activeCompanyId, month);
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

  // A company switch must not send the previous company's lines. Draft lines whose
  // item exists in the active company only are part of this statement; the others
  // stay stored and reappear when their company becomes active again.
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
    draft.templatesByMonth[month] ?? activeModel?.id ?? null;
  const complete = draft.completeByMonth[month] ?? true;

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
    selectedLeaseId,
    expenseItemsQuery,
    templates,
    rentReceipt,
    activeStatement,
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
