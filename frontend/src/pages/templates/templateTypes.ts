import { FileText, ReceiptText } from "lucide-react";
import type { TemplateType } from "@/api/types";
import i18n from "@/i18n";

export const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024;

export interface ConfigurationType {
  type: TemplateType;
  readonly title: string;
  readonly description: string;
  dataCy: string;
  icon: typeof FileText;
}

export const RENT_RECEIPT_CONFIGURATION: ConfigurationType = {
  type: "RENT_RECEIPT",
  get title() {
    return i18n.t("templates.types.rentReceipt.title");
  },
  get description() {
    return i18n.t("templates.types.rentReceipt.description");
  },
  dataCy: "dropzone-template-quittance",
  icon: ReceiptText,
};

export const EXPENSE_STATEMENT_CONFIGURATION: ConfigurationType = {
  type: "EXPENSE_STATEMENT",
  get title() {
    return i18n.t("templates.types.expenseStatement.title");
  },
  get description() {
    return i18n.t("templates.types.expenseStatement.description");
  },
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
