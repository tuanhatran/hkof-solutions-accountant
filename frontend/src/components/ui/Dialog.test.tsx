import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";

function renderDialog(overrides: Partial<Parameters<typeof Dialog>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <Dialog
      open
      title="Frais du bail"
      onClose={onClose}
      dataCy="dialog-expense"
      {...overrides}
    >
      <button type="button">Ajouter un poste</button>
    </Dialog>,
  );
  return { onClose };
}

describe("Dialog", () => {
  it("renders the accessible chrome, focuses the panel and closes with the close button", async () => {
    const { onClose } = renderDialog();
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-cy", "dialog-expense");
    expect(
      screen.getByRole("heading", { name: "Frais du bail" }),
    ).toBeVisible();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(
      screen.getByRole("button", { name: "Ajouter un poste" }),
    ).toBeVisible();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("translates the close label into English", async () => {
    await i18n.changeLanguage("en");
    renderDialog();

    expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
  });

  it("closes once on Escape or the backdrop but not inside the panel", () => {
    const { onClose } = renderDialog();
    const dialog = screen.getByRole("dialog");

    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps Tab and Shift+Tab inside the panel", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Hors dialogue</button>
        <Dialog open title="Frais" onClose={vi.fn()} dataCy="dialog-expense">
          <button type="button">Premier</button>
          <button type="button">Dernier</button>
        </Dialog>
      </>,
    );

    const dialog = screen.getByRole("dialog");
    const outside = screen.getByRole("button", { name: "Hors dialogue" });
    const first = screen.getByRole("button", { name: "Premier" });
    const last = screen.getByRole("button", { name: "Dernier" });
    const close = screen.getByRole("button", { name: "Fermer" });

    await user.click(first);
    expect(first).toHaveFocus();
    await user.tab();
    expect(last).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    expect(outside).not.toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("restores focus to the opener once the dialog closes", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Ouvrir les frais
          </button>
          <Dialog
            open={open}
            title="Frais"
            onClose={() => setOpen(false)}
            dataCy="dialog-expense"
          >
            <button type="button">Annuler</button>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "Ouvrir les frais" });

    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("leaves Escape to a stacked dialog above it", () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    render(
      <>
        <Dialog open title="Frais" onClose={onClose} dataCy="dialog-expense">
          <button type="button">Interne</button>
        </Dialog>
        <ConfirmDialog
          open
          title="Retirer ce poste ?"
          onConfirm={vi.fn()}
          onCancel={onCancel}
          dataCy="dialog-delete-item"
        />
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders nothing when closed and cleans the key listener", () => {
    const onClose = vi.fn();
    const { container, rerender } = render(
      <Dialog
        open={false}
        title="Frais"
        onClose={onClose}
        dataCy="dialog-expense"
      >
        <button type="button">Interne</button>
      </Dialog>,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <Dialog open title="Frais" onClose={onClose} dataCy="dialog-expense">
        <button type="button">Interne</button>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    rerender(
      <Dialog
        open={false}
        title="Frais"
        onClose={onClose}
        dataCy="dialog-expense"
      >
        <button type="button">Interne</button>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
