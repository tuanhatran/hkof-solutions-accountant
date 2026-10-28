import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { useAllRentReceipts } from "@/api/queries";
import type { LeaseDto } from "@/api/types";
import { currentMonth } from "@/lib/dates";
import { latestReceiptForMonth } from "@/lib/leaseReceipts";
import { buildRentLine } from "@/lib/lines";
import { useExpenseStatementPage } from "@/pages/expense-statement/useExpenseStatementPage";
import {
  createStatementDraftStore,
  draftScopeKey,
} from "@/state/statementDraft";

/**
 * Controller of the expense statement modal opened from one company lease row.
 * It reuses the full /generer/note-frais controller scoped to this
 * company+lease: a non-persisted draft store (the global sessionStorage draft
 * is never touched), the latest ACTIVE rent receipt of this exact lease for
 * the selected month, and the rent line primed once per month/receipt.
 */
export function useCompanyLeaseStatementModal(
  lease: LeaseDto,
  companyId: number,
) {
  const [draft] = useState(() =>
    createStatementDraftStore(currentMonth(), companyId, lease.id ?? null),
  );
  const month = useStore(draft, (state) => state.month);
  const allRentReceipts = useAllRentReceipts();
  const scopedReceipt = useMemo(
    () => latestReceiptForMonth(allRentReceipts.data, lease, month),
    [allRentReceipts.data, lease, month],
  );
  const rentReceipt = useMemo(
    () => ({ data: scopedReceipt, isPending: allRentReceipts.isPending }),
    [scopedReceipt, allRentReceipts.isPending],
  );
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const controller = useExpenseStatementPage({
    companyId,
    leaseId: lease.id ?? null,
    draft,
    rentReceipt,
    onGoToRentReceipt: () => setReceiptModalOpen(true),
  });

  // The rent line is primed once per month and per receipt: removing it does
  // not re-add it, but a month change or a newer receipt primes again. The
  // amount of an already primed line follows the newer receipt total; totals
  // always come from the backend receipt, never from a client calculation.
  useEffect(() => {
    if (!scopedReceipt?.id || !scopedReceipt.total) {
      return;
    }
    const state = draft.getState();
    const scope = draftScopeKey(state.companyId, month, state.leaseId);
    if (state.primedReceiptByMonth[scope] === scopedReceipt.id) {
      return;
    }
    const existing = (state.linesByMonth[scope] ?? []).find(
      (line) => line.itemCode === "loyer",
    );
    if (existing) {
      if (existing.amountInclVat !== scopedReceipt.total) {
        state.updateLine(existing.key, {
          amountInclVat: scopedReceipt.total,
        });
      }
    } else {
      state.addLine(buildRentLine(scopedReceipt.total, "100.00"));
    }
    state.markReceiptPrimed(scopedReceipt.id);
  }, [draft, month, scopedReceipt]);

  return {
    controller,
    receiptModalOpen,
    closeReceiptModal: () => setReceiptModalOpen(false),
  };
}
