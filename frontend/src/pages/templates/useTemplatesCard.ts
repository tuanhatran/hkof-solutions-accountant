import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { errorMessage, downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useTemplates } from "@/api/queries";
import type { TemplateDto, ValidationReportDto } from "@/api/types";
import { toast } from "@/state/toasts";
import { downloadFileName, type ConfigurationType } from "./templateTypes";

/**
 * Controller of one template-type card: versions, import, activation,
 * deletion, reset and preview.
 */
export function useTemplatesCard(configuration: ConfigurationType) {
  const { type } = configuration;
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
      toast.success(
        `Modèle intégré restauré et activé (v${template.version}).`,
      );
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
      downloadBlob(
        reply.blob,
        downloadFileName(template.name, template.version),
      );
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

  return {
    configuration,
    templates,
    name,
    setName,
    file,
    setFile,
    report,
    lastImport,
    uploadError,
    preview,
    setPreview,
    previewInProgress,
    toDelete,
    setToDelete,
    resetDialogOpen,
    setResetDialogOpen,
    versions,
    active,
    builtInModel,
    upload,
    activate,
    remove,
    resetMutation,
    download,
    downloadDefault,
    openPreview,
    chooseFile,
    canUpload,
    previousVersions,
  };
}

export type TemplatesCardController = ReturnType<typeof useTemplatesCard>;
