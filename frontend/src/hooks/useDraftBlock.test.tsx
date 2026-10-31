import { act, render, screen, cleanup } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { draftScopeKey, useStatementDraft } from "@/state/statementDraft";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useDraftBlock } from "./useDraftBlock";

function Probe() {
  const blocker = useDraftBlock();
  return <span data-testid="blocker-state">{blocker.state}</span>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/generate/rent-receipt", element: <Probe /> },
      { path: "/generate/expense-statement", element: <Probe /> },
      { path: "/history", element: <p>Historique</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  useRentReceiptDraft.setState({ dirty: false });
  useStatementDraft.setState({
    month: "2026-01",
    companyId: null,
    dirtyByMonth: {},
  });
});

afterEach(() => {
  cleanup();
});

describe("useDraftBlock", () => {
  it("does not register a beforeunload warning without a draft", () => {
    renderAt("/generate/rent-receipt");

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByTestId("blocker-state")).toHaveTextContent("unblocked");
  });

  it("warns before unload when a rent receipt draft is dirty", () => {
    useRentReceiptDraft.setState({ dirty: true });

    renderAt("/generate/rent-receipt");

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("warns before unload when a statement draft is dirty", () => {
    useStatementDraft.setState({
      month: "2026-01",
      companyId: null,
      dirtyByMonth: { [draftScopeKey(null, "2026-01")]: true },
    });

    renderAt("/generate/expense-statement");

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("blocks leaving the note-frais page with a dirty statement draft", async () => {
    useStatementDraft.setState({
      month: "2026-01",
      companyId: null,
      dirtyByMonth: { [draftScopeKey(null, "2026-01")]: true },
    });

    const router = renderAt("/generate/expense-statement");
    await act(async () => {
      await router.navigate("/history");
    });

    expect(screen.queryByText("Historique")).toBeNull();
    expect(screen.getByTestId("blocker-state")).toHaveTextContent("blocked");
  });

  it("blocks leaving the quittance page with a dirty rent receipt draft", async () => {
    useRentReceiptDraft.setState({ dirty: true });

    const router = renderAt("/generate/rent-receipt");
    await act(async () => {
      await router.navigate("/history");
    });

    expect(screen.queryByText("Historique")).toBeNull();
    expect(screen.getByTestId("blocker-state")).toHaveTextContent("blocked");
  });

  it("allows leaving the note-frais page with only a dirty rent receipt draft", async () => {
    useRentReceiptDraft.setState({ dirty: true });

    const router = renderAt("/generate/expense-statement");
    await act(async () => {
      await router.navigate("/history");
    });

    expect(await screen.findByText("Historique")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/history");
  });

  it("allows leaving the quittance page with only a dirty statement draft", async () => {
    useStatementDraft.setState({
      month: "2026-01",
      companyId: null,
      dirtyByMonth: { [draftScopeKey(null, "2026-01")]: true },
    });

    const router = renderAt("/generate/rent-receipt");
    await act(async () => {
      await router.navigate("/history");
    });

    expect(await screen.findByText("Historique")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/history");
  });

  it("allows navigation between generation pages", async () => {
    useRentReceiptDraft.setState({ dirty: true });

    const router = renderAt("/generate/rent-receipt");
    await act(async () => {
      await router.navigate("/generate/expense-statement");
    });

    expect(screen.getByTestId("blocker-state")).toHaveTextContent("unblocked");
  });

  it("allows leaving the generation pages without any draft", async () => {
    const router = renderAt("/generate/rent-receipt");
    await act(async () => {
      await router.navigate("/history");
    });

    expect(screen.getByText("Historique")).toBeInTheDocument();
  });
});
