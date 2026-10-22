import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Download, ExternalLink, FileCheck2, LoaderCircle, ReceiptText, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { messageErreur } from '@/api/client';
import { api } from '@/api/endpoints';
import { useParametres, useQuittanceActive, useTemplates } from '@/api/queries';
import type { QuittanceDto, QuittanceRequest } from '@/api/types';
import { Bouton } from '@/components/Bouton';
import { DialogueConfirmation } from '@/components/DialogueConfirmation';
import { EtatErreur } from '@/components/Etats';
import { GroupeChamp } from '@/components/GroupeChamp';
import { PageHeader } from '@/components/PageHeader';
import { PdfViewer } from '@/components/PdfViewer';
import { telechargerBlob } from '@/api/client';
import { useApercuPdf } from '@/hooks/useApercuPdf';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { periodeDuMois } from '@/lib/dates';
import { formatEUR, formatMois, parseMontant } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useQuittanceDraft } from '@/state/quittanceDraft';
import { useNoteDraft } from '@/state/noteDraft';
import { toast } from '@/state/toasts';
import { quittanceSchema, type QuittanceFormValues } from '@/lib/validation';

function requeteDepuisValeurs(
  valeurs: QuittanceFormValues,
  templateId: number | null,
): QuittanceRequest {
  const requete: QuittanceRequest = {
    mois: valeurs.mois,
    periodeDebut: valeurs.periodeDebut,
    periodeFin: valeurs.periodeFin,
    loyerHc: parseMontant(valeurs.loyerHc) ?? '',
    charges: parseMontant(valeurs.charges) ?? '',
  };
  if (valeurs.datePaiement) {
    requete.datePaiement = valeurs.datePaiement;
  }
  if (valeurs.dateEmission) {
    requete.dateEmission = valeurs.dateEmission;
  }
  if (templateId !== null) {
    requete.templateId = templateId;
  }
  return requete;
}

export function GenererQuittancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const brouillon = useQuittanceDraft();
  const mobile = useMediaQuery('(max-width: 1023px)');
  const [voletMobile, setVoletMobile] = useState<'saisie' | 'apercu'>('saisie');
  const [dialogueRegeneration, setDialogueRegeneration] = useState(false);
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [resultat, setResultat] = useState<QuittanceDto | null>(null);
  const valeursEnAttente = useRef<QuittanceFormValues | null>(null);

  const parametres = useParametres();
  const templates = useTemplates('QUITTANCE');
  const quittanceActive = useQuittanceActive(brouillon.mois);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<QuittanceFormValues>({
    resolver: zodResolver(quittanceSchema),
    mode: 'onChange',
    defaultValues: {
      mois: brouillon.mois,
      periodeDebut: brouillon.periodeDebut,
      periodeFin: brouillon.periodeFin,
      loyerHc: brouillon.loyerHc,
      charges: brouillon.charges,
      datePaiement: brouillon.datePaiement,
      dateEmission: brouillon.dateEmission,
    },
  });

  const valeurs = watch();
  const validation = quittanceSchema.safeParse(valeurs);

  const modeles = templates.data ?? [];
  const modeleActif = modeles.find((modele) => modele.actif) ?? null;
  const modeleSelectionne = brouillon.templateId ?? modeleActif?.id ?? null;
  const requete = validation.success
    ? requeteDepuisValeurs(validation.data, modeleSelectionne)
    : null;
  const signature = JSON.stringify(requete ?? valeurs);

  const apercu = useApercuPdf(
    (signal) =>
      requete
        ? api.quittances.apercu(requete, signal)
        : Promise.reject(new DOMException('Formulaire incomplet', 'AbortError')),
    signature,
    { actif: validation.success, debounceMs: 400 },
  );

  useEffect(() => {
    if (!parametres.data) {
      return;
    }
    const initialiseAvant = useQuittanceDraft.getState().initialise;
    brouillon.initialiserDepuisParametres(parametres.data);
    if (!initialiseAvant) {
      const etat = useQuittanceDraft.getState();
      if (!getValues('loyerHc')) {
        setValue('loyerHc', etat.loyerHc, { shouldValidate: true });
      }
      if (!getValues('charges')) {
        setValue('charges', etat.charges, { shouldValidate: true });
      }
    }
    // L'initialisation ne doit se produire qu'au premier chargement des paramètres.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametres.data]);

  const totalEstime = (() => {
    const loyer = parseMontant(valeurs.loyerHc) ?? '0';
    const charges = parseMontant(valeurs.charges) ?? '0';
    return formatEUR(Number(loyer) + Number(charges));
  })();

  async function executerGeneration(valeursSoumises: QuittanceFormValues) {
    if (!validation.success) {
      return;
    }
    const corps = requeteDepuisValeurs(valeursSoumises, modeleSelectionne);
    setGenerationEnCours(true);
    try {
      const quittance = await api.quittances.generer(corps);
      setResultat(quittance);
      brouillon.marquerGenere();
      await queryClient.invalidateQueries({ queryKey: ['quittances'] });
      toast.succes(
        `Quittance de ${formatMois(valeursSoumises.mois)} générée en version ${quittance.version ?? 1}.`,
      );
    } catch (error) {
      toast.erreur(messageErreur(error));
    } finally {
      setGenerationEnCours(false);
    }
  }

  function soumettre(valeursSoumises: QuittanceFormValues) {
    valeursEnAttente.current = valeursSoumises;
    if (quittanceActive.data) {
      setDialogueRegeneration(true);
      return;
    }
    void executerGeneration(valeursSoumises);
  }

  async function telechargerQuittance(quittance: QuittanceDto) {
    if (!quittance.id) {
      return;
    }
    try {
      const reponse = await api.quittances.pdf(quittance.id);
      telechargerBlob(
        reponse.blob,
        reponse.nomFichier ?? `quittance_${quittance.mois ?? brouillon.mois}.pdf`,
      );
    } catch (error) {
      toast.erreur(messageErreur(error));
    }
  }

  function allerVersNote() {
    const mois = resultat?.mois ?? brouillon.mois;
    useNoteDraft.getState().changerMois(mois);
    navigate('/generer/note-frais');
  }

  function reprendreConfiguration() {
    if (!parametres.data) {
      return;
    }
    brouillon.reprendreDepuisParametres(parametres.data);
    setValue('loyerHc', parametres.data.loyerHc ?? '', { shouldValidate: true });
    setValue('charges', parametres.data.provisionCharges ?? '', { shouldValidate: true });
    toast.info('Montants repris depuis la configuration.');
  }

  function changerMois(valeur: string) {
    if (!valeur) {
      return;
    }
    brouillon.changerMois(valeur);
    const periode = periodeDuMois(valeur);
    setValue('periodeDebut', periode.debut, { shouldValidate: true });
    setValue('periodeFin', periode.fin, { shouldValidate: true });
  }

  const versionActive = quittanceActive.data?.version;
  const totalAffiche = resultat
    ? formatEUR(resultat.total)
    : quittanceActive.data
      ? formatEUR(quittanceActive.data.total)
      : null;

  return (
    <>
      <PageHeader
        surTitre="Générer · Quittance"
        titre="Quittance de loyer"
        description="Choisissez le mois : la période, les montants et les coordonnées sont pré-remplis depuis votre configuration. Ajustez si besoin, puis générez le document définitif."
        actions={
          <>
            <Bouton
              variante="secondaire"
              icone={<ReceiptText size={15} />}
              onClick={() => navigate('/generer/note-frais')}
            >
              Note de frais du mois
            </Bouton>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium text-ink-soft sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMois(brouillon.mois)}
            </span>
          </>
        }
      />

      {parametres.isError ? (
        <div className="mb-4">
          <EtatErreur message={messageErreur(parametres.error)} onReessayer={() => void parametres.refetch()} />
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="segmented w-full" role="tablist" aria-label="Volets de génération">
          <button
            type="button"
            role="tab"
            aria-selected={voletMobile === 'saisie'}
            onClick={() => setVoletMobile('saisie')}
            className={cn('segmented-item flex-1', voletMobile === 'saisie' && 'segmented-item-actif')}
          >
            Saisie
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={voletMobile === 'apercu'}
            onClick={() => setVoletMobile('apercu')}
            className={cn(
              'segmented-item flex flex-1 items-center justify-center gap-2',
              voletMobile === 'apercu' && 'segmented-item-actif',
            )}
          >
            Aperçu
            {apercu.misAJour ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" /> : null}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)] xl:gap-6">
        <div
          data-cy="volet-saisie"
          className={cn('min-w-0 space-y-4', mobile && voletMobile !== 'saisie' && 'hidden')}
        >
          {quittanceActive.data && !resultat ? (
            <div className="carte flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
                  <FileCheck2 size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {formatMois(quittanceActive.data.mois)} — version {versionActive} déjà active
                  </p>
                  <p className="text-xs text-ink-soft">
                    Total {totalAffiche}. Générer à nouveau créera la version {(versionActive ?? 0) + 1}.
                  </p>
                </div>
              </div>
              {quittanceActive.data.id ? (
                <a
                  href={api.quittances.urlPdf(quittanceActive.data.id)}
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

          {resultat ? (
            <div className="carte animation-fondu overflow-hidden border-accent/25">
              <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-accent">Quittance générée</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatMois(resultat.mois)} · version {resultat.version ?? 1} · {formatEUR(resultat.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Enregistrée dans l’historique avec le template « {resultat.templateNom ?? 'modèle intégré'} » v
                    {resultat.templateVersion ?? 1}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Bouton
                  variante="primaire"
                  petit
                  icone={<Download size={14} />}
                  onClick={() => void telechargerQuittance(resultat)}
                  data-cy="btn-telecharger-quittance"
                >
                  Télécharger le PDF
                </Bouton>
                {resultat.id ? (
                  <a
                    href={api.quittances.urlPdf(resultat.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondaire btn-petit"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Ouvrir
                  </a>
                ) : null}
                <Bouton variante="fantome" petit onClick={allerVersNote}>
                  Aller à la note de frais de ce mois
                </Bouton>
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
                  <GroupeChamp
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
                        onChange: (evenement) => changerMois(evenement.target.value),
                      })}
                    />
                  </GroupeChamp>

                  <GroupeChamp
                    id="quittance-template"
                    label="Template"
                    aide="Le modèle actif est utilisé par défaut."
                    badge={<span className="badge badge-neutre">Versionné</span>}
                  >
                    <select
                      id="quittance-template"
                      className="champ"
                      data-cy="select-template"
                      value={modeleSelectionne ?? ''}
                      onChange={(evenement) =>
                        brouillon.definirTemplate(evenement.target.value ? Number(evenement.target.value) : null)
                      }
                      disabled={templates.isPending || modeles.length === 0}
                    >
                      {modeles.length === 0 ? <option value="">Modèle intégré</option> : null}
                      {modeles.map((modele) => (
                        <option key={modele.id} value={modele.id}>
                          {modele.nom} — v{modele.version}
                          {modele.actif ? ' (actif)' : ''}
                        </option>
                      ))}
                    </select>
                  </GroupeChamp>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <GroupeChamp
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
                        onChange: (evenement) => brouillon.modifier({ periodeDebut: evenement.target.value }),
                      })}
                    />
                  </GroupeChamp>
                  <GroupeChamp id="quittance-fin" label="Fin de période" erreur={errors.periodeFin?.message}>
                    <input
                      id="quittance-fin"
                      type="date"
                      className={cn('champ', errors.periodeFin && 'champ-erreur')}
                      aria-invalid={Boolean(errors.periodeFin)}
                      {...register('periodeFin', {
                        onChange: (evenement) => brouillon.modifier({ periodeFin: evenement.target.value }),
                      })}
                    />
                  </GroupeChamp>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <GroupeChamp
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
                          onChange: (evenement) => brouillon.modifier({ loyerHc: evenement.target.value }),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </GroupeChamp>
                  <GroupeChamp
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
                          onChange: (evenement) => brouillon.modifier({ charges: evenement.target.value }),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </GroupeChamp>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3.5">
                  <div>
                    <p className="eyebrow text-accent">Total estimé</p>
                    <p className="mt-1 font-display text-[28px] leading-none text-accent-strong nombre">{totalEstime}</p>
                  </div>
                  <p className="max-w-[240px] text-right text-[11px] leading-snug text-ink-soft">
                    Affichage estimé. Le backend calcule le total du PDF avec arrondi au centime.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <GroupeChamp id="quittance-paiement" label="Date de paiement" erreur={errors.datePaiement?.message}>
                    <input
                      id="quittance-paiement"
                      type="date"
                      className={cn('champ', errors.datePaiement && 'champ-erreur')}
                      {...register('datePaiement', {
                        onChange: (evenement) => brouillon.modifier({ datePaiement: evenement.target.value }),
                      })}
                    />
                  </GroupeChamp>
                  <GroupeChamp id="quittance-emission" label="Date d’émission" erreur={errors.dateEmission?.message}>
                    <input
                      id="quittance-emission"
                      type="date"
                      className={cn('champ', errors.dateEmission && 'champ-erreur')}
                      {...register('dateEmission', {
                        onChange: (evenement) => brouillon.modifier({ dateEmission: evenement.target.value }),
                      })}
                    />
                  </GroupeChamp>
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
                  <Bouton
                    type="submit"
                    variante="primaire"
                    chargement={generationEnCours}
                    icone={<ReceiptText size={16} />}
                    disabled={!isValid || quittanceActive.isPending || templates.isPending}
                    data-cy="btn-generer-quittance"
                  >
                    Générer la quittance
                  </Bouton>
                  <Bouton
                    variante="fantome"
                    petit
                    icone={<RotateCcw size={13} />}
                    onClick={reprendreConfiguration}
                    disabled={!parametres.data || generationEnCours}
                  >
                    Reprendre la configuration
                  </Bouton>
                </div>
                {quittanceActive.data ? (
                  <p className="text-[11px] text-ink-soft">
                    Version active : v{versionActive} → v{(versionActive ?? 0) + 1} à la génération.
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-soft">
                    {generationEnCours ? (
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
            mobile && voletMobile !== 'apercu' && 'hidden',
            'lg:sticky lg:top-6 lg:self-start',
          )}
        >
          <PdfViewer
            url={apercu.url}
            chargement={apercu.chargement}
            erreur={
              !validation.success
                ? 'Complétez les champs de la quittance pour actualiser l’aperçu.'
                : apercu.erreur
            }
            misAJour={apercu.misAJour}
            onTelecharger={apercu.telecharger}
            actions={
              <select
                aria-label="Template de la quittance"
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
                value={modeleSelectionne ?? ''}
                onChange={(evenement) =>
                  brouillon.definirTemplate(evenement.target.value ? Number(evenement.target.value) : null)
                }
                disabled={modeles.length === 0}
                data-cy="select-template-apercu"
              >
                {modeles.length === 0 ? <option value="">Modèle intégré</option> : null}
                {modeles.map((modele) => (
                  <option key={modele.id} value={modele.id}>
                    {modele.nom} — v{modele.version}
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

      <DialogueConfirmation
        ouvert={dialogueRegeneration}
        titre="Générer une nouvelle version ?"
        message={
          <>
            Une quittance active existe déjà pour {formatMois(brouillon.mois)} (version {versionActive}).
            La version {(versionActive ?? 0) + 1} sera créée et l’ancienne restera consultable dans l’historique.
          </>
        }
        libelleConfirmer="Créer la nouvelle version"
        onConfirmer={() => {
          setDialogueRegeneration(false);
          const valeursSoumises = valeursEnAttente.current;
          if (valeursSoumises) {
            void executerGeneration(valeursSoumises);
          }
        }}
        onAnnuler={() => setDialogueRegeneration(false)}
        dataCy="dialogue-regeneration-quittance"
      />
    </>
  );
}
