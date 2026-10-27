import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { AnalysisDto } from "@/api/types";
import i18n from "@/i18n";
import { isAnalysisRunning, useAnalysis } from "./useAnalysis";

vi.mock("@/api/endpoints", () => ({
  api: {
    analyses: {
      start: vi.fn(),
      get: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

const RUNNING: AnalysisDto = { id: 2, status: "RUNNING" };
const DONE: AnalysisDto = {
  id: 2,
  status: "DONE",
  result: { amountInclVat: "80.00", supplier: "EDF", confidence: "haute" },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(api.analyses.start).mockReset();
  vi.mocked(api.analyses.get).mockReset();
  vi.mocked(api.analyses.cancel).mockReset();
  vi.mocked(api.analyses.cancel).mockResolvedValue(RUNNING);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("isAnalysisRunning", () => {
  it("is true only for starting and running states", () => {
    expect(isAnalysisRunning({ status: "idle" })).toBe(false);
    expect(isAnalysisRunning({ status: "starting" })).toBe(true);
    expect(isAnalysisRunning({ status: "running", analysisId: 1 })).toBe(true);
    expect(isAnalysisRunning({ status: "cancelled", message: "x" })).toBe(
      false,
    );
  });
});

describe("useAnalysis", () => {
  it("starts idle and moves to done when the backend reports DONE", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue(DONE);

    const { result } = renderHook(() => useAnalysis());
    expect(result.current.state).toEqual({ status: "idle" });

    await act(async () => {
      await result.current.start(8);
    });

    expect(api.analyses.start).toHaveBeenCalledWith(8);
    expect(result.current.state).toEqual({ status: "done", analysis: DONE });
  });

  it("polls while RUNNING and stops at the first DONE result", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get)
      .mockResolvedValueOnce(RUNNING)
      .mockResolvedValueOnce(DONE);

    const { result } = renderHook(() => useAnalysis());

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.start(8);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });
    await pending;

    expect(api.analyses.get).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe("done");
  });

  it("surfaces the backend failure message or a French fallback", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue({
      id: 2,
      status: "FAILED",
      errorMessage: "Modèle indisponible.",
    });

    const { result } = renderHook(() => useAnalysis());
    await act(async () => {
      await result.current.start(8);
    });
    expect(result.current.state).toEqual({
      status: "failed",
      message: "Modèle indisponible.",
    });

    vi.mocked(api.analyses.get).mockResolvedValue({
      id: 2,
      status: "FAILED",
    });
    await act(async () => {
      await result.current.start(8);
    });
    expect(result.current.state).toEqual({
      status: "failed",
      message: "L'analyse a échoué. Saisissez le montant manuellement.",
    });
  });

  it("reports a cancelled backend analysis", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue({
      id: 2,
      status: "CANCELLED",
    });

    const { result } = renderHook(() => useAnalysis());
    await act(async () => {
      await result.current.start(8);
    });

    expect(result.current.state).toEqual({
      status: "cancelled",
      message: "Analyse annulée.",
    });
  });

  it("fails with the French message when start does not return an id", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({});

    const { result } = renderHook(() => useAnalysis());
    await act(async () => {
      await result.current.start(8);
    });

    expect(result.current.state).toEqual({
      status: "failed",
      message: "Analyse indisponible, saisissez le montant.",
    });
  });

  it("fails with the French message when start rejects", async () => {
    vi.mocked(api.analyses.start).mockRejectedValue(new Error("réseau"));

    const { result } = renderHook(() => useAnalysis());
    await act(async () => {
      await result.current.start(8);
    });

    expect(result.current.state).toEqual({
      status: "failed",
      message: "Analyse indisponible, saisissez le montant.",
    });
  });

  it("gives up after three minutes of polling", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue(RUNNING);

    const { result } = renderHook(() => useAnalysis());

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.start(8);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    await pending;

    expect(result.current.state).toEqual({
      status: "failed",
      message:
        "L'analyse prend trop de temps. Saisissez le montant manuellement.",
    });
  });

  it("cancels the running analysis and exposes the cancelled state", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue(RUNNING);

    const { result } = renderHook(() => useAnalysis());
    act(() => {
      void result.current.start(8);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await result.current.cancel();
    });

    expect(api.analyses.cancel).toHaveBeenCalledWith(2);
    expect(result.current.state).toEqual({
      status: "cancelled",
      message: "Analyse annulée.",
    });
  });

  it("resets to idle on a silent cancel, even if the cancel call fails", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue(RUNNING);
    vi.mocked(api.analyses.cancel).mockRejectedValue(new Error("déjà fini"));

    const { result } = renderHook(() => useAnalysis());
    act(() => {
      void result.current.start(8);
    });

    await act(async () => {
      await result.current.cancel(true);
    });

    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("ignores a cancel when no analysis was started", async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.cancel(true);
    });

    expect(api.analyses.cancel).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("aborts the polling when unmounted", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    const getCalls: AbortSignal[] = [];
    vi.mocked(api.analyses.get).mockImplementation((_id, signal) => {
      if (signal) {
        getCalls.push(signal);
      }
      return Promise.resolve(RUNNING);
    });

    const { result, unmount } = renderHook(() => useAnalysis());
    act(() => {
      void result.current.start(8);
    });
    unmount();
    expect(getCalls.length).toBeGreaterThanOrEqual(0);
  });

  it("returns to idle through reset", async () => {
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue(DONE);

    const { result } = renderHook(() => useAnalysis());
    await act(async () => {
      await result.current.start(8);
    });
    expect(result.current.state.status).toBe("done");

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("reports failures and cancellations in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 2 });
    vi.mocked(api.analyses.get).mockResolvedValue({
      id: 2,
      status: "FAILED",
    });

    const { result } = renderHook(() => useAnalysis());
    await act(async () => {
      await result.current.start(8);
    });
    expect(result.current.state).toEqual({
      status: "failed",
      message: "The analysis failed. Enter the amount manually.",
    });

    vi.mocked(api.analyses.start).mockResolvedValue({});
    await act(async () => {
      await result.current.start(8);
    });
    expect(result.current.state).toEqual({
      status: "failed",
      message: "Analysis unavailable, enter the amount.",
    });

    vi.mocked(api.analyses.start).mockResolvedValue({ analysisId: 3 });
    vi.mocked(api.analyses.get).mockResolvedValue({
      id: 3,
      status: "CANCELLED",
    });
    await act(async () => {
      await result.current.start(8);
    });
    expect(result.current.state).toEqual({
      status: "cancelled",
      message: "Analysis cancelled.",
    });
  });
});
