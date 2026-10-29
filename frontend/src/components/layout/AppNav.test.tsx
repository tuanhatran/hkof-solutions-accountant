import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
      within(navigation).getByRole("link", { name: /LMNP/ }),
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
      "LMNP",
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
      "LMNP",
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
      "LMNP",
      "AI analysis",
    ]);
  });
});
