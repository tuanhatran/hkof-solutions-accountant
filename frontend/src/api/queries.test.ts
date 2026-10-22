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
