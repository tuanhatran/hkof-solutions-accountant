import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { TemplatesPage } from "./TemplatesPage";

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: () => null,
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useTemplates: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTemplateVariables: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TemplatesPage />
    </QueryClientProvider>,
  );
}

describe("TemplatesPage", () => {
  it("renders both template cards and one shared sandbox warning", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Modèles", level: 1 }),
    ).toBeVisible();
    expect(screen.getByText("Réglages")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Quittance de loyer" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Note de frais d’occupation" }),
    ).toBeVisible();
    expect(
      document.querySelector('[data-cy="dropzone-rent-receipt-template"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="dropzone-statement-template"]'),
    ).not.toBeNull();
    expect(
      screen.getAllByText(/Les modèles ne peuvent exécuter aucun code/),
    ).toHaveLength(1);

    const cards = document.querySelectorAll("section.templates-card");
    expect(cards).toHaveLength(2);
    cards.forEach((card) => expect(card.classList.contains("card")).toBe(true));
  });

  it("renders the page header and the warning in English", async () => {
    await i18n.changeLanguage("en");
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Templates", level: 1 }),
    ).toBeVisible();
    expect(screen.getByText("Settings")).toBeVisible();
    expect(
      screen.getAllByText(/Templates cannot execute any code/),
    ).toHaveLength(1);
  });
});
