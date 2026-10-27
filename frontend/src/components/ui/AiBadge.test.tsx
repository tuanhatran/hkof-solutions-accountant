import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { AiBadge } from "./AiBadge";

describe("AiBadge", () => {
  it("shows the default label without a title", () => {
    render(<AiBadge />);
    const badge = screen.getByText("Détecté par IA");
    expect(badge).toHaveAttribute("data-cy", "badge-ia-detecte");
    expect(badge).not.toHaveAttribute("title");
  });

  it("exposes the source extract in the title and accepts a label", () => {
    render(<AiBadge sourceExtract="TOTAL TTC 42,00" label="Montant IA" />);
    const badge = screen.getByText("Montant IA");
    expect(badge).toHaveAttribute(
      "title",
      "Extrait du document : « TOTAL TTC 42,00 »",
    );
  });

  it("translates the default label and source title into English", async () => {
    await i18n.changeLanguage("en");
    render(<AiBadge sourceExtract="TOTAL TTC 42,00" />);

    const badge = screen.getByText("Detected by AI");
    expect(badge).toHaveAttribute(
      "title",
      "Document excerpt: “TOTAL TTC 42,00”",
    );
  });
});
