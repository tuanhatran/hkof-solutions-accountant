import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProRataInput } from "./ProRataInput";

describe("ProRataInput", () => {
  it("keeps the intermediate empty value out of the draft and commits the typed percentage", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ProRataInput label="Prorata de Gaz" value="35.71" onChange={onChange} />,
    );
    const input = screen.getByLabelText("Prorata de Gaz");

    await user.clear(input);

    expect(input).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();

    await user.type(input, "50");

    expect(input).toHaveValue("50");
    expect(onChange).toHaveBeenLastCalledWith("50");
    expect(onChange).not.toHaveBeenCalledWith("");
  });

  it("restores the last valid value when the field loses focus while empty", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ProRataInput label="Prorata de Gaz" value="35.71" onChange={onChange} />,
    );
    const input = screen.getByLabelText("Prorata de Gaz");

    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue("35.71");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("normalizes the typed percentage on blur", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ProRataInput label="Prorata de Gaz" value="35.71" onChange={onChange} />,
    );
    const input = screen.getByLabelText("Prorata de Gaz");

    await user.clear(input);
    await user.type(input, "50,0");
    await user.tab();

    expect(input).toHaveValue("50");
    expect(onChange).toHaveBeenLastCalledWith("50");
  });

  it("shows an error state while the value is not a valid percentage", async () => {
    const user = userEvent.setup();
    render(
      <ProRataInput label="Prorata de Gaz" value="35.71" onChange={vi.fn()} />,
    );
    const input = screen.getByLabelText("Prorata de Gaz");

    expect(input).toHaveAttribute("aria-invalid", "false");

    await user.clear(input);

    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
