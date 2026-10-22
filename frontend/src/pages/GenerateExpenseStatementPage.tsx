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
import { isCancellation, errorMessage, downloadBlob } from '@/api/client';
import { api } from '@/api/endpoints';
import {
  useActiveStatement,
  useSettings,
  useExpenseItems,
  useActiveRentReceipt,
  useTemplates,
} from '@/api/queries';
import type {
  CalculationResponse,
  AiConfidence,
  ExtractionDto,
  LineRequest,
  StatementPreviewRequest,
  StatementDto,
  StatementGenerationRequest,
  ExpenseItemDto,
} from '@/api/types';
import { AiBadge } from '@/components/AiBadge';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState, Spinner } from '@/components/States';
import { SelectedFile, FileDropzone } from '@/components/FileDropzone';
import { FieldGroup } from '@/components/FieldGroup';
import { PageHeader } from '@/components/PageHeader';
import { PdfViewer } from '@/components/PdfViewer';
import { isAnalysisRunning, useAnalysis, type AnalysisState } from '@/hooks/useAnalysis';
import { usePdfPreview } from '@/hooks/usePdfPreview';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { periodInOrder, isValidDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import {
  formatDateTime,
  formatEUR,
  formatMonth,
  formatPeriod,
  estimatedRetainedAmount,
  parseAmount,
  parsePercentage,
} from '@/lib/format';
import {
  newKey,
  typeAlreadyAdded,
  missingTypes,
  toLineRequest,
  type DraftLine,
} from '@/lib/lines';
import { estimateAllocation } from '@/lib/allocation';
import { expenseSchema, type ExpenseFormValues } from '@/lib/validation';
import { useStatementLines, useStatementDraft } from '@/state/statementDraft';
import { useRentReceiptDraft } from '@/state/rentReceiptDraft';
import { toast } from '@/state/toasts';

const INITIAL_VALUES: ExpenseFormValues = {
  posteCode: '',
  montantTtc: '',
  prorataPct: '100',
  periodeDebut: '',
  periodeFin: '',
  montantMoisSurcharge: '',
};

interface AttachedFile {
  id: number;
  nom: string;
  taille: number | null;
  typeMime: string | null;
}

interface AiState {
  type: boolean;
  montant: boolean;
  periode: boolean;
  montantDetecte: string | null;
  fournisseur: string | null;
  extraitSource: string | null;
  confiance: AiConfidence | null;
}

const AI_EMPTY: AiState = {
  type: false,
  montant: false,
  periode: false,
  montantDetecte: null,
  fournisseur: null,
  extraitSource: null,
  confiance: null,
};

function confidenceValid(value: string | null | undefined): AiConfidence | null {
  return value === 'haute' || value === 'moyenne' || value === 'basse' ? value : null;
}

function confidenceLabel(confidence: AiConfidence | null): string | null {
  if (confidence === 'haute') {
    return 'Confiance élevée';
  }
  if (confidence === 'moyenne') {
    return 'Confiance moyenne';
  }
  if (confidence === 'basse') {
    return 'Confiance faible — vérifiez les valeurs';
  }
  return null;
}

function AnalysisPanel({
  etat: phase,
  aFichier: hasFile,
  onAnnuler: onCancel,
}: {
  etat: AnalysisState;
  aFichier: boolean;
  onAnnuler: () => void;
}) {
  const inProgress = isAnalysisRunning(phase);
  const result: ExtractionDto | null = phase.statut === 'terminee' ? phase.analyse.resultat ?? null : null;
  const duration =
    phase.statut === 'terminee' && phase.analyse.dureeMs
      ? `${(phase.analyse.dureeMs / 1000).toFixed(1)} s`
      : null;

  return (
    <div
      data-cy="analyse-statut"
      aria-live="polite"
      className={cn(
        'rounded-xl border px-3.5 py-3 text-xs',
        phase.statut === 'echec'
          ? 'border-warning/25 bg-warning-soft/40 text-warning'
          : phase.statut === 'terminee'
            ? 'border-copper/20 bg-copper-soft/50 text-ink'
            : inProgress
              ? 'border-accent/20 bg-accent-soft/45 text-ink'
              : 'border-line bg-paper/50 text-ink-soft',
      )}
    >
      {inProgress ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <Spinner taille={14} />
            {phase.statut === 'demarrage'
              ? 'Préparation de l’analyse…'
              : 'Analyse IA en cours — le modèle local peut prendre quelques secondes.'}
          </span>
          <Button variante="fantome" petit onClick={onCancel} data-cy="btn-annuler-analyse">
            <X size={13} aria-hidden="true" />
            Annuler l’analyse
          </Button>
        </div>
      ) : phase.statut === 'terminee' ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 size={14} className="text-copper" aria-hidden="true" />
            Analyse terminée{duration ? ` en ${duration}` : ''} — les champs vides ont été pré-remplis.
          </p>
          {result ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
              <AiBadge extraitSource={result.extraitSource} />
              {result.fournisseur ? <span>Fournisseur détecté : {result.fournisseur}</span> : null}
              {confidenceLabel(confidenceValid(result.confiance)) ? (
                <span className={cn(confidenceValid(result.confiance) === 'basse' && 'font-semibold text-warning')}>
                  {confidenceLabel(confidenceValid(result.confiance))}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px]">
              Aucune information exploitable n’a été extraite. Complétez le frais manuellement.
            </p>
          )}
          {result?.extraitSource ? (
            <p className="border-l-2 border-copper/30 pl-2 text-[11px] italic text-ink-soft">
              « {result.extraitSource} »
            </p>
          ) : null}
          <p className="text-[11px] text-ink-soft">
            Les propositions de l’IA restent modifiables. Vérifiez-les avant d’ajouter le frais.
          </p>
        </div>
      ) : phase.statut === 'echec' ? (
        <p className="flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {phase.message} L’analyse est facultative : vous pouvez saisir le montant et le prorata
            manuellement.
          </span>
        </p>
      ) : phase.statut === 'annulee' ? (
        <p>{phase.message} La saisie manuelle reste disponible.</p>
      ) : (
        <p>
          {hasFile
            ? 'Analyse non lancée. Vous pouvez saisir le frais manuellement.'
            : 'Déposez un justificatif : l’analyse IA démarrera automatiquement. Elle reste facultative.'}
        </p>
      )}
    </div>
  );
}

export function GenerateExpenseStatementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useStatementDraft();
  const lines = useStatementLines();
  const mobile = useMediaQuery('(max-width: 1023px)');
  const [mobilePanel, setMobilePanel] = useState<'saisie' | 'apercu'>('saisie');

  const month = draft.mois;
  const settings = useSettings();
  const expenseItemsQuery = useExpenseItems(false);
  const templates = useTemplates('NOTE_FRAIS');
  const rentReceipt = useActiveRentReceipt(month);
  const activeStatement = useActiveStatement(month);

  const expenseItems = useMemo<ExpenseItemDto[]>(
    () => [...(expenseItemsQuery.data ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
    [expenseItemsQuery.data],
  );
  const expenseItemByCode = useMemo(
    () => new Map(expenseItems.map((expenseItem) => [expenseItem.code ?? '', expenseItem])),
    [expenseItems],
  );

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.actif) ?? null;
  const selectedTemplate = draft.templatesParMois[month] ?? activeModel?.id ?? null;
  const complete = draft.completsParMois[month] ?? true;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: 'onChange',
    defaultValues: INITIAL_VALUES,
  });

  const values = watch();
  const isRent = values.posteCode === 'loyer';
  const availableRent = Boolean(rentReceipt.data?.id);

  const { etat: analysisPhase, demarrer: start, annuler: cancel, reinitialiser: resetStatement } = useAnalysis();
  const [receipt, setReceipt] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiState>(AI_EMPTY);
  const [lineBeingEdited, setLineBeingEdited] = useState<string | null>(null);
  const [periodVisible, setPeriodVisible] = useState(false);
  const [lineToRemove, setLineToRemove] = useState<DraftLine | null>(null);
  const [regenerationDialog, setRegenerationDialog] = useState(false);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [result, setResult] = useState<StatementDto | null>(null);

  const uploadSequence = useRef(0);
  const appliedAnalysis = useRef<number | null>(null);
  const originalReceipt = useRef<AttachedFile | null>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const formCardRef = useRef<HTMLFormElement>(null);

  function releaseIfNotAttached(file: AttachedFile) {
    const isOriginal = originalReceipt.current?.id === file.id;
    if (!isOriginal) {
      void api.justificatifs.supprimer(file.id).catch(() => undefined);
    }
  }

  function resetForm() {
    reset(INITIAL_VALUES);
    setAi(AI_EMPTY);
    setPeriodVisible(false);
    setFileError(null);
    setLineBeingEdited(null);
    setReceipt(null);
    originalReceipt.current = null;
    appliedAnalysis.current = null;
  }

  function focusType() {
    window.setTimeout(() => typeRef.current?.focus(), 0);
  }

  async function upload(file: File) {
    const sequence = ++uploadSequence.current;
    const old = receipt;
    setUploading(true);
    setFileError(null);
    setAi(AI_EMPTY);
    appliedAnalysis.current = null;
    resetStatement();

    try {
      const dto = await api.justificatifs.uploader(file);
      if (!dto.id) {
        throw new Error('Le justificatif n’a pas pu être enregistré.');
      }
      if (sequence !== uploadSequence.current) {
        void api.justificatifs.supprimer(dto.id).catch(() => undefined);
        return;
      }
      if (old) {
        releaseIfNotAttached(old);
      }
      setReceipt({
        id: dto.id,
        nom: dto.nomFichier ?? file.name,
        taille: dto.taille ?? file.size,
        typeMime: dto.typeMime ?? file.type,
      });
      await start(dto.id);
    } catch (error) {
      if (sequence === uploadSequence.current) {
        setReceipt(old);
        setFileError(errorMessage(error));
      }
    } finally {
      if (sequence === uploadSequence.current) {
        setUploading(false);
      }
    }
  }

  function removeFile() {
    uploadSequence.current += 1;
    void cancel(true);
    const old = receipt;
    setReceipt(null);
    setFileError(null);
    setAi(AI_EMPTY);
    appliedAnalysis.current = null;
    if (old) {
      releaseIfNotAttached(old);
    }
  }

  useEffect(() => {
    const activeRentReceipt = rentReceipt.data;
    if (!activeRentReceipt?.id || !activeRentReceipt.total) {
      return;
    }
    if (getValues('posteCode') !== 'loyer') {
      return;
    }
    setValue('montantTtc', activeRentReceipt.total, { shouldValidate: true, shouldDirty: true });
    // Le montant du loyer est verrouillé sur la quittance active du mois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentReceipt.data?.id, rentReceipt.data?.total]);

  useEffect(() => {
    if (analysisPhase.statut !== 'terminee' || !expenseItemsQuery.data) {
      return;
    }
    const analysis = analysisPhase.analyse;
    const analysisId = analysis.id;
    if (analysisId === null || analysisId === undefined || appliedAnalysis.current === analysisId) {
      return;
    }
    if (analysis.justificatifId !== receipt?.id) {
      return;
    }
    appliedAnalysis.current = analysisId;
    const extraction = analysis.resultat;
    if (!extraction) {
      return;
    }

    const current = getValues();
    const currentLines = useStatementDraft.getState().lignesParMois[month] ?? [];
    let appliedType = false;
    let appliedAmount = false;
    let appliedPeriod = false;

    const suggestedAmount =
      extraction.devise && extraction.devise.toUpperCase() !== 'EUR'
        ? null
        : extraction.montantTtc
          ? parseAmount(extraction.montantTtc)
          : null;

    if (!current.montantTtc && suggestedAmount !== null) {
      appliedAmount = true;
    }

    const start = extraction.periodeDebut && isValidDate(extraction.periodeDebut) ? extraction.periodeDebut : '';
    const end = extraction.periodeFin && isValidDate(extraction.periodeFin) ? extraction.periodeFin : '';
    const isValidPeriod = Boolean(start && end && periodInOrder(start, end));

    if (!current.periodeDebut && !current.periodeFin && isValidPeriod) {
      appliedPeriod = true;
    }

    const suggestedItem =
      extraction.typeSuggere && extraction.typeSuggere !== 'loyer'
        ? expenseItemByCode.get(extraction.typeSuggere) ?? null
        : null;
    const others = currentLines.filter((line) => line.cle !== lineBeingEdited);

    if (
      !current.posteCode &&
      suggestedItem?.code &&
      (suggestedItem.plusieursLignesAutorisees || !typeAlreadyAdded(others, suggestedItem.code))
    ) {
      appliedType = true;
      setValue('posteCode', suggestedItem.code, { shouldValidate: true, shouldDirty: true });
      if (
        (current.prorataPct === '' || current.prorataPct === '100') &&
        suggestedItem.prorataPct
      ) {
        setValue('prorataPct', suggestedItem.prorataPct, { shouldValidate: true, shouldDirty: true });
      }
    }

    if (appliedAmount && suggestedAmount) {
      setValue('montantTtc', suggestedAmount, { shouldValidate: true, shouldDirty: true });
    }
    if (appliedPeriod) {
      setValue('periodeDebut', start, { shouldValidate: true, shouldDirty: true });
      setValue('periodeFin', end, { shouldValidate: true, shouldDirty: true });
      setPeriodVisible(true);
    }

    setAi({
      type: appliedType,
      montant: appliedAmount,
      periode: appliedPeriod,
      montantDetecte: suggestedAmount,
      fournisseur: extraction.fournisseur ?? null,
      extraitSource: extraction.extraitSource ?? null,
      confiance: confidenceValid(extraction.confiance),
    });
    if (appliedAmount || appliedPeriod || appliedType) {
      toast.info('Des champs ont été pré-remplis par l’IA. Vérifiez-les avant d’ajouter le frais.');
    }
    // L'extraction n'est appliquée qu'une fois par analyse, et uniquement aux champs vides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisPhase, receipt?.id, expenseItemsQuery.data, lineBeingEdited]);

  function changeMonth(value: string) {
    if (!value || value === month) {
      return;
    }
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    if (receipt) {
      releaseIfNotAttached(receipt);
    }
    resetForm();
    setResult(null);
    setMobilePanel('saisie');
    draft.changerMois(value);
  }

  function changeType(code: string) {
    const old = getValues('posteCode');
    const expenseItem = expenseItemByCode.get(code) ?? null;
    setValue('posteCode', code, { shouldValidate: true, shouldDirty: true });
    setValue('prorataPct', expenseItem?.prorataPct ?? '100', { shouldValidate: true, shouldDirty: true });
    setValue('periodeDebut', '', { shouldDirty: true });
    setValue('periodeFin', '', { shouldDirty: true });
    setValue('montantMoisSurcharge', '', { shouldDirty: true });
    setPeriodVisible(false);
    setAi((previous) => ({ ...previous, type: false, periode: false }));

    if (code === 'loyer' && old !== 'loyer') {
      if (!lineBeingEdited) {
        removeFile();
      } else {
        void cancel(true);
        resetStatement();
      }
      setValue('montantTtc', rentReceipt.data?.total ?? '', { shouldValidate: true, shouldDirty: true });
    } else if (code !== 'loyer' && old === 'loyer') {
      setValue('montantTtc', '', { shouldValidate: true, shouldDirty: true });
    }
  }

  function editLine(line: DraftLine) {
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    appliedAnalysis.current = null;
    setLineBeingEdited(line.cle);
    const file: AttachedFile | null = line.justificatifId
      ? {
          id: line.justificatifId,
          nom: line.justificatifNom ?? 'Justificatif',
          taille: null,
          typeMime: null,
        }
      : null;
    originalReceipt.current = file;
    setReceipt(file);
    setFileError(null);
    reset({
      posteCode: line.posteCode,
      montantTtc:
        line.posteCode === 'loyer' && rentReceipt.data?.total ? rentReceipt.data.total : line.montantTtc,
      prorataPct: line.prorataPct,
      periodeDebut: line.periodeDebut,
      periodeFin: line.periodeFin,
      montantMoisSurcharge: line.montantMoisSurcharge,
    });
    setPeriodVisible(Boolean(line.periodeDebut || line.periodeFin || line.montantMoisSurcharge));
    setAi({
      type: false,
      montant: line.sourceMontant === 'AI',
      periode: false,
      montantDetecte: line.montantDetecteIa,
      fournisseur: line.fournisseurDetecte,
      extraitSource: null,
      confiance: line.confianceIa,
    });
    setResult(null);
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    focusType();
  }

  function cancelEdit() {
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    if (receipt) {
      releaseIfNotAttached(receipt);
    }
    resetForm();
    focusType();
  }

  function saveExpense(submittedValues: ExpenseFormValues) {
    const expenseItem = expenseItemByCode.get(submittedValues.posteCode);
    if (!expenseItem?.code) {
      setError('posteCode', { type: 'manual', message: 'Sélectionnez un type de frais.' });
      return;
    }
    const others = lines.filter((line) => line.cle !== lineBeingEdited);
    if (!expenseItem.plusieursLignesAutorisees && typeAlreadyAdded(others, expenseItem.code)) {
      setError('posteCode', {
        type: 'manual',
        message: 'Ce type est déjà présent. Modifiez la ligne existante ou autorisez plusieurs lignes.',
      });
      return;
    }
    const rentLine = expenseItem.code === 'loyer';
    if (rentLine && !availableRent) {
      setFileError('Ajoutez d’abord la quittance du mois pour utiliser ce type.');
      return;
    }
    if (!rentLine && !receipt) {
      setFileError('Le justificatif est obligatoire pour ce type de frais.');
      return;
    }

    const amountInclVat = parseAmount(submittedValues.montantTtc);
    const proRataPct = parsePercentage(submittedValues.prorataPct);
    if (amountInclVat === null || proRataPct === null) {
      return;
    }
    const override = submittedValues.montantMoisSurcharge.trim()
      ? parseAmount(submittedValues.montantMoisSurcharge)
      : null;

    const line: DraftLine = {
      cle: lineBeingEdited ?? newKey(),
      posteCode: expenseItem.code,
      montantTtc: amountInclVat,
      prorataPct: proRataPct,
      periodeDebut: submittedValues.periodeDebut,
      periodeFin: submittedValues.periodeFin,
      montantMoisSurcharge: override ?? '',
      justificatifId: rentLine ? null : receipt?.id ?? null,
      justificatifNom: rentLine ? null : receipt?.nom ?? null,
      sourceMontant: ai.montant ? 'AI' : 'MANUAL',
      montantDetecteIa: ai.montantDetecte,
      confianceIa: ai.confiance,
      fournisseurDetecte: ai.fournisseur,
    };

    if (lineBeingEdited) {
      draft.modifierLigne(lineBeingEdited, line);
      toast.succes('Frais modifié.');
    } else {
      draft.ajouterLigne(line);
      toast.succes('Frais ajouté.');
    }

    if (rentLine && receipt && originalReceipt.current?.id !== receipt.id) {
      releaseIfNotAttached(receipt);
    }
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    resetForm();
    setResult(null);
    focusType();
  }

  function removeLine() {
    if (!lineToRemove) {
      return;
    }
    const key = lineToRemove.cle;
    draft.supprimerLigne(key);
    if (lineBeingEdited === key) {
      resetForm();
    }
    setLineToRemove(null);
    setResult(null);
    toast.info('Frais supprimé.');
  }

  function changeProRata(line: DraftLine, value: string) {
    draft.modifierLigne(line.cle, { prorataPct: value });
    setResult(null);
  }

  const requests = useMemo<{ valeurs: LineRequest[] | null; erreur: string | null }>(() => {
    try {
      return { valeurs: lines.map(toLineRequest), erreur: null };
    } catch (error) {
      return {
        valeurs: null,
        erreur: error instanceof Error ? error.message : 'Les lignes contiennent une valeur invalide.',
      };
    }
  }, [lines]);

  const calculationSignature = useMemo(
    () => JSON.stringify({ mois: month, lignes: requests.valeurs }),
    [month, requests],
  );

  const [calculation, setCalculation] = useState<CalculationResponse | null>(null);
  const [calculatedSignature, setCalculatedSignature] = useState<string | null>(null);
  const [calculationInProgress, setCalculationInProgress] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (requests.erreur) {
      setCalculationError(requests.erreur);
      setCalculationInProgress(false);
      return () => controller.abort();
    }
    if (!requests.valeurs) {
      return () => controller.abort();
    }
    const validRequests = requests.valeurs;
    setCalculationInProgress(true);
    setCalculationError(null);
    const timer = window.setTimeout(async () => {
      try {
        const reply = await api.notes.calculer({ mois: month, lignes: validRequests }, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setCalculation(reply);
        setCalculatedSignature(calculationSignature);
        setCalculationInProgress(false);
      } catch (error) {
        if (isCancellation(error) || controller.signal.aborted) {
          return;
        }
        setCalculationError(errorMessage(error));
        setCalculationInProgress(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationSignature, month, requests.erreur]);

  const calculationUpToDate =
    calculatedSignature === calculationSignature && calculation !== null && calculationError === null;

  const previewRequest = useMemo<StatementPreviewRequest | null>(() => {
    if (!requests.valeurs || lines.length === 0) {
      return null;
    }
    const requestBody: StatementPreviewRequest = { mois: month, complet: complete, lignes: requests.valeurs };
    if (selectedTemplate !== null) {
      requestBody.templateId = selectedTemplate;
    }
    return requestBody;
  }, [month, complete, selectedTemplate, requests, lines.length]);

  const preview = usePdfPreview(
    (signal) =>
      previewRequest
        ? api.notes.apercu(previewRequest, signal)
        : Promise.reject(new DOMException('Aperçu inactif', 'AbortError')),
    JSON.stringify(previewRequest ?? { inactif: true }),
    { actif: previewRequest !== null, debounceMs: 400 },
  );

  function goToRentReceipt() {
    useRentReceiptDraft.getState().changerMois(month);
    navigate('/generer/quittance');
  }

  async function generateStatement() {
    if (!requests.valeurs || lines.length === 0 || !calculationUpToDate) {
      return;
    }
    setGenerationInProgress(true);
    try {
      const requestBody: StatementGenerationRequest = { mois: month, lignes: requests.valeurs };
      if (selectedTemplate !== null) {
        requestBody.templateId = selectedTemplate;
      }
      const statement = await api.notes.generer(requestBody);
      setResult(statement);
      draft.marquerGenere();
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.succes(`Note de ${formatMonth(month)} générée en version ${statement.version ?? 1}.`);
    } catch (error) {
      toast.erreur(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  function requestGeneration() {
    if (activeStatement.data) {
      setRegenerationDialog(true);
      return;
    }
    void generateStatement();
  }

  async function downloadStatement(statement: StatementDto, withAttachments: boolean) {
    if (!statement.id) {
      return;
    }
    try {
      const reply = await api.notes.pdf(statement.id, withAttachments);
      downloadBlob(
        reply.blob,
        reply.nomFichier ??
          `note_frais_${statement.mois ?? month}_v${statement.version ?? 1}${withAttachments ? '_complet' : ''}.pdf`,
      );
    } catch (error) {
      toast.erreur(errorMessage(error));
    }
  }

  const estimate = estimateAllocation(
    values.montantTtc,
    values.prorataPct,
    values.periodeDebut,
    values.periodeFin,
    month,
  );
  const typedOverride = values.montantMoisSurcharge.trim()
    ? parseAmount(values.montantMoisSurcharge)
    : null;
  const estimatedMonthAmount = typedOverride ?? estimate?.montantMois ?? values.montantTtc;
  const displayedRetainedAmount = estimatedRetainedAmount(estimatedMonthAmount, values.prorataPct);
  const omittedTypes = missingTypes(expenseItems, lines);
  const lowConfidenceError = ai.confiance === 'basse' && (ai.montant || ai.periode);

  function optionDisabled(expenseItem: ExpenseItemDto): boolean {
    if (!expenseItem.code || expenseItem.plusieursLignesAutorisees) {
      return false;
    }
    if (lineBeingEdited && lines.find((line) => line.cle === lineBeingEdited)?.posteCode === expenseItem.code) {
      return false;
    }
    return typeAlreadyAdded(lines, expenseItem.code);
  }

  const displayedTotal = calculation?.total;
  const activeVersion = activeStatement.data?.version;
  const currentTemplate = activeModel?.nom ?? 'modèle intégré';

  return (
    <>
      <PageHeader
        surTitre="Générer · Note de frais"
        titre="Note de frais d’occupation"
        description="Ajoutez les factures du mois, vérifiez les propositions de l’IA et laissez le backend calculer la quote-part. Le loyer est repris de la quittance active."
        actions={
          <>
            <Button variante="secondaire" icone={<ReceiptText size={15} />} onClick={goToRentReceipt}>
              Quittance du mois
            </Button>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium text-ink-soft sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMonth(month)}
            </span>
          </>
        }
      />

      {activeStatement.data && !result ? (
        <div className="carte mb-4 flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
              <FileCheck2 size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {formatMonth(month)} — note version {activeVersion} déjà active
              </p>
              <p className="text-xs text-ink-soft">
                Total {formatEUR(activeStatement.data.total)}. Générer à nouveau créera la version{' '}
                {(activeVersion ?? 0) + 1}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeStatement.data.id ? (
              <>
                <a
                  href={api.notes.urlPdf(activeStatement.data.id, false)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondaire btn-petit"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Ouvrir
                </a>
                <a
                  href={api.notes.urlPdf(activeStatement.data.id, true)}
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

      {settings.isError ? (
        <div className="mb-4">
          <ErrorState message={errorMessage(settings.error)} onReessayer={() => void settings.refetch()} />
        </div>
      ) : null}
      {expenseItemsQuery.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(expenseItemsQuery.error)}
            onReessayer={() => void expenseItemsQuery.refetch()}
          />
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(400px,0.94fr)] xl:gap-6">
        <div
          data-cy="volet-saisie"
          className={cn('min-w-0 space-y-4', mobile && mobilePanel !== 'saisie' && 'hidden')}
        >
          <div className="carte">
            <div className="carte-entete">
              <div>
                <p className="eyebrow">{lineBeingEdited ? 'Modification' : 'Ajouter un frais'}</p>
                <h2 className="mt-1 text-[22px] text-ink">
                  {lineBeingEdited ? 'Modifier le frais' : 'Nouveau frais'}
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
                    value={month}
                    onChange={(event) => changeMonth(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <form ref={formCardRef} onSubmit={handleSubmit(saveExpense)} noValidate>
              <div className="carte-corps space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <FieldGroup
                    id="frais-type"
                    label="Type de frais"
                    erreur={errors.posteCode?.message}
                    badge={ai.type ? <AiBadge libelle="Type suggéré par IA" /> : undefined}
                    aide={
                      ai.fournisseur
                        ? `Fournisseur détecté : ${ai.fournisseur}`
                        : 'Les libellés proviennent de votre configuration.'
                    }
                  >
                    <select
                      id="frais-type"
                      ref={typeRef}
                      className={cn('champ', errors.posteCode && 'champ-erreur')}
                      data-cy="select-type-frais"
                      value={values.posteCode}
                      onChange={(event) => changeType(event.target.value)}
                      aria-invalid={Boolean(errors.posteCode)}
                      disabled={expenseItemsQuery.isPending}
                    >
                      <option value="">Sélectionner…</option>
                      {expenseItems.map((expenseItem) => (
                        <option
                          key={expenseItem.code}
                          value={expenseItem.code}
                          disabled={optionDisabled(expenseItem)}
                        >
                          {expenseItem.libelle ?? expenseItem.code}
                          {expenseItem.fournisseur ? ` (${expenseItem.fournisseur})` : ''}
                          {optionDisabled(expenseItem) ? ' — déjà ajouté' : ''}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>

                  <FieldGroup
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
                  </FieldGroup>
                </div>

                {isRent ? (
                  <div className="rounded-xl border border-line bg-paper/50 p-4">
                    {rentReceipt.isPending ? (
                      <p className="flex items-center gap-2 text-sm text-ink-soft">
                        <Spinner taille={16} /> Recherche de la quittance du mois…
                      </p>
                    ) : rentReceipt.data ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            Quittance de {formatMonth(month)} (v{rentReceipt.data.version ?? 1}) :{' '}
                            <span className="nombre">{formatEUR(rentReceipt.data.total)}</span>
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            Montant pré-rempli et verrouillé. La quittance sera annexée automatiquement.
                          </p>
                        </div>
                        {rentReceipt.data.id ? (
                          <a
                            href={api.quittances.urlPdf(rentReceipt.data.id)}
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
                        <Button variante="secondaire" petit onClick={goToRentReceipt}>
                          Générer la quittance
                        </Button>
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
                    {uploading ? (
                      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-4 text-sm text-ink-soft">
                        <Spinner taille={18} />
                        Envoi et préparation de l’analyse…
                      </div>
                    ) : receipt ? (
                      <SelectedFile
                        nom={receipt.nom}
                        taille={receipt.taille}
                        typeMime={receipt.typeMime}
                        onRetirer={removeFile}
                      />
                    ) : (
                      <FileDropzone
                        onFichier={(file) => void upload(file)}
                        dataCy="dropzone-fichier"
                        disabled={expenseItemsQuery.isPending}
                      />
                    )}
                    {fileError ? (
                      <p className="erreur-champ" role="alert">
                        {fileError}
                      </p>
                    ) : null}
                  </div>
                )}

                {!isRent ? (
                  <AnalysisPanel
                    etat={analysisPhase}
                    aFichier={receipt !== null || uploading}
                    onAnnuler={() => void cancel()}
                  />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="frais-montant"
                    label="Montant TTC"
                    erreur={errors.montantTtc?.message}
                    badge={ai.montant ? <AiBadge extraitSource={ai.extraitSource} /> : undefined}
                  >
                    <div className="relative">
                      <input
                        id="frais-montant"
                        inputMode="decimal"
                        className={cn(
                          'champ pr-9',
                          errors.montantTtc && 'champ-erreur',
                          lowConfidenceError && ai.montant && 'champ-avertissement',
                        )}
                        data-cy="input-montant-ttc"
                        aria-invalid={Boolean(errors.montantTtc)}
                        aria-readonly={isRent && availableRent}
                        readOnly={isRent && availableRent}
                        {...register('montantTtc', {
                          onChange: () => setAi((previous) => ({ ...previous, montant: false })),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>

                  <div className="flex flex-col justify-end rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
                    <p className="eyebrow text-accent">Montant retenu estimé</p>
                    <p className="mt-1 font-display text-[24px] leading-none text-accent-strong nombre">
                      {displayedRetainedAmount}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">
                      Estimation d’affichage : le backend recalcule chaque ligne avec arrondi au centime.
                    </p>
                  </div>
                </div>

                {lowConfidenceError ? (
                  <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2 text-xs text-warning">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Confiance faible : vérifiez le montant et la période avant d’ajouter le frais.
                  </p>
                ) : null}

                <div className="rounded-xl border border-line bg-paper/40">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-semibold text-ink"
                    onClick={() => setPeriodVisible((value) => !value)}
                    aria-expanded={periodVisible}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      Facture sur plusieurs mois ?
                      {ai.periode ? <AiBadge libelle="Période détectée" /> : null}
                      {!periodVisible && (values.periodeDebut || values.periodeFin) ? (
                        <span className="text-[11px] font-normal text-ink-soft">
                          {formatPeriod(values.periodeDebut, values.periodeFin)}
                        </span>
                      ) : null}
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn('shrink-0 text-ink-soft transition', periodVisible && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>

                  {periodVisible ? (
                    <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
                      <p className="text-[11px] leading-relaxed text-ink-soft">
                        Renseignez la période de la facture : le montant du mois est ventilé au prorata
                        temporis par le backend.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
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
                              onChange: () => setAi((previous) => ({ ...previous, periode: false })),
                            })}
                          />
                        </FieldGroup>
                        <FieldGroup
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
                              onChange: () => setAi((previous) => ({ ...previous, periode: false })),
                            })}
                          />
                        </FieldGroup>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
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
                        </FieldGroup>
                        <div className="flex flex-col justify-end">
                          {estimate ? (
                            <p className="rounded-lg bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
                              Ventilation estimée :{' '}
                              <span className="font-semibold text-ink">
                                {estimate.joursMois} jours sur {estimate.joursTotal}
                              </span>{' '}
                              → <span className="nombre">{estimate.montantMois}</span>
                              <br />
                              Retenu estimé : <span className="nombre">{displayedRetainedAmount}</span>
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
                  <Button
                    type="submit"
                    variante="primaire"
                    icone={lineBeingEdited ? <Pencil size={15} /> : <Plus size={16} />}
                    disabled={
                      !isValid ||
                      uploading ||
                      (!isRent && !receipt) ||
                      (isRent && !availableRent)
                    }
                    data-cy="btn-ajouter-frais"
                  >
                    {lineBeingEdited ? 'Enregistrer la modification' : 'Ajouter ce frais'}
                  </Button>
                  {lineBeingEdited ? (
                    <Button variante="fantome" petit onClick={cancelEdit}>
                      Annuler la modification
                    </Button>
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
                {omittedTypes.length > 0 ? (
                  <span className="badge badge-avertissement" title={`Il manque : ${omittedTypes.join(', ')}`}>
                    <AlertTriangle size={11} aria-hidden="true" />
                    Il manque : {omittedTypes.join(', ')}
                  </span>
                ) : null}
                <span className="badge badge-neutre">{lines.length} ligne{lines.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div data-cy="liste-frais">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-paper-deep/70 text-ink-soft">
                    <FileText size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink">Aucun frais pour {formatMonth(month)}</p>
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
                      {lines.map((line, index) => {
                        const expenseItem = expenseItemByCode.get(line.posteCode);
                        const dto = calculationUpToDate ? calculation?.lignes?.[index] : undefined;
                        return (
                          <tr key={line.cle} data-cy={`ligne-frais-${line.posteCode}`}>
                            <td>
                              <p className="font-semibold text-ink">
                                {expenseItem?.libelle ?? dto?.posteLibelle ?? line.posteCode}
                              </p>
                              {line.justificatifNom ? (
                                <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-ink-soft" title={line.justificatifNom}>
                                  {line.justificatifNom}
                                </p>
                              ) : null}
                            </td>
                            <td className="text-ink-soft">
                              {line.fournisseurDetecte ?? expenseItem?.fournisseur ?? '—'}
                            </td>
                            <td className="whitespace-nowrap text-xs text-ink-soft">
                              {line.periodeDebut && line.periodeFin
                                ? formatPeriod(line.periodeDebut, line.periodeFin)
                                : 'Mois concerné'}
                            </td>
                            <td className="whitespace-nowrap text-right">
                              <span className="nombre font-semibold text-ink">
                                {formatEUR(line.montantTtc)}
                              </span>
                              {line.sourceMontant === 'AI' ? (
                                <span className="ml-2 inline-flex align-middle">
                                  <AiBadge />
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <div className="relative w-[92px]">
                                <input
                                  inputMode="decimal"
                                  className={cn(
                                    'champ mt-0 px-2 py-1 pr-6 text-xs',
                                    parsePercentage(line.prorataPct) === null && 'champ-erreur',
                                  )}
                                  value={line.prorataPct}
                                  onChange={(event) => changeProRata(line, event.target.value)}
                                  onBlur={(event) => {
                                    const normalized = parsePercentage(event.target.value);
                                    if (normalized !== null) {
                                      changeProRata(line, normalized);
                                    }
                                  }}
                                  aria-label={`Prorata de ${expenseItem?.libelle ?? line.posteCode}`}
                                  aria-invalid={parsePercentage(line.prorataPct) === null}
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
                                  {calculationInProgress ? 'Calcul…' : '—'}
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                {line.justificatifId ? (
                                  <a
                                    href={api.justificatifs.urlFichier(line.justificatifId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                                    aria-label={`Voir le justificatif de ${expenseItem?.libelle ?? line.posteCode}`}
                                    data-cy={`btn-voir-justificatif-${line.posteCode}`}
                                  >
                                    <FileText size={15} />
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                                  onClick={() => editLine(line)}
                                  aria-label={`Modifier ${expenseItem?.libelle ?? line.posteCode}`}
                                  data-cy={`btn-modifier-${line.posteCode}`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-danger-soft hover:text-danger"
                                  onClick={() => setLineToRemove(line)}
                                  aria-label={`Supprimer ${expenseItem?.libelle ?? line.posteCode}`}
                                  data-cy={`btn-supprimer-${line.posteCode}`}
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
                      {formatEUR(displayedTotal)}
                    </span>
                    {calculationInProgress ? <Spinner taille={15} /> : null}
                  </p>
                  {calculation?.totalEnLettres ? (
                    <p className="mt-1.5 text-xs text-ink-soft">Soit {calculation.totalEnLettres}.</p>
                  ) : null}
                </div>
                <div className="text-right text-[11px] leading-relaxed text-ink-soft">
                  <p>
                    Base de prorata :{' '}
                    <span className="font-medium text-ink">
                      {calculation?.baseProrataDetail ?? settings.data?.prorataBaseDetail ?? '—'}
                    </span>
                  </p>
                  {calculation?.baseProrata ? (
                    <p>
                      Quote-part de référence : <span className="nombre">{formatEUR(calculation.baseProrata)}</span>
                    </p>
                  ) : null}
                  <p>Calcul backend · recalcul automatique (300 ms).</p>
                </div>
              </div>

              {calculationError ? (
                <p className="erreur-champ" role="alert">
                  Calcul indisponible : {calculationError}
                </p>
              ) : null}
              {requests.erreur && !calculationError ? (
                <p className="erreur-champ" role="alert">
                  {requests.erreur}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variante="primaire"
                  icone={<FileCheck2 size={16} />}
                  chargement={generationInProgress}
                  disabled={lines.length === 0 || !calculationUpToDate}
                  onClick={requestGeneration}
                  data-cy="btn-generer-note"
                >
                  Générer la note de frais
                </Button>
                <p className="max-w-[300px] text-[11px] leading-snug text-ink-soft">
                  {lines.length === 0
                    ? 'Ajoutez au moins un frais pour générer la note.'
                    : !calculationUpToDate
                      ? 'En attente du calcul backend à jour…'
                      : activeStatement.data
                        ? `Une version ${activeVersion} existe : la version ${(activeVersion ?? 0) + 1} sera créée.`
                        : 'Le PDF définitif sera enregistré dans l’historique.'}
                </p>
              </div>
            </div>
          </div>

          {result ? (
            <div className="carte animation-fondu overflow-hidden border-accent/25">
              <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-accent">Note de frais générée</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatMonth(result.mois)} · version {result.version ?? 1} ·{' '}
                    {formatEUR(result.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Enregistrée avec le template « {result.templateNom ?? currentTemplate} » v
                    {result.templateVersion ?? 1} le {formatDateTime(result.createdAt)}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Button
                  variante="primaire"
                  petit
                  icone={<Download size={14} />}
                  onClick={() => void downloadStatement(result, false)}
                  data-cy="btn-telecharger-note"
                >
                  Télécharger la note seule
                </Button>
                <Button
                  variante="secondaire"
                  petit
                  icone={<Download size={14} />}
                  onClick={() => void downloadStatement(result, true)}
                  data-cy="btn-telecharger-note-complete"
                >
                  Télécharger la note complète
                </Button>
                {result.id ? (
                  <a
                    href={api.notes.urlPdf(result.id, false)}
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
            mobile && mobilePanel !== 'apercu' && 'hidden',
            'lg:sticky lg:top-6 lg:self-start',
          )}
        >
          <PdfViewer
            url={previewRequest ? preview.url : null}
            chargement={preview.chargement}
            erreur={
              requests.erreur
                ? 'Corrigez les lignes en rouge pour actualiser l’aperçu.'
                : lines.length === 0
                  ? 'Ajoutez un frais pour voir l’aperçu de la note.'
                  : preview.erreur
            }
            misAJour={preview.misAJour}
            onTelecharger={preview.telecharger}
            actions={
              <>
                <select
                  aria-label="Template de la note de frais"
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
                  value={selectedTemplate ?? ''}
                  onChange={(event) =>
                    draft.definirTemplate(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  disabled={models.length === 0}
                  data-cy="select-template"
                >
                  {models.length === 0 ? <option value="">Modèle intégré</option> : null}
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.nom} — v{model.version}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#1d5b49]"
                    checked={complete}
                    onChange={(event) => draft.definirComplet(event.target.checked)}
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

      <ConfirmDialog
        ouvert={lineToRemove !== null}
        titre="Supprimer ce frais ?"
        message={
          lineToRemove ? (
            <>
              La ligne « {expenseItemByCode.get(lineToRemove.posteCode)?.libelle ?? lineToRemove.posteCode} »
              sera retirée du brouillon. Cette action ne modifie pas les versions déjà générées.
            </>
          ) : null
        }
        libelleConfirmer="Supprimer"
        variante="danger"
        onConfirmer={removeLine}
        onAnnuler={() => setLineToRemove(null)}
        dataCy="dialogue-suppression-frais"
      />

      <ConfirmDialog
        ouvert={regenerationDialog}
        titre="Générer une nouvelle version ?"
        message={
          <>
            Une note active existe déjà pour {formatMonth(month)} (version {activeVersion}). La version{' '}
            {(activeVersion ?? 0) + 1} sera créée et l’ancienne restera consultable dans l’historique.
          </>
        }
        libelleConfirmer="Créer la nouvelle version"
        onConfirmer={() => {
          setRegenerationDialog(false);
          void generateStatement();
        }}
        onAnnuler={() => setRegenerationDialog(false)}
        dataCy="dialogue-regeneration-note"
      />
    </>
  );
}
