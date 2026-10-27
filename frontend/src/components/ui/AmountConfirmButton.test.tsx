import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { AmountConfirmButton } from "@/components/ui/AmountConfirmButton";

describe("AmountConfirmButton", () => {
  it("asks for confirmation with a French hint and reports the click", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<AmountConfirmButton confirmed={false} onConfirm={onConfirm} />);

    const button = screen.getByRole("button", {
      name: "Confirmer le montant détecté par IA",
    });

    expect(button).toHaveAttribute("data-cy", "btn-confirmer-montant");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(
        "Montant détecté par IA — confirmez-le pour ajouter le frais.",
      ),
    ).toBeInTheDocument();

    await user.click(button);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows and announces the confirmed state", () => {
    render(<AmountConfirmButton confirmed onConfirm={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Montant confirmé" });

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Montant confirmé.")).toBeInTheDocument();
    expect(screen.getByText("Montant confirmé.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(
      screen.queryByText(
        "Montant détecté par IA — confirmez-le pour ajouter le frais.",
      ),
    ).not.toBeInTheDocument();
  });

  it("translates the hint and labels into English", async () => {
    await i18n.changeLanguage("en");
    const { rerender } = render(
      <AmountConfirmButton confirmed={false} onConfirm={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", {
        name: "Confirm the AI-detected amount",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("AI-detected amount — confirm it to add the expense."),
    ).toBeVisible();

    rerender(<AmountConfirmButton confirmed onConfirm={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Amount confirmed" }),
    ).toBeVisible();
    expect(screen.getByText("Amount confirmed.")).toBeInTheDocument();
  });
});
