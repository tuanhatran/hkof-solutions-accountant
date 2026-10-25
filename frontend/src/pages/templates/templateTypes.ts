import { FileText, ReceiptText } from "lucide-react";
import type { TemplateType } from "@/api/types";

export const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024;

export interface ConfigurationType {
  type: TemplateType;
  title: string;
  description: string;
  dataCy: string;
  icon: typeof FileText;
}

export const RENT_RECEIPT_CONFIGURATION: ConfigurationType = {
  type: "RENT_RECEIPT",
  title: "Quittance de loyer",
  description: "Modèle utilisé pour les quittances mensuelles.",
  dataCy: "dropzone-template-quittance",
  icon: ReceiptText,
};

export const EXPENSE_STATEMENT_CONFIGURATION: ConfigurationType = {
  type: "EXPENSE_STATEMENT",
  title: "Note de frais d’occupation",
  description:
    "Modèle utilisé pour les notes de frais et leur version complète.",
  dataCy: "dropzone-template-note",
  icon: FileText,
};

export function downloadFileName(
  name: string | undefined,
  version: number | undefined,
): string {
  const base = (name ?? "template")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "template"}_v${version ?? 1}.html`;
}
