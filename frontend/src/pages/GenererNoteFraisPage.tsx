import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { estAnnulation, messageErreur, telechargerBlob } from '@/api/client';
import { api } from '@/api/endpoints';
import {
  useNoteActive,
  useParametres,
  usePostes,
  useQuittanceActive,
  useTemplates,
} from '@/api/queries';
import type {
  CalculResponse,
  ConfianceIa,
  ExtractionDto,
  LigneRequest,
  NoteApercuRequest,
  NoteDto,
  NoteGenerationRequest,
  PosteDto,
} from '@/api/types';
import { BadgeIA } from '@/components/BadgeIA';
import { Bouton } from '@/components/Bouton';
import { DialogueConfirmation } from '@/components/DialogueConfirmation';
import { EtatErreur, Spinner } from '@/components/Etats';
import { FichierSelectionne, FileDropzone } from '@/components/FileDropzone';
import { GroupeChamp } from '@/components/GroupeChamp';
import { PageHeader } from '@/components/PageHeader';
import { PdfViewer } from '@/components/PdfViewer';
import { estAnalyseEnCours, useAnalyse, type EtatAnalyse } from '@/hooks/useAnalyse';
import { useApercuPdf } from '@/hooks/useApercuPdf';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { periodeDansLOrdre, estDateValide } from '@/lib/dates';
import { cn } from '@/lib/cn';
import {
  formatDateHeure,
  formatEUR,
  formatMois,
  formatPeriode,
  montantRetenuEstime,
  parseMontant,
  parsePourcentage,
} from '@/lib/format';
import {
  nouvelleCle,
  typeDejaAjoute,
  typesManquants,
  versLigneRequest,
  type LigneBrouillon,
} from '@/lib/lignes';
import { estimerVentilation } from '@/lib/ventilation';
import { fraisSchema, type FraisFormValues } from '@/lib/validation';
import { useLignesNote, useNoteDraft } from '@/state/noteDraft';
import { useQuittanceDraft } from '@/state/quittanceDraft';
import { toast } from '@/state/toasts';

const VALEURS_INITIALES: FraisFormValues = {
  posteCode: '',
  montantTtc: '',
  prorataPct: '100',
  periodeDebut: '',
  periodeFin: '',
  montantMoisSurcharge: '',
};

interface FichierJoint {
  id: number;
  nom: string;
  taille: number | null;
  typeMime: string | null;
}

interface EtatIa {
  type: boolean;
  montant: boolean;
  periode: boolean;
  montantDetecte: string | null;
  fournisseur: string | null;
  extraitSource: string | null;
  confiance: ConfianceIa | null;
}

const IA_VIDE: EtatIa = {
  type: false,
  montant: false,
  periode: false,
  montantDetecte: null,
  fournisseur: null,
  extraitSource: null,
  confiance: null,
};

function confianceValide(valeur: string | null | undefined): ConfianceIa | null {
  return valeur === 'haute' || valeur === 'moyenne' || valeur === 'basse' ? valeur : null;
}

function libelleConfiance(confiance: ConfianceIa | null): string | null {
  if (confiance === 'haute') {
    return 'Confiance élevée';
  }
  if (confiance === 'moyenne') {
    return 'Confiance moyenne';
  }
  if (confiance === 'basse') {
    return 'Confiance faible — vérifiez les valeurs';
  }
  return null;
}

function PanneauAnalyse({
  etat,
  aFichier,
  onAnnuler,
}: {
  etat: EtatAnalyse;
  aFichier: boolean;
  onAnnuler: () => void;
}) {
  const enCours = estAnalyseEnCours(etat);
  const resultat: ExtractionDto | null = etat.statut === 'terminee' ? etat.analyse.resultat ?? null : null;
  const duree =
    etat.statut === 'terminee' && etat.analyse.dureeMs
      ? `${(etat.analyse.dureeMs / 1000).toFixed(1)} s`
      : null;

  return (
    <div
      data-cy="analyse-statut"
      aria-live="polite"
      className={cn(
        'rounded-xl border px-3.5 py-3 text-xs',
        etat.statut === 'echec'
          ? 'border-warning/25 bg-warning-soft/40 text-warning'
          : etat.statut === 'terminee'
            ? 'border-copper/20 bg-copper-soft/50 text-ink'
            : enCours
              ? 'border-accent/20 bg-accent-soft/45 text-ink'
              : 'border-line bg-paper/50 text-ink-soft',
      )}
    >
      {enCours ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <Spinner taille={14} />
            {etat.statut === 'demarrage'
              ? 'Préparation de l’analyse…'
              : 'Analyse IA en cours — le modèle local peut prendre quelques secondes.'}
          </span>
          <Bouton variante="fantome" petit onClick={onAnnuler} data-cy="btn-annuler-analyse">
            <X size={13} aria-hidden="true" />
            Annuler l’analyse
          </Bouton>
        </div>
      ) : etat.statut === 'terminee' ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 size={14} className="text-copper" aria-hidden="true" />
            Analyse terminée{duree ? ` en ${duree}` : ''} — les champs vides ont été pré-remplis.
          </p>
          {resultat ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
              <BadgeIA extraitSource={resultat.extraitSource} />
              {resultat.fournisseur ? <span>Fournisseur détecté : {resultat.fournisseur}</span> : null}
              {libelleConfiance(confianceValide(resultat.confiance)) ? (
                <span className={cn(confianceValide(resultat.confiance) === 'basse' && 'font-semibold text-warning')}>
                  {libelleConfiance(confianceValide(resultat.confiance))}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px]">
              Aucune information exploitable n’a été extraite. Complétez le frais manuellement.
            </p>
          )}
          {resultat?.extraitSource ? (
            <p className="border-l-2 border-copper/30 pl-2 text-[11px] italic text-ink-soft">
              « {resultat.extraitSource} »
            </p>
          ) : null}
          <p className="text-[11px] text-ink-soft">
            Les propositions de l’IA restent modifiables. Vérifiez-les avant d’ajouter le frais.
          </p>
        </div>
      ) : etat.statut === 'echec' ? (
        <p className="flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {etat.message} L’analyse est facultative : vous pouvez saisir le montant et le prorata
            manuellement.
          </span>
        </p>
      ) : etat.statut === 'annulee' ? (
        <p>{etat.message} La saisie manuelle reste disponible.</p>
      ) : (
        <p>
          {aFichier
            ? 'Analyse non lancée. Vous pouvez saisir le frais manuellement.'
            : 'Déposez un justificatif : l’analyse IA démarrera automatiquement. Elle reste facultative.'}
        </p>
      )}
    </div>
  );
}

export function GenererNoteFraisPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const brouillon = useNoteDraft();
  const lignes = useLignesNote();
  const mobile = useMediaQuery('(max-width: 1023px)');
  const [voletMobile, setVoletMobile] = useState<'saisie' | 'apercu'>('saisie');

  const mois = brouillon.mois;
  const parametres = useParametres();
  const postesQuery = usePostes(false);
  const templates = useTemplates('NOTE_FRAIS');
  const quittance = useQuittanceActive(mois);
  const noteActive = useNoteActive(mois);

  const postes = useMemo<PosteDto[]>(
    () => [...(postesQuery.data ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
    [postesQuery.data],
  );
  const posteParCode = useMemo(
    () => new Map(postes.map((poste) => [poste.code ?? '', poste])),
    [postes],
  );

  const modeles = templates.data ?? [];
  const modeleActif = modeles.find((modele) => modele.actif) ?? null;
  const templateSelectionne = brouillon.templatesParMois[mois] ?? modeleActif?.id ?? null;
  const complet = brouillon.completsParMois[mois] ?? true;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<FraisFormValues>({
    resolver: zodResolver(fraisSchema),
    mode: 'onChange',
    defaultValues: VALEURS_INITIALES,
  });

  const valeurs = watch();
  const estLoyer = valeurs.posteCode === 'loyer';
  const loyerDisponible = Boolean(quittance.data?.id);

  const { etat: etatAnalyse, demarrer, annuler, reinitialiser } = useAnalyse();
  const [justificatif, setJustificatif] = useState<FichierJoint | null>(null);
  const [televersement, setTeleversement] = useState(false);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [ia, setIa] = useState<EtatIa>(IA_VIDE);
  const [ligneEnEdition, setLigneEnEdition] = useState<string | null>(null);
  const [periodeVisible, setPeriodeVisible] = useState(false);
  const [ligneASupprimer, setLigneASupprimer] = useState<LigneBrouillon | null>(null);
  const [dialogueRegeneration, setDialogueRegeneration] = useState(false);
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [resultat, setResultat] = useState<NoteDto | null>(null);

  const uploadSequence = useRef(0);
  const analyseAppliquee = useRef<number | null>(null);
  const justificatifOriginal = useRef<FichierJoint | null>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const carteFormulaireRef = useRef<HTMLFormElement>(null);

  function libererSiNonAttache(fichier: FichierJoint) {
    const estOriginal = justificatifOriginal.current?.id === fichier.id;
    if (!estOriginal) {
      void api.justificatifs.supprimer(fichier.id).catch(() => undefined);
    }
  }

  function reinitialiserFormulaire() {
    reset(VALEURS_INITIALES);
    setIa(IA_VIDE);
    setPeriodeVisible(false);
    setErreurFichier(null);
    setLigneEnEdition(null);
    setJustificatif(null);
    justificatifOriginal.current = null;
    analyseAppliquee.current = null;
  }

  function focaliserType() {
    window.setTimeout(() => typeRef.current?.focus(), 0);
  }

  async function televerser(fichier: File) {
    const sequence = ++uploadSequence.current;
    const ancien = justificatif;
    setTeleversement(true);
    setErreurFichier(null);
    setIa(IA_VIDE);
    analyseAppliquee.current = null;
    reinitialiser();

    try {
      const dto = await api.justificatifs.uploader(fichier);
      if (!dto.id) {
        throw new Error('Le justificatif n’a pas pu être enregistré.');
      }
      if (sequence !== uploadSequence.current) {
        void api.justificatifs.supprimer(dto.id).catch(() => undefined);
        return;
      }
      if (ancien) {
        libererSiNonAttache(ancien);
      }
      setJustificatif({
        id: dto.id,
        nom: dto.nomFichier ?? fichier.name,
        taille: dto.taille ?? fichier.size,
        typeMime: dto.typeMime ?? fichier.type,
      });
      await demarrer(dto.id);
    } catch (error) {
      if (sequence === uploadSequence.current) {
        setJustificatif(ancien);
        setErreurFichier(messageErreur(error));
      }
    } finally {
      if (sequence === uploadSequence.current) {
        setTeleversement(false);
      }
    }
  }

  function retirerFichier() {
    uploadSequence.current += 1;
    void annuler(true);
    const ancien = justificatif;
    setJustificatif(null);
    setErreurFichier(null);
    setIa(IA_VIDE);
    analyseAppliquee.current = null;
    if (ancien) {
      libererSiNonAttache(ancien);
    }
  }

  useEffect(() => {
    const quittanceActive = quittance.data;
    if (!quittanceActive?.id || !quittanceActive.total) {
      return;
    }
    if (getValues('posteCode') !== 'loyer') {
      return;
    }
    setValue('montantTtc', quittanceActive.total, { shouldValidate: true, shouldDirty: true });
    // Le montant du loyer est verrouillé sur la quittance active du mois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quittance.data?.id, quittance.data?.total]);

  useEffect(() => {
    if (etatAnalyse.statut !== 'terminee' || !postesQuery.data) {
      return;
    }
    const analyse = etatAnalyse.analyse;
    const analyseId = analyse.id;
    if (analyseId === null || analyseId === undefined || analyseAppliquee.current === analyseId) {
      return;
    }
    if (analyse.justificatifId !== justificatif?.id) {
      return;
    }
    analyseAppliquee.current = analyseId;
    const extraction = analyse.resultat;
    if (!extraction) {
      return;
    }

    const actuelles = getValues();
    const lignesActuelles = useNoteDraft.getState().lignesParMois[mois] ?? [];
    let typeApplique = false;
    let montantApplique = false;
    let periodeAppliquee = false;

    const montantSuggere =
      extraction.devise && extraction.devise.toUpperCase() !== 'EUR'
        ? null
        : extraction.montantTtc
          ? parseMontant(extraction.montantTtc)
          : null;

    if (!actuelles.montantTtc && montantSuggere !== null) {
      montantApplique = true;
    }

    const debut = extraction.periodeDebut && estDateValide(extraction.periodeDebut) ? extraction.periodeDebut : '';
    const fin = extraction.periodeFin && estDateValide(extraction.periodeFin) ? extraction.periodeFin : '';
    const periodeValide = Boolean(debut && fin && periodeDansLOrdre(debut, fin));

    if (!actuelles.periodeDebut && !actuelles.periodeFin && periodeValide) {
      periodeAppliquee = true;
    }

    const posteSuggere =
      extraction.typeSuggere && extraction.typeSuggere !== 'loyer'
        ? posteParCode.get(extraction.typeSuggere) ?? null
        : null;
    const autres = lignesActuelles.filter((ligne) => ligne.cle !== ligneEnEdition);

    if (
      !actuelles.posteCode &&
      posteSuggere?.code &&
      (posteSuggere.plusieursLignesAutorisees || !typeDejaAjoute(autres, posteSuggere.code))
    ) {
      typeApplique = true;
      setValue('posteCode', posteSuggere.code, { shouldValidate: true, shouldDirty: true });
      if (
        (actuelles.prorataPct === '' || actuelles.prorataPct === '100') &&
        posteSuggere.prorataPct
      ) {
        setValue('prorataPct', posteSuggere.prorataPct, { shouldValidate: true, shouldDirty: true });
      }
    }

    if (montantApplique && montantSuggere) {
      setValue('montantTtc', montantSuggere, { shouldValidate: true, shouldDirty: true });
    }
    if (periodeAppliquee) {
      setValue('periodeDebut', debut, { shouldValidate: true, shouldDirty: true });
      setValue('periodeFin', fin, { shouldValidate: true, shouldDirty: true });
      setPeriodeVisible(true);
    }

    setIa({
      type: typeApplique,
      montant: montantApplique,
      periode: periodeAppliquee,
      montantDetecte: montantSuggere,
      fournisseur: extraction.fournisseur ?? null,
      extraitSource: extraction.extraitSource ?? null,
      confiance: confianceValide(extraction.confiance),
    });
    if (montantApplique || periodeAppliquee || typeApplique) {
      toast.info('Des champs ont été pré-remplis par l’IA. Vérifiez-les avant d’ajouter le frais.');
    }
    // L'extraction n'est appliquée qu'une fois par analyse, et uniquement aux champs vides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etatAnalyse, justificatif?.id, postesQuery.data, ligneEnEdition]);

  function changerMois(valeur: string) {
    if (!valeur || valeur === mois) {
      return;
    }
    uploadSequence.current += 1;
    void annuler(true);
    reinitialiser();
    if (justificatif) {
      libererSiNonAttache(justificatif);
    }
    reinitialiserFormulaire();
    setResultat(null);
    setVoletMobile('saisie');
    brouillon.changerMois(valeur);
  }

  function changerType(code: string) {
    const ancien = getValues('posteCode');
    const poste = posteParCode.get(code) ?? null;
    setValue('posteCode', code, { shouldValidate: true, shouldDirty: true });
    setValue('prorataPct', poste?.prorataPct ?? '100', { shouldValidate: true, shouldDirty: true });
    setValue('periodeDebut', '', { shouldDirty: true });
    setValue('periodeFin', '', { shouldDirty: true });
    setValue('montantMoisSurcharge', '', { shouldDirty: true });
    setPeriodeVisible(false);
    setIa((precedent) => ({ ...precedent, type: false, periode: false }));

    if (code === 'loyer' && ancien !== 'loyer') {
      if (!ligneEnEdition) {
        retirerFichier();
      } else {
        void annuler(true);
        reinitialiser();
      }
      setValue('montantTtc', quittance.data?.total ?? '', { shouldValidate: true, shouldDirty: true });
    } else if (code !== 'loyer' && ancien === 'loyer') {
      setValue('montantTtc', '', { shouldValidate: true, shouldDirty: true });
    }
  }

  function editerLigne(ligne: LigneBrouillon) {
    uploadSequence.current += 1;
    void annuler(true);
    reinitialiser();
    analyseAppliquee.current = null;
    setLigneEnEdition(ligne.cle);
    const fichier: FichierJoint | null = ligne.justificatifId
      ? {
          id: ligne.justificatifId,
          nom: ligne.justificatifNom ?? 'Justificatif',
          taille: null,
          typeMime: null,
        }
      : null;
    justificatifOriginal.current = fichier;
    setJustificatif(fichier);
    setErreurFichier(null);
    reset({
      posteCode: ligne.posteCode,
      montantTtc:
        ligne.posteCode === 'loyer' && quittance.data?.total ? quittance.data.total : ligne.montantTtc,
      prorataPct: ligne.prorataPct,
      periodeDebut: ligne.periodeDebut,
      periodeFin: ligne.periodeFin,
      montantMoisSurcharge: ligne.montantMoisSurcharge,
    });
    setPeriodeVisible(Boolean(ligne.periodeDebut || ligne.periodeFin || ligne.montantMoisSurcharge));
    setIa({
      type: false,
      montant: ligne.sourceMontant === 'AI',
      periode: false,
      montantDetecte: ligne.montantDetecteIa,
      fournisseur: ligne.fournisseurDetecte,
      extraitSource: null,
      confiance: ligne.confianceIa,
    });
    setResultat(null);
    carteFormulaireRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    focaliserType();
  }

  function annulerEdition() {
    uploadSequence.current += 1;
    void annuler(true);
    reinitialiser();
    if (justificatif) {
      libererSiNonAttache(justificatif);
    }
    reinitialiserFormulaire();
    focaliserType();
  }

  function enregistrerFrais(valeursSoumises: FraisFormValues) {
    const poste = posteParCode.get(valeursSoumises.posteCode);
    if (!poste?.code) {
      setError('posteCode', { type: 'manual', message: 'Sélectionnez un type de frais.' });
      return;
    }
    const autres = lignes.filter((ligne) => ligne.cle !== ligneEnEdition);
    if (!poste.plusieursLignesAutorisees && typeDejaAjoute(autres, poste.code)) {
      setError('posteCode', {
        type: 'manual',
        message: 'Ce type est déjà présent. Modifiez la ligne existante ou autorisez plusieurs lignes.',
      });
      return;
    }
    const ligneLoyer = poste.code === 'loyer';
    if (ligneLoyer && !loyerDisponible) {
      setErreurFichier('Ajoutez d’abord la quittance du mois pour utiliser ce type.');
      return;
    }
    if (!ligneLoyer && !justificatif) {
      setErreurFichier('Le justificatif est obligatoire pour ce type de frais.');
      return;
    }

    const montantTtc = parseMontant(valeursSoumises.montantTtc);
    const prorataPct = parsePourcentage(valeursSoumises.prorataPct);
    if (montantTtc === null || prorataPct === null) {
      return;
    }
    const surcharge = valeursSoumises.montantMoisSurcharge.trim()
      ? parseMontant(valeursSoumises.montantMoisSurcharge)
      : null;

    const ligne: LigneBrouillon = {
      cle: ligneEnEdition ?? nouvelleCle(),
      posteCode: poste.code,
      montantTtc,
      prorataPct,
      periodeDebut: valeursSoumises.periodeDebut,
      periodeFin: valeursSoumises.periodeFin,
      montantMoisSurcharge: surcharge ?? '',
      justificatifId: ligneLoyer ? null : justificatif?.id ?? null,
      justificatifNom: ligneLoyer ? null : justificatif?.nom ?? null,
      sourceMontant: ia.montant ? 'AI' : 'MANUAL',
      montantDetecteIa: ia.montantDetecte,
      confianceIa: ia.confiance,
      fournisseurDetecte: ia.fournisseur,
    };

    if (ligneEnEdition) {
      brouillon.modifierLigne(ligneEnEdition, ligne);
      toast.succes('Frais modifié.');
    } else {
      brouillon.ajouterLigne(ligne);
      toast.succes('Frais ajouté.');
    }

    if (ligneLoyer && justificatif && justificatifOriginal.current?.id !== justificatif.id) {
      libererSiNonAttache(justificatif);
    }
    uploadSequence.current += 1;
    void annuler(true);
    reinitialiser();
    reinitialiserFormulaire();
    setResultat(null);
    focaliserType();
  }

  function supprimerLigne() {
    if (!ligneASupprimer) {
      return;
    }
    const cle = ligneASupprimer.cle;
    brouillon.supprimerLigne(cle);
    if (ligneEnEdition === cle) {
      reinitialiserFormulaire();
    }
    setLigneASupprimer(null);
    setResultat(null);
    toast.info('Frais supprimé.');
  }

  function modifierProrata(ligne: LigneBrouillon, valeur: string) {
    brouillon.modifierLigne(ligne.cle, { prorataPct: valeur });
    setResultat(null);
  }

  const requetes = useMemo<{ valeurs: LigneRequest[] | null; erreur: string | null }>(() => {
    try {
      return { valeurs: lignes.map(versLigneRequest), erreur: null };
    } catch (error) {
      return {
        valeurs: null,
        erreur: error instanceof Error ? error.message : 'Les lignes contiennent une valeur invalide.',
      };
    }
  }, [lignes]);

  const signatureCalcul = useMemo(
    () => JSON.stringify({ mois, lignes: requetes.valeurs }),
    [mois, requetes],
  );

  const [calcul, setCalcul] = useState<CalculResponse | null>(null);
  const [signatureCalculee, setSignatureCalculee] = useState<string | null>(null);
  const [calculEnCours, setCalculEnCours] = useState(false);
  const [calculErreur, setCalculErreur] = useState<string | null>(null);

  useEffect(() => {
    const controleur = new AbortController();
    if (requetes.erreur) {
      setCalculErreur(requetes.erreur);
      setCalculEnCours(false);
      return () => controleur.abort();
    }
    if (!requetes.valeurs) {
      return () => controleur.abort();
    }
    const requetesValides = requetes.valeurs;
    setCalculEnCours(true);
    setCalculErreur(null);
    const timer = window.setTimeout(async () => {
      try {
        const reponse = await api.notes.calculer({ mois, lignes: requetesValides }, controleur.signal);
        if (controleur.signal.aborted) {
          return;
        }
        setCalcul(reponse);
        setSignatureCalculee(signatureCalcul);
        setCalculEnCours(false);
      } catch (error) {
        if (estAnnulation(error) || controleur.signal.aborted) {
          return;
        }
        setCalculErreur(messageErreur(error));
        setCalculEnCours(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controleur.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureCalcul, mois, requetes.erreur]);

  const calculAJour =
    signatureCalculee === signatureCalcul && calcul !== null && calculErreur === null;

  const requeteApercu = useMemo<NoteApercuRequest | null>(() => {
    if (!requetes.valeurs || lignes.length === 0) {
      return null;
    }
    const corps: NoteApercuRequest = { mois, complet, lignes: requetes.valeurs };
    if (templateSelectionne !== null) {
      corps.templateId = templateSelectionne;
    }
    return corps;
  }, [mois, complet, templateSelectionne, requetes, lignes.length]);

  const apercu = useApercuPdf(
    (signal) =>
      requeteApercu
        ? api.notes.apercu(requeteApercu, signal)
        : Promise.reject(new DOMException('Aperçu inactif', 'AbortError')),
    JSON.stringify(requeteApercu ?? { inactif: true }),
    { actif: requeteApercu !== null, debounceMs: 400 },
  );

  function allerVersQuittance() {
    useQuittanceDraft.getState().changerMois(mois);
    navigate('/generer/quittance');
  }

  async function genererNote() {
    if (!requetes.valeurs || lignes.length === 0 || !calculAJour) {
      return;
    }
    setGenerationEnCours(true);
    try {
      const corps: NoteGenerationRequest = { mois, lignes: requetes.valeurs };
      if (templateSelectionne !== null) {
        corps.templateId = templateSelectionne;
      }
      const note = await api.notes.generer(corps);
      setResultat(note);
      brouillon.marquerGenere();
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.succes(`Note de ${formatMois(mois)} générée en version ${note.version ?? 1}.`);
    } catch (error) {
      toast.erreur(messageErreur(error));
    } finally {
      setGenerationEnCours(false);
    }
  }

  function demanderGeneration() {
    if (noteActive.data) {
      setDialogueRegeneration(true);
      return;
    }
    void genererNote();
  }

  async function telechargerNote(note: NoteDto, avecAnnexes: boolean) {
    if (!note.id) {
      return;
    }
    try {
      const reponse = await api.notes.pdf(note.id, avecAnnexes);
      telechargerBlob(
        reponse.blob,
        reponse.nomFichier ??
          `note_frais_${note.mois ?? mois}_v${note.version ?? 1}${avecAnnexes ? '_complet' : ''}.pdf`,
      );
    } catch (error) {
      toast.erreur(messageErreur(error));
    }
  }

  const estimation = estimerVentilation(
    valeurs.montantTtc,
    valeurs.prorataPct,
    valeurs.periodeDebut,
    valeurs.periodeFin,
    mois,
  );
  const surchargeSaisie = valeurs.montantMoisSurcharge.trim()
    ? parseMontant(valeurs.montantMoisSurcharge)
    : null;
  const montantMoisEstime = surchargeSaisie ?? estimation?.montantMois ?? valeurs.montantTtc;
  const montantRetenuAffiche = montantRetenuEstime(montantMoisEstime, valeurs.prorataPct);
  const typesOublies = typesManquants(postes, lignes);
  const erreurBasseConfiance = ia.confiance === 'basse' && (ia.montant || ia.periode);

  function optionDesactivee(poste: PosteDto): boolean {
    if (!poste.code || poste.plusieursLignesAutorisees) {
      return false;
    }
    if (ligneEnEdition && lignes.find((ligne) => ligne.cle === ligneEnEdition)?.posteCode === poste.code) {
      return false;
    }
    return typeDejaAjoute(lignes, poste.code);
  }

  const totalAffiche = calcul?.total;
  const versionActive = noteActive.data?.version;
  const templateCourant = modeleActif?.nom ?? 'modèle intégré';

  return (
    <>
      <PageHeader
        surTitre="Générer · Note de frais"
        titre="Note de frais d’occupation"
        description="Ajoutez les factures du mois, vérifiez les propositions de l’IA et laissez le backend calculer la quote-part. Le loyer est repris de la quittance active."
        actions={
          <>
            <Bouton variante="secondaire" icone={<ReceiptText size={15} />} onClick={allerVersQuittance}>
              Quittance du mois
            </Bouton>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium text-ink-soft sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMois(mois)}
            </span>
          </>
        }
      />

      {noteActive.data && !resultat ? (
        <div className="carte mb-4 flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
              <FileCheck2 size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {formatMois(mois)} — note version {versionActive} déjà active
              </p>
              <p className="text-xs text-ink-soft">
                Total {formatEUR(noteActive.data.total)}. Générer à nouveau créera la version{' '}
                {(versionActive ?? 0) + 1}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {noteActive.data.id ? (
              <>
                <a
                  href={api.notes.urlPdf(noteActive.data.id, false)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondaire btn-petit"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Ouvrir
                </a>
                <a
                  href={api.notes.urlPdf(noteActive.data.id, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondaire btn-petit"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Version complète
                </a>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {parametres.isError ? (
        <div className="mb-4">
          <EtatErreur message={messageErreur(parametres.error)} onReessayer={() => void parametres.refetch()} />
        </div>
      ) : null}
      {postesQuery.isError ? (
        <div className="mb-4">
          <EtatErreur
            message={messageErreur(postesQuery.error)}
            onReessayer={() => void postesQuery.refetch()}
          />
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(400px,0.94fr)] xl:gap-6">
        <div
          data-cy="volet-saisie"
          className={cn('min-w-0 space-y-4', mobile && voletMobile !== 'saisie' && 'hidden')}
        >
          <div className="carte">
            <div className="carte-entete">
              <div>
                <p className="eyebrow">{ligneEnEdition ? 'Modification' : 'Ajouter un frais'}</p>
                <h2 className="mt-1 text-[22px] text-ink">
                  {ligneEnEdition ? 'Modifier le frais' : 'Nouveau frais'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid gap-2">
                  <label htmlFor="note-mois" className="sr-only">
                    Mois concerné
                  </label>
                  <input
                    id="note-mois"
                    type="month"
                    className="champ mt-0 w-auto py-1.5 text-xs"
                    data-cy="select-mois"
                    value={mois}
                    onChange={(evenement) => changerMois(evenement.target.value)}
                  />
                </div>
              </div>
            </div>

            <form ref={carteFormulaireRef} onSubmit={handleSubmit(enregistrerFrais)} noValidate>
              <div className="carte-corps space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <GroupeChamp
                    id="frais-type"
                    label="Type de frais"
                    erreur={errors.posteCode?.message}
                    badge={ia.type ? <BadgeIA libelle="Type suggéré par IA" /> : undefined}
                    aide={
                      ia.fournisseur
                        ? `Fournisseur détecté : ${ia.fournisseur}`
                        : 'Les libellés proviennent de votre configuration.'
                    }
                  >
                    <select
                      id="frais-type"
                      ref={typeRef}
                      className={cn('champ', errors.posteCode && 'champ-erreur')}
                      data-cy="select-type-frais"
                      value={valeurs.posteCode}
                      onChange={(evenement) => changerType(evenement.target.value)}
                      aria-invalid={Boolean(errors.posteCode)}
                      disabled={postesQuery.isPending}
                    >
                      <option value="">Sélectionner…</option>
                      {postes.map((poste) => (
                        <option
                          key={poste.code}
                          value={poste.code}
                          disabled={optionDesactivee(poste)}
                        >
                          {poste.libelle ?? poste.code}
                          {poste.fournisseur ? ` (${poste.fournisseur})` : ''}
                          {optionDesactivee(poste) ? ' — déjà ajouté' : ''}
                        </option>
                      ))}
                    </select>
                  </GroupeChamp>

                  <GroupeChamp
                    id="frais-prorata"
                    label="Prorata (%)"
                    erreur={errors.prorataPct?.message}
                    aide="Champ libre : 35,71 ou 35,71 %."
                  >
                    <div className="relative">
                      <input
                        id="frais-prorata"
                        inputMode="decimal"
                        className={cn('champ pr-9', errors.prorataPct && 'champ-erreur')}
                        data-cy="input-prorata"
                        aria-invalid={Boolean(errors.prorataPct)}
                        {...register('prorataPct')}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        %
                      </span>
                    </div>
                  </GroupeChamp>
                </div>

                {estLoyer ? (
                  <div className="rounded-xl border border-line bg-paper/50 p-4">
                    {quittance.isPending ? (
                      <p className="flex items-center gap-2 text-sm text-ink-soft">
                        <Spinner taille={16} /> Recherche de la quittance du mois…
                      </p>
                    ) : quittance.data ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            Quittance de {formatMois(mois)} (v{quittance.data.version ?? 1}) :{' '}
                            <span className="nombre">{formatEUR(quittance.data.total)}</span>
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            Montant pré-rempli et verrouillé. La quittance sera annexée automatiquement.
                          </p>
                        </div>
                        {quittance.data.id ? (
                          <a
                            href={api.quittances.urlPdf(quittance.data.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondaire btn-petit"
                          >
                            <ExternalLink size={13} aria-hidden="true" />
                            Voir le PDF
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3"
                        data-cy="alerte-quittance-manquante"
                        role="alert"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={17} className="mt-0.5 text-warning" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-semibold text-ink">Aucune quittance pour ce mois</p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              Générez la quittance : le montant du loyer sera repris et verrouillé.
                            </p>
                          </div>
                        </div>
                        <Bouton variante="secondaire" petit onClick={allerVersQuittance}>
                          Générer la quittance
                        </Bouton>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="label-champ">
                        Fichier justificatif <span className="text-danger">*</span>
                      </span>
                      <span className="text-[11px] text-ink-soft">10 Mo max.</span>
                    </div>
                    {televersement ? (
                      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-4 text-sm text-ink-soft">
                        <Spinner taille={18} />
                        Envoi et préparation de l’analyse…
                      </div>
                    ) : justificatif ? (
                      <FichierSelectionne
                        nom={justificatif.nom}
                        taille={justificatif.taille}
                        typeMime={justificatif.typeMime}
                        onRetirer={retirerFichier}
                      />
                    ) : (
                      <FileDropzone
                        onFichier={(fichier) => void televerser(fichier)}
                        dataCy="dropzone-fichier"
                        disabled={postesQuery.isPending}
                      />
                    )}
                    {erreurFichier ? (
                      <p className="erreur-champ" role="alert">
                        {erreurFichier}
                      </p>
                    ) : null}
                  </div>
                )}

                {!estLoyer ? (
                  <PanneauAnalyse
                    etat={etatAnalyse}
                    aFichier={justificatif !== null || televersement}
                    onAnnuler={() => void annuler()}
                  />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <GroupeChamp
                    id="frais-montant"
                    label="Montant TTC"
                    erreur={errors.montantTtc?.message}
                    badge={ia.montant ? <BadgeIA extraitSource={ia.extraitSource} /> : undefined}
                  >
                    <div className="relative">
                      <input
                        id="frais-montant"
                        inputMode="decimal"
                        className={cn(
                          'champ pr-9',
                          errors.montantTtc && 'champ-erreur',
                          erreurBasseConfiance && ia.montant && 'champ-avertissement',
                        )}
                        data-cy="input-montant-ttc"
                        aria-invalid={Boolean(errors.montantTtc)}
                        aria-readonly={estLoyer && loyerDisponible}
                        readOnly={estLoyer && loyerDisponible}
                        {...register('montantTtc', {
                          onChange: () => setIa((precedent) => ({ ...precedent, montant: false })),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </GroupeChamp>

                  <div className="flex flex-col justify-end rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
                    <p className="eyebrow text-accent">Montant retenu estimé</p>
                    <p className="mt-1 font-display text-[24px] leading-none text-accent-strong nombre">
                      {montantRetenuAffiche}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">
                      Estimation d’affichage : le backend recalcule chaque ligne avec arrondi au centime.
                    </p>
                  </div>
                </div>

                {erreurBasseConfiance ? (
                  <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2 text-xs text-warning">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Confiance faible : vérifiez le montant et la période avant d’ajouter le frais.
                  </p>
                ) : null}

                <div className="rounded-xl border border-line bg-paper/40">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-semibold text-ink"
                    onClick={() => setPeriodeVisible((valeur) => !valeur)}
                    aria-expanded={periodeVisible}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      Facture sur plusieurs mois ?
                      {ia.periode ? <BadgeIA libelle="Période détectée" /> : null}
                      {!periodeVisible && (valeurs.periodeDebut || valeurs.periodeFin) ? (
                        <span className="text-[11px] font-normal text-ink-soft">
                          {formatPeriode(valeurs.periodeDebut, valeurs.periodeFin)}
                        </span>
                      ) : null}
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn('shrink-0 text-ink-soft transition', periodeVisible && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>

                  {periodeVisible ? (
                    <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
                      <p className="text-[11px] leading-relaxed text-ink-soft">
                        Renseignez la période de la facture : le montant du mois est ventilé au prorata
                        temporis par le backend.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <GroupeChamp
                          id="frais-periode-debut"
                          label="Début de la période"
                          erreur={errors.periodeDebut?.message}
                        >
                          <input
                            id="frais-periode-debut"
                            type="date"
                            className={cn('champ', errors.periodeDebut && 'champ-erreur')}
                            data-cy="input-periode-debut"
                            aria-invalid={Boolean(errors.periodeDebut)}
                            {...register('periodeDebut', {
                              onChange: () => setIa((precedent) => ({ ...precedent, periode: false })),
                            })}
                          />
                        </GroupeChamp>
                        <GroupeChamp
                          id="frais-periode-fin"
                          label="Fin de la période"
                          erreur={errors.periodeFin?.message}
                        >
                          <input
                            id="frais-periode-fin"
                            type="date"
                            className={cn('champ', errors.periodeFin && 'champ-erreur')}
                            data-cy="input-periode-fin"
                            aria-invalid={Boolean(errors.periodeFin)}
                            {...register('periodeFin', {
                              onChange: () => setIa((precedent) => ({ ...precedent, periode: false })),
                            })}
                          />
                        </GroupeChamp>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <GroupeChamp
                          id="frais-montant-mois"
                          label="Montant du mois (optionnel)"
                          erreur={errors.montantMoisSurcharge?.message}
                          aide="Surcharge manuelle : remplace la ventilation calculée."
                        >
                          <div className="relative">
                            <input
                              id="frais-montant-mois"
                              inputMode="decimal"
                              className={cn('champ pr-9', errors.montantMoisSurcharge && 'champ-erreur')}
                              data-cy="input-montant-mois"
                              aria-invalid={Boolean(errors.montantMoisSurcharge)}
                              {...register('montantMoisSurcharge')}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                              €
                            </span>
                          </div>
                        </GroupeChamp>
                        <div className="flex flex-col justify-end">
                          {estimation ? (
                            <p className="rounded-lg bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
                              Ventilation estimée :{' '}
                              <span className="font-semibold text-ink">
                                {estimation.joursMois} jours sur {estimation.joursTotal}
                              </span>{' '}
                              → <span className="nombre">{estimation.montantMois}</span>
                              <br />
                              Retenu estimé : <span className="nombre">{montantRetenuAffiche}</span>
                            </p>
                          ) : (
                            <p className="rounded-lg bg-surface px-3 py-2.5 text-xs text-ink-soft">
                              La ventilation apparaîtra dès que la période sera complète.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <Bouton
                    type="submit"
                    variante="primaire"
                    icone={ligneEnEdition ? <Pencil size={15} /> : <Plus size={16} />}
                    disabled={
                      !isValid ||
                      televersement ||
                      (!estLoyer && !justificatif) ||
                      (estLoyer && !loyerDisponible)
                    }
                    data-cy="btn-ajouter-frais"
                  >
                    {ligneEnEdition ? 'Enregistrer la modification' : 'Ajouter ce frais'}
                  </Bouton>
                  {ligneEnEdition ? (
                    <Bouton variante="fantome" petit onClick={annulerEdition}>
                      Annuler la modification
                    </Bouton>
                  ) : null}
                </div>
                <p className="text-[11px] text-ink-soft">
                  Le formulaire se réinitialise après chaque ajout.
                </p>
              </div>
            </form>
          </div>

          <div className="carte">
            <div className="carte-entete">
              <div>
                <p className="eyebrow">Liste</p>
                <h2 className="mt-1 text-[22px] text-ink">Frais ajoutés</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {typesOublies.length > 0 ? (
                  <span className="badge badge-avertissement" title={`Il manque : ${typesOublies.join(', ')}`}>
                    <AlertTriangle size={11} aria-hidden="true" />
                    Il manque : {typesOublies.join(', ')}
                  </span>
                ) : null}
                <span className="badge badge-neutre">{lignes.length} ligne{lignes.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div data-cy="liste-frais">
              {lignes.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-paper-deep/70 text-ink-soft">
                    <FileText size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink">Aucun frais pour {formatMois(mois)}</p>
                  <p className="mt-1 max-w-sm text-xs text-ink-soft">
                    Sélectionnez un type de frais ci-dessus, déposez un justificatif et ajoutez la ligne.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="tableau-frais min-w-[760px]">
                    <thead>
                      <tr>
                        <th scope="col">Type</th>
                        <th scope="col">Fournisseur</th>
                        <th scope="col">Période</th>
                        <th scope="col" className="text-right">Montant TTC</th>
                        <th scope="col">Prorata</th>
                        <th scope="col" className="text-right">Montant retenu</th>
                        <th scope="col" className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((ligne, index) => {
                        const poste = posteParCode.get(ligne.posteCode);
                        const dto = calculAJour ? calcul?.lignes?.[index] : undefined;
                        return (
                          <tr key={ligne.cle} data-cy={`ligne-frais-${ligne.posteCode}`}>
                            <td>
                              <p className="font-semibold text-ink">
                                {poste?.libelle ?? dto?.posteLibelle ?? ligne.posteCode}
                              </p>
                              {ligne.justificatifNom ? (
                                <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-ink-soft" title={ligne.justificatifNom}>
                                  {ligne.justificatifNom}
                                </p>
                              ) : null}
                            </td>
                            <td className="text-ink-soft">
                              {ligne.fournisseurDetecte ?? poste?.fournisseur ?? '—'}
                            </td>
                            <td className="whitespace-nowrap text-xs text-ink-soft">
                              {ligne.periodeDebut && ligne.periodeFin
                                ? formatPeriode(ligne.periodeDebut, ligne.periodeFin)
                                : 'Mois concerné'}
                            </td>
                            <td className="whitespace-nowrap text-right">
                              <span className="nombre font-semibold text-ink">
                                {formatEUR(ligne.montantTtc)}
                              </span>
                              {ligne.sourceMontant === 'AI' ? (
                                <span className="ml-2 inline-flex align-middle">
                                  <BadgeIA />
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <div className="relative w-[92px]">
                                <input
                                  inputMode="decimal"
                                  className={cn(
                                    'champ mt-0 px-2 py-1 pr-6 text-xs',
                                    parsePourcentage(ligne.prorataPct) === null && 'champ-erreur',
                                  )}
                                  value={ligne.prorataPct}
                                  onChange={(evenement) => modifierProrata(ligne, evenement.target.value)}
                                  onBlur={(evenement) => {
                                    const normalise = parsePourcentage(evenement.target.value);
                                    if (normalise !== null) {
                                      modifierProrata(ligne, normalise);
                                    }
                                  }}
                                  aria-label={`Prorata de ${poste?.libelle ?? ligne.posteCode}`}
                                  aria-invalid={parsePourcentage(ligne.prorataPct) === null}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-ink-soft">
                                  %
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap text-right">
                              {dto?.montantRetenu ? (
                                <span className="nombre font-semibold text-accent-strong">
                                  {formatEUR(dto.montantRetenu)}
                                </span>
                              ) : (
                                <span className="text-xs text-ink-soft">
                                  {calculEnCours ? 'Calcul…' : '—'}
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                {ligne.justificatifId ? (
                                  <a
                                    href={api.justificatifs.urlFichier(ligne.justificatifId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                                    aria-label={`Voir le justificatif de ${poste?.libelle ?? ligne.posteCode}`}
                                    data-cy={`btn-voir-justificatif-${ligne.posteCode}`}
                                  >
                                    <FileText size={15} />
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                                  onClick={() => editerLigne(ligne)}
                                  aria-label={`Modifier ${poste?.libelle ?? ligne.posteCode}`}
                                  data-cy={`btn-modifier-${ligne.posteCode}`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-danger-soft hover:text-danger"
                                  onClick={() => setLigneASupprimer(ligne)}
                                  aria-label={`Supprimer ${poste?.libelle ?? ligne.posteCode}`}
                                  data-cy={`btn-supprimer-${ligne.posteCode}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-line px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Total retenu</p>
                  <p className="mt-1 flex items-baseline gap-2 font-display text-[30px] leading-none text-accent-strong">
                    <span className="nombre" data-cy="total-retenu">
                      {formatEUR(totalAffiche)}
                    </span>
                    {calculEnCours ? <Spinner taille={15} /> : null}
                  </p>
                  {calcul?.totalEnLettres ? (
                    <p className="mt-1.5 text-xs text-ink-soft">Soit {calcul.totalEnLettres}.</p>
                  ) : null}
                </div>
                <div className="text-right text-[11px] leading-relaxed text-ink-soft">
                  <p>
                    Base de prorata :{' '}
                    <span className="font-medium text-ink">
                      {calcul?.baseProrataDetail ?? parametres.data?.prorataBaseDetail ?? '—'}
                    </span>
                  </p>
                  {calcul?.baseProrata ? (
                    <p>
                      Quote-part de référence : <span className="nombre">{formatEUR(calcul.baseProrata)}</span>
                    </p>
                  ) : null}
                  <p>Calcul backend · recalcul automatique (300 ms).</p>
                </div>
              </div>

              {calculErreur ? (
                <p className="erreur-champ" role="alert">
                  Calcul indisponible : {calculErreur}
                </p>
              ) : null}
              {requetes.erreur && !calculErreur ? (
                <p className="erreur-champ" role="alert">
                  {requetes.erreur}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Bouton
                  variante="primaire"
                  icone={<FileCheck2 size={16} />}
                  chargement={generationEnCours}
                  disabled={lignes.length === 0 || !calculAJour}
                  onClick={demanderGeneration}
                  data-cy="btn-generer-note"
                >
                  Générer la note de frais
                </Bouton>
                <p className="max-w-[300px] text-[11px] leading-snug text-ink-soft">
                  {lignes.length === 0
                    ? 'Ajoutez au moins un frais pour générer la note.'
                    : !calculAJour
                      ? 'En attente du calcul backend à jour…'
                      : noteActive.data
                        ? `Une version ${versionActive} existe : la version ${(versionActive ?? 0) + 1} sera créée.`
                        : 'Le PDF définitif sera enregistré dans l’historique.'}
                </p>
              </div>
            </div>
          </div>

          {resultat ? (
            <div className="carte animation-fondu overflow-hidden border-accent/25">
              <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-accent">Note de frais générée</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatMois(resultat.mois)} · version {resultat.version ?? 1} ·{' '}
                    {formatEUR(resultat.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Enregistrée avec le template « {resultat.templateNom ?? templateCourant} » v
                    {resultat.templateVersion ?? 1} le {formatDateHeure(resultat.createdAt)}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Bouton
                  variante="primaire"
                  petit
                  icone={<Download size={14} />}
                  onClick={() => void telechargerNote(resultat, false)}
                  data-cy="btn-telecharger-note"
                >
                  Télécharger la note seule
                </Bouton>
                <Bouton
                  variante="secondaire"
                  petit
                  icone={<Download size={14} />}
                  onClick={() => void telechargerNote(resultat, true)}
                  data-cy="btn-telecharger-note-complete"
                >
                  Télécharger la note complète
                </Bouton>
                {resultat.id ? (
                  <a
                    href={api.notes.urlPdf(resultat.id, false)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondaire btn-petit"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Ouvrir
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
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
            url={requeteApercu ? apercu.url : null}
            chargement={apercu.chargement}
            erreur={
              requetes.erreur
                ? 'Corrigez les lignes en rouge pour actualiser l’aperçu.'
                : lignes.length === 0
                  ? 'Ajoutez un frais pour voir l’aperçu de la note.'
                  : apercu.erreur
            }
            misAJour={apercu.misAJour}
            onTelecharger={apercu.telecharger}
            actions={
              <>
                <select
                  aria-label="Template de la note de frais"
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
                  value={templateSelectionne ?? ''}
                  onChange={(evenement) =>
                    brouillon.definirTemplate(
                      evenement.target.value ? Number(evenement.target.value) : null,
                    )
                  }
                  disabled={modeles.length === 0}
                  data-cy="select-template"
                >
                  {modeles.length === 0 ? <option value="">Modèle intégré</option> : null}
                  {modeles.map((modele) => (
                    <option key={modele.id} value={modele.id}>
                      {modele.nom} — v{modele.version}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#1d5b49]"
                    checked={complet}
                    onChange={(evenement) => brouillon.definirComplet(evenement.target.checked)}
                    data-cy="toggle-apercu-complet"
                  />
                  Avec annexes
                </label>
              </>
            }
          />
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
            L’aperçu est rendu par le backend à partir des mêmes lignes que le total affiché. Il porte un
            filigrane et n’est jamais enregistré.
          </p>
        </div>
      </div>

      <DialogueConfirmation
        ouvert={ligneASupprimer !== null}
        titre="Supprimer ce frais ?"
        message={
          ligneASupprimer ? (
            <>
              La ligne « {posteParCode.get(ligneASupprimer.posteCode)?.libelle ?? ligneASupprimer.posteCode} »
              sera retirée du brouillon. Cette action ne modifie pas les versions déjà générées.
            </>
          ) : null
        }
        libelleConfirmer="Supprimer"
        variante="danger"
        onConfirmer={supprimerLigne}
        onAnnuler={() => setLigneASupprimer(null)}
        dataCy="dialogue-suppression-frais"
      />

      <DialogueConfirmation
        ouvert={dialogueRegeneration}
        titre="Générer une nouvelle version ?"
        message={
          <>
            Une note active existe déjà pour {formatMois(mois)} (version {versionActive}). La version{' '}
            {(versionActive ?? 0) + 1} sera créée et l’ancienne restera consultable dans l’historique.
          </>
        }
        libelleConfirmer="Créer la nouvelle version"
        onConfirmer={() => {
          setDialogueRegeneration(false);
          void genererNote();
        }}
        onAnnuler={() => setDialogueRegeneration(false)}
        dataCy="dialogue-regeneration-note"
      />
    </>
  );
}
