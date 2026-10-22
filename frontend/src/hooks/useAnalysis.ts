import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/endpoints";
import { isCancellation } from "@/api/client";
import type { AnalysisDto } from "@/api/types";

const INTERVAL_MS = 1_200;
const MAX_DURATION_MS = 180_000;

export type AnalysisState =
  | { statut: "inactif" }
  | { statut: "demarrage" }
  | { statut: "en_cours"; analyseId: number }
  | { statut: "terminee"; analyse: AnalysisDto }
  | { statut: "echec"; message: string }
  | { statut: "annulee"; message: string };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isAnalysisRunning(phase: AnalysisState): boolean {
  return phase.statut === "demarrage" || phase.statut === "en_cours";
}

export function useAnalysis() {
  const [phase, setEtat] = useState<AnalysisState>({ statut: "inactif" });
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
    setEtat({ statut: "demarrage" });

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
      setEtat({ statut: "en_cours", analyseId: analysisId });

      const start = Date.now();
      while (
        !controller.signal.aborted &&
        Date.now() - start < MAX_DURATION_MS
      ) {
        const analysis = await api.analyses.get(analysisId, controller.signal);
        if (controller.signal.aborted || !mountRef.current) {
          return;
        }
        if (analysis.status === "DONE") {
          setEtat({ statut: "terminee", analyse: analysis });
          return;
        }
        if (analysis.status === "FAILED") {
          setEtat({
            statut: "echec",
            message:
              analysis.errorMessage ||
              "L'analyse a échoué. Saisissez le montant manuellement.",
          });
          return;
        }
        if (analysis.status === "CANCELLED") {
          setEtat({ statut: "annulee", message: "Analyse annulée." });
          return;
        }
        await wait(INTERVAL_MS);
      }
      if (!controller.signal.aborted && mountRef.current) {
        setEtat({
          statut: "echec",
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
      setEtat({
        statut: "echec",
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
      setEtat(
        silent
          ? { statut: "inactif" }
          : { statut: "annulee", message: "Analyse annulée." },
      );
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    controllerRef.current?.abort();
    analysisIdRef.current = null;
    setEtat({ statut: "inactif" });
  }, []);

  return {
    etat: phase,
    demarrer: start,
    annuler: cancel,
    reinitialiser: resetAnalysis,
  };
}
