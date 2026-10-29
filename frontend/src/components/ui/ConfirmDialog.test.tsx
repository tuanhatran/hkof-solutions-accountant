import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
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
    expect(dialog).toHaveAttribute("data-cy", "dialog-confirmation");
    expect(
      screen.getByRole("heading", { name: "Quitter la page ?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("translates the default labels into English", async () => {
    await i18n.changeLanguage("en");
    renderDialog();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
  });

  it("renders custom labels, message and danger variant", () => {
    renderDialog({
      message: <p>Le brouillon sera conservé.</p>,
      confirmLabel: "Quitter",
      cancelLabel: "Rester",
      variant: "danger",
      dataCy: "dialog-leave",
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-cy", "dialog-leave");
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

  it("traps Tab and Shift+Tab inside the panel", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Hors dialogue</button>
        <ConfirmDialog
          open
          title="Quitter"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </>,
    );

    const outside = screen.getByRole("button", { name: "Hors dialogue" });
    const cancel = screen.getByRole("button", { name: "Annuler" });
    const confirm = screen.getByRole("button", { name: "Confirmer" });
    const close = screen.getByRole("button", { name: "Fermer" });

    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    expect(outside).not.toHaveFocus();

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("traps Tab and Shift+Tab when focus is outside the panel", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Hors dialogue</button>
        <ConfirmDialog
          open
          title="Quitter"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
        {createPortal(
          <button type="button">Hors dialogue après</button>,
          document.body,
        )}
      </>,
    );

    const dialog = screen.getByRole("dialog");
    const outsideBefore = screen.getByRole("button", {
      name: "Hors dialogue",
    });
    const outsideAfter = screen.getByRole("button", {
      name: "Hors dialogue après",
    });
    const title = screen.getByRole("heading", { name: "Quitter" });

    await user.click(title);
    expect(document.activeElement).toBe(document.body);

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(outsideBefore).not.toHaveFocus();
    expect(outsideAfter).not.toHaveFocus();

    await user.click(title);
    expect(document.activeElement).toBe(document.body);

    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(outsideBefore).not.toHaveFocus();
    expect(outsideAfter).not.toHaveFocus();
  });

  it("restores focus to the opener once the dialog closes", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Ouvrir la confirmation
          </button>
          <ConfirmDialog
            open={open}
            title="Quitter"
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </>
      );
    }

    render(<Harness />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", {
      name: "Ouvrir la confirmation",
    });

    await user.click(opener);
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("renders the extra action after the confirm action", async () => {
    const onExtra = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Modifications non enregistrées"
        cancelLabel="Rester"
        confirmLabel="Quitter sans enregistrer"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        extraAction={{ label: "Enregistrer et quitter", onClick: onExtra }}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const labels = buttons
      .map((button) => button.textContent)
      .filter((label) => label !== "");
    expect(labels).toEqual([
      "Rester",
      "Quitter sans enregistrer",
      "Enregistrer et quitter",
    ]);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Enregistrer et quitter" }));
    expect(onExtra).toHaveBeenCalledTimes(1);
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
