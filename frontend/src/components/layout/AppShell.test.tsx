import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { AppShell } from "./AppShell";

type Blocker = {
  state: "unblocked" | "blocked" | "proceeding";
  proceed: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
};

let blockerState: Blocker;
const saveActiveDraftMock = vi.fn();

vi.mock("@/hooks/useDraftBlock", () => ({
  useDraftBlock: () => blockerState,
}));

vi.mock("@/state/draftSaver", () => ({
  saveActiveDraft: () => saveActiveDraftMock(),
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
  saveActiveDraftMock.mockReset();
  saveActiveDraftMock.mockResolvedValue(true);
  blockerState = {
    state: "unblocked",
    proceed: vi.fn(),
    reset: vi.fn(),
  };
});

describe("AppShell", () => {
  it("renders the desktop groups, links and the active route", () => {
    renderShell();

    const navigation = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    expect(within(navigation).getByText("Documents")).toBeVisible();
    expect(within(navigation).getByText("Suivi")).toBeVisible();
    expect(within(navigation).getByText("Réglages")).toBeVisible();
    expect(
      within(navigation).getByRole("link", { name: /Quittance/ }),
    ).toHaveAttribute("href", "/generer/quittance");
    expect(
      within(navigation).getByRole("link", { name: /Quittance/ }),
    ).toHaveAttribute("data-cy", "tab-quittance");
    expect(
      within(navigation).getByRole("link", { name: /Note de frais/ }),
    ).toHaveAttribute("href", "/generer/note-frais");
    expect(
      within(navigation).getByRole("link", { name: /Note de frais/ }),
    ).toHaveAttribute("data-cy", "tab-note-frais");
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
      name: /Analyse IA/,
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
      screen.getByTitle(/Aucune donnée ne quitte votre machine/),
    ).toHaveTextContent("Données locales");
  });

  it("renders the skip link, the brand and the light LLM badges", () => {
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
      expect(badge).toHaveAttribute("data-dark", "false"),
    );
  });

  it("renders the mobile navigation with every section link", () => {
    renderShell();

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Navigation principale mobile",
    });
    const links = within(mobileNavigation).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Quittance",
      "Note de frais",
      "Historique",
      "Société",
      "LMNP",
      "Analyse IA",
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
    expect(screen.getByText("Modifications non enregistrées")).toBeVisible();
    expect(screen.getByText(/Des modifications de ce brouillon/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Enregistrer et quitter" }),
    ).toBeVisible();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Quitter sans enregistrer" }));
    expect(blockerState.proceed).toHaveBeenCalledTimes(1);
    expect(blockerState.reset).not.toHaveBeenCalled();
  });

  it("saves the draft before leaving when the user asks for it", async () => {
    blockerState = {
      state: "blocked",
      proceed: vi.fn(),
      reset: vi.fn(),
    };
    renderShell("/generer/quittance");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Enregistrer et quitter" }));

    expect(saveActiveDraftMock).toHaveBeenCalledTimes(1);
    expect(blockerState.proceed).toHaveBeenCalledTimes(1);
    expect(blockerState.reset).not.toHaveBeenCalled();
  });

  it("stays on the page when saving the draft fails", async () => {
    saveActiveDraftMock.mockResolvedValue(false);
    blockerState = {
      state: "blocked",
      proceed: vi.fn(),
      reset: vi.fn(),
    };
    renderShell("/generer/note-frais");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Enregistrer et quitter" }));

    expect(saveActiveDraftMock).toHaveBeenCalledTimes(1);
    expect(blockerState.proceed).not.toHaveBeenCalled();
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

  it("renders the actions on the right without a global company selector", () => {
    renderShell();

    const topbar = document.querySelector(".app-shell-topbar");
    expect(topbar).not.toBeNull();
    expect(
      topbar?.querySelector('[data-cy="select-societe-active"]'),
    ).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: /Société active/ }),
    ).toBeNull();
    const actions = topbar?.firstElementChild as HTMLElement;
    expect(within(actions).getByTestId("llm-badge")).toBeVisible();
    const language = within(actions).getByRole("group", { name: "Langue" });
    expect(within(language).getAllByRole("button")).toHaveLength(2);
    expect(topbar?.nextElementSibling).toBe(screen.getByRole("main"));
  });

  it("translates the shell, navigation and draft dialog into English", async () => {
    blockerState = {
      state: "blocked",
      proceed: vi.fn(),
      reset: vi.fn(),
    };
    await i18n.changeLanguage("en");
    renderShell();

    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#contenu");
    expect(
      screen.getByText("Rent receipts & home-office expenses"),
    ).toBeVisible();
    expect(screen.getByText("Local data")).toBeVisible();
    expect(screen.getByTitle(/No data leaves your machine/)).toHaveTextContent(
      "Local data",
    );
    expect(screen.getByText("HomeOfficeExpenses · personal use")).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "Active company" }),
    ).toBeNull();

    const navigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(within(navigation).getByText("Documents")).toBeVisible();
    expect(within(navigation).getByText("Tracking")).toBeVisible();
    expect(within(navigation).getByText("Settings")).toBeVisible();
    expect(
      within(navigation).getByRole("link", { name: /Rent receipt/ }),
    ).toHaveAttribute("href", "/generer/quittance");
    expect(
      within(navigation).getByRole("link", { name: /Expense statement/ }),
    ).toHaveAttribute("href", "/generer/note-frais");
    expect(
      within(navigation).getByRole("link", { name: /History/ }),
    ).toHaveAttribute("data-cy", "tab-historique");
    expect(
      within(navigation).getByRole("link", { name: /Company/ }),
    ).toHaveAttribute("href", "/configuration/entreprise");
    expect(
      within(navigation).getByRole("link", { name: /AI analysis/ }),
    ).toHaveAttribute("href", "/admin");
    expect(within(navigation).queryByText("Historique")).toBeNull();

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(
      within(mobileNavigation)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Rent receipt",
      "Expense statement",
      "History",
      "Company",
      "LMNP",
      "AI analysis",
    ]);

    expect(screen.getByText("Unsaved changes")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Leave without saving" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Stay" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save and leave" }),
    ).toBeVisible();
  });
});
