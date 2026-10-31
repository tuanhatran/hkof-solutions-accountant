import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { setAuthUser } from "@/api/queries";
import i18n from "@/i18n";
import { MobileNavigation, SECTIONS, SideNavigation } from "./AppNav";

function renderAt(ui: ReactElement, path = "/historique") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe("SideNavigation", () => {
  it("renders the sections, the links and the active route", () => {
    renderAt(<SideNavigation />);

    const navigation = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    expect(within(navigation).getByText("Documents")).toBeVisible();
    expect(within(navigation).getByText("Suivi")).toBeVisible();
    expect(within(navigation).getByText("Réglages")).toBeVisible();
    expect(
      within(navigation).getByRole("link", { name: /Société/ }),
    ).toHaveAttribute("href", "/configuration/entreprise");
    expect(
      within(navigation).getByRole("link", { name: /Agence immobilière/ }),
    ).toHaveAttribute("href", "/configuration/lmnp");
    const templatesLink = within(navigation).getByRole("link", {
      name: /Modèles/,
    });
    expect(templatesLink).toHaveAttribute("href", "/templates");
    expect(templatesLink).toHaveAttribute("data-cy", "tab-templates");
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Quittance",
      "Note de frais",
      "Historique",
      "Modèles",
      "Société",
      "Agence immobilière",
      "Analyse IA",
    ]);

    const historyLink = within(navigation).getByRole("link", {
      name: /Historique/,
    });
    expect(historyLink).toHaveAttribute("href", "/historique");
    expect(historyLink).toHaveAttribute("data-cy", "tab-history");
    expect(historyLink.className).toContain("app-nav-link-active");
    expect(historyLink.querySelector(".app-nav-icon-active")).not.toBeNull();

    const adminLink = within(navigation).getByRole("link", {
      name: /Analyse IA/,
    });
    expect(adminLink).toHaveAttribute("href", "/admin");
    expect(adminLink).toHaveAttribute("data-cy", "tab-admin");
    expect(adminLink.className).toContain("app-nav-link-idle");
    expect(adminLink.querySelector(".app-nav-icon-active")).toBeNull();

    const receiptLink = within(navigation).getByRole("link", {
      name: /Quittance/,
    });
    expect(receiptLink).toHaveAttribute("href", "/generer/quittance");
    expect(receiptLink).toHaveAttribute("data-cy", "tab-rent-receipt");
    const statementLink = within(navigation).getByRole("link", {
      name: /Note de frais/,
    });
    expect(statementLink).toHaveAttribute("href", "/generer/note-frais");
    expect(statementLink).toHaveAttribute("data-cy", "tab-expense-statement");
  });

  it("marks the generation route as active", () => {
    renderAt(<SideNavigation />, "/generer/quittance");

    const navigation = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    const receiptLink = within(navigation).getByRole("link", {
      name: /Quittance/,
    });
    expect(receiptLink.className).toContain("app-nav-link-active");
    expect(
      within(navigation).getByRole("link", { name: /Note de frais/ }).className,
    ).toContain("app-nav-link-idle");
  });

  it("translates the sections and links into English without changing routes", async () => {
    await i18n.changeLanguage("en");
    renderAt(<SideNavigation />);

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
    ).toHaveAttribute("href", "/historique");
    expect(
      within(navigation).getByRole("link", { name: /History/ }),
    ).toHaveAttribute("data-cy", "tab-history");
    expect(
      within(navigation).getByRole("link", { name: /Company/ }),
    ).toHaveAttribute("href", "/configuration/entreprise");
    expect(
      within(navigation).getByRole("link", { name: /Templates/ }),
    ).toHaveAttribute("href", "/templates");
    expect(
      within(navigation).getByRole("link", { name: /AI analysis/ }),
    ).toHaveAttribute("href", "/admin");
    expect(within(navigation).queryByText("Suivi")).toBeNull();
    expect(within(navigation).queryByText("Réglages")).toBeNull();
  });
});

describe("module-aware navigation", () => {
  afterEach(() => setAuthUser(null));

  function linkLabels(): string[] {
    return within(
      screen.getByRole("navigation", { name: "Navigation principale" }),
    )
      .getAllByRole("link")
      .map((link) => link.textContent ?? "");
  }

  it("shows only the company module links for a company-only account", () => {
    setAuthUser({
      email: "societe@exemple.fr",
      companyEnabled: true,
      lmnpEnabled: false,
    });
    renderAt(<SideNavigation />);

    expect(linkLabels()).toEqual([
      "Note de frais",
      "Historique",
      "Modèles",
      "Société",
      "Analyse IA",
    ]);
    expect(
      screen.queryByRole("link", { name: /Quittance/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Agence immobilière/ }),
    ).toBeNull();
  });

  it("shows only the LMNP module links for an LMNP-only account", () => {
    setAuthUser({
      email: "lmnp@exemple.fr",
      companyEnabled: false,
      lmnpEnabled: true,
    });
    renderAt(<SideNavigation />);

    expect(linkLabels()).toEqual([
      "Quittance",
      "Historique",
      "Modèles",
      "Agence immobilière",
      "Analyse IA",
    ]);
    expect(
      screen.queryByRole("link", { name: /Note de frais/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Société/ })).toBeNull();
  });

  it("adds the admin users link for an ADMIN account with both modules", () => {
    setAuthUser({
      email: "admin@exemple.fr",
      role: "ADMIN",
      companyEnabled: true,
      lmnpEnabled: true,
    });
    renderAt(<SideNavigation />);

    const adminUsers = screen.getByRole("link", {
      name: /Administration utilisateurs/,
    });
    expect(adminUsers).toHaveAttribute("href", "/admin/utilisateurs");
    expect(adminUsers).toHaveAttribute("data-cy", "tab-admin-users");
    expect(linkLabels()).toHaveLength(8);
  });

  it("adds the admin users link to the mobile navigation for an ADMIN account", () => {
    setAuthUser({
      email: "admin@exemple.fr",
      role: "ADMIN",
      companyEnabled: true,
      lmnpEnabled: true,
    });
    renderAt(<MobileNavigation />);

    expect(
      within(
        screen.getByRole("navigation", {
          name: "Navigation principale mobile",
        }),
      ).getByRole("link", { name: /Administration utilisateurs/ }),
    ).toHaveAttribute("href", "/admin/utilisateurs");
  });

  it("keeps the admin users link out of a USER navigation", () => {
    setAuthUser({
      email: "user@exemple.fr",
      role: "USER",
      companyEnabled: true,
      lmnpEnabled: true,
    });
    renderAt(<MobileNavigation />);

    expect(
      screen.queryByRole("link", { name: /Administration utilisateurs/ }),
    ).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("navigation", {
          name: "Navigation principale mobile",
        }),
      ).getAllByRole("link"),
    ).toHaveLength(7);
  });

  it("filters the USER mobile navigation without an admin users link", () => {
    setAuthUser({
      email: "user@exemple.fr",
      role: "USER",
      companyEnabled: true,
      lmnpEnabled: false,
    });
    renderAt(<MobileNavigation />);

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Navigation principale mobile",
    });
    expect(
      within(mobileNavigation)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Note de frais",
      "Historique",
      "Modèles",
      "Société",
      "Analyse IA",
    ]);
    expect(
      within(mobileNavigation).queryByRole("link", {
        name: /Administration utilisateurs/,
      }),
    ).toBeNull();
  });
});

describe("navigation selectors", () => {
  it("renders navigation groups with the group data-cy prefix", () => {
    const documents = SECTIONS[0];
    documents.groups = [{ titleKey: "navigation.links.history", links: [] }];

    try {
      renderAt(<SideNavigation />);

      const group = document.querySelector(
        '[data-cy="group-navigation.links.history"]',
      );
      expect(group).not.toBeNull();
      expect(
        within(group as HTMLElement).getByText("Historique"),
      ).toBeVisible();
    } finally {
      delete documents.groups;
    }
  });

  it("keeps every data-cy selector unique when both navigations are mounted", () => {
    const { container } = renderAt(
      <>
        <SideNavigation />
        <MobileNavigation />
      </>,
    );

    for (const dataCy of [
      "tab-rent-receipt",
      "tab-expense-statement",
      "tab-history",
      "tab-templates",
      "tab-configuration",
      "tab-lmnp",
      "tab-admin",
    ]) {
      expect(container.querySelectorAll(`[data-cy="${dataCy}"]`)).toHaveLength(
        1,
      );
    }
  });
});

describe("MobileNavigation", () => {
  it("renders every section link in order with the active route", () => {
    renderAt(<MobileNavigation />);

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Navigation principale mobile",
    });
    const links = within(mobileNavigation).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Quittance",
      "Note de frais",
      "Historique",
      "Modèles",
      "Société",
      "Agence immobilière",
      "Analyse IA",
    ]);
    const active = within(mobileNavigation).getByRole("link", {
      name: "Historique",
    });
    expect(active.className).toContain("app-nav-mobile-link-active");
    expect(
      within(mobileNavigation).getByRole("link", { name: "Analyse IA" })
        .className,
    ).toContain("app-nav-mobile-link-idle");
  });

  it("translates the mobile links into English in the same order", async () => {
    await i18n.changeLanguage("en");
    renderAt(<MobileNavigation />);

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
      "Templates",
      "Company",
      "Real estate agency",
      "AI analysis",
    ]);
  });
});
