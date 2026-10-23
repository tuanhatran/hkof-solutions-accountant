import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

interface Listener {
  matches: boolean;
  change?: (event: MediaQueryListEvent) => void;
}

function stubMatchMedia(initialMatches: boolean) {
  const state: Listener = { matches: initialMatches };
  const addEventListener = vi.fn(
    (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      state.change = listener;
    },
  );
  const removeEventListener = vi.fn();
  const matchMedia = vi.fn((request: string) => ({
    matches: state.matches,
    media: request,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener,
    removeEventListener,
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, "matchMedia", {
    value: matchMedia,
    configurable: true,
    writable: true,
  });
  return { state, addEventListener, removeEventListener, matchMedia };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    value: originalMatchMedia,
    configurable: true,
    writable: true,
  });
});

describe("useMediaQuery", () => {
  it("reads the initial match and follows change events", () => {
    const { state, addEventListener, matchMedia } = stubMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery("(max-width: 1023px)"));
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 1023px)");
    expect(result.current).toBe(false);

    act(() => {
      state.matches = true;
      state.change?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);

    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("removes its listener on unmount", () => {
    const { removeEventListener } = stubMatchMedia(true);

    const { result, unmount } = renderHook(() => useMediaQuery("(min-width: 1px)"));
    expect(result.current).toBe(true);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("returns false when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useMediaQuery("(max-width: 1px)"));
    expect(result.current).toBe(false);
  });

  it("re-registers when the request changes", () => {
    const { matchMedia } = stubMatchMedia(false);

    const { rerender } = renderHook(
      ({ request }) => useMediaQuery(request),
      { initialProps: { request: "(max-width: 1023px)" } },
    );
    rerender({ request: "(min-width: 1024px)" });

    expect(matchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
  });
});
