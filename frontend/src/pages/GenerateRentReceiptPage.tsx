import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Download, ExternalLink, FileCheck2, LoaderCircle, ReceiptText, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { useSettings, useActiveRentReceipt, useTemplates } from '@/api/queries';
import type { RentReceiptDto, RentReceiptRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/States';
import { FieldGroup } from '@/components/FieldGroup';
import { PageHeader } from '@/components/PageHeader';
import { PdfViewer } from '@/components/PdfViewer';
import { downloadBlob } from '@/api/client';
import { usePdfPreview } from '@/hooks/usePdfPreview';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { periodOfMonth } from '@/lib/dates';
import { formatEUR, formatMonth, parseAmount } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useRentReceiptDraft } from '@/state/rentReceiptDraft';
import { useStatementDraft } from '@/state/statementDraft';
import { toast } from '@/state/toasts';
import { rentReceiptSchema, type RentReceiptFormValues } from '@/lib/validation';

function requestFromValues(
  values: RentReceiptFormValues,
  templateId: number | null,
): RentReceiptRequest {
  const request: RentReceiptRequest = {
    mois: values.mois,
    periodeDebut: values.periodeDebut,
    periodeFin: values.periodeFin,
    loyerHc: parseAmount(values.loyerHc) ?? '',
    charges: parseAmount(values.charges) ?? '',
  };
  if (values.datePaiement) {
    request.datePaiement = values.datePaiement;
  }
  if (values.dateEmission) {
    request.dateEmission = values.dateEmission;
  }
  if (templateId !== null) {
    request.templateId = templateId;
  }
  return request;
}

export function GenerateRentReceiptPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useRentReceiptDraft();
  const mobile = useMediaQuery('(max-width: 1023px)');
  const [mobilePanel, setMobilePanel] = useState<'saisie' | 'apercu'>('saisie');
  const [regenerationDialog, setRegenerationDialog] = useState(false);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [result, setResult] = useState<RentReceiptDto | null>(null);
  const pendingValues = useRef<RentReceiptFormValues | null>(null);

  const settings = useSettings();
  const templates = useTemplates('QUITTANCE');
  const activeRentReceipt = useActiveRentReceipt(draft.mois);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<RentReceiptFormValues>({
    resolver: zodResolver(rentReceiptSchema),
    mode: 'onChange',
    defaultValues: {
      mois: draft.mois,
      periodeDebut: draft.periodeDebut,
      periodeFin: draft.periodeFin,
      loyerHc: draft.loyerHc,
      charges: draft.charges,
      datePaiement: draft.datePaiement,
      dateEmission: draft.dateEmission,
    },
  });

  const values = watch();
  const validation = rentReceiptSchema.safeParse(values);

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.actif) ?? null;
  const selectedModel = draft.templateId ?? activeModel?.id ?? null;
  const request = validation.success
    ? requestFromValues(validation.data, selectedModel)
    : null;
  const signature = JSON.stringify(request ?? values);

  const preview = usePdfPreview(
    (signal) =>
      request
        ? api.quittances.apercu(request, signal)
        : Promise.reject(new DOMException('Formulaire incomplet', 'AbortError')),
    signature,
    { actif: validation.success, debounceMs: 400 },
  );

  useEffect(() => {
    if (!settings.data) {
      return;
    }
    const initializedBefore = useRentReceiptDraft.getState().initialise;
    draft.initialiserDepuisParametres(settings.data);
    if (!initializedBefore) {
      const phase = useRentReceiptDraft.getState();
      if (!getValues('loyerHc')) {
        setValue('loyerHc', phase.loyerHc, { shouldValidate: true });
      }
      if (!getValues('charges')) {
        setValue('charges', phase.charges, { shouldValidate: true });
      }
    }
    // L'initialisation ne doit se produire qu'au premier chargement des paramètres.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  const estimatedTotal = (() => {
    const rent = parseAmount(values.loyerHc) ?? '0';
    const costs = parseAmount(values.charges) ?? '0';
    return formatEUR(Number(rent) + Number(costs));
  })();

  async function runGeneration(submittedValues: RentReceiptFormValues) {
    if (!validation.success) {
      return;
    }
    const requestBody = requestFromValues(submittedValues, selectedModel);
    setGenerationInProgress(true);
    try {
      const rentReceipt = await api.quittances.generer(requestBody);
      setResult(rentReceipt);
      draft.marquerGenere();
      await queryClient.invalidateQueries({ queryKey: ['quittances'] });
      toast.succes(
        `Quittance de ${formatMonth(submittedValues.mois)} générée en version ${rentReceipt.version ?? 1}.`,
      );
    } catch (error) {
      toast.erreur(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  function soumettre(submittedValues: RentReceiptFormValues) {
    pendingValues.current = submittedValues;
    if (activeRentReceipt.data) {
      setRegenerationDialog(true);
      return;
    }
    void runGeneration(submittedValues);
  }

  async function downloadRentReceipt(rentReceipt: RentReceiptDto) {
    if (!rentReceipt.id) {
      return;
    }
    try {
      const reply = await api.quittances.pdf(rentReceipt.id);
      downloadBlob(
        reply.blob,
        reply.nomFichier ?? `quittance_${rentReceipt.mois ?? draft.mois}.pdf`,
      );
    } catch (error) {
      toast.erreur(errorMessage(error));
    }
  }

  function goToStatement() {
    const month = result?.mois ?? draft.mois;
    useStatementDraft.getState().changerMois(month);
    navigate('/generer/note-frais');
  }

  function resumeConfiguration() {
    if (!settings.data) {
      return;
    }
    draft.reprendreDepuisParametres(settings.data);
    setValue('loyerHc', settings.data.loyerHc ?? '', { shouldValidate: true });
    setValue('charges', settings.data.provisionCharges ?? '', { shouldValidate: true });
    toast.info('Montants repris depuis la configuration.');
  }

  function changeMonth(value: string) {
    if (!value) {
      return;
    }
    draft.changerMois(value);
    const period = periodOfMonth(value);
    setValue('periodeDebut', period.debut, { shouldValidate: true });
    setValue('periodeFin', period.fin, { shouldValidate: true });
  }

  const activeVersion = activeRentReceipt.data?.version;
  const displayedTotal = result
    ? formatEUR(result.total)
    : activeRentReceipt.data
      ? formatEUR(activeRentReceipt.data.total)
      : null;

  return (
    <>
      <PageHeader
        surTitre="Générer · Quittance"
        titre="Quittance de loyer"
        description="Choisissez le mois : la période, les montants et les coordonnées sont pré-remplis depuis votre configuration. Ajustez si besoin, puis générez le document définitif."
        actions={
          <>
            <Button
              variante="secondaire"
              icone={<ReceiptText size={15} />}
              onClick={() => navigate('/generer/note-frais')}
            >
              Note de frais du mois
            </Button>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium text-ink-soft sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMonth(draft.mois)}
            </span>
          </>
        }
      />

      {settings.isError ? (
        <div className="mb-4">
          <ErrorState message={errorMessage(settings.error)} onReessayer={() => void settings.refetch()} />
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="segmented w-full" role="tablist" aria-label="Volets de génération">
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === 'saisie'}
            onClick={() => setMobilePanel('saisie')}
            className={cn('segmented-item flex-1', mobilePanel === 'saisie' && 'segmented-item-actif')}
          >
            Saisie
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === 'apercu'}
            onClick={() => setMobilePanel('apercu')}
            className={cn(
              'segmented-item flex flex-1 items-center justify-center gap-2',
              mobilePanel === 'apercu' && 'segmented-item-actif',
            )}
          >
            Aperçu
            {preview.misAJour ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" /> : null}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)] xl:gap-6">
        <div
          data-cy="volet-saisie"
          className={cn('min-w-0 space-y-4', mobile && mobilePanel !== 'saisie' && 'hidden')}
        >
          {activeRentReceipt.data && !result ? (
            <div className="carte flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
                  <FileCheck2 size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {formatMonth(activeRentReceipt.data.mois)} — version {activeVersion} déjà active
                  </p>
                  <p className="text-xs text-ink-soft">
                    Total {displayedTotal}. Générer à nouveau créera la version {(activeVersion ?? 0) + 1}.
                  </p>
                </div>
              </div>
              {activeRentReceipt.data.id ? (
                <a
                  href={api.quittances.urlPdf(activeRentReceipt.data.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondaire btn-petit"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Ouvrir le PDF
                </a>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <div className="carte animation-fondu overflow-hidden border-accent/25">
              <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-accent">Quittance générée</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatMonth(result.mois)} · version {result.version ?? 1} · {formatEUR(result.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Enregistrée dans l’historique avec le template « {result.templateNom ?? 'modèle intégré'} » v
                    {result.templateVersion ?? 1}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Button
                  variante="primaire"
                  petit
                  icone={<Download size={14} />}
                  onClick={() => void downloadRentReceipt(result)}
                  data-cy="btn-telecharger-quittance"
                >
                  Télécharger le PDF
                </Button>
                {result.id ? (
                  <a
                    href={api.quittances.urlPdf(result.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondaire btn-petit"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Ouvrir
                  </a>
                ) : null}
                <Button variante="fantome" petit onClick={goToStatement}>
                  Aller à la note de frais de ce mois
                </Button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit(soumettre)} noValidate>
            <div className="carte">
              <div className="carte-entete">
                <div>
                  <p className="eyebrow">Étape 1</p>
                  <h2 className="mt-1 text-[22px] text-ink">Paramètres de la quittance</h2>
                </div>
                <span className="badge badge-neutre">
                  <Sparkles size={11} aria-hidden="true" />
                  Calcul backend
                </span>
              </div>

              <div className="carte-corps space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-mois"
                    label="Mois concerné"
                    erreur={errors.mois?.message}
                    aide="La période est recalculée automatiquement."
                  >
                    <input
                      id="quittance-mois"
                      type="month"
                      className={cn('champ', errors.mois && 'champ-erreur')}
                      data-cy="select-mois"
                      aria-invalid={Boolean(errors.mois)}
                      {...register('mois', {
                        onChange: (event) => changeMonth(event.target.value),
                      })}
                    />
                  </FieldGroup>

                  <FieldGroup
                    id="quittance-template"
                    label="Template"
                    aide="Le modèle actif est utilisé par défaut."
                    badge={<span className="badge badge-neutre">Versionné</span>}
                  >
                    <select
                      id="quittance-template"
                      className="champ"
                      data-cy="select-template"
                      value={selectedModel ?? ''}
                      onChange={(event) =>
                        draft.definirTemplate(event.target.value ? Number(event.target.value) : null)
                      }
                      disabled={templates.isPending || models.length === 0}
                    >
                      {models.length === 0 ? <option value="">Modèle intégré</option> : null}
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.nom} — v{model.version}
                          {model.actif ? ' (actif)' : ''}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-debut"
                    label="Début de période"
                    erreur={errors.periodeDebut?.message}
                  >
                    <input
                      id="quittance-debut"
                      type="date"
                      className={cn('champ', errors.periodeDebut && 'champ-erreur')}
                      aria-invalid={Boolean(errors.periodeDebut)}
                      {...register('periodeDebut', {
                        onChange: (event) => draft.modifier({ periodeDebut: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                  <FieldGroup id="quittance-fin" label="Fin de période" erreur={errors.periodeFin?.message}>
                    <input
                      id="quittance-fin"
                      type="date"
                      className={cn('champ', errors.periodeFin && 'champ-erreur')}
                      aria-invalid={Boolean(errors.periodeFin)}
                      {...register('periodeFin', {
                        onChange: (event) => draft.modifier({ periodeFin: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-loyer"
                    label="Loyer hors charges"
                    erreur={errors.loyerHc?.message}
                    aide="Modifiable pour une régularisation ponctuelle."
                  >
                    <div className="relative">
                      <input
                        id="quittance-loyer"
                        inputMode="decimal"
                        className={cn('champ pr-9', errors.loyerHc && 'champ-erreur')}
                        aria-invalid={Boolean(errors.loyerHc)}
                        {...register('loyerHc', {
                          onChange: (event) => draft.modifier({ loyerHc: event.target.value }),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>
                  <FieldGroup
                    id="quittance-charges"
                    label="Provision pour charges"
                    erreur={errors.charges?.message}
                  >
                    <div className="relative">
                      <input
                        id="quittance-charges"
                        inputMode="decimal"
                        className={cn('champ pr-9', errors.charges && 'champ-erreur')}
                        aria-invalid={Boolean(errors.charges)}
                        {...register('charges', {
                          onChange: (event) => draft.modifier({ charges: event.target.value }),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3.5">
                  <div>
                    <p className="eyebrow text-accent">Total estimé</p>
                    <p className="mt-1 font-display text-[28px] leading-none text-accent-strong nombre">{estimatedTotal}</p>
                  </div>
                  <p className="max-w-[240px] text-right text-[11px] leading-snug text-ink-soft">
                    Affichage estimé. Le backend calcule le total du PDF avec arrondi au centime.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup id="quittance-paiement" label="Date de paiement" erreur={errors.datePaiement?.message}>
                    <input
                      id="quittance-paiement"
                      type="date"
                      className={cn('champ', errors.datePaiement && 'champ-erreur')}
                      {...register('datePaiement', {
                        onChange: (event) => draft.modifier({ datePaiement: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                  <FieldGroup id="quittance-emission" label="Date d’émission" erreur={errors.dateEmission?.message}>
                    <input
                      id="quittance-emission"
                      type="date"
                      className={cn('champ', errors.dateEmission && 'champ-erreur')}
                      {...register('dateEmission', {
                        onChange: (event) => draft.modifier({ dateEmission: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                </div>

                <p className="aide">
                  Les coordonnées du bailleur, du locataire et du logement proviennent de la{' '}
                  <button
                    type="button"
                    className="lien"
                    onClick={() => navigate('/configuration')}
                  >
                    configuration
                  </button>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variante="primaire"
                    chargement={generationInProgress}
                    icone={<ReceiptText size={16} />}
                    disabled={!isValid || activeRentReceipt.isPending || templates.isPending}
                    data-cy="btn-generer-quittance"
                  >
                    Générer la quittance
                  </Button>
                  <Button
                    variante="fantome"
                    petit
                    icone={<RotateCcw size={13} />}
                    onClick={resumeConfiguration}
                    disabled={!settings.data || generationInProgress}
                  >
                    Reprendre la configuration
                  </Button>
                </div>
                {activeRentReceipt.data ? (
                  <p className="text-[11px] text-ink-soft">
                    Version active : v{activeVersion} → v{(activeVersion ?? 0) + 1} à la génération.
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-soft">
                    {generationInProgress ? (
                      <span className="inline-flex items-center gap-1.5">
                        <LoaderCircle size={12} className="animate-spin" /> Génération en cours…
                      </span>
                    ) : (
                      'Le PDF définitif est enregistré dans l’historique.'
                    )}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        <div
          data-cy="volet-apercu"
          className={cn(
            'min-w-0',
            mobile && mobilePanel !== 'apercu' && 'hidden',
            'lg:sticky lg:top-6 lg:self-start',
          )}
        >
          <PdfViewer
            url={preview.url}
            chargement={preview.chargement}
            erreur={
              !validation.success
                ? 'Complétez les champs de la quittance pour actualiser l’aperçu.'
                : preview.erreur
            }
            misAJour={preview.misAJour}
            onTelecharger={preview.telecharger}
            actions={
              <select
                aria-label="Template de la quittance"
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
                value={selectedModel ?? ''}
                onChange={(event) =>
                  draft.definirTemplate(event.target.value ? Number(event.target.value) : null)
                }
                disabled={models.length === 0}
                data-cy="select-template-apercu"
              >
                {models.length === 0 ? <option value="">Modèle intégré</option> : null}
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.nom} — v{model.version}
                  </option>
                ))}
              </select>
            }
          />
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
            L’aperçu est rendu par le backend à partir du template actif. Il porte un filigrane et n’est jamais
            enregistré.
          </p>
        </div>
      </div>

      <ConfirmDialog
        ouvert={regenerationDialog}
        titre="Générer une nouvelle version ?"
        message={
          <>
            Une quittance active existe déjà pour {formatMonth(draft.mois)} (version {activeVersion}).
            La version {(activeVersion ?? 0) + 1} sera créée et l’ancienne restera consultable dans l’historique.
          </>
        }
        libelleConfirmer="Créer la nouvelle version"
        onConfirmer={() => {
          setRegenerationDialog(false);
          const submittedValues = pendingValues.current;
          if (submittedValues) {
            void runGeneration(submittedValues);
          }
        }}
        onAnnuler={() => setRegenerationDialog(false)}
        dataCy="dialogue-regeneration-quittance"
      />
    </>
  );
}
