import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clipboard,
  Download,
  Eye,
  FileCode2,
  FileText,
  Info,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { errorMessage, downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useTemplates, useTemplateVariables } from "@/api/queries";
import type {
  ValidationReportDto,
  TemplateDto,
  TemplateType,
} from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingState, ErrorState } from "@/components/States";
import {
  SelectedFile,
  FileDropzone,
  TEMPLATE_FORMATS,
} from "@/components/FileDropzone";
import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/state/toasts";

const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024;

interface ConfigurationType {
  type: TemplateType;
  title: string;
  description: string;
  dataCy: string;
  icon: typeof FileText;
}

const TYPES: ConfigurationType[] = [
  {
    type: "RENT_RECEIPT",
    title: "Quittance de loyer",
    description: "Modèle utilisé pour les quittances mensuelles.",
    dataCy: "dropzone-template-quittance",
    icon: ReceiptText,
  },
  {
    type: "EXPENSE_STATEMENT",
    title: "Note de frais d’occupation",
    description:
      "Modèle utilisé pour les notes de frais et leur version complète.",
    dataCy: "dropzone-template-note",
    icon: FileText,
  },
];

function downloadFileName(
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

function BadgeStructure({ valid }: { valid: boolean }) {
  return (
    <span className={cn("badge", valid ? "badge-accent" : "badge-danger")}>
      {valid ? (
        <Check size={12} aria-hidden="true" />
      ) : (
        <X size={12} aria-hidden="true" />
      )}
      {valid ? "Structure valide" : "Structure invalide"}
    </span>
  );
}

function VariableList({
  title,
  variables,
  tone,
}: {
  title: string;
  variables: string[];
  tone: "accent" | "danger" | "warning";
}) {
  if (variables.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {title}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {variables.map((variable) => (
          <code
            key={variable}
            className={cn(
              "rounded-md border px-1.5 py-0.5 font-mono text-[11px]",
              tone === "danger"
                ? "border-danger/25 bg-danger-soft text-danger"
                : tone === "warning"
                  ? "border-warning/25 bg-warning-soft text-warning"
                  : "border-accent/15 bg-accent-soft text-accent",
            )}
          >
            {variable}
          </code>
        ))}
      </div>
    </div>
  );
}

function ValidationReport({
  report,
}: {
  report: ValidationReportDto;
}) {
  const recognizedVariables = report.recognizedVariables ?? [];
  const unknownVariables = report.unknownVariables ?? [];
  const missingVariables = report.missingVariables ?? [];
  const errorList = report.errors ?? [];

  return (
    <div
      className="space-y-3 rounded-xl border border-line bg-paper/45 p-4"
      data-cy="rapport-validation-template"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Rapport de validation</p>
        <BadgeStructure valid={Boolean(report.structureValid)} />
      </div>
      <VariableList
        title={`Variables reconnues (${recognizedVariables.length})`}
        variables={recognizedVariables}
        tone="accent"
      />
      <VariableList
        title={`Variables inconnues (${unknownVariables.length})`}
        variables={unknownVariables}
        tone="danger"
      />
      <VariableList
        title={`Obligatoires manquantes (${missingVariables.length})`}
        variables={missingVariables}
        tone="warning"
      />
      {errorList.length > 0 ? (
        <div className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-danger">
            Erreurs
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-danger">
            {errorList.map((errorText) => (
              <li key={errorText}>{errorText}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missingVariables.length > 0 && errorList.length === 0 ? (
        <p className="text-xs text-warning">
          Avertissement : le modèle sera accepté, mais les champs obligatoires
          absents apparaîtront vides dans le document.
        </p>
      ) : null}
    </div>
  );
}

function ReferenceVariables({ type }: { type: TemplateType }) {
  const variables = useTemplateVariables(type);
  const [copy, setCopy] = useState<string | null>(null);

  useEffect(() => {
    if (!copy) {
      return;
    }
    const timer = window.setTimeout(() => setCopy(null), 1_800);
    return () => window.clearTimeout(timer);
  }, [copy]);

  async function copyTemplate(name: string) {
    try {
      await navigator.clipboard.writeText(`{{${name}}}`);
      setCopy(name);
      toast.success(`{{${name}}} copié dans le presse-papiers.`);
    } catch {
      toast.error(
        "Impossible de copier dans le presse-papiers. Sélectionnez la variable manuellement.",
      );
    }
  }

  return (
    <details className="group border-t border-line px-5 py-4 sm:px-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink">
        <span className="flex items-center gap-2">
          <FileCode2 size={16} className="text-accent" aria-hidden="true" />
          Référence des variables
          <span className="badge badge-neutral">
            {variables.data?.length ?? "—"}
          </span>
        </span>
        <span className="text-xs font-medium text-ink-soft group-open:hidden">
          Afficher
        </span>
        <span className="hidden text-xs font-medium text-ink-soft group-open:inline">
          Masquer
        </span>
      </summary>

      {variables.isPending ? (
        <p className="mt-3 text-xs text-ink-soft">Chargement des variables…</p>
      ) : variables.isError ? (
        <p className="mt-3 text-xs text-danger">
          {errorMessage(variables.error)}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-ink-soft">
            Les montants sont déjà formatés en français par le backend : le
            template ne calcule rien. Les expressions non échappées, scripts,
            iframes, ressources distantes et expressions Thymeleaf/JSP sont
            refusés.
          </p>
          {type === "EXPENSE_STATEMENT" ? (
            <div className="rounded-xl border border-line bg-paper/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                Boucle des frais
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-accent-strong p-3 font-mono text-[11.5px] leading-relaxed text-white/90">
                {`{{#lignes}}
  {{poste}} — {{fournisseur}} — {{montant_retenu}}
{{/lignes}}`}
              </pre>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Dans la boucle{" "}
                <code className="font-mono">{"{{#lignes}}"}</code>, les
                variables internes s’écrivent{" "}
                <code className="font-mono">{"{{poste}}"}</code>,{" "}
                <code className="font-mono">{"{{fournisseur}}"}</code>,{" "}
                <code className="font-mono">{"{{periode}}"}</code>,{" "}
                <code className="font-mono">{"{{montant_ttc}}"}</code>,{" "}
                <code className="font-mono">{"{{prorata}}"}</code> et{" "}
                <code className="font-mono">{"{{montant_retenu}}"}</code>.
              </p>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Description</th>
                  <th>Exemple</th>
                  <th className="w-16 text-right">Copier</th>
                </tr>
              </thead>
              <tbody>
                {(variables.data ?? []).map((variable) => {
                  const name = variable.name ?? "";
                  return (
                    <tr key={name}>
                      <td>
                        <code className="rounded bg-paper-deep/60 px-1.5 py-0.5 font-mono text-[11.5px] text-ink">
                          {`{{${name}}}`}
                        </code>
                        {variable.required ? (
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-copper">
                            requis
                          </span>
                        ) : null}
                      </td>
                      <td className="text-xs text-ink-soft">
                        {variable.description}
                      </td>
                      <td className="text-xs text-ink-soft/80">
                        {variable.example || "—"}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => void copyTemplate(name)}
                          className="rounded-lg p-1.5 text-ink-soft transition hover:bg-accent-soft hover:text-accent"
                          aria-label={`Copier la variable ${name}`}
                          title="Copier"
                        >
                          {copy === name ? (
                            <Check size={15} />
                          ) : (
                            <Clipboard size={15} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </details>
  );
}

function ModelPreview({
  template,
  url,
  onClose,
  onActivate,
  activationInProgress,
}: {
  template: TemplateDto;
  url: string;
  onClose: () => void;
  onActivate: () => void;
  activationInProgress: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[3px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="animation-fade flex max-h-[94vh] w-full max-w-4xl flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apercu-template-titre"
        data-cy="apercu-template"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-strong px-4 py-3 text-white">
          <div className="min-w-0">
            <h2
              id="apercu-template-titre"
              className="truncate text-lg text-white"
            >
              Aperçu — {template.name} · v{template.version}
            </h2>
            <p className="text-[11px] text-white/60">
              Données d’exemple · filigrane « APERÇU » · rien n’est persisté.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!template.active ? (
              <Button
                variant="secondary"
                small
                onClick={onActivate}
                loading={activationInProgress}
                icon={<Check size={14} />}
              >
                Activer ce modèle
              </Button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer l’aperçu"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <PdfViewer
          url={url}
          dataCy="apercu-template-pdf"
          className="min-h-0 flex-1"
        />
      </div>
    </div>,
    document.body,
  );
}

function TemplatesCard({
  configuration,
}: {
  configuration: ConfigurationType;
}) {
  const {
    type,
    title,
    description,
    dataCy,
    icon: IconComponent,
  } = configuration;
  const queryClient = useQueryClient();
  const templates = useTemplates(type);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ValidationReportDto | null>(null);
  const [lastImport, setLastImport] = useState<TemplateDto | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    template: TemplateDto;
    url: string;
  } | null>(null);
  const [previewInProgress, setPreviewInProgress] = useState<number | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<TemplateDto | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const versions = templates.data ?? [];
  const active =
    versions.find((template) => template.active) ??
    versions.find((template) => template.builtIn) ??
    null;
  const builtInModel = versions.find((template) => template.builtIn) ?? null;

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.templates(type) });
  }

  const upload = useMutation({
    mutationFn: ({
      templateName: templateName,
      templateFile: templateFile,
    }: {
      templateName: string;
      templateFile: File;
    }) => api.templates.upload(type, templateName, templateFile),
    onSuccess: (template) => {
      invalidate();
      setReport(template.report ?? null);
      setLastImport(template);
      setFile(null);
      setUploadError(null);
      toast.success(
        `Version v${template.version} importée. Vérifiez l’aperçu puis activez-la.`,
      );
    },
    onError: (error) => {
      setReport(null);
      setLastImport(null);
      setUploadError(errorMessage(error));
    },
  });

  const activate = useMutation({
    mutationFn: (template: TemplateDto) =>
      api.templates.activate(template.id as number),
    onSuccess: (template) => {
      invalidate();
      setPreview(null);
      toast.success(
        `Le modèle « ${template.name} » v${template.version} est désormais actif.`,
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (template: TemplateDto) =>
      api.templates.delete(template.id as number),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success(
        "Version supprimée. Le fichier reste archivé côté stockage.",
      );
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => api.templates.resetDefault(type),
    onSuccess: (template) => {
      invalidate();
      setResetDialogOpen(false);
      toast.success(`Modèle intégré restauré et activé (v${template.version}).`);
    },
    onError: (error) => {
      setResetDialogOpen(false);
      toast.error(errorMessage(error));
    },
  });

  const download = useMutation({
    mutationFn: (template: TemplateDto) =>
      api.templates.file(template.id as number),
    onSuccess: (reply, template) => {
      downloadBlob(reply.blob, downloadFileName(template.name, template.version));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const downloadDefault = useMutation({
    mutationFn: () => api.templates.getDefault(type),
    onSuccess: (reply) => {
      downloadBlob(
        reply.blob,
        type === "RENT_RECEIPT"
          ? "modele-quittance-defaut.html"
          : "modele-note-frais-defaut.html",
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  async function openPreview(template: TemplateDto) {
    if (!template.id || previewInProgress !== null) {
      return;
    }
    setPreviewInProgress(template.id);
    try {
      const reply = await api.templates.preview(template.id);
      setPreview({ template, url: URL.createObjectURL(reply.blob) });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPreviewInProgress(null);
    }
  }

  function chooseFile(newItem: File) {
    setFile(newItem);
    setUploadError(null);
    setReport(null);
    setLastImport(null);
    if (!name.trim()) {
      setName(newItem.name.replace(/\.html?$/i, ""));
    }
  }

  const canUpload =
    file !== null && name.trim().length > 0 && !upload.isPending;
  const previousVersions = versions.filter((template) => !template.active);

  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
            <IconComponent size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
          </div>
        </div>
        <span className="badge badge-neutral">
          <ShieldCheck size={12} aria-hidden="true" />
          HTML + CSS
        </span>
      </div>

      <div className="card-body space-y-5">
        {templates.isError ? (
          <ErrorState
            message={errorMessage(templates.error)}
            onRetry={() => void templates.refetch()}
          />
        ) : templates.isPending ? (
          <LoadingState message="Chargement des modèles…" />
        ) : (
          <>
            <div className="rounded-xl border border-accent/15 bg-accent-soft/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-accent">
                    Modèle actif
                  </p>
                  {active ? (
                    <>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                        {active.name}
                        <span className="badge badge-accent">
                          v{active.version}
                        </span>
                        {active.builtIn ? (
                          <span className="badge badge-neutral">intégré</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {active.format ?? "HTML"} · importé le{" "}
                        {formatDateTime(active.createdAt)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-warning">
                      Aucun modèle actif.
                    </p>
                  )}
                </div>
                {active ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      small
                      icon={<Eye size={14} />}
                      loading={previewInProgress === active.id}
                      onClick={() => void openPreview(active)}
                      data-cy="btn-apercu-template-actif"
                    >
                      Aperçu
                    </Button>
                    <Button
                      variant="secondary"
                      small
                      icon={<Download size={14} />}
                      loading={
                        download.isPending &&
                        download.variables?.id === active.id
                      }
                      onClick={() => download.mutate(active)}
                    >
                      Télécharger
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    small
                    icon={<RotateCcw size={14} />}
                    onClick={() => setResetDialogOpen(true)}
                  >
                    Restaurer le modèle intégré
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                small
                icon={<Download size={14} />}
                loading={downloadDefault.isPending}
                onClick={() => downloadDefault.mutate()}
              >
                Télécharger le modèle par défaut intégré
              </Button>
              <Button
                variant="secondary"
                small
                icon={<RotateCcw size={14} />}
                onClick={() => setResetDialogOpen(true)}
                disabled={Boolean(active?.builtIn)}
                title={
                  active?.builtIn
                    ? "Le modèle intégré est déjà actif."
                    : undefined
                }
                data-cy="btn-modele-defaut"
              >
                Revenir au modèle par défaut
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold text-ink">Versions</h3>
                <span className="text-xs text-ink-soft">
                  {versions.length} version{versions.length > 1 ? "s" : ""}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {versions.map((template) => {
                  const isTemplateActive = Boolean(template.active);
                  const deletionBlocked =
                    isTemplateActive || Boolean(template.builtIn);
                  return (
                    <li
                      key={template.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                          <span className="truncate">{template.name}</span>
                          <span
                            className={cn(
                              "badge",
                              isTemplateActive
                                ? "badge-accent"
                                : "badge-neutral",
                            )}
                          >
                            v{template.version}
                          </span>
                          {template.builtIn ? (
                            <span className="badge badge-neutral">intégré</span>
                          ) : null}
                          {isTemplateActive ? (
                            <span className="text-[10px] font-bold uppercase text-accent">
                              active
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">
                          {template.format ?? "HTML"} ·{" "}
                          {formatDateTime(template.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          small
                          icon={<Eye size={13} />}
                          loading={previewInProgress === template.id}
                          onClick={() => void openPreview(template)}
                        >
                          Aperçu
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Download size={13} />}
                          loading={
                            download.isPending &&
                            download.variables?.id === template.id
                          }
                          onClick={() => download.mutate(template)}
                        >
                          Télécharger
                        </Button>
                        {!isTemplateActive ? (
                          <Button
                            variant="ghost"
                            small
                            icon={<Check size={13} />}
                            loading={
                              activate.isPending &&
                              activate.variables?.id === template.id
                            }
                            onClick={() => activate.mutate(template)}
                            data-cy="btn-activer-template"
                          >
                            Activer
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          small
                          className={cn(
                            !deletionBlocked &&
                              "text-danger hover:bg-danger-soft",
                          )}
                          icon={<Trash2 size={13} />}
                          disabled={deletionBlocked}
                          title={
                            deletionBlocked
                              ? template.builtIn
                                ? "Le modèle intégré ne peut pas être supprimé."
                                : "Le modèle actif ne peut pas être supprimé."
                              : undefined
                          }
                          onClick={() => setToDelete(template)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {previousVersions.length === 0 ? (
                <p className="mt-2 text-xs text-ink-soft">
                  Aucune version précédente archivée.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-line bg-paper/35 p-4">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <UploadCloud
                  size={16}
                  className="text-accent"
                  aria-hidden="true"
                />
                Importer une nouvelle version
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Fichier HTML UTF-8, 5 Mo maximum. Le nouveau modèle est validé
                puis importé sans être activé : vous pouvez d’abord l’aperçu
                avec des données d’exemple.
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <label
                    className="field-label"
                    htmlFor={`nom-template-${type}`}
                  >
                    Nom de la version
                  </label>
                  <input
                    id={`nom-template-${type}`}
                    className="field"
                    value={name}
                    maxLength={120}
                    placeholder="Ex. Quittance — version 2027"
                    onChange={(event) => setName(event.target.value)}
                    data-cy="input-template-nom"
                  />
                </div>

                {file ? (
                  <SelectedFile
                    name={file.name}
                    size={file.size}
                    mimeType={file.type}
                    inProgress={upload.isPending}
                    onRemove={() => setFile(null)}
                  />
                ) : (
                  <FileDropzone
                    onFile={chooseFile}
                    disabled={upload.isPending}
                    dataCy={dataCy}
                    accept={TEMPLATE_FORMATS}
                    maxSize={MAX_TEMPLATE_SIZE}
                    formatsDescription="HTML, HTM"
                    text="Déposez votre template HTML"
                    ariaLabel="Choisir un fichier template HTML"
                  />
                )}

                {uploadError ? (
                  <p
                    className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs font-medium text-danger"
                    role="alert"
                  >
                    {uploadError}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    icon={<UploadCloud size={15} />}
                    loading={upload.isPending}
                    disabled={!canUpload}
                    onClick={() => {
                      if (file && name.trim()) {
                        upload.mutate({
                          templateName: name.trim(),
                          templateFile: file,
                        });
                      }
                    }}
                    data-cy="btn-televerser-template"
                  >
                    Valider et importer
                  </Button>
                  <span className="text-[11px] text-ink-soft">
                    Une version importée doit être activée explicitement.
                  </span>
                </div>

                {report ? <ValidationReport report={report} /> : null}

                {report && lastImport?.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      small
                      icon={<Eye size={14} />}
                      loading={previewInProgress === lastImport.id}
                      onClick={() => void openPreview(lastImport)}
                    >
                      Aperçu de la version v{lastImport.version}
                    </Button>
                    <Button
                      variant="secondary"
                      small
                      icon={<Check size={14} />}
                      loading={
                        activate.isPending &&
                        activate.variables?.id === lastImport.id
                      }
                      onClick={() => activate.mutate(lastImport)}
                    >
                      Activer la version v{lastImport.version}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/30 p-3 text-[11.5px] leading-relaxed text-ink-soft">
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <p>
                Un seul modèle actif par type. Les documents déjà générés
                conservent la référence de leur version. La suppression est
                logique : aucune version n’est réellement effacée.
              </p>
            </div>
          </>
        )}
      </div>

      <ReferenceVariables type={type} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette version ?"
        message={
          toDelete
            ? `La version v${toDelete.version} de « ${toDelete.name} » ne sera plus proposée. Les documents qui l’utilisent restent inchangés.`
            : ""
        }
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-template"
      />

      <ConfirmDialog
        open={resetDialogOpen}
        title="Revenir au modèle par défaut ?"
        message={
          builtInModel
            ? `Le modèle intégré « ${builtInModel.name} » (v${builtInModel.version}) redeviendra actif. Vos versions importées restent disponibles.`
            : "Le modèle intégré redeviendra actif. Vos versions importées restent disponibles."
        }
        confirmLabel="Restaurer le modèle"
        onConfirm={() => resetMutation.mutate()}
        onCancel={() => setResetDialogOpen(false)}
        dataCy="dialogue-modele-defaut"
      />

      {preview ? (
        <ModelPreview
          template={preview.template}
          url={preview.url}
          onClose={() => setPreview(null)}
          onActivate={() => activate.mutate(preview.template)}
          activationInProgress={activate.isPending}
        />
      ) : null}
    </section>
  );
}

export function TemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Templates"
        description="Personnalisez les documents générés sans toucher au calcul : le backend fournit les montants déjà formatés, votre modèle HTML ne fait que les mettre en page."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {TYPES.map((configuration) => (
          <TemplatesCard
            key={configuration.type}
            configuration={configuration}
          />
        ))}
      </div>
      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning-soft/50 px-4 py-3 text-xs leading-relaxed text-warning">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Les templates ne peuvent exécuter aucun code : Mustache sans logique,
          HTML assaini, images en data URI uniquement, aucune ressource
          distante. Un fichier refusé affiche les erreurs de validation sans
          être enregistré.
        </p>
      </div>
    </>
  );
}
