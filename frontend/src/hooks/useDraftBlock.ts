import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { useStatementDirty } from "@/state/statementDraft";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";

export function useDraftBlock() {
  const rentReceiptDirty = useRentReceiptDraft((state) => state.dirty);
  const statementDirty = useStatementDirty();
  const draftExists = rentReceiptDirty || statementDirty;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const fromGeneration = currentLocation.pathname.startsWith("/generate");
    const toGeneration = nextLocation.pathname.startsWith("/generate");
    if (!fromGeneration || toGeneration) {
      return false;
    }
    // Each generation page only owns its own draft: leaving /generate/expense-statement
    // must never save an unrelated dirty rent receipt draft (and vice versa).
    if (currentLocation.pathname.startsWith("/generate/rent-receipt")) {
      return rentReceiptDirty;
    }
    if (currentLocation.pathname.startsWith("/generate/expense-statement")) {
      return statementDirty;
    }
    return false;
  });

  useEffect(() => {
    if (!draftExists) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftExists]);

  return blocker;
}
