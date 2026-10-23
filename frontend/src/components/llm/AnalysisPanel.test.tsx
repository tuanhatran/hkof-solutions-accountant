import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisState } from "@/hooks/useAnalysis";
import { AnalysisPanel } from "./AnalysisPanel";

const DONE: AnalysisState = {
  status: "done",
  analysis: {
    id: 1,
    durationMs: 2400,
    result: {
      supplier: "EDF",
      amountInclVat: "42.00",
      sourceExcerpt: "TOTAL TTC 42,00",
      confidence: "haute",
    },
  },
};

describe("AnalysisPanel", () => {
  it("explains that a file triggers the optional analysis", () => {
    const { rerender } = render(
      <AnalysisPanel state={{ status: "idle" }} hasFile onCancel={vi.fn()} />,
    );
    expect(
      screen.getByText(
        "Analyse non lancée. Vous pouvez saisir le frais manuellement.",
      ),
    ).toBeVisible();

    rerender(
      <AnalysisPanel state={{ status: "idle" }} hasFile={false} onCancel={vi.fn()} />,
    );
    expect(
      screen.getByText(
        "Déposez un justificatif : l’analyse IA démarrera automatiquement. Elle reste facultative.",
      ),
    ).toBeVisible();
  });

  it.each([
    [{ status: "starting" } as AnalysisState, "Préparation de l’analyse…"],
    [
      { status: "running", analysisId: 3 } as AnalysisState,
      "Analyse IA en cours — le modèle local peut prendre quelques secondes.",
    ],
  ])("shows the progress message and cancels", async (state, message) => {
    const onCancel = vi.fn();
    render(<AnalysisPanel state={state} hasFile onCancel={onCancel} />);

    expect(screen.getByText(message)).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Annuler l’analyse/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("summarises a successful analysis with duration, supplier, confidence and excerpt", () => {
    render(<AnalysisPanel state={DONE} hasFile onCancel={vi.fn()} />);

    expect(
      screen.getByText(/Analyse terminée en 2.4 s/),
    ).toBeVisible();
    expect(screen.getByText("Détecté par IA")).toBeVisible();
    expect(screen.getByText("Fournisseur détecté : EDF")).toBeVisible();
    expect(screen.getByText("Confiance élevée")).toBeVisible();
    expect(screen.getByText("« TOTAL TTC 42,00 »")).toBeVisible();
    expect(
      screen.getByText(
        "Les propositions de l’IA restent modifiables. Vérifiez-les avant d’ajouter le frais.",
      ),
    ).toBeVisible();
  });

  it("handles an analysis without result or duration", () => {
    render(
      <AnalysisPanel
        state={{ status: "done", analysis: { id: 2 } }}
        hasFile
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Analyse terminée —/)).toBeVisible();
    expect(
      screen.getByText(
        "Aucune information exploitable n’a été extraite. Complétez le frais manuellement.",
      ),
    ).toBeVisible();
  });

  it("renders a low confidence and ignores an unknown confidence value", () => {
    const { rerender } = render(
      <AnalysisPanel
        state={{
          status: "done",
          analysis: {
            result: { confidence: "basse", supplier: "" },
          },
        }}
        hasFile
        onCancel={vi.fn()}
      />,
    );
    const low = screen.getByText("Confiance faible — vérifiez les valeurs");
    expect(low.className).toContain("text-warning");
    expect(screen.queryByText(/Fournisseur détecté/)).toBeNull();

    rerender(
      <AnalysisPanel
        state={{ status: "done", analysis: { result: { confidence: "x" } } }}
        hasFile
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Confiance/)).toBeNull();
  });

  it("renders failure and cancellation messages", () => {
    const { rerender } = render(
      <AnalysisPanel
        state={{ status: "failed", message: "Le modèle a échoué." }}
        hasFile
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        /Le modèle a échoué. L’analyse est facultative : vous pouvez saisir le montant et le prorata manuellement./,
      ),
    ).toBeVisible();

    rerender(
      <AnalysisPanel
        state={{ status: "cancelled", message: "Analyse annulée." }}
        hasFile
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Analyse annulée. La saisie manuelle reste disponible."),
    ).toBeVisible();
  });
});
