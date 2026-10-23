import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function renderDialog(
  overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {},
) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const result = render(
    <ConfirmDialog
      open
      title="Quitter la page ?"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { ...result, onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("renders the default labels, focuses the cancel button and confirms", async () => {
    const { onConfirm } = renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-cy", "dialogue-confirmation");
    expect(
      screen.getByRole("heading", { name: "Quitter la page ?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders custom labels, message and danger variant", () => {
    renderDialog({
      message: <p>Le brouillon sera conservé.</p>,
      confirmLabel: "Quitter",
      cancelLabel: "Rester",
      variant: "danger",
      dataCy: "dialogue-quitter",
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-cy", "dialogue-quitter");
    expect(screen.getByText("Le brouillon sera conservé.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Quitter" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Rester" })).toBeVisible();
    const confirm = screen.getByRole("button", { name: "Quitter" });
    expect(confirm.className).toContain("btn-danger");
  });

  it("cancels on the close button, the backdrop and Escape", async () => {
    const { onCancel } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("renders nothing when closed and cleans the key listener", () => {
    const onCancel = vi.fn();
    const { container, rerender } = render(
      <ConfirmDialog
        open={false}
        title="Quitter"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <ConfirmDialog
        open
        title="Quitter"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    rerender(
      <ConfirmDialog
        open={false}
        title="Quitter"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
