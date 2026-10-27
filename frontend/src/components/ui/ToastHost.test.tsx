import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { toast, useToasts } from "@/state/toasts";
import { ToastHost } from "./ToastHost";

beforeEach(() => {
  useToasts.setState({ toasts: [] });
});

describe("ToastHost", () => {
  it("renders each toast type with its role and removes it on click", async () => {
    render(<ToastHost />);
    act(() => {
      toast.success("Quittance générée");
      toast.error("Échec de la génération");
      toast.info("Brouillon conservé");
    });

    expect(screen.getByText("Quittance générée")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Échec de la génération",
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses.map((element) => element.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Quittance générée"),
        expect.stringContaining("Brouillon conservé"),
      ]),
    );

    const successToast = screen
      .getByText("Quittance générée")
      .closest('[data-cy="toast-success"]');
    expect(successToast).not.toBeNull();
    await userEvent.setup().click(
      within(successToast as HTMLElement).getByRole("button", {
        name: "Fermer la notification",
      }),
    );
    expect(screen.queryByText("Quittance générée")).toBeNull();
    expect(useToasts.getState().toasts).toHaveLength(2);
  });

  it("translates the close label into English", async () => {
    await i18n.changeLanguage("en");
    render(<ToastHost />);
    act(() => {
      toast.info("Draft kept");
    });

    expect(
      screen.getByRole("button", { name: "Close notification" }),
    ).toBeVisible();
  });

  it("renders nothing without toasts", () => {
    const { container } = render(<ToastHost />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
