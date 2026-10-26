import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyDto } from "@/api/types";
import { useCompanyStore } from "@/state/company";
import { AppShell } from "./AppShell";

type Blocker = {
  state: "unblocked" | "blocked" | "proceeding";
  proceed: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
};

type CompaniesState = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: CompanyDto[];
};

let blockerState: Blocker;
let companiesState: CompaniesState;

vi.mock("@/hooks/useDraftBlock", () => ({
  useDraftBlock: () => blockerState,
}));

vi.mock("@/api/queries", () => ({
  useCompanies: () => companiesState,
}));

vi.mock("@/components/llm/LlmBadge", () => ({
  LlmBadge: ({ dark }: { dark?: boolean }) => (
    <span data-testid="llm-badge" data-dark={String(Boolean(dark))} />
  ),
}));

function renderShell(path = "/historique") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>Contenu de la page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useCompanyStore.setState({ activeCompanyId: null });
  blockerState = {
    state: "unblocked",
    proceed: vi.fn(),
    reset: vi.fn(),
  };
  companiesState = {
    isPending: false,
    isError: false,
    isSuccess: true,
    data: [
      { id: 1, name: "HKOF" },
      { id: 2, name: "Autre société" },
    ],
  };
});

describe("AppShell", () => {
  it("renders the desktop groups, links and the active route", () => {
    renderShell();

    const navigation = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    expect(within(navigation).queryByText("Générer")).toBeNull();
    expect(navigation.querySelector('a[href^="/generer/"]')).toBeNull();
    expect(within(navigation).getByText("Suivi")).toBeVisible();
    expect(within(navigation).getByText("Réglages")).toBeVisible();
    expect(
      within(navigation).getByRole("link", { name: /Société/ }),
    ).toHaveAttribute("href", "/configuration/entreprise");
    expect(
      within(navigation).getByRole("link", { name: /LMNP/ }),
    ).toHaveAttribute("href", "/configuration/lmnp");

    const historyLink = within(navigation).getByRole("link", {
      name: /Historique/,
    });
    expect(historyLink).toHaveAttribute("href", "/historique");
    expect(historyLink).toHaveAttribute("data-cy", "tab-historique");
    expect(historyLink.className).toContain("app-nav-link-active");
    expect(historyLink.querySelector(".app-nav-icon-active")).not.toBeNull();

    const adminLink = within(navigation).getByRole("link", {
      name: /Admin IA/,
    });
    expect(adminLink).toHaveAttribute("href", "/admin");
    expect(adminLink.className).toContain("app-nav-link-idle");
    expect(adminLink.querySelector(".app-nav-icon-active")).toBeNull();

    expect(
      within(navigation).queryByRole("link", { name: /Templates/ }),
    ).toBeNull();

    expect(screen.getByText("Contenu de la page")).toBeVisible();
    expect(screen.getByText("Quittances & frais d’occupation")).toBeVisible();
    expect(
      screen.getByText("HomeOfficeExpenses · usage personnel"),
    ).toBeVisible();
    expect(
      screen.getByText(/Aucune donnée ne quitte votre machine/),
    ).toBeVisible();
  });

  it("renders the skip link, the brand and the dark LLM badges", () => {
    renderShell();

    expect(
      screen.getByRole("link", { name: "Aller au contenu" }),
    ).toHaveAttribute("href", "#contenu");
    expect(screen.getAllByText("HomeOfficeExpenses")).toHaveLength(2);
    expect(screen.getAllByText("F")).toHaveLength(2);
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenu");

    const badges = screen.getAllByTestId("llm-badge");
    expect(badges).toHaveLength(2);
    badges.forEach((badge) =>
      expect(badge).toHaveAttribute("data-dark", "true"),
    );
  });

  it("renders the mobile navigation with every section link", () => {
    renderShell();

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Navigation principale mobile",
    });
    const links = within(mobileNavigation).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Historique",
      "Société",
      "LMNP",
      "Admin IA",
    ]);
    const active = within(mobileNavigation).getByRole("link", {
      name: "Historique",
    });
    expect(active.className).toContain("app-nav-mobile-link-active");
  });

  it("shows the draft dialog and proceeds when blocked", async () => {
    blockerState = {
      state: "blocked",
      proceed: vi.fn(),
      reset: vi.fn(),
    };
    renderShell("/generer/quittance");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-cy", "dialogue-quitter");
    expect(screen.getByText("Brouillon non généré")).toBeVisible();
    expect(
      screen.getByText(/Des informations saisies ne sont pas encore/),
    ).toBeVisible();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Quitter la page" }));
    expect(blockerState.proceed).toHaveBeenCalledTimes(1);
    expect(blockerState.reset).not.toHaveBeenCalled();
  });

  it("resets the blocker when the user stays", async () => {
    blockerState = {
      state: "blocked",
      proceed: vi.fn(),
      reset: vi.fn(),
    };
    renderShell("/generer/note-frais");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Rester" }));
    expect(blockerState.reset).toHaveBeenCalledTimes(1);
    expect(blockerState.proceed).not.toHaveBeenCalled();
  });

  it("hides the dialog when navigation is not blocked", () => {
    renderShell();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves the active company to the first one without a selector", async () => {
    renderShell();

    await waitFor(() =>
      expect(useCompanyStore.getState().activeCompanyId).toBe(1),
    );
    expect(screen.queryByLabelText("Société active")).toBeNull();
    expect(
      document.querySelector('[data-cy="select-societe-active"]'),
    ).toBeNull();
    expect(screen.queryByText("Société active")).toBeNull();
  });

  it("keeps a stored company that still exists", async () => {
    useCompanyStore.setState({ activeCompanyId: 2 });
    renderShell();

    await waitFor(() =>
      expect(useCompanyStore.getState().activeCompanyId).toBe(2),
    );
    expect(
      document.querySelector('[data-cy="select-societe-active"]'),
    ).toBeNull();
  });

  it("falls back on the first company when the stored id is gone", async () => {
    useCompanyStore.setState({ activeCompanyId: 99 });
    renderShell();

    await waitFor(() =>
      expect(useCompanyStore.getState().activeCompanyId).toBe(1),
    );
  });

  it("clears the active company when none is configured", async () => {
    companiesState = {
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    };
    renderShell();

    await waitFor(() =>
      expect(useCompanyStore.getState().activeCompanyId).toBeNull(),
    );
    expect(
      document.querySelector('[data-cy="select-societe-active"]'),
    ).toBeNull();
  });
});
