import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CloudOff,
  Cpu,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useLlmConfig,
  useLlmModels,
  useLlmStatus,
} from "@/api/queries";
import type {
  LlmConfigDto,
  LlmConfigRequest,
  LlmTestResponse,
  LlmStatus,
} from "@/api/types";
import { Button } from "@/components/Button";
import { LoadingState, ErrorState } from "@/components/States";
import { FieldGroup } from "@/components/FieldGroup";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/cn";
import { llmSchema, type LlmFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";

const STATUSES: Record<
  LlmStatus,
  { text: string; className: string; dot: string; description: string }
> = {
  PRET: {
    text: "Connecté",
    className: "badge-accent",
    dot: "bg-accent",
    description: "Le serveur Ollama et le modèle configuré sont disponibles.",
  },
  PRET_DISTANT: {
    text: "Connecté — serveur distant",
    className: "badge-warning",
    dot: "bg-warning",
    description:
      "Ollama répond, mais l’URL n’est pas locale : les documents quittent cette machine.",
  },
  MODELE_ABSENT: {
    text: "Modèle absent",
    className: "badge-warning",
    dot: "bg-warning",
    description: "Ollama répond mais le modèle sélectionné n’est pas installé.",
  },
  INJOIGNABLE: {
    text: "Injoignable",
    className: "badge-danger",
    dot: "bg-danger",
    description:
      "Le serveur Ollama ne répond pas. La saisie manuelle reste disponible.",
  },
  DESACTIVE: {
    text: "Désactivé",
    className: "badge-neutral",
    dot: "bg-ink-soft/60",
    description:
      "L’analyse IA est désactivée. Toute l’application reste utilisable manuellement.",
  },
};

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isValidUrl(url: string): boolean {
  try {
    const analysis = new URL(url);
    return analysis.protocol === "http:" || analysis.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      [
        "localhost",
        "127.0.0.1",
        "::1",
        "[::1]",
        "0.0.0.0",
        "host.docker.internal",
        "ollama",
      ].includes(host)
    ) {
      return true;
    }
    if (
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return true;
    }
    return /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch {
    return false;
  }
}

function valuesFromConfig(config: LlmConfigDto | undefined): LlmFormValues {
  return {
    active: config?.active ?? false,
    url: config?.url ?? "http://host.docker.internal:11434",
    model: config?.model ?? "",
    timeoutSeconds: config?.timeoutSeconds ?? 120,
    temperature: config?.temperature ?? "0",
    numCtx: config?.numCtx ?? 8192,
    maxPages: config?.maxPages ?? 5,
    ocrActive: config?.ocrActive ?? false,
    extractionPrompt: config?.extractionPrompt ?? "",
    apiKey: "",
    deleteApiKey: false,
  };
}

function requestBodyFromValues(values: LlmFormValues): LlmConfigRequest {
  const requestBody: LlmConfigRequest = {
    active: values.active,
    supplier: "OLLAMA",
    url: normalizeUrl(values.url),
    model: values.model.trim(),
    timeoutSeconds: values.timeoutSeconds,
    temperature: values.temperature.trim().replace(",", "."),
    numCtx: values.numCtx,
    maxPages: values.maxPages,
    ocrActive: values.ocrActive,
    extractionPrompt: values.extractionPrompt.trim(),
  };
  if (values.apiKey.trim()) {
    requestBody.apiKey = values.apiKey.trim();
  } else if (values.deleteApiKey) {
    requestBody.apiKey = "";
  }
  return requestBody;
}

function Switch({
  enabled: active,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label="Activer l’analyse par IA"
      onClick={onChange}
      data-cy="switch-llm-actif"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        active ? "bg-accent" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          active ? "translate-x-[22px]" : "translate-x-0.5",
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function StatusState() {
  const status = useLlmStatus();
  const key = (status.data?.status as LlmStatus | undefined) ?? null;
  const info = key ? STATUSES[key] : null;

  return (
    <section className="card mb-6 overflow-hidden" data-cy="llm-statut">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl",
              key === "PRET"
                ? "bg-accent-soft text-accent"
                : key === "DESACTIVE"
                  ? "bg-paper-deep text-ink-soft"
                  : "bg-warning-soft text-warning",
            )}
          >
            {key === "PRET" ? (
              <CheckCircle2 size={19} aria-hidden="true" />
            ) : key === "INJOIGNABLE" ? (
              <CloudOff size={19} aria-hidden="true" />
            ) : (
              <Activity size={19} aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="eyebrow">État de l’analyse IA</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg text-ink">Connexion Ollama</h2>
              <span
                className={cn("badge", info?.className ?? "badge-neutral")}
                data-cy="badge-llm-statut-admin"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    info?.dot ?? "bg-ink-soft/60",
                  )}
                  aria-hidden="true"
                />
                {status.isPending
                  ? "Vérification…"
                  : status.isError
                    ? "Indisponible"
                    : (info?.text ?? "Inconnu")}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
              {status.data?.message ??
                info?.description ??
                "Interrogation du serveur Ollama…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-soft sm:inline">
            {status.data?.reachable
              ? "Serveur joignable"
              : status.data
                ? "Serveur non joignable"
                : "—"}
            {status.data?.active
              ? " · IA activée"
              : status.data
                ? " · IA désactivée"
                : ""}
          </span>
          <Button
            variant="secondary"
            small
            icon={<RefreshCw size={14} />}
            loading={status.isFetching}
            onClick={() => void status.refetch()}
          >
            Actualiser
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AdminLlmPage() {
  const queryClient = useQueryClient();
  const config = useLlmConfig();
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [testResult, setTestResult] = useState<LlmTestResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [promptInProgress, setPromptInProgress] = useState(false);
  const modelLock = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<LlmFormValues>({
    resolver: zodResolver(llmSchema),
    mode: "onChange",
    defaultValues: valuesFromConfig(undefined),
  });

  const values = watch();
  const active = values.active;
  const removeKey = values.deleteApiKey;
  const remoteUrl = values.url.trim() !== "" && !isLocalUrl(values.url);
  const models = useLlmModels(loadedUrl);

  useEffect(() => {
    if (!config.data) {
      return;
    }
    reset(valuesFromConfig(config.data));
    const url = normalizeUrl(config.data.url ?? "");
    setSavedUrl(url);
    setLoadedUrl(url || null);
  }, [config.data, reset]);

  useEffect(() => {
    if (removeKey) {
      setValue("apiKey", "", { shouldDirty: true });
    }
  }, [removeKey, setValue]);

  useEffect(() => {
    if (models.isError) {
      setManualMode(true);
    }
  }, [models.isError]);

  const save = useMutation({
    mutationFn: (submittedValues: LlmFormValues) =>
      api.llm.update(requestBodyFromValues(submittedValues)),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.llmConfig, payload);
      const url = normalizeUrl(payload.url ?? "");
      setSavedUrl(url);
      setLoadedUrl(url || null);
      setTestResult(null);
      setTestError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatus });
      toast.success("Configuration IA enregistrée.");
    },
  });

  async function refreshModels(force = false) {
    if (modelLock.current) {
      return;
    }
    const url = normalizeUrl(values.url);
    if (!isValidUrl(url)) {
      setModelsError("URL invalide : commencez par http:// ou https://.");
      return;
    }
    setModelsError(null);
    modelLock.current = true;
    setModelsLoading(true);
    try {
      if (url !== savedUrl) {
        await api.llm.update({ url });
        setSavedUrl(url);
        void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatus });
      }
      if (url !== loadedUrl) {
        setLoadedUrl(url);
        setManualMode(false);
      } else if (force) {
        const result = await models.refetch();
        if (result.isError) {
          setModelsError(errorMessage(result.error));
        }
      }
    } catch (error) {
      setModelsError(errorMessage(error));
    } finally {
      modelLock.current = false;
      setModelsLoading(false);
    }
  }

  async function resetPrompt() {
    setPromptInProgress(true);
    try {
      const reply = await api.llm.defaultPrompt();
      if (!reply.prompt) {
        toast.error("Le prompt par défaut est indisponible.");
        return;
      }
      setValue("extractionPrompt", reply.prompt, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.info("Prompt par défaut chargé. Enregistrez pour l’appliquer.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPromptInProgress(false);
    }
  }

  const runTest = handleSubmit(async (submittedValues) => {
    setTestInProgress(true);
    setTestResult(null);
    setTestError(null);
    try {
      const payload = await api.llm.update(
        requestBodyFromValues(submittedValues),
      );
      queryClient.setQueryData(queryKeys.llmConfig, payload);
      const url = normalizeUrl(payload.url ?? "");
      setSavedUrl(url);
      setLoadedUrl(url || null);
      const result = await api.llm.test();
      setTestResult(result);
      if (result.success) {
        toast.success("Test de connexion réussi.");
      } else {
        toast.error(result.message ?? "Le test de connexion a échoué.");
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatus });
    } catch (error) {
      setTestError(errorMessage(error));
    } finally {
      setTestInProgress(false);
    }
  });

  const modelOptions = useMemo(() => {
    const options = models.data ?? [];
    if (
      values.model &&
      !options.some((model) => model.name === values.model)
    ) {
      return [
        {
          name: values.model,
          family: null,
          parameters: null,
          vision: false,
          configure: true,
        },
        ...options.map((model) => ({ ...model, configure: false })),
      ];
    }
    return options.map((model) => ({ ...model, configure: false }));
  }, [models.data, values.model]);

  const selectedModel = modelOptions.find(
    (model) => model.name === values.model,
  );
  const listLoading = modelsLoading || models.isPending;

  if (config.isPending) {
    return (
      <>
        <PageHeader eyebrow="Réglages" title="Admin IA" />
        <LoadingState message="Chargement de la configuration IA…" />
      </>
    );
  }

  if (config.isError) {
    return (
      <>
        <PageHeader eyebrow="Réglages" title="Admin IA" />
        <ErrorState
          message={errorMessage(config.error)}
          onRetry={() => void config.refetch()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Admin IA"
        description="Ollama reste local par défaut. Le modèle ne fait que proposer une extraction : tous les montants sont vérifiés et calculés par le backend."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Activity size={15} />}
              loading={testInProgress}
              onClick={() => void runTest()}
              data-cy="btn-test-llm"
            >
              Tester la connexion
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="form-llm"
              icon={<Save size={15} />}
              loading={save.isPending}
              data-cy="btn-enregistrer-llm"
            >
              Enregistrer
            </Button>
          </>
        }
      />

      <StatusState />

      {remoteUrl ? (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-soft/70 px-4 py-3"
          role="alert"
          data-cy="alerte-llm-distante"
        >
          <ShieldAlert
            size={18}
            className="mt-0.5 shrink-0 text-warning"
            aria-hidden="true"
          />
          <div className="text-xs leading-relaxed text-warning">
            <p className="font-semibold">
              Les justificatifs seront envoyés à un serveur distant.
            </p>
            <p className="mt-0.5">
              L’URL configurée n’est ni{" "}
              <code className="font-mono">localhost</code>, ni{" "}
              <code className="font-mono">host.docker.internal</code>, ni une IP
              privée. N’utilisez cette option que si vous acceptez ce transfert.
            </p>
          </div>
        </div>
      ) : null}

      <form
        id="form-llm"
        className="space-y-6"
        onSubmit={handleSubmit((submittedValues) =>
          save.mutate(submittedValues),
        )}
        noValidate
      >
        <section className="card overflow-hidden">
          <div className="card-header">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Bot size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl text-ink">Connexion Ollama</h2>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Fournisseur local, URL, modèle et authentification éventuelle.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ink-soft">
                {active ? "Analyse IA activée" : "Analyse IA désactivée"}
              </span>
              <Switch
                enabled={active}
                onChange={() =>
                  setValue("active", !active, { shouldDirty: true })
                }
              />
            </div>
          </div>

          <div className="card-body space-y-5">
            {!active ? (
              <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/45 p-3 text-xs leading-relaxed text-ink-soft">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-warning"
                  aria-hidden="true"
                />
                Quand l’IA est désactivée, aucun justificatif n’est envoyé.
                Toute la saisie manuelle reste disponible.
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <FieldGroup id="llm-fournisseur" label="Fournisseur">
                <select
                  id="llm-fournisseur"
                  className="field"
                  value="OLLAMA"
                  disabled
                >
                  <option value="OLLAMA">Ollama (local)</option>
                  <option value="OPENAI" disabled>
                    Compatible OpenAI — phase 2
                  </option>
                </select>
              </FieldGroup>

              <FieldGroup
                id="llm-url"
                label="URL du serveur Ollama"
                error={errors.url?.message}
                help="Par défaut : http://host.docker.internal:11434. L’URL est enregistrée automatiquement lorsque la liste des modèles est actualisée."
              >
                <div className="flex gap-2">
                  <input
                    id="llm-url"
                    className={cn("field mt-1.5", errors.url && "field-error")}
                    placeholder="http://host.docker.internal:11434"
                    autoComplete="off"
                    spellCheck={false}
                    {...register("url")}
                    onBlur={() => {
                      const url = normalizeUrl(values.url);
                      if (isValidUrl(url) && url !== savedUrl) {
                        void refreshModels();
                      }
                    }}
                    data-cy="input-llm-url"
                  />
                  <Button
                    variant="secondary"
                    className="mt-1.5 shrink-0"
                    icon={
                      <RefreshCw
                        size={15}
                        className={cn(listLoading && "animate-spin")}
                      />
                    }
                    disabled={listLoading}
                    onClick={() => void refreshModels(true)}
                    aria-label="Actualiser la liste des modèles"
                    data-cy="btn-refresh-models"
                  >
                    Actualiser
                  </Button>
                </div>
              </FieldGroup>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FieldGroup
                id="llm-modele"
                label="Modèle"
                error={errors.model?.message}
                help={
                  selectedModel
                    ? `${selectedModel.family || "Famille inconnue"}${selectedModel.parameters ? ` · ${selectedModel.parameters}` : ""}${selectedModel.vision ? " · accepte les images" : ""}`
                    : "La liste est chargée depuis /api/tags. Vous pouvez saisir un nom manuellement si Ollama est injoignable."
                }
              >
                {!manualMode ? (
                  <select
                    id="llm-modele"
                    className={cn("field", errors.model && "field-error")}
                    value={values.model}
                    onChange={(event) => {
                      const choice = event.target.value;
                      if (choice === "__manuel__") {
                        setManualMode(true);
                        return;
                      }
                      setValue("model", choice, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    disabled={listLoading && modelOptions.length === 0}
                    data-cy="select-llm-model"
                  >
                    <option value="" disabled>
                      {listLoading && modelOptions.length === 0
                        ? "Chargement des modèles…"
                        : "Sélectionnez un modèle"}
                    </option>
                    {modelOptions.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name}
                        {model.vision ? " · vision" : ""}
                        {model.parameters ? ` · ${model.parameters}` : ""}
                        {model.configure ? " (configuré)" : ""}
                      </option>
                    ))}
                    <option value="__manuel__">Saisie manuelle…</option>
                  </select>
                ) : null}

                {manualMode ? (
                  <div className="mt-1.5">
                    <input
                      id="llm-modele"
                      className={cn(
                        "field mt-0",
                        errors.model && "field-error",
                      )}
                      placeholder="qwen2.5:7b"
                      autoComplete="off"
                      spellCheck={false}
                      {...register("model")}
                      data-cy="input-llm-modele"
                    />
                    {models.data && models.data.length > 0 ? (
                      <button
                        type="button"
                        className="mt-1.5 text-xs font-medium text-accent underline decoration-accent/30 underline-offset-4"
                        onClick={() => setManualMode(false)}
                      >
                        Choisir dans la liste
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </FieldGroup>

              <div className="flex flex-col justify-end gap-2">
                <div className="rounded-xl border border-line bg-paper/40 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <Cpu size={14} className="text-accent" aria-hidden="true" />
                    Support des images
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                    {selectedModel?.vision
                      ? "Ce modèle accepte les images : les photos et scans peuvent être analysés."
                      : "Ce modèle n’est pas signalé comme multimodal. Les PDF texte restent analysables ; les images nécessitent un modèle vision ou l’OCR."}
                  </p>
                </div>
                {selectedModel && selectedModel.configure ? (
                  <p className="text-[11px] text-warning">
                    Ce modèle configuré n’apparaît pas dans la liste du serveur.
                    Vérifiez qu’il est installé.
                  </p>
                ) : null}
              </div>
            </div>

            {modelsError || models.isError ? (
              <div
                className="rounded-xl border border-warning/25 bg-warning-soft/70 p-3 text-xs text-warning"
                role="alert"
              >
                <p className="font-semibold">Liste des modèles indisponible.</p>
                <p className="mt-0.5">
                  {modelsError ?? errorMessage(models.error)}
                </p>
                <p className="mt-1">
                  Saisissez le nom du modèle manuellement, puis testez la
                  connexion.
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-line bg-paper/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <KeyRound
                    size={16}
                    className="mt-0.5 text-accent"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Clé API (facultative)
                    </p>
                    <p className="text-[11.5px] text-ink-soft">
                      Jamais renvoyée par le serveur ni réaffichée. Laissez vide
                      pour conserver la clé enregistrée.
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "badge",
                    config.data?.apiKeyConfigured
                      ? "badge-accent"
                      : "badge-neutral",
                  )}
                >
                  {config.data?.apiKeyConfigured
                    ? "Clé configurée"
                    : "Aucune clé"}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FieldGroup
                  id="llm-cle-api"
                  label="Nouvelle clé API"
                  error={errors.apiKey?.message}
                >
                  <input
                    id="llm-cle-api"
                    type="password"
                    autoComplete="new-password"
                    className="field"
                    placeholder={
                      config.data?.apiKeyConfigured
                        ? "Clé enregistrée — laisser vide"
                        : "Aucune clé enregistrée"
                    }
                    disabled={removeKey}
                    {...register("apiKey")}
                    data-cy="input-llm-cle-api"
                  />
                </FieldGroup>
                {config.data?.apiKeyConfigured ? (
                  <label className="mt-1.5 flex cursor-pointer items-start gap-2 self-end rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-line accent-[#1b5b49]"
                      {...register("deleteApiKey")}
                      data-cy="checkbox-supprimer-cle"
                    />
                    <span>
                      <span className="block font-medium text-ink">
                        Supprimer la clé enregistrée
                      </span>
                      <span className="mt-0.5 block text-[11px]">
                        Envoie explicitement une clé vide. Sans cette case, une
                        clé vide n’est jamais transmise.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <p className="text-[11px] text-ink-soft">
                « Tester la connexion » enregistre d’abord les réglages
                affichés, puis interroge le serveur.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  small
                  icon={<Activity size={14} />}
                  loading={testInProgress}
                  onClick={() => void runTest()}
                  data-cy="btn-test-llm-bas"
                >
                  Tester la connexion
                </Button>
                <Button
                  variant="primary"
                  small
                  type="submit"
                  icon={<Save size={14} />}
                  loading={save.isPending}
                >
                  Enregistrer
                </Button>
              </div>
            </div>

            {testError ? (
              <p
                className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
                role="alert"
              >
                {testError}
              </p>
            ) : null}

            {testResult ? (
              <div
                className={cn(
                  "rounded-xl border p-4",
                  testResult.success
                    ? "border-accent/20 bg-accent-soft/50"
                    : "border-danger/20 bg-danger-soft/50",
                )}
                role={testResult.success ? "status" : "alert"}
                data-cy="resultat-test-llm"
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2
                      size={17}
                      className="text-accent"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      size={17}
                      className="text-danger"
                      aria-hidden="true"
                    />
                  )}
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      testResult.success ? "text-accent" : "text-danger",
                    )}
                  >
                    {testResult.success ? "Connexion réussie" : "Test échoué"}
                    {typeof testResult.durationMs === "number"
                      ? ` en ${(testResult.durationMs / 1000).toFixed(1)} s`
                      : ""}
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {testResult.message}
                </p>
                {testResult.detectedAmount ? (
                  <p className="mt-2 text-xs text-ink">
                    Montant détecté sur le document de test :{" "}
                    <span className="font-mono font-semibold">
                      {testResult.detectedAmount} €
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <details className="card group overflow-hidden">
          <summary className="card-header cursor-pointer list-none">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper-deep text-ink-soft">
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl text-ink">Paramètres avancés</h2>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Délai, température, contexte, pages analysées, OCR et prompt
                  d’extraction.
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-ink-soft group-open:hidden">
              Afficher
            </span>
            <span className="hidden text-xs font-medium text-ink-soft group-open:inline">
              Masquer
            </span>
          </summary>

          <div className="card-body space-y-5 border-t border-line">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldGroup
                id="llm-timeout"
                label="Délai (secondes)"
                error={errors.timeoutSeconds?.message}
              >
                <input
                  id="llm-timeout"
                  type="number"
                  min={5}
                  max={600}
                  step={1}
                  className={cn(
                    "field",
                    errors.timeoutSeconds && "field-error",
                  )}
                  {...register("timeoutSeconds", { valueAsNumber: true })}
                />
              </FieldGroup>
              <FieldGroup
                id="llm-temperature"
                label="Température"
                error={errors.temperature?.message}
                help="0 = réponses déterministes, recommandé."
              >
                <input
                  id="llm-temperature"
                  className={cn("field", errors.temperature && "field-error")}
                  inputMode="decimal"
                  {...register("temperature")}
                />
              </FieldGroup>
              <FieldGroup
                id="llm-numctx"
                label="Contexte (num_ctx)"
                error={errors.numCtx?.message}
              >
                <input
                  id="llm-numctx"
                  type="number"
                  min={1024}
                  max={131072}
                  step={1024}
                  className={cn("field", errors.numCtx && "field-error")}
                  {...register("numCtx", { valueAsNumber: true })}
                />
              </FieldGroup>
              <FieldGroup
                id="llm-pages"
                label="Pages max analysées"
                error={errors.maxPages?.message}
              >
                <input
                  id="llm-pages"
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  className={cn("field", errors.maxPages && "field-error")}
                  {...register("maxPages", { valueAsNumber: true })}
                />
              </FieldGroup>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/35 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-line accent-[#1b5b49]"
                {...register("ocrActive")}
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  OCR Tesseract en secours
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">
                  À activer si Tesseract est installé sur le serveur : extrait
                  le texte des justificatifs image ou scannés avant l’analyse.
                </span>
              </span>
            </label>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="llm-prompt" className="field-label">
                  Prompt d’extraction
                </label>
                <Button
                  variant="secondary"
                  small
                  icon={<RotateCcw size={13} />}
                  loading={promptInProgress}
                  onClick={() => void resetPrompt()}
                  data-cy="btn-reinitialiser-prompt"
                >
                  Réinitialiser le prompt par défaut
                </Button>
              </div>
              <textarea
                id="llm-prompt"
                rows={12}
                spellCheck={false}
                className={cn(
                  "field resize-y font-mono text-[12.5px] leading-relaxed",
                  errors.extractionPrompt && "field-error",
                )}
                {...register("extractionPrompt")}
                data-cy="input-llm-prompt"
              />
              {errors.extractionPrompt ? (
                <p className="error-text" role="alert">
                  {errors.extractionPrompt.message}
                </p>
              ) : (
                <p className="hint">
                  Le prompt système interdit au modèle d’obéir aux instructions
                  contenues dans un document et impose un JSON validé par le
                  serveur. Le modèle ne calcule jamais de montant.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/30 p-3 text-[11.5px] leading-relaxed text-ink-soft">
              <Server
                size={15}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <p>
                Les valeurs par défaut conviennent à un usage local : 120 s,
                température 0, contexte 8 192 et 5 pages. Un délai trop court
                interrompt l’analyse sans bloquer la saisie manuelle.
              </p>
            </div>
          </div>
        </details>

        {save.isError ? (
          <p
            className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger"
            role="alert"
          >
            {errorMessage(save.error)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
          <p className="text-xs text-ink-soft" aria-live="polite">
            {isDirty
              ? "Modifications non enregistrées."
              : "Configuration à jour."}
          </p>
          <Button
            variant="primary"
            type="submit"
            icon={<Save size={15} />}
            loading={save.isPending}
            data-cy="btn-enregistrer-llm-bas"
          >
            Enregistrer la configuration IA
          </Button>
        </div>
      </form>
    </>
  );
}
