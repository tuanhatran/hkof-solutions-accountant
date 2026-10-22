import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "./queries";

describe("expense item query invalidation", () => {
  it("invalidates every expense item list, whatever the all flag", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.expenseItems(true), []);
    queryClient.setQueryData(queryKeys.expenseItems(false), []);
    queryClient.setQueryData(queryKeys.settings, {});

    void queryClient.invalidateQueries({ queryKey: queryKeys.expenseItemsAll });

    expect(
      queryClient.getQueryState(queryKeys.expenseItems(true))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.expenseItems(false))?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.settings)?.isInvalidated).toBe(
      false,
    );
  });
});

describe("generated document query invalidation", () => {
  const month = "2026-01";

  it("invalidates the active statement through the statements prefix", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.statementActive(month), null);
    queryClient.setQueryData(queryKeys.rentReceiptActive(month), null);
    queryClient.setQueryData(queryKeys.settings, {});

    void queryClient.invalidateQueries({ queryKey: queryKeys.statementsAll });
    expect(
      queryClient.getQueryState(queryKeys.statementActive(month))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month))
        ?.isInvalidated,
    ).toBe(false);
    expect(queryClient.getQueryState(queryKeys.settings)?.isInvalidated).toBe(
      false,
    );
  });

  it("invalidates the active rent receipt through the rent receipts prefix", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rentReceiptActive(month), null);
    queryClient.setQueryData(queryKeys.statementActive(month), null);
    queryClient.setQueryData(queryKeys.rentReceipts(month), []);

    void queryClient.invalidateQueries({ queryKey: queryKeys.rentReceiptsAll });

    expect(
      queryClient.getQueryState(queryKeys.rentReceiptActive(month))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.rentReceipts(month))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.statementActive(month))?.isInvalidated,
    ).toBe(false);
  });
});
