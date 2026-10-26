import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
});
