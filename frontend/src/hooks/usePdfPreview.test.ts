import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePdfPreview } from "./usePdfPreview";

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

beforeEach(() => {
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
  let sequence = 0;
  createObjectURL.mockImplementation(() => {
    sequence += 1;
    return `blob:apercu-${sequence}`;
  });
  Object.defineProperty(URL, "createObjectURL", {
    value: createObjectURL,
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revokeObjectURL,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePdfPreview", () => {
  it("loads the preview after the debounce and exposes the blob URL", async () => {
    const load = vi.fn().mockResolvedValue({
      blob: new Blob(["pdf"]),
      fileName: "quittance.pdf",
    });

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature-1", { debounceMs: 0 }),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.url).toBe("blob:apercu-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.updatedAt).toBeInstanceOf(Date);
    expect(load).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("keeps the previous preview when the signature changes", async () => {
    const load = vi.fn().mockResolvedValue({
      blob: new Blob(["pdf"]),
      fileName: null,
    });

    const { result, rerender } = renderHook(
      ({ signature }) => usePdfPreview(load, signature, { debounceMs: 0 }),
      { initialProps: { signature: "one" } },
    );

    await waitFor(() => expect(result.current.url).toBe("blob:apercu-1"));

    rerender({ signature: "two" });
    await waitFor(() => expect(result.current.url).toBe("blob:apercu-2"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:apercu-1");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("surfaces the French error message when the load fails", async () => {
    const load = vi.fn().mockRejectedValue(new Error("Service indisponible"));

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0 }),
    );

    await waitFor(() =>
      expect(result.current.error).toBe("Service indisponible"),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.url).toBeNull();
  });

  it("ignores an aborted load", async () => {
    const load = vi
      .fn()
      .mockRejectedValue(new DOMException("annulé", "AbortError"));

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0 }),
    );

    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current.error).toBeNull();
    expect(result.current.url).toBeNull();
  });

  it("does nothing while inactive and clears the loading flag", () => {
    const load = vi.fn();

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0, active: false }),
    );

    expect(load).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("downloads the last blob under its file name", async () => {
    const load = vi.fn().mockResolvedValue({
      blob: new Blob(["pdf"]),
      fileName: "note-frais.pdf",
    });
    let downloadedName = "";
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download;
      });

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0 }),
    );
    await waitFor(() => expect(result.current.url).not.toBeNull());

    result.current.download();
    expect(click).toHaveBeenCalledTimes(1);
    expect(downloadedName).toBe("note-frais.pdf");

    click.mockRestore();
  });

  it("keeps the default file name when the reply has none and ignores an empty download", async () => {
    const load = vi.fn().mockResolvedValue({
      blob: new Blob(["pdf"]),
      fileName: null,
    });
    let downloadedName = "";
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download;
      });

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0 }),
    );
    await waitFor(() => expect(result.current.url).not.toBeNull());
    result.current.download();
    expect(downloadedName).toBe("apercu.pdf");
    click.mockRestore();
  });

  it("does nothing when downloading without a loaded blob", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const load = vi.fn();

    const { result } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0, active: false }),
    );
    result.current.download();

    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it("revokes the object URL on unmount", async () => {
    const load = vi.fn().mockResolvedValue({
      blob: new Blob(["pdf"]),
      fileName: null,
    });

    const { result, unmount } = renderHook(() =>
      usePdfPreview(load, "signature", { debounceMs: 0 }),
    );
    await waitFor(() => expect(result.current.url).toBe("blob:apercu-1"));

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:apercu-1");
  });
});
