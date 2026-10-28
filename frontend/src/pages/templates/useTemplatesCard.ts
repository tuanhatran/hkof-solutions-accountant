import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage, downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useTemplates } from "@/api/queries";
import type { TemplateDto, ValidationReportDto } from "@/api/types";
import { toast } from "@/state/toasts";
import { downloadFileName, type ConfigurationType } from "./templateTypes";

export interface TemplateComparisonSide {
  template: TemplateDto;
  url: string;
}

export interface TemplateComparison {
  left: TemplateComparisonSide;
  right: TemplateComparisonSide;
}

/**
 * Controller of one template-type card: versions, import, activation,
 * deletion, reset, preview and side-by-side comparison.
 */
export function useTemplatesCard(configuration: ConfigurationType) {
  const { t } = useTranslation();
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
  const [compareSelection, setCompareSelection] = useState<number[]>([]);
  const [compare, setCompare] = useState<TemplateComparison | null>(null);
  const [compareInProgress, setCompareInProgress] = useState(false);
  const compareRequest = useRef(0);
  const versions = templates.data ?? [];

  useEffect(() => {
    return () => {
      compareRequest.current += 1;
    };
  }, []);

  useEffect(() => {
    const ids = new Set((templates.data ?? []).map((template) => template.id));
    setCompareSelection((selection) => {
      const pruned = selection.filter((id) => ids.has(id));
      return pruned.length === selection.length ? selection : pruned;
    });
  }, [templates.data]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (compare) {
        URL.revokeObjectURL(compare.left.url);
        URL.revokeObjectURL(compare.right.url);
      }
    };
  }, [compare]);

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
        t("templates.toasts.imported", { version: template.version }),
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
        t("templates.toasts.activated", {
          name: template.name,
          version: template.version,
        }),
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
      toast.success(t("templates.toasts.deleted"));
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
      toast.success(t("templates.toasts.reset", { version: template.version }));
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

  function toggleCompareSelection(template: TemplateDto) {
    if (template.id === undefined) {
      return;
    }
    const id = template.id;
    setCompareSelection((selection) => {
      if (selection.includes(id)) {
        return selection.filter((value) => value !== id);
      }
      if (selection.length >= 2) {
        return selection;
      }
      return [...selection, id];
    });
  }

  function clearCompareSelection() {
    setCompareSelection([]);
  }

  async function openCompare() {
    if (compareInProgress) {
      return;
    }
    const selected = compareSelection
      .map((id) => versions.find((template) => template.id === id))
      .filter((template): template is TemplateDto => template !== undefined);
    if (selected.length !== 2) {
      return;
    }
    const [left, right] = selected;
    if (!left || !right) {
      return;
    }
    setCompareInProgress(true);
    const request = ++compareRequest.current;
    try {
      const [leftReply, rightReply] = await Promise.all([
        api.templates.preview(left.id as number),
        api.templates.preview(right.id as number),
      ]);
      if (request !== compareRequest.current) {
        return;
      }
      setCompare({
        left: {
          template: left,
          url: URL.createObjectURL(leftReply.blob),
        },
        right: {
          template: right,
          url: URL.createObjectURL(rightReply.blob),
        },
      });
    } catch (error) {
      if (request === compareRequest.current) {
        toast.error(errorMessage(error));
      }
    } finally {
      if (request === compareRequest.current) {
        setCompareInProgress(false);
      }
    }
  }

  function closeCompare() {
    compareRequest.current += 1;
    setCompare(null);
    setCompareInProgress(false);
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
    compareSelection,
    toggleCompareSelection,
    clearCompareSelection,
    compare,
    compareInProgress,
    openCompare,
    closeCompare,
  };
}

export type TemplatesCardController = ReturnType<typeof useTemplatesCard>;
