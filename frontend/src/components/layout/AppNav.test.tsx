import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { MobileNavigation, SideNavigation } from "./AppNav";

function renderAt(ui: ReactElement, path = "/historique") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe("SideNavigation", () => {
  it("renders the sections, the links and the active route", () => {
    renderAt(<SideNavigation />);

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
    expect(adminLink).toHaveAttribute("data-cy", "tab-admin");
    expect(adminLink.className).toContain("app-nav-link-idle");
    expect(adminLink.querySelector(".app-nav-icon-active")).toBeNull();

    expect(
      within(navigation).queryByRole("link", { name: /Templates/ }),
    ).toBeNull();
  });

  it("translates the sections and links into English without changing routes", async () => {
    await i18n.changeLanguage("en");
    renderAt(<SideNavigation />);

    const navigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(within(navigation).getByText("Tracking")).toBeVisible();
    expect(within(navigation).getByText("Settings")).toBeVisible();
    expect(
      within(navigation).getByRole("link", { name: /History/ }),
    ).toHaveAttribute("href", "/historique");
    expect(
      within(navigation).getByRole("link", { name: /History/ }),
    ).toHaveAttribute("data-cy", "tab-historique");
    expect(
      within(navigation).getByRole("link", { name: /Company/ }),
    ).toHaveAttribute("href", "/configuration/entreprise");
    expect(
      within(navigation).getByRole("link", { name: /AI Admin/ }),
    ).toHaveAttribute("href", "/admin");
    expect(within(navigation).queryByText("Suivi")).toBeNull();
    expect(within(navigation).queryByText("Réglages")).toBeNull();
  });
});

describe("navigation selectors", () => {
  it("keeps every data-cy selector unique when both navigations are mounted", () => {
    const { container } = renderAt(
      <>
        <SideNavigation />
        <MobileNavigation />
      </>,
    );

    for (const dataCy of [
      "tab-historique",
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
      "Historique",
      "Société",
      "LMNP",
      "Admin IA",
    ]);
    const active = within(mobileNavigation).getByRole("link", {
      name: "Historique",
    });
    expect(active.className).toContain("app-nav-mobile-link-active");
    expect(
      within(mobileNavigation).getByRole("link", { name: "Admin IA" })
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
    ).toEqual(["History", "Company", "LMNP", "AI Admin"]);
  });
});
