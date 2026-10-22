import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { useStatementDirty } from "@/state/statementDraft";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";

export function useDraftBlock() {
  const rentReceiptDirty = useRentReceiptDraft((state) => state.dirty);
  const statementDirty = useStatementDirty();
  const draftExists = rentReceiptDirty || statementDirty;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const fromGeneration = currentLocation.pathname.startsWith("/generer");
    const toGeneration = nextLocation.pathname.startsWith("/generer");
    return fromGeneration && !toGeneration && draftExists;
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
