import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { queryKeys, useLlmConfig, useLlmModeles, useLlmStatus } from '@/api/queries';
import type { LlmConfigDto, LlmConfigRequest, LlmTestResponse, LlmStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState } from '@/components/States';
import { FieldGroup } from '@/components/FieldGroup';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/cn';
import { llmSchema, type LlmFormValues } from '@/lib/validation';
import { toast } from '@/state/toasts';

const STATUSES: Record<LlmStatus, { texte: string; classe: string; point: string; description: string }> = {
  PRET: {
    texte: 'Connecté',
    classe: 'badge-accent',
    point: 'bg-accent',
    description: 'Le serveur Ollama et le modèle configuré sont disponibles.',
  },
  PRET_DISTANT: {
    texte: 'Connecté — serveur distant',
    classe: 'badge-avertissement',
    point: 'bg-warning',
    description: 'Ollama répond, mais l’URL n’est pas locale : les documents quittent cette machine.',
  },
  MODELE_ABSENT: {
    texte: 'Modèle absent',
    classe: 'badge-avertissement',
    point: 'bg-warning',
    description: 'Ollama répond mais le modèle sélectionné n’est pas installé.',
  },
  INJOIGNABLE: {
    texte: 'Injoignable',
    classe: 'badge-danger',
    point: 'bg-danger',
    description: 'Le serveur Ollama ne répond pas. La saisie manuelle reste disponible.',
  },
  DESACTIVE: {
    texte: 'Désactivé',
    classe: 'badge-neutre',
    point: 'bg-ink-soft/60',
    description: 'L’analyse IA est désactivée. Toute l’application reste utilisable manuellement.',
  },
};

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isValidUrl(url: string): boolean {
  try {
    const analysis = new URL(url);
    return analysis.protocol === 'http:' || analysis.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0', 'host.docker.internal', 'ollama'].includes(host)
    ) {
      return true;
    }
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
      return true;
    }
    return /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch {
    return false;
  }
}

function valuesFromConfig(config: LlmConfigDto | undefined): LlmFormValues {
  return {
    actif: config?.actif ?? false,
    url: config?.url ?? 'http://host.docker.internal:11434',
    modele: config?.modele ?? '',
    timeoutSeconds: config?.timeoutSeconds ?? 120,
    temperature: config?.temperature ?? '0',
    numCtx: config?.numCtx ?? 8192,
    pagesMax: config?.pagesMax ?? 5,
    ocrActif: config?.ocrActif ?? false,
    promptExtraction: config?.promptExtraction ?? '',
    cleApi: '',
    supprimerCle: false,
  };
}

function requestBodyFromValues(values: LlmFormValues): LlmConfigRequest {
  const requestBody: LlmConfigRequest = {
    actif: values.actif,
    fournisseur: 'OLLAMA',
    url: normalizeUrl(values.url),
    modele: values.modele.trim(),
    timeoutSeconds: values.timeoutSeconds,
    temperature: values.temperature.trim().replace(',', '.'),
    numCtx: values.numCtx,
    pagesMax: values.pagesMax,
    ocrActif: values.ocrActif,
    promptExtraction: values.promptExtraction.trim(),
  };
  if (values.cleApi.trim()) {
    requestBody.cleApi = values.cleApi.trim();
  } else if (values.supprimerCle) {
    requestBody.cleApi = '';
  }
  return requestBody;
}

function Switch({ actif: active, onChange }: { actif: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label="Activer l’analyse par IA"
      onClick={onChange}
      data-cy="switch-llm-actif"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        active ? 'bg-accent' : 'bg-line-forte',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          active ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function StatusState() {
  const status = useLlmStatus();
  const key = (status.data?.statut as LlmStatus | undefined) ?? null;
  const info = key ? STATUSES[key] : null;

  return (
    <section className="carte mb-6 overflow-hidden" data-cy="llm-statut">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid h-10 w-10 place-items-center rounded-xl',
              key === 'PRET'
                ? 'bg-accent-soft text-accent'
                : key === 'DESACTIVE'
                  ? 'bg-paper-deep text-ink-soft'
                  : 'bg-warning-soft text-warning',
            )}
          >
            {key === 'PRET' ? (
              <CheckCircle2 size={19} aria-hidden="true" />
            ) : key === 'INJOIGNABLE' ? (
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
                className={cn('badge', info?.classe ?? 'badge-neutre')}
                data-cy="badge-llm-statut-admin"
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', info?.point ?? 'bg-ink-soft/60')}
                  aria-hidden="true"
                />
                {status.isPending ? 'Vérification…' : status.isError ? 'Indisponible' : (info?.texte ?? 'Inconnu')}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
              {status.data?.message ?? info?.description ?? 'Interrogation du serveur Ollama…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-soft sm:inline">
            {status.data?.joignable ? 'Serveur joignable' : status.data ? 'Serveur non joignable' : '—'}
            {status.data?.actif ? ' · IA activée' : status.data ? ' · IA désactivée' : ''}
          </span>
          <Button
            variante="secondaire"
            petit
            icone={<RefreshCw size={14} />}
            chargement={status.isFetching}
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
  const [savedUrl, setSavedUrl] = useState('');
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
    mode: 'onChange',
    defaultValues: valuesFromConfig(undefined),
  });

  const values = watch();
  const active = values.actif;
  const removeKey = values.supprimerCle;
  const remoteUrl = values.url.trim() !== '' && !isLocalUrl(values.url);
  const models = useLlmModeles(loadedUrl);

  useEffect(() => {
    if (!config.data) {
      return;
    }
    reset(valuesFromConfig(config.data));
    const url = normalizeUrl(config.data.url ?? '');
    setSavedUrl(url);
    setLoadedUrl(url || null);
  }, [config.data, reset]);

  useEffect(() => {
    if (removeKey) {
      setValue('cleApi', '', { shouldDirty: true });
    }
  }, [removeKey, setValue]);

  useEffect(() => {
    if (models.isError) {
      setManualMode(true);
    }
  }, [models.isError]);

  const save = useMutation({
    mutationFn: (submittedValues: LlmFormValues) => api.llm.enregistrer(requestBodyFromValues(submittedValues)),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.llmConfig, payload);
      const url = normalizeUrl(payload.url ?? '');
      setSavedUrl(url);
      setLoadedUrl(url || null);
      setTestResult(null);
      setTestError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatut });
      toast.succes('Configuration IA enregistrée.');
    },
  });

  async function refreshModels(force = false) {
    if (modelLock.current) {
      return;
    }
    const url = normalizeUrl(values.url);
    if (!isValidUrl(url)) {
      setModelsError('URL invalide : commencez par http:// ou https://.');
      return;
    }
    setModelsError(null);
    modelLock.current = true;
    setModelsLoading(true);
    try {
      if (url !== savedUrl) {
        await api.llm.enregistrer({ url });
        setSavedUrl(url);
        void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatut });
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
      const reply = await api.llm.promptDefaut();
      if (!reply.prompt) {
        toast.erreur('Le prompt par défaut est indisponible.');
        return;
      }
      setValue('promptExtraction', reply.prompt, { shouldDirty: true, shouldValidate: true });
      toast.info('Prompt par défaut chargé. Enregistrez pour l’appliquer.');
    } catch (error) {
      toast.erreur(errorMessage(error));
    } finally {
      setPromptInProgress(false);
    }
  }

  const runTest = handleSubmit(async (submittedValues) => {
    setTestInProgress(true);
    setTestResult(null);
    setTestError(null);
    try {
      const payload = await api.llm.enregistrer(requestBodyFromValues(submittedValues));
      queryClient.setQueryData(queryKeys.llmConfig, payload);
      const url = normalizeUrl(payload.url ?? '');
      setSavedUrl(url);
      setLoadedUrl(url || null);
      const result = await api.llm.tester();
      setTestResult(result);
      if (result.succes) {
        toast.succes('Test de connexion réussi.');
      } else {
        toast.erreur(result.message ?? 'Le test de connexion a échoué.');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatut });
    } catch (error) {
      setTestError(errorMessage(error));
    } finally {
      setTestInProgress(false);
    }
  });

  const modelOptions = useMemo(() => {
    const options = models.data ?? [];
    if (values.modele && !options.some((model) => model.nom === values.modele)) {
      return [
        {
          nom: values.modele,
          famille: null,
          parametres: null,
          vision: false,
          configure: true,
        },
        ...options.map((model) => ({ ...model, configure: false })),
      ];
    }
    return options.map((model) => ({ ...model, configure: false }));
  }, [models.data, values.modele]);

  const selectedModel = modelOptions.find((model) => model.nom === values.modele);
  const listLoading = modelsLoading || models.isPending;

  if (config.isPending) {
    return (
      <>
        <PageHeader surTitre="Réglages" titre="Admin IA" />
        <LoadingState message="Chargement de la configuration IA…" />
      </>
    );
  }

  if (config.isError) {
    return (
      <>
        <PageHeader surTitre="Réglages" titre="Admin IA" />
        <ErrorState message={errorMessage(config.error)} onReessayer={() => void config.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        surTitre="Réglages"
        titre="Admin IA"
        description="Ollama reste local par défaut. Le modèle ne fait que proposer une extraction : tous les montants sont vérifiés et calculés par le backend."
        actions={
          <>
            <Button
              variante="secondaire"
              icone={<Activity size={15} />}
              chargement={testInProgress}
              onClick={() => void runTest()}
              data-cy="btn-test-llm"
            >
              Tester la connexion
            </Button>
            <Button
              variante="primaire"
              type="submit"
              form="form-llm"
              icone={<Save size={15} />}
              chargement={save.isPending}
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
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <div className="text-xs leading-relaxed text-warning">
            <p className="font-semibold">Les justificatifs seront envoyés à un serveur distant.</p>
            <p className="mt-0.5">
              L’URL configurée n’est ni <code className="font-mono">localhost</code>, ni{' '}
              <code className="font-mono">host.docker.internal</code>, ni une IP privée. N’utilisez cette option que si
              vous acceptez ce transfert.
            </p>
          </div>
        </div>
      ) : null}

      <form
        id="form-llm"
        className="space-y-6"
        onSubmit={handleSubmit((submittedValues) => save.mutate(submittedValues))}
        noValidate
      >
        <section className="carte overflow-hidden">
          <div className="carte-entete">
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
                {active ? 'Analyse IA activée' : 'Analyse IA désactivée'}
              </span>
              <Switch actif={active} onChange={() => setValue('actif', !active, { shouldDirty: true })} />
            </div>
          </div>

          <div className="carte-corps space-y-5">
            {!active ? (
              <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/45 p-3 text-xs leading-relaxed text-ink-soft">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                Quand l’IA est désactivée, aucun justificatif n’est envoyé. Toute la saisie manuelle reste disponible.
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <FieldGroup id="llm-fournisseur" label="Fournisseur">
                <select id="llm-fournisseur" className="champ" value="OLLAMA" disabled>
                  <option value="OLLAMA">Ollama (local)</option>
                  <option value="OPENAI" disabled>
                    Compatible OpenAI — phase 2
                  </option>
                </select>
              </FieldGroup>

              <FieldGroup
                id="llm-url"
                label="URL du serveur Ollama"
                erreur={errors.url?.message}
                aide="Par défaut : http://host.docker.internal:11434. L’URL est enregistrée automatiquement lorsque la liste des modèles est actualisée."
              >
                <div className="flex gap-2">
                  <input
                    id="llm-url"
                    className={cn('champ mt-1.5', errors.url && 'champ-erreur')}
                    placeholder="http://host.docker.internal:11434"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('url')}
                    onBlur={() => {
                      const url = normalizeUrl(values.url);
                      if (isValidUrl(url) && url !== savedUrl) {
                        void refreshModels();
                      }
                    }}
                    data-cy="input-llm-url"
                  />
                  <Button
                    variante="secondaire"
                    className="mt-1.5 shrink-0"
                    icone={<RefreshCw size={15} className={cn(listLoading && 'animate-spin')} />}
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
                erreur={errors.modele?.message}
                aide={
                  selectedModel
                    ? `${selectedModel.famille || 'Famille inconnue'}${selectedModel.parametres ? ` · ${selectedModel.parametres}` : ''}${selectedModel.vision ? ' · accepte les images' : ''}`
                    : 'La liste est chargée depuis /api/tags. Vous pouvez saisir un nom manuellement si Ollama est injoignable.'
                }
              >
                {!manualMode ? (
                  <select
                    id="llm-modele"
                    className={cn('champ', errors.modele && 'champ-erreur')}
                    value={values.modele}
                    onChange={(event) => {
                      const choice = event.target.value;
                      if (choice === '__manuel__') {
                        setManualMode(true);
                        return;
                      }
                      setValue('modele', choice, { shouldDirty: true, shouldValidate: true });
                    }}
                    disabled={listLoading && modelOptions.length === 0}
                    data-cy="select-llm-model"
                  >
                    <option value="" disabled>
                      {listLoading && modelOptions.length === 0 ? 'Chargement des modèles…' : 'Sélectionnez un modèle'}
                    </option>
                    {modelOptions.map((model) => (
                      <option key={model.nom} value={model.nom}>
                        {model.nom}
                        {model.vision ? ' · vision' : ''}
                        {model.parametres ? ` · ${model.parametres}` : ''}
                        {model.configure ? ' (configuré)' : ''}
                      </option>
                    ))}
                    <option value="__manuel__">Saisie manuelle…</option>
                  </select>
                ) : null}

                {manualMode ? (
                  <div className="mt-1.5">
                    <input
                      id="llm-modele"
                      className={cn('champ mt-0', errors.modele && 'champ-erreur')}
                      placeholder="qwen2.5:7b"
                      autoComplete="off"
                      spellCheck={false}
                      {...register('modele')}
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
                      ? 'Ce modèle accepte les images : les photos et scans peuvent être analysés.'
                      : 'Ce modèle n’est pas signalé comme multimodal. Les PDF texte restent analysables ; les images nécessitent un modèle vision ou l’OCR.'}
                  </p>
                </div>
                {selectedModel && selectedModel.configure ? (
                  <p className="text-[11px] text-warning">
                    Ce modèle configuré n’apparaît pas dans la liste du serveur. Vérifiez qu’il est installé.
                  </p>
                ) : null}
              </div>
            </div>

            {modelsError || models.isError ? (
              <div className="rounded-xl border border-warning/25 bg-warning-soft/70 p-3 text-xs text-warning" role="alert">
                <p className="font-semibold">Liste des modèles indisponible.</p>
                <p className="mt-0.5">{modelsError ?? errorMessage(models.error)}</p>
                <p className="mt-1">Saisissez le nom du modèle manuellement, puis testez la connexion.</p>
              </div>
            ) : null}

            <div className="rounded-xl border border-line bg-paper/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <KeyRound size={16} className="mt-0.5 text-accent" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Clé API (facultative)</p>
                    <p className="text-[11.5px] text-ink-soft">
                      Jamais renvoyée par le serveur ni réaffichée. Laissez vide pour conserver la clé enregistrée.
                    </p>
                  </div>
                </div>
                <span className={cn('badge', config.data?.apiKeyConfiguree ? 'badge-accent' : 'badge-neutre')}>
                  {config.data?.apiKeyConfiguree ? 'Clé configurée' : 'Aucune clé'}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FieldGroup id="llm-cle-api" label="Nouvelle clé API" erreur={errors.cleApi?.message}>
                  <input
                    id="llm-cle-api"
                    type="password"
                    autoComplete="new-password"
                    className="champ"
                    placeholder={config.data?.apiKeyConfiguree ? 'Clé enregistrée — laisser vide' : 'Aucune clé enregistrée'}
                    disabled={removeKey}
                    {...register('cleApi')}
                    data-cy="input-llm-cle-api"
                  />
                </FieldGroup>
                {config.data?.apiKeyConfiguree ? (
                  <label className="mt-1.5 flex cursor-pointer items-start gap-2 self-end rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-line accent-[#1b5b49]"
                      {...register('supprimerCle')}
                      data-cy="checkbox-supprimer-cle"
                    />
                    <span>
                      <span className="block font-medium text-ink">Supprimer la clé enregistrée</span>
                      <span className="mt-0.5 block text-[11px]">
                        Envoie explicitement une clé vide. Sans cette case, une clé vide n’est jamais transmise.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <p className="text-[11px] text-ink-soft">
                « Tester la connexion » enregistre d’abord les réglages affichés, puis interroge le serveur.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variante="secondaire"
                  petit
                  icone={<Activity size={14} />}
                  chargement={testInProgress}
                  onClick={() => void runTest()}
                  data-cy="btn-test-llm-bas"
                >
                  Tester la connexion
                </Button>
                <Button
                  variante="primaire"
                  petit
                  type="submit"
                  icone={<Save size={14} />}
                  chargement={save.isPending}
                >
                  Enregistrer
                </Button>
              </div>
            </div>

            {testError ? (
              <p className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger" role="alert">
                {testError}
              </p>
            ) : null}

            {testResult ? (
              <div
                className={cn(
                  'rounded-xl border p-4',
                  testResult.succes ? 'border-accent/20 bg-accent-soft/50' : 'border-danger/20 bg-danger-soft/50',
                )}
                role={testResult.succes ? 'status' : 'alert'}
                data-cy="resultat-test-llm"
              >
                <div className="flex items-center gap-2">
                  {testResult.succes ? (
                    <CheckCircle2 size={17} className="text-accent" aria-hidden="true" />
                  ) : (
                    <XCircle size={17} className="text-danger" aria-hidden="true" />
                  )}
                  <p className={cn('text-sm font-semibold', testResult.succes ? 'text-accent' : 'text-danger')}>
                    {testResult.succes ? 'Connexion réussie' : 'Test échoué'}
                    {typeof testResult.dureeMs === 'number' ? ` en ${(testResult.dureeMs / 1000).toFixed(1)} s` : ''}
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{testResult.message}</p>
                {testResult.montantDetecte ? (
                  <p className="mt-2 text-xs text-ink">
                    Montant détecté sur le document de test :{' '}
                    <span className="font-mono font-semibold">{testResult.montantDetecte} €</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <details className="carte group overflow-hidden">
          <summary className="carte-entete cursor-pointer list-none">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper-deep text-ink-soft">
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl text-ink">Paramètres avancés</h2>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Délai, température, contexte, pages analysées, OCR et prompt d’extraction.
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-ink-soft group-open:hidden">Afficher</span>
            <span className="hidden text-xs font-medium text-ink-soft group-open:inline">Masquer</span>
          </summary>

          <div className="carte-corps space-y-5 border-t border-line">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldGroup
                id="llm-timeout"
                label="Délai (secondes)"
                erreur={errors.timeoutSeconds?.message}
              >
                <input
                  id="llm-timeout"
                  type="number"
                  min={5}
                  max={600}
                  step={1}
                  className={cn('champ', errors.timeoutSeconds && 'champ-erreur')}
                  {...register('timeoutSeconds', { valueAsNumber: true })}
                />
              </FieldGroup>
              <FieldGroup
                id="llm-temperature"
                label="Température"
                erreur={errors.temperature?.message}
                aide="0 = réponses déterministes, recommandé."
              >
                <input
                  id="llm-temperature"
                  className={cn('champ', errors.temperature && 'champ-erreur')}
                  inputMode="decimal"
                  {...register('temperature')}
                />
              </FieldGroup>
              <FieldGroup id="llm-numctx" label="Contexte (num_ctx)" erreur={errors.numCtx?.message}>
                <input
                  id="llm-numctx"
                  type="number"
                  min={1024}
                  max={131072}
                  step={1024}
                  className={cn('champ', errors.numCtx && 'champ-erreur')}
                  {...register('numCtx', { valueAsNumber: true })}
                />
              </FieldGroup>
              <FieldGroup id="llm-pages" label="Pages max analysées" erreur={errors.pagesMax?.message}>
                <input
                  id="llm-pages"
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  className={cn('champ', errors.pagesMax && 'champ-erreur')}
                  {...register('pagesMax', { valueAsNumber: true })}
                />
              </FieldGroup>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/35 p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-line accent-[#1b5b49]"
                {...register('ocrActif')}
              />
              <span>
                <span className="block text-sm font-medium text-ink">OCR Tesseract en secours</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">
                  À activer si Tesseract est installé sur le serveur : extrait le texte des justificatifs image ou
                  scannés avant l’analyse.
                </span>
              </span>
            </label>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="llm-prompt" className="label-champ">
                  Prompt d’extraction
                </label>
                <Button
                  variante="secondaire"
                  petit
                  icone={<RotateCcw size={13} />}
                  chargement={promptInProgress}
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
                className={cn('champ resize-y font-mono text-[12.5px] leading-relaxed', errors.promptExtraction && 'champ-erreur')}
                {...register('promptExtraction')}
                data-cy="input-llm-prompt"
              />
              {errors.promptExtraction ? (
                <p className="erreur-champ" role="alert">
                  {errors.promptExtraction.message}
                </p>
              ) : (
                <p className="aide">
                  Le prompt système interdit au modèle d’obéir aux instructions contenues dans un document et impose un
                  JSON validé par le serveur. Le modèle ne calcule jamais de montant.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/30 p-3 text-[11.5px] leading-relaxed text-ink-soft">
              <Server size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <p>
                Les valeurs par défaut conviennent à un usage local : 120 s, température 0, contexte 8 192 et 5 pages.
                Un délai trop court interrompt l’analyse sans bloquer la saisie manuelle.
              </p>
            </div>
          </div>
        </details>

        {save.isError ? (
          <p className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger" role="alert">
            {errorMessage(save.error)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
          <p className="text-xs text-ink-soft" aria-live="polite">
            {isDirty ? 'Modifications non enregistrées.' : 'Configuration à jour.'}
          </p>
          <Button
            variante="primaire"
            type="submit"
            icone={<Save size={15} />}
            chargement={save.isPending}
            data-cy="btn-enregistrer-llm-bas"
          >
            Enregistrer la configuration IA
          </Button>
        </div>
      </form>
    </>
  );
}
