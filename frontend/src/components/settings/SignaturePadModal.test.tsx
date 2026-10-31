import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contentBounds, SignaturePadModal } from "./SignaturePadModal";

interface FakeContext {
  setTransform: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  strokeStyle: string;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
}

function pixelData(
  width: number,
  height: number,
  opaque: Array<[number, number]> = [],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of opaque) {
    const offset = (y * width + x) * 4;
    data[offset] = 28;
    data[offset + 1] = 37;
    data[offset + 2] = 46;
    data[offset + 3] = 255;
  }
  return { data, width, height } as unknown as ImageData;
}

let context: FakeContext;
const toBlob = vi.fn();

function createContext(): FakeContext {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(
      (_x: number, _y: number, width: number, height: number) =>
        pixelData(width, height),
    ),
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
  };
}

function renderPad() {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <SignaturePadModal
      open
      onClose={onClose}
      onSubmit={onSubmit}
      pending={false}
    />,
  );
  return { onSubmit, onClose };
}

function canvasElement(): HTMLCanvasElement {
  return screen.getByLabelText(
    "Zone de dessin de la signature",
  ) as HTMLCanvasElement;
}

function stroke(element: HTMLCanvasElement) {
  fireEvent.pointerDown(element, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: 80, clientY: 60 });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: 80, clientY: 60 });
}

beforeEach(() => {
  context = createContext();
  toBlob.mockReset();
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
  vi.spyOn(
    HTMLCanvasElement.prototype,
    "getBoundingClientRect",
  ).mockReturnValue({
    width: 480,
    height: 200,
    top: 0,
    left: 0,
    right: 480,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 1,
  });
});

describe("contentBounds", () => {
  it("returns the bounding box of the opaque pixels", () => {
    const data = new Uint8ClampedArray(10 * 10 * 4);
    data[(3 * 10 + 2) * 4 + 3] = 255;
    data[(7 * 10 + 5) * 4 + 3] = 255;
    expect(contentBounds(data, 10, 10)).toEqual({
      x: 2,
      y: 3,
      width: 4,
      height: 5,
    });
  });

  it("returns null for a fully transparent buffer", () => {
    expect(
      contentBounds(new Uint8ClampedArray(10 * 10 * 4), 10, 10),
    ).toBeNull();
  });
});

describe("SignaturePadModal", () => {
  it("scales the canvas with the device pixel ratio", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    renderPad();

    const canvas = canvasElement();
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(400);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it("rejects a blank canvas with a French error and saves nothing", async () => {
    const { onSubmit } = renderPad();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText(
        "La zone de dessin est vide. Tracez votre signature avant de valider.",
      ),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("draws with pointer events and exports a trimmed transparent PNG", async () => {
    context.getImageData.mockImplementation(
      (_x: number, _y: number, width: number, height: number) =>
        pixelData(width, height, [
          [10, 10],
          [12, 14],
        ]),
    );
    const { onSubmit } = renderPad();
    const user = userEvent.setup();
    const canvas = canvasElement();

    stroke(canvas);
    expect(context.moveTo).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.strokeStyle).toBe("#1c252e");

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const file = onSubmit.mock.calls[0][0] as File;
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("signature-dessinee.png");

    const trimmed = toBlob.mock.calls[0][0] as HTMLCanvasElement;
    expect(trimmed.width).toBe(3);
    expect(trimmed.height).toBe(5);
    expect(context.drawImage).toHaveBeenCalled();
  });

  it("clears the drawing and refuses the empty canvas", async () => {
    const { onSubmit } = renderPad();
    const user = userEvent.setup();
    const canvas = canvasElement();

    stroke(canvas);
    await user.click(screen.getByRole("button", { name: "Effacer" }));
    expect(context.clearRect).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText(
        "La zone de dessin est vide. Tracez votre signature avant de valider.",
      ),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the French wording in English mode", async () => {
    const i18n = (await import("@/i18n")).default;
    await i18n.changeLanguage("en");
    renderPad();

    expect(
      screen.getByRole("dialog", { name: "Draw a signature" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Clear" })).toBeVisible();
  });
});
