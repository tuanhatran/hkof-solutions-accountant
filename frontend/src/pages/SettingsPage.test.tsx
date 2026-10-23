import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { SettingsDto } from "@/api/types";
import { SettingsPage } from "./SettingsPage";

const SETTINGS: SettingsDto = {
  companyName: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  companyAddress: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  homeAddress: "12 rue des Lilas, 75011 Paris",
  totalArea: "70.00",
  businessArea: "25.00",
  proRataBase: "35.71",
  issuePlace: "Paris",
};

vi.mock("@/api/endpoints", () => ({
  api: {
    settings: { get: vi.fn(), update: vi.fn() },
    expenseItems: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useSettings: () => ({
      data: SETTINGS,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useExpenseItems: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useSignatures: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLandlords: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTenants: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLeases: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

function renderPage() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SettingsPage tabs", () => {
  beforeEach(() => {
    vi.mocked(api.settings.update).mockReset();
  });

  it("opens on the Entreprise tab with the company form", () => {
    renderPage();

    expect(screen.getByRole("tab", { name: "Entreprise" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF");
    expect(screen.queryByRole("heading", { name: "Bailleurs" })).toBeNull();
  });

  it("switches to the Quittances tab with the directories and signatures", async () => {
    renderPage();

    await userEvent
      .setup()
      .click(screen.getByRole("tab", { name: "Quittances" }));

    expect(await screen.findByRole("heading", { name: "Bailleurs" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Locataires" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Signatures" })).toBeVisible();
    expect(screen.queryByLabelText("Raison sociale")).toBeNull();
    expect(screen.getByRole("tab", { name: "Quittances" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
