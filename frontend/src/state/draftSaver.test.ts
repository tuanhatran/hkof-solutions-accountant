import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDraftSaver,
  saveActiveDraft,
  setDraftSaver,
  useDraftSaver,
} from "./draftSaver";

afterEach(() => {
  setDraftSaver(null);
});

describe("draftSaver", () => {
  it("returns false when no page registered a saver", async () => {
    await expect(saveActiveDraft()).resolves.toBe(false);
  });

  it("runs the registered saver and returns its result", async () => {
    const saver = vi.fn().mockResolvedValue(true);
    setDraftSaver(saver);

    await expect(saveActiveDraft()).resolves.toBe(true);
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it("propagates a failed save", async () => {
    setDraftSaver(vi.fn().mockResolvedValue(false));

    await expect(saveActiveDraft()).resolves.toBe(false);
  });

  it("runs only the saver of the mounted page when several pages register", async () => {
    const rentSaver = vi.fn().mockResolvedValue(true);
    const statementSaver = vi.fn().mockResolvedValue(true);
    renderHook(() => useDraftSaver(rentSaver));
    renderHook(() => useDraftSaver(statementSaver));

    await act(async () => {
      await saveActiveDraft();
    });

    expect(statementSaver).toHaveBeenCalledTimes(1);
    expect(rentSaver).not.toHaveBeenCalled();
  });

  it("keeps the registry clean after the owner unregisters", async () => {
    const saver = vi.fn().mockResolvedValue(true);
    setDraftSaver(saver);
    clearDraftSaver(saver);

    await expect(saveActiveDraft()).resolves.toBe(false);
    expect(saver).not.toHaveBeenCalled();
  });

  it("registers the latest save callback through the hook and clears it on unmount", async () => {
    const first = vi.fn().mockResolvedValue(true);
    const second = vi.fn().mockResolvedValue(true);
    const { rerender, unmount } = renderHook(
      ({ save }: { save: () => Promise<boolean> }) => useDraftSaver(save),
      { initialProps: { save: first } },
    );

    await act(async () => {
      await saveActiveDraft();
    });
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ save: second });
    await act(async () => {
      await saveActiveDraft();
    });
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    await expect(saveActiveDraft()).resolves.toBe(false);
  });
});
