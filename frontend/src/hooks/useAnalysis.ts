import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/endpoints";
import { isCancellation } from "@/api/client";
import type { AnalysisDto } from "@/api/types";

const INTERVAL_MS = 1_200;
const MAX_DURATION_MS = 180_000;

export type AnalysisState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "running"; analysisId: number }
  | { status: "done"; analysis: AnalysisDto }
  | { status: "failed"; message: string }
  | { status: "cancelled"; message: string };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isAnalysisRunning(state: AnalysisState): boolean {
  return state.status === "starting" || state.status === "running";
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const analysisIdRef = useRef<number | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    return () => {
      mountRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const start = useCallback(async (receiptId: number) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    analysisIdRef.current = null;
    setState({ status: "starting" });

    try {
      const launch = await api.analyses.start(receiptId);
      if (controller.signal.aborted || !mountRef.current) {
        return;
      }
      const analysisId = launch.analysisId;
      if (!analysisId) {
        throw new Error("L'analyse n'a pas pu démarrer.");
      }
      analysisIdRef.current = analysisId;
      setState({ status: "running", analysisId });

      const startedAt = Date.now();
      while (
        !controller.signal.aborted &&
        Date.now() - startedAt < MAX_DURATION_MS
      ) {
        const analysis = await api.analyses.get(analysisId, controller.signal);
        if (controller.signal.aborted || !mountRef.current) {
          return;
        }
        if (analysis.status === "DONE") {
          setState({ status: "done", analysis });
          return;
        }
        if (analysis.status === "FAILED") {
          setState({
            status: "failed",
            message:
              analysis.errorMessage ||
              "L'analyse a échoué. Saisissez le montant manuellement.",
          });
          return;
        }
        if (analysis.status === "CANCELLED") {
          setState({ status: "cancelled", message: "Analyse annulée." });
          return;
        }
        await wait(INTERVAL_MS);
      }
      if (!controller.signal.aborted && mountRef.current) {
        setState({
          status: "failed",
          message:
            "L'analyse prend trop de temps. Saisissez le montant manuellement.",
        });
      }
    } catch (error) {
      if (
        isCancellation(error) ||
        controller.signal.aborted ||
        !mountRef.current
      ) {
        return;
      }
      setState({
        status: "failed",
        message: "Analyse indisponible, saisissez le montant.",
      });
    }
  }, []);

  const cancel = useCallback(async (silent = false) => {
    const analysisId = analysisIdRef.current;
    controllerRef.current?.abort();
    analysisIdRef.current = null;
    if (analysisId !== null) {
      try {
        await api.analyses.cancel(analysisId);
      } catch {
        // The analysis may already be finished: cancellation has no effect.
      }
    }
    if (mountRef.current) {
      setState(
        silent
          ? { status: "idle" }
          : { status: "cancelled", message: "Analyse annulée." },
      );
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    analysisIdRef.current = null;
    setState({ status: "idle" });
  }, []);

  return { state, start, cancel, reset };
}
