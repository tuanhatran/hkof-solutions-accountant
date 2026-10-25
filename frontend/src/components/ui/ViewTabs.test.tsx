import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewTabs } from "./ViewTabs";

describe("ViewTabs", () => {
  it("marks the active tab, shows the update dot and reports changes", async () => {
    const onChange = vi.fn();
    render(
      <ViewTabs
        ariaLabel="Vue du document"
        active="apercu"
        onChange={onChange}
        tabs={[
          { value: "saisie", label: "Saisie", className: "custom-tab" },
          { value: "apercu", label: "Aperçu", updated: true },
        ]}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Vue du document" });
    const saisie = screen.getByRole("tab", { name: "Saisie" });
    const apercu = screen.getByRole("tab", { name: "Aperçu" });

    expect(apercu).toHaveAttribute("aria-selected", "true");
    expect(saisie).toHaveAttribute("aria-selected", "false");
    expect(saisie.className).toContain("custom-tab");
    expect(apercu.className).toContain("segmented-item-active");
    expect(saisie.querySelector("span")).toBeNull();
    expect(apercu.querySelector("span")).toHaveClass("view-tabs-dot");
    expect(tablist).toBeVisible();

    await userEvent.setup().click(saisie);
    expect(onChange).toHaveBeenCalledWith("saisie");
  });

  it("puts the per-tab data-cy on the tab button and omits it when absent", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ViewTabs
        ariaLabel="Sections"
        active="a"
        onChange={onChange}
        tabs={[
          { value: "a", label: "Section A", dataCy: "onglet-a" },
          { value: "b", label: "Section B", dataCy: "onglet-b" },
          { value: "c", label: "Section C" },
        ]}
      />,
    );

    const tabA = document.querySelector('[data-cy="onglet-a"]');
    const tabB = document.querySelector('[data-cy="onglet-b"]');
    expect(tabA).not.toBeNull();
    expect(tabB).not.toBeNull();
    expect(tabA).toHaveAttribute("role", "tab");
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabB).toHaveAttribute("aria-selected", "false");

    if (tabB instanceof HTMLElement) {
      await user.click(tabB);
    }
    expect(onChange).toHaveBeenCalledWith("b");

    const tabC = screen.getByRole("tab", { name: "Section C" });
    expect(tabC).not.toHaveAttribute("data-cy");
  });
});
