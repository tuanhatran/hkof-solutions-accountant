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
import { messageErreur } from '@/api/client';
import { api } from '@/api/endpoints';
import { cles, useLlmConfig, useLlmModeles, useLlmStatus } from '@/api/queries';
import type { LlmConfigDto, LlmConfigRequest, LlmTestResponse, StatutLlm } from '@/api/types';
import { Bouton } from '@/components/Bouton';
import { EtatChargement, EtatErreur } from '@/components/Etats';
import { GroupeChamp } from '@/components/GroupeChamp';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/cn';
import { llmSchema, type LlmFormValues } from '@/lib/validation';
import { toast } from '@/state/toasts';

const STATUTS: Record<StatutLlm, { texte: string; classe: string; point: string; description: string }> = {
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

function normaliserUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function urlValide(url: string): boolean {
  try {
    const analyse = new URL(url);
    return analyse.protocol === 'http:' || analyse.protocol === 'https:';
  } catch {
    return false;
  }
}

function estUrlLocale(url: string): boolean {
  try {
    const hote = new URL(url).hostname.toLowerCase();
    if (
      ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0', 'host.docker.internal', 'ollama'].includes(hote)
    ) {
      return true;
    }
    if (/^127\./.test(hote) || /^10\./.test(hote) || /^192\.168\./.test(hote) || /^169\.254\./.test(hote)) {
      return true;
    }
    return /^172\.(1[6-9]|2\d|3[01])\./.test(hote);
  } catch {
    return false;
  }
}

function valeursDepuisConfig(config: LlmConfigDto | undefined): LlmFormValues {
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

function corpsDepuisValeurs(valeurs: LlmFormValues): LlmConfigRequest {
  const corps: LlmConfigRequest = {
    actif: valeurs.actif,
    fournisseur: 'OLLAMA',
    url: normaliserUrl(valeurs.url),
    modele: valeurs.modele.trim(),
    timeoutSeconds: valeurs.timeoutSeconds,
    temperature: valeurs.temperature.trim().replace(',', '.'),
    numCtx: valeurs.numCtx,
    pagesMax: valeurs.pagesMax,
    ocrActif: valeurs.ocrActif,
    promptExtraction: valeurs.promptExtraction.trim(),
  };
  if (valeurs.cleApi.trim()) {
    corps.cleApi = valeurs.cleApi.trim();
  } else if (valeurs.supprimerCle) {
    corps.cleApi = '';
  }
  return corps;
}

function Switch({ actif, onChange }: { actif: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label="Activer l’analyse par IA"
      onClick={onChange}
      data-cy="switch-llm-actif"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        actif ? 'bg-accent' : 'bg-line-forte',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          actif ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function EtatStatut() {
  const statut = useLlmStatus();
  const cle = (statut.data?.statut as StatutLlm | undefined) ?? null;
  const info = cle ? STATUTS[cle] : null;

  return (
    <section className="carte mb-6 overflow-hidden" data-cy="llm-statut">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid h-10 w-10 place-items-center rounded-xl',
              cle === 'PRET'
                ? 'bg-accent-soft text-accent'
                : cle === 'DESACTIVE'
                  ? 'bg-paper-deep text-ink-soft'
                  : 'bg-warning-soft text-warning',
            )}
          >
            {cle === 'PRET' ? (
              <CheckCircle2 size={19} aria-hidden="true" />
            ) : cle === 'INJOIGNABLE' ? (
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
                {statut.isPending ? 'Vérification…' : statut.isError ? 'Indisponible' : (info?.texte ?? 'Inconnu')}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
              {statut.data?.message ?? info?.description ?? 'Interrogation du serveur Ollama…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-soft sm:inline">
            {statut.data?.joignable ? 'Serveur joignable' : statut.data ? 'Serveur non joignable' : '—'}
            {statut.data?.actif ? ' · IA activée' : statut.data ? ' · IA désactivée' : ''}
          </span>
          <Bouton
            variante="secondaire"
            petit
            icone={<RefreshCw size={14} />}
            chargement={statut.isFetching}
            onClick={() => void statut.refetch()}
          >
            Actualiser
          </Bouton>
        </div>
      </div>
    </section>
  );
}

export function AdminLlmPage() {
  const queryClient = useQueryClient();
  const config = useLlmConfig();
  const [urlChargee, setUrlChargee] = useState<string | null>(null);
  const [urlSauvegardee, setUrlSauvegardee] = useState('');
  const [modeManuel, setModeManuel] = useState(false);
  const [erreurModeles, setErreurModeles] = useState<string | null>(null);
  const [chargementModeles, setChargementModeles] = useState(false);
  const [testEnCours, setTestEnCours] = useState(false);
  const [test, setTest] = useState<LlmTestResponse | null>(null);
  const [erreurTest, setErreurTest] = useState<string | null>(null);
  const [promptEnCours, setPromptEnCours] = useState(false);
  const verrouModeles = useRef(false);

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
    defaultValues: valeursDepuisConfig(undefined),
  });

  const valeurs = watch();
  const actif = valeurs.actif;
  const supprimerCle = valeurs.supprimerCle;
  const urlDistante = valeurs.url.trim() !== '' && !estUrlLocale(valeurs.url);
  const modeles = useLlmModeles(urlChargee);

  useEffect(() => {
    if (!config.data) {
      return;
    }
    reset(valeursDepuisConfig(config.data));
    const url = normaliserUrl(config.data.url ?? '');
    setUrlSauvegardee(url);
    setUrlChargee(url || null);
  }, [config.data, reset]);

  useEffect(() => {
    if (supprimerCle) {
      setValue('cleApi', '', { shouldDirty: true });
    }
  }, [supprimerCle, setValue]);

  useEffect(() => {
    if (modeles.isError) {
      setModeManuel(true);
    }
  }, [modeles.isError]);

  const enregistrer = useMutation({
    mutationFn: (valeursSoumises: LlmFormValues) => api.llm.enregistrer(corpsDepuisValeurs(valeursSoumises)),
    onSuccess: (donnees) => {
      queryClient.setQueryData(cles.llmConfig, donnees);
      const url = normaliserUrl(donnees.url ?? '');
      setUrlSauvegardee(url);
      setUrlChargee(url || null);
      setTest(null);
      setErreurTest(null);
      void queryClient.invalidateQueries({ queryKey: cles.llmStatut });
      toast.succes('Configuration IA enregistrée.');
    },
  });

  async function actualiserModeles(force = false) {
    if (verrouModeles.current) {
      return;
    }
    const url = normaliserUrl(valeurs.url);
    if (!urlValide(url)) {
      setErreurModeles('URL invalide : commencez par http:// ou https://.');
      return;
    }
    setErreurModeles(null);
    verrouModeles.current = true;
    setChargementModeles(true);
    try {
      if (url !== urlSauvegardee) {
        await api.llm.enregistrer({ url });
        setUrlSauvegardee(url);
        void queryClient.invalidateQueries({ queryKey: cles.llmStatut });
      }
      if (url !== urlChargee) {
        setUrlChargee(url);
        setModeManuel(false);
      } else if (force) {
        const resultat = await modeles.refetch();
        if (resultat.isError) {
          setErreurModeles(messageErreur(resultat.error));
        }
      }
    } catch (error) {
      setErreurModeles(messageErreur(error));
    } finally {
      verrouModeles.current = false;
      setChargementModeles(false);
    }
  }

  async function reinitialiserPrompt() {
    setPromptEnCours(true);
    try {
      const reponse = await api.llm.promptDefaut();
      if (!reponse.prompt) {
        toast.erreur('Le prompt par défaut est indisponible.');
        return;
      }
      setValue('promptExtraction', reponse.prompt, { shouldDirty: true, shouldValidate: true });
      toast.info('Prompt par défaut chargé. Enregistrez pour l’appliquer.');
    } catch (error) {
      toast.erreur(messageErreur(error));
    } finally {
      setPromptEnCours(false);
    }
  }

  const lancerTest = handleSubmit(async (valeursSoumises) => {
    setTestEnCours(true);
    setTest(null);
    setErreurTest(null);
    try {
      const donnees = await api.llm.enregistrer(corpsDepuisValeurs(valeursSoumises));
      queryClient.setQueryData(cles.llmConfig, donnees);
      const url = normaliserUrl(donnees.url ?? '');
      setUrlSauvegardee(url);
      setUrlChargee(url || null);
      const resultat = await api.llm.tester();
      setTest(resultat);
      if (resultat.succes) {
        toast.succes('Test de connexion réussi.');
      } else {
        toast.erreur(resultat.message ?? 'Le test de connexion a échoué.');
      }
      void queryClient.invalidateQueries({ queryKey: cles.llmStatut });
    } catch (error) {
      setErreurTest(messageErreur(error));
    } finally {
      setTestEnCours(false);
    }
  });

  const optionsModeles = useMemo(() => {
    const options = modeles.data ?? [];
    if (valeurs.modele && !options.some((modele) => modele.nom === valeurs.modele)) {
      return [
        {
          nom: valeurs.modele,
          famille: null,
          parametres: null,
          vision: false,
          configure: true,
        },
        ...options.map((modele) => ({ ...modele, configure: false })),
      ];
    }
    return options.map((modele) => ({ ...modele, configure: false }));
  }, [modeles.data, valeurs.modele]);

  const modeleChoisi = optionsModeles.find((modele) => modele.nom === valeurs.modele);
  const chargementListe = chargementModeles || modeles.isPending;

  if (config.isPending) {
    return (
      <>
        <PageHeader surTitre="Réglages" titre="Admin IA" />
        <EtatChargement message="Chargement de la configuration IA…" />
      </>
    );
  }

  if (config.isError) {
    return (
      <>
        <PageHeader surTitre="Réglages" titre="Admin IA" />
        <EtatErreur message={messageErreur(config.error)} onReessayer={() => void config.refetch()} />
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
            <Bouton
              variante="secondaire"
              icone={<Activity size={15} />}
              chargement={testEnCours}
              onClick={() => void lancerTest()}
              data-cy="btn-test-llm"
            >
              Tester la connexion
            </Bouton>
            <Bouton
              variante="primaire"
              type="submit"
              form="form-llm"
              icone={<Save size={15} />}
              chargement={enregistrer.isPending}
              data-cy="btn-enregistrer-llm"
            >
              Enregistrer
            </Bouton>
          </>
        }
      />

      <EtatStatut />

      {urlDistante ? (
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
        onSubmit={handleSubmit((valeursSoumises) => enregistrer.mutate(valeursSoumises))}
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
                {actif ? 'Analyse IA activée' : 'Analyse IA désactivée'}
              </span>
              <Switch actif={actif} onChange={() => setValue('actif', !actif, { shouldDirty: true })} />
            </div>
          </div>

          <div className="carte-corps space-y-5">
            {!actif ? (
              <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/45 p-3 text-xs leading-relaxed text-ink-soft">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                Quand l’IA est désactivée, aucun justificatif n’est envoyé. Toute la saisie manuelle reste disponible.
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <GroupeChamp id="llm-fournisseur" label="Fournisseur">
                <select id="llm-fournisseur" className="champ" value="OLLAMA" disabled>
                  <option value="OLLAMA">Ollama (local)</option>
                  <option value="OPENAI" disabled>
                    Compatible OpenAI — phase 2
                  </option>
                </select>
              </GroupeChamp>

              <GroupeChamp
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
                      const url = normaliserUrl(valeurs.url);
                      if (urlValide(url) && url !== urlSauvegardee) {
                        void actualiserModeles();
                      }
                    }}
                    data-cy="input-llm-url"
                  />
                  <Bouton
                    variante="secondaire"
                    className="mt-1.5 shrink-0"
                    icone={<RefreshCw size={15} className={cn(chargementListe && 'animate-spin')} />}
                    disabled={chargementListe}
                    onClick={() => void actualiserModeles(true)}
                    aria-label="Actualiser la liste des modèles"
                    data-cy="btn-refresh-models"
                  >
                    Actualiser
                  </Bouton>
                </div>
              </GroupeChamp>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <GroupeChamp
                id="llm-modele"
                label="Modèle"
                erreur={errors.modele?.message}
                aide={
                  modeleChoisi
                    ? `${modeleChoisi.famille || 'Famille inconnue'}${modeleChoisi.parametres ? ` · ${modeleChoisi.parametres}` : ''}${modeleChoisi.vision ? ' · accepte les images' : ''}`
                    : 'La liste est chargée depuis /api/tags. Vous pouvez saisir un nom manuellement si Ollama est injoignable.'
                }
              >
                {!modeManuel ? (
                  <select
                    id="llm-modele"
                    className={cn('champ', errors.modele && 'champ-erreur')}
                    value={valeurs.modele}
                    onChange={(evenement) => {
                      const choix = evenement.target.value;
                      if (choix === '__manuel__') {
                        setModeManuel(true);
                        return;
                      }
                      setValue('modele', choix, { shouldDirty: true, shouldValidate: true });
                    }}
                    disabled={chargementListe && optionsModeles.length === 0}
                    data-cy="select-llm-model"
                  >
                    <option value="" disabled>
                      {chargementListe && optionsModeles.length === 0 ? 'Chargement des modèles…' : 'Sélectionnez un modèle'}
                    </option>
                    {optionsModeles.map((modele) => (
                      <option key={modele.nom} value={modele.nom}>
                        {modele.nom}
                        {modele.vision ? ' · vision' : ''}
                        {modele.parametres ? ` · ${modele.parametres}` : ''}
                        {modele.configure ? ' (configuré)' : ''}
                      </option>
                    ))}
                    <option value="__manuel__">Saisie manuelle…</option>
                  </select>
                ) : null}

                {modeManuel ? (
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
                    {modeles.data && modeles.data.length > 0 ? (
                      <button
                        type="button"
                        className="mt-1.5 text-xs font-medium text-accent underline decoration-accent/30 underline-offset-4"
                        onClick={() => setModeManuel(false)}
                      >
                        Choisir dans la liste
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </GroupeChamp>

              <div className="flex flex-col justify-end gap-2">
                <div className="rounded-xl border border-line bg-paper/40 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <Cpu size={14} className="text-accent" aria-hidden="true" />
                    Support des images
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                    {modeleChoisi?.vision
                      ? 'Ce modèle accepte les images : les photos et scans peuvent être analysés.'
                      : 'Ce modèle n’est pas signalé comme multimodal. Les PDF texte restent analysables ; les images nécessitent un modèle vision ou l’OCR.'}
                  </p>
                </div>
                {modeleChoisi && modeleChoisi.configure ? (
                  <p className="text-[11px] text-warning">
                    Ce modèle configuré n’apparaît pas dans la liste du serveur. Vérifiez qu’il est installé.
                  </p>
                ) : null}
              </div>
            </div>

            {erreurModeles || modeles.isError ? (
              <div className="rounded-xl border border-warning/25 bg-warning-soft/70 p-3 text-xs text-warning" role="alert">
                <p className="font-semibold">Liste des modèles indisponible.</p>
                <p className="mt-0.5">{erreurModeles ?? messageErreur(modeles.error)}</p>
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
                <GroupeChamp id="llm-cle-api" label="Nouvelle clé API" erreur={errors.cleApi?.message}>
                  <input
                    id="llm-cle-api"
                    type="password"
                    autoComplete="new-password"
                    className="champ"
                    placeholder={config.data?.apiKeyConfiguree ? 'Clé enregistrée — laisser vide' : 'Aucune clé enregistrée'}
                    disabled={supprimerCle}
                    {...register('cleApi')}
                    data-cy="input-llm-cle-api"
                  />
                </GroupeChamp>
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
                <Bouton
                  variante="secondaire"
                  petit
                  icone={<Activity size={14} />}
                  chargement={testEnCours}
                  onClick={() => void lancerTest()}
                  data-cy="btn-test-llm-bas"
                >
                  Tester la connexion
                </Bouton>
                <Bouton
                  variante="primaire"
                  petit
                  type="submit"
                  icone={<Save size={14} />}
                  chargement={enregistrer.isPending}
                >
                  Enregistrer
                </Bouton>
              </div>
            </div>

            {erreurTest ? (
              <p className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger" role="alert">
                {erreurTest}
              </p>
            ) : null}

            {test ? (
              <div
                className={cn(
                  'rounded-xl border p-4',
                  test.succes ? 'border-accent/20 bg-accent-soft/50' : 'border-danger/20 bg-danger-soft/50',
                )}
                role={test.succes ? 'status' : 'alert'}
                data-cy="resultat-test-llm"
              >
                <div className="flex items-center gap-2">
                  {test.succes ? (
                    <CheckCircle2 size={17} className="text-accent" aria-hidden="true" />
                  ) : (
                    <XCircle size={17} className="text-danger" aria-hidden="true" />
                  )}
                  <p className={cn('text-sm font-semibold', test.succes ? 'text-accent' : 'text-danger')}>
                    {test.succes ? 'Connexion réussie' : 'Test échoué'}
                    {typeof test.dureeMs === 'number' ? ` en ${(test.dureeMs / 1000).toFixed(1)} s` : ''}
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{test.message}</p>
                {test.montantDetecte ? (
                  <p className="mt-2 text-xs text-ink">
                    Montant détecté sur le document de test :{' '}
                    <span className="font-mono font-semibold">{test.montantDetecte} €</span>
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
              <GroupeChamp
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
              </GroupeChamp>
              <GroupeChamp
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
              </GroupeChamp>
              <GroupeChamp id="llm-numctx" label="Contexte (num_ctx)" erreur={errors.numCtx?.message}>
                <input
                  id="llm-numctx"
                  type="number"
                  min={1024}
                  max={131072}
                  step={1024}
                  className={cn('champ', errors.numCtx && 'champ-erreur')}
                  {...register('numCtx', { valueAsNumber: true })}
                />
              </GroupeChamp>
              <GroupeChamp id="llm-pages" label="Pages max analysées" erreur={errors.pagesMax?.message}>
                <input
                  id="llm-pages"
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  className={cn('champ', errors.pagesMax && 'champ-erreur')}
                  {...register('pagesMax', { valueAsNumber: true })}
                />
              </GroupeChamp>
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
                <Bouton
                  variante="secondaire"
                  petit
                  icone={<RotateCcw size={13} />}
                  chargement={promptEnCours}
                  onClick={() => void reinitialiserPrompt()}
                  data-cy="btn-reinitialiser-prompt"
                >
                  Réinitialiser le prompt par défaut
                </Bouton>
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

        {enregistrer.isError ? (
          <p className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger" role="alert">
            {messageErreur(enregistrer.error)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
          <p className="text-xs text-ink-soft" aria-live="polite">
            {isDirty ? 'Modifications non enregistrées.' : 'Configuration à jour.'}
          </p>
          <Bouton
            variante="primaire"
            type="submit"
            icone={<Save size={15} />}
            chargement={enregistrer.isPending}
            data-cy="btn-enregistrer-llm-bas"
          >
            Enregistrer la configuration IA
          </Bouton>
        </div>
      </form>
    </>
  );
}
