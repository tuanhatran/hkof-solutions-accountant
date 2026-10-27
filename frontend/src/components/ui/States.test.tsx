import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { EmptyState, ErrorState, LoadingState, Spinner } from "./States";

describe("States", () => {
  it("renders the default loading message and a custom one", () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…");

    rerender(<LoadingState message="Chargement des baux…" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement des baux…",
    );
  });

  it("renders a spinner with a custom size", () => {
    render(<Spinner size={24} className="text-danger" />);
    const spinner = document.querySelector("svg");
    expect(spinner).toHaveAttribute("width", "24");
    expect(spinner?.getAttribute("class")).toContain("text-danger");
  });

  it("hides the retry button without a handler and calls it otherwise", async () => {
    const { rerender } = render(<ErrorState message="Erreur réseau" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur réseau");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();

    const onRetry = vi.fn();
    rerender(<ErrorState message="Erreur réseau" onRetry={onRetry} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the shared defaults in English", async () => {
    await i18n.changeLanguage("en");
    const { rerender } = render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");

    rerender(<ErrorState message="Network error" onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load data");
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("renders optional description, action and icon in the empty state", async () => {
    const onAction = vi.fn();
    const { rerender } = render(<EmptyState title="Aucun bail" />);
    expect(screen.getByRole("heading", { name: "Aucun bail" })).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <EmptyState
        title="Aucun bail"
        description="Créez un bail pour commencer."
        icon={<span data-testid="custom-icon" />}
        action={
          <button type="button" onClick={onAction}>
            Créer
          </button>
        }
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByText("Créez un bail pour commencer.")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Créer" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
