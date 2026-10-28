import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthField } from "@/components/ui/MonthField";

describe("MonthField", () => {
  it("names the native month input without repeating the month on screen", () => {
    render(
      <MonthField
        id="mois"
        label="Mois concerné"
        value="2026-01"
        onChange={vi.fn()}
        dataCy="select-mois"
      />,
    );

    const input = screen.getByLabelText("Mois concerné");
    expect(input).toHaveAttribute("type", "month");
    expect(input).toHaveAttribute("data-cy", "select-mois");
    expect(input).toHaveValue("2026-01");
    expect(screen.queryByText("Mois concerné")).toBeNull();
    expect(screen.queryByText("Janvier 2026")).toBeNull();
    expect(document.querySelector("label")).toBeNull();
  });

  it("renders no month echo when no month is selected", () => {
    render(<MonthField id="mois" label="Mois" value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Mois")).toHaveValue("");
    expect(screen.queryByText("—")).toBeNull();
  });

  it("composes inputProps.onChange before forwarding the native value", () => {
    const onChange = vi.fn();
    const inputOnChange = vi.fn();
    const onBlur = vi.fn();
    render(
      <MonthField
        id="mois"
        label="Mois"
        value="2026-01"
        onChange={onChange}
        inputProps={{ name: "month", onChange: inputOnChange, onBlur }}
      />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("Mois");
    expect(input).toHaveAttribute("name", "month");

    fireEvent.change(input, { target: { value: "2026-02" } });

    expect(inputOnChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("2026-02");

    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("wires the error to an alert and to the input aria attributes", () => {
    render(
      <MonthField
        id="mois"
        label="Mois"
        value=""
        onChange={vi.fn()}
        error="Choisissez un mois valide."
      />,
    );

    const input = screen.getByLabelText("Mois");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Choisissez un mois valide.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("renders the optional help when there is no error", () => {
    render(
      <MonthField
        id="mois"
        label="Mois"
        value="2026-01"
        onChange={vi.fn()}
        help="La période se déduit du mois choisi."
      />,
    );

    const input = screen.getByLabelText("Mois");
    expect(input).toHaveAttribute("aria-invalid", "false");
    const help = screen.getByText("La période se déduit du mois choisi.");
    expect(input.getAttribute("aria-describedby")).toBe(help.id);
  });
});
