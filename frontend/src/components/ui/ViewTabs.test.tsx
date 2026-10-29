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
        idPrefix="vue"
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
    expect(saisie).toHaveAttribute("id", "vue-tab-saisie");
    expect(apercu).toHaveAttribute("id", "vue-tab-apercu");
    expect(apercu).toHaveAttribute("tabindex", "0");
    expect(saisie).toHaveAttribute("tabindex", "-1");
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
        idPrefix="vue"
        active="a"
        onChange={onChange}
        tabs={[
          { value: "a", label: "Section A", dataCy: "tab-a" },
          { value: "b", label: "Section B", dataCy: "tab-b" },
          { value: "c", label: "Section C" },
        ]}
      />,
    );

    const tabA = document.querySelector('[data-cy="tab-a"]');
    const tabB = document.querySelector('[data-cy="tab-b"]');
    expect(tabA).not.toBeNull();
    expect(tabB).not.toBeNull();
    expect(tabA).toHaveAttribute("role", "tab");
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabB).toHaveAttribute("aria-selected", "false");
    expect(tabA).toHaveAttribute("id", "vue-tab-a");

    if (tabB instanceof HTMLElement) {
      await user.click(tabB);
    }
    expect(onChange).toHaveBeenCalledWith("b");

    const tabC = screen.getByRole("tab", { name: "Section C" });
    expect(tabC).not.toHaveAttribute("data-cy");
    expect(tabC).toHaveAttribute("id", "vue-tab-c");
    expect(tabB).toHaveAttribute("tabindex", "-1");
  });

  it("links a tab to its panel only when a panel id is provided", () => {
    render(
      <ViewTabs
        ariaLabel="Sections"
        idPrefix="vue"
        active="a"
        onChange={vi.fn()}
        tabs={[
          { value: "a", label: "Section A", panelId: "panneau-a" },
          { value: "b", label: "Section B" },
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: "Section A" })).toHaveAttribute(
      "aria-controls",
      "panneau-a",
    );
    expect(screen.getByRole("tab", { name: "Section B" })).not.toHaveAttribute(
      "aria-controls",
    );
  });

  it("moves focus and selection with the arrow keys, Home and End", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ViewTabs
        ariaLabel="Sections"
        idPrefix="vue"
        active="a"
        onChange={onChange}
        tabs={[
          { value: "a", label: "Section A" },
          { value: "b", label: "Section B" },
          { value: "c", label: "Section C" },
        ]}
      />,
    );

    const tabA = screen.getByRole("tab", { name: "Section A" });
    const tabB = screen.getByRole("tab", { name: "Section B" });
    const tabC = screen.getByRole("tab", { name: "Section C" });

    tabA.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("b");
    expect(tabB).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("a");
    expect(tabA).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(tabC).toHaveFocus();

    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("a");
    expect(tabA).toHaveFocus();

    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(tabC).toHaveFocus();
  });
});
