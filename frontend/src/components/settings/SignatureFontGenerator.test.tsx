import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import {
  SIGNATURE_FONTS,
  SignatureFontGenerator,
} from "./SignatureFontGenerator";

interface FakeContext {
  font: string;
  fillStyle: string;
  textBaseline: string;
  fillText: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

let context: FakeContext;
const toBlob = vi.fn();
const fontsLoad = vi.fn(() => Promise.resolve([]));
const fontsReady = Promise.resolve();

function pixelData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  data[3] = 255;
  return { data, width, height } as unknown as ImageData;
}

function createContext(): FakeContext {
  return {
    font: "",
    fillStyle: "",
    textBaseline: "",
    fillText: vi.fn(),
    getImageData: vi.fn(
      (_x: number, _y: number, width: number, height: number) =>
        pixelData(width, height),
    ),
    drawImage: vi.fn(),
  };
}

function renderGenerator() {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <SignatureFontGenerator
      open
      onClose={onClose}
      onSubmit={onSubmit}
      pending={false}
    />,
  );
  return { onSubmit, onClose };
}

beforeEach(() => {
  context = createContext();
  toBlob.mockReset();
  fontsLoad.mockClear();
  vi.restoreAllMocks();
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => context),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    value: function toBlobStub(
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      toBlob(this);
      callback(new Blob(["png"], { type: "image/png" }));
    },
  });
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { load: fontsLoad, ready: fontsReady },
  });
});

describe("SignatureFontGenerator", () => {
  it("offers the three cursive styles", () => {
    renderGenerator();

    expect(SIGNATURE_FONTS.map((font) => font.family)).toEqual([
      "Caveat",
      "Dancing Script",
      "Alex Brush",
    ]);
    for (const font of SIGNATURE_FONTS) {
      expect(
        screen.getByRole("radio", { name: font.family }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Caveat" })).toBeChecked();
  });

  it("requires a text before exporting", async () => {
    const { onSubmit } = renderGenerator();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText("Saisissez le texte de la signature."),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("awaits the chosen font and exports a transparent PNG", async () => {
    const { onSubmit } = renderGenerator();
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Texte de la signature"),
      "Jean Dupont",
    );
    await user.click(screen.getByRole("radio", { name: "Dancing Script" }));
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const file = onSubmit.mock.calls[0][0] as File;
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("signature-generee.png");
    expect(onSubmit.mock.calls[0][1]).toBe("Jean Dupont");
    expect(context.fillText).toHaveBeenCalledWith("Jean Dupont", 24, 130);
    expect(context.font).toContain("Dancing Script");
    expect(fontsLoad).toHaveBeenCalledWith(
      expect.stringContaining("Dancing Script"),
    );
  });

  it("degrades to the cursive fallback when the font cannot load", async () => {
    fontsLoad.mockImplementationOnce(() =>
      Promise.reject(new Error("offline")),
    );
    const { onSubmit } = renderGenerator();
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Texte de la signature"),
      "Jean Dupont",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(context.font).toContain("cursive");
  });

  it("uses the English wording", async () => {
    await i18n.changeLanguage("en");
    renderGenerator();

    expect(screen.getByLabelText("Signature text")).toBeVisible();
    expect(screen.getByText("Cursive style")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
  });
});
