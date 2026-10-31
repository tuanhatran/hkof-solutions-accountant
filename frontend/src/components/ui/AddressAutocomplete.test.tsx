import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";

function ControlledWrapper({
  initialValue = "",
  onChangeSpy,
}: {
  initialValue?: string;
  onChangeSpy?: (val: string) => void;
}) {
  const [val, setVal] = useState(initialValue);
  return (
    <AddressAutocomplete
      id="test-address"
      value={val}
      onChange={(next) => {
        setVal(next);
        onChangeSpy?.(next);
      }}
      placeholder="Entrez une adresse"
    />
  );
}

const MOCK_API_RESPONSE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [2.35, 48.85] },
      properties: {
        id: "addr-1",
        label: "10 Rue de la Paix 75002 Paris",
        name: "10 Rue de la Paix",
        postcode: "75002",
        city: "Paris",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [2.36, 48.86] },
      properties: {
        id: "addr-2",
        label: "10 Rue de la Paix 69000 Lyon",
        name: "10 Rue de la Paix",
        postcode: "69000",
        city: "Lyon",
      },
    },
  ],
};

describe("AddressAutocomplete", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => MOCK_API_RESPONSE,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders input with accessible combobox attributes", () => {
    render(<AddressAutocomplete id="addr" value="" onChange={vi.fn()} />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("id", "addr");
  });

  it("updates value immediately on typing (freeform fallback)", () => {
    const onChange = vi.fn();
    render(<ControlledWrapper onChangeSpy={onChange} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "123 Rue Inconnue" } });

    expect(onChange).toHaveBeenCalledWith("123 Rue Inconnue");
    expect(input).toHaveValue("123 Rue Inconnue");
  });

  it("debounces fetch by 300ms before querying api-adresse.data.gouv.fr", async () => {
    render(<ControlledWrapper />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "10 Rue de" } });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "https://api-adresse.data.gouv.fr/search/?q=10%20Rue%20de&limit=5",
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      },
      { timeout: 1000 },
    );
  });

  it("shows suggestions and allows selecting an address with click", async () => {
    const onChange = vi.fn();
    render(<ControlledWrapper onChangeSpy={onChange} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "10 Rue de la Paix" } });

    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "true");

    const option1 = screen.getByText("10 Rue de la Paix 75002 Paris");
    expect(option1).toBeInTheDocument();

    fireEvent.mouseDown(option1);

    expect(onChange).toHaveBeenLastCalledWith("10 Rue de la Paix 75002 Paris");
    expect(input).toHaveValue("10 Rue de la Paix 75002 Paris");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates suggestions with ArrowDown / ArrowUp and selects on Enter", async () => {
    const onChange = vi.fn();
    render(<ControlledWrapper onChangeSpy={onChange} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "10 Rue" } });

    await screen.findByRole("listbox");

    // ArrowDown highlights first option
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // ArrowDown highlights second option
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    // Enter selects highlighted option
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("10 Rue de la Paix 69000 Lyon");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes suggestions dropdown when pressing Escape", async () => {
    render(<ControlledWrapper />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "10 Rue" } });

    await screen.findByRole("listbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("handles network failure gracefully without crashing and allows typing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network Error"));
    const onChange = vi.fn();
    render(<ControlledWrapper onChangeSpy={onChange} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "15 Rue Invalide" } });

    // Wait 400ms for debounced fetch to fail
    await new Promise((r) => setTimeout(r, 400));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("15 Rue Invalide");
    expect(onChange).toHaveBeenCalledWith("15 Rue Invalide");
  });

  it("handles HTTP error status gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    render(<ControlledWrapper />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "10 Rue de la Paix" } });
    await new Promise((r) => setTimeout(r, 400));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears suggestions when query is shorter than 3 characters", async () => {
    render(<ControlledWrapper />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "10 Rue" } });
    await screen.findByRole("listbox");

    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("re-opens suggestions on focus and calls onBlur callback", async () => {
    const onBlur = vi.fn();
    render(
      <AddressAutocomplete
        id="addr"
        value="10 Rue"
        onChange={vi.fn()}
        onBlur={onBlur}
      />,
    );
    const input = screen.getByRole("combobox");

    // Fetch initial suggestions
    await screen.findByRole("listbox");

    // Escape closes list
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // ArrowDown re-opens list
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // Blur closes after delay and calls onBlur
    fireEvent.blur(input);
    await new Promise((r) => setTimeout(r, 200));
    expect(onBlur).toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // Focus re-opens if suggestions present
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("keeps the list closed when the input is blurred before the response arrives", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    vi.mocked(globalThis.fetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<ControlledWrapper initialValue="10 Rue de la Paix" />);
    const input = screen.getByRole("combobox");

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1), {
      timeout: 1000,
    });
    fireEvent.blur(input);
    resolveFetch({
      ok: true,
      json: async () => MOCK_API_RESPONSE,
    } as Response);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("10 Rue de la Paix");
  });
});
