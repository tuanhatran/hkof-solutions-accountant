import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToasts } from "./toasts";

beforeEach(() => {
  vi.useFakeTimers();
  useToasts.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toasts", () => {
  it("adds a toast with the default success type", () => {
    useToasts.getState().add("Document généré.");

    const [entry] = useToasts.getState().toasts;
    expect(entry).toMatchObject({ type: "success", message: "Document généré." });
  });

  it("removes a toast by id", () => {
    useToasts.getState().add("Un", "info");
    useToasts.getState().add("Deux", "error");
    const [first] = useToasts.getState().toasts;

    useToasts.getState().remove(first?.id ?? -1);

    expect(useToasts.getState().toasts).toHaveLength(1);
    expect(useToasts.getState().toasts[0]?.message).toBe("Deux");
  });

  it("removes a toast automatically after five seconds", () => {
    useToasts.getState().add("Temporaire");

    expect(useToasts.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(5_000);
    expect(useToasts.getState().toasts).toHaveLength(0);
  });

  it("exposes the three French feedback helpers", () => {
    toast.success("Succès");
    toast.error("Erreur");
    toast.info("Info");

    expect(useToasts.getState().toasts.map((entry) => entry.type)).toEqual([
      "success",
      "error",
      "info",
    ]);
  });
});
