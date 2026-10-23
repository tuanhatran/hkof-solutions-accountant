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
    expect(apercu.querySelector("span")).toHaveClass("bg-accent");
    expect(tablist).toBeVisible();

    await userEvent.setup().click(saisie);
    expect(onChange).toHaveBeenCalledWith("saisie");
  });
});
