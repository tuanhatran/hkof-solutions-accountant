import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";
import { LanguageSelector } from "./LanguageSelector";

describe("LanguageSelector", () => {
  it("renders a labelled language select with both options", () => {
    render(<LanguageSelector />);

    const select = screen.getByRole("combobox", { name: "Langue" });
    expect(select).toHaveAttribute("data-cy", "select-langue");
    expect(select).toHaveValue("fr");
    expect(
      screen.getByRole("option", { name: "Français" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("is keyboard focusable and switches the persisted language", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    const select = screen.getByRole("combobox", { name: "Langue" });

    await user.tab();
    expect(select).toHaveFocus();

    await user.selectOptions(select, "en");

    expect(i18n.resolvedLanguage).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en",
    );
  });

  it("shows the persisted language on mount", async () => {
    await i18n.changeLanguage("en");

    render(<LanguageSelector />);

    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en",
    );
  });
});
