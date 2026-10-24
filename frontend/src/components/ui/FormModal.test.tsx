import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormModal } from "./FormModal";

function renderModal(overrides: Partial<Parameters<typeof FormModal>[0]> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <FormModal
      open
      title="Ajouter un bail"
      onClose={onClose}
      onSubmit={onSubmit}
      formDataCy="formulaire-bail"
      submitDataCy="btn-enregistrer-bail"
      {...overrides}
    >
      <label htmlFor="champ-test">Nom du bail</label>
      <input id="champ-test" />
    </FormModal>,
  );
  return { onClose, onSubmit };
}

describe("FormModal", () => {
  it("renders a modal dialog with its title, fields and footer", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "Ajouter un bail" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(screen.getByLabelText("Nom du bail"));
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider" })).toHaveAttribute(
      "data-cy",
      "btn-enregistrer-bail",
    );
    expect(screen.getByRole("form")).toHaveAttribute(
      "data-cy",
      "formulaire-bail",
    );
    expect(dialog).toHaveFocus();
  });

  it("submits the form with Valider and Enter, without closing", async () => {
    const { onClose, onSubmit } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Nom du bail"), "{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("closes on Escape, on Annuler and on an overlay click", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.click(document.querySelector(".form-modal-overlay") as Element);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("keeps the dialog open on an inner click and shows request errors", async () => {
    const { onClose } = renderModal({ error: "Bail refusé." });
    const user = userEvent.setup();

    await user.click(screen.getByText("Bail refusé."));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Bail refusé.");
  });

  it("disables the footer while the request is pending", () => {
    renderModal({ pending: true });

    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Valider" })).toBeDisabled();
  });

  it("renders nothing when closed", () => {
    renderModal({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
