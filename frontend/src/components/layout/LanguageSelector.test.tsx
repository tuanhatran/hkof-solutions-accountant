import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";
import { LanguageSelector } from "./LanguageSelector";

describe("LanguageSelector", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders a two-state language toggle with the pressed language", () => {
    render(<LanguageSelector />);

    const group = screen.getByRole("group", { name: "Langue" });
    expect(group).toHaveAttribute("data-cy", "select-langue");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      within(group).getByRole("button", { name: "Français" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(group).getByRole("button", { name: "English" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the persisted language with the keyboard", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    const french = screen.getByRole("button", { name: "Français" });
    const english = screen.getByRole("button", { name: "English" });

    await user.tab();
    expect(french).toHaveFocus();
    await user.tab();
    expect(english).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(i18n.resolvedLanguage).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(english).toHaveAttribute("aria-pressed", "true");
    expect(french).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the persisted language on mount", async () => {
    await i18n.changeLanguage("en");

    const { unmount } = render(<LanguageSelector />);

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    unmount();
    render(<LanguageSelector />);
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
  });
});
