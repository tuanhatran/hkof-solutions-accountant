import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldGroup } from "./FieldGroup";

describe("FieldGroup", () => {
  it("describes the nested input with the hint id", () => {
    render(
      <FieldGroup id="montant" label="Montant" help="Saisissez le montant TTC.">
        <div>
          <input id="montant" />
        </div>
      </FieldGroup>,
    );

    const input = screen.getByLabelText("Montant");
    expect(input).toHaveAttribute("aria-describedby", "montant-hint");
    expect(screen.getByText("Saisissez le montant TTC.")).toHaveAttribute(
      "id",
      "montant-hint",
    );
  });

  it("describes the control with the error id when an error is shown", () => {
    render(
      <FieldGroup
        id="montant"
        label="Montant"
        help="Saisissez le montant TTC."
        error="Montant invalide."
      >
        <select id="montant" />
      </FieldGroup>,
    );

    const select = screen.getByLabelText("Montant");
    expect(select).toHaveAttribute("aria-describedby", "montant-error");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "montant-error");
  });

  it("appends the described id to an existing aria-describedby without duplicates", () => {
    const first = render(
      <FieldGroup id="montant" label="Montant" help="Saisissez le montant TTC.">
        <div>
          <textarea id="montant" aria-describedby="externe" />
        </div>
      </FieldGroup>,
    );

    const textarea = screen.getByLabelText("Montant");
    expect(textarea).toHaveAttribute(
      "aria-describedby",
      "externe montant-hint",
    );
    first.unmount();

    render(
      <FieldGroup id="montant" label="Montant" help="Saisissez le montant TTC.">
        <textarea id="montant" aria-describedby="montant-hint externe" />
      </FieldGroup>,
    );

    expect(screen.getByLabelText("Montant")).toHaveAttribute(
      "aria-describedby",
      "montant-hint externe",
    );
  });

  it("adds no aria-describedby when neither help nor error is present", () => {
    render(
      <FieldGroup id="montant" label="Montant">
        <input id="montant" />
      </FieldGroup>,
    );

    expect(screen.getByLabelText("Montant")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
