import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import i18n from "@/i18n";

beforeEach(async () => {
  localStorage.clear();
  // Default network stub: no unit test may reach the real address API.
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  } as Response);
  await i18n.changeLanguage("fr");
});

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (request: string) =>
    ({
      matches: false,
      media: request,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverTest {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverTest as unknown as typeof ResizeObserver;
}

if (
  typeof window !== "undefined" &&
  !window.HTMLElement.prototype.scrollIntoView
) {
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
}
