import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { messageErreur, telechargerBlob } from '@/api/client';
import { api } from '@/api/endpoints';
import { cles, useTemplates, useVariablesTemplate } from '@/api/queries';
import type { RapportValidationDto, TemplateDto, TypeTemplate } from '@/api/types';
import { Bouton } from '@/components/Bouton';
import { DialogueConfirmation } from '@/components/DialogueConfirmation';
import { EtatChargement, EtatErreur } from '@/components/Etats';
import { FichierSelectionne, FileDropzone, FORMATS_TEMPLATE } from '@/components/FileDropzone';
import { PageHeader } from '@/components/PageHeader';
import { PdfViewer } from '@/components/PdfViewer';
import { cn } from '@/lib/cn';
import { formatDateHeure } from '@/lib/format';
import { toast } from '@/state/toasts';

const TAILLE_MAX_TEMPLATE = 5 * 1024 * 1024;

interface ConfigurationType {
  type: TypeTemplate;
  titre: string;
  description: string;
  dropzone: string;
  icone: typeof FileText;
}

const TYPES: ConfigurationType[] = [
  {
    type: 'QUITTANCE',
    titre: 'Quittance de loyer',
    description: 'Modèle utilisé pour les quittances mensuelles.',
    dropzone: 'dropzone-template-quittance',
    icone: ReceiptText,
  },
  {
    type: 'NOTE_FRAIS',
    titre: 'Note de frais d’occupation',
    description: 'Modèle utilisé pour les notes de frais et leur version complète.',
    dropzone: 'dropzone-template-note',
    icone: FileText,
  },
];

function nomFichierSur(nom: string | undefined, version: number | undefined): string {
  const base = (nom ?? 'template')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base || 'template'}_v${version ?? 1}.html`;
}

function BadgeStructure({ valide }: { valide: boolean }) {
  return (
    <span className={cn('badge', valide ? 'badge-accent' : 'badge-danger')}>
      {valide ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
      {valide ? 'Structure valide' : 'Structure invalide'}
    </span>
  );
}

function ListeVariables({
  titre,
  variables,
  ton,
}: {
  titre: string;
  variables: string[];
  ton: 'accent' | 'danger' | 'avertissement';
}) {
  if (variables.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">{titre}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {variables.map((variable) => (
          <code
            key={variable}
            className={cn(
              'rounded-md border px-1.5 py-0.5 font-mono text-[11px]',
              ton === 'danger'
                ? 'border-danger/25 bg-danger-soft text-danger'
                : ton === 'avertissement'
                  ? 'border-warning/25 bg-warning-soft text-warning'
                  : 'border-accent/15 bg-accent-soft text-accent',
            )}
          >
            {variable}
          </code>
        ))}
      </div>
    </div>
  );
}

function RapportValidation({ rapport }: { rapport: RapportValidationDto }) {
  const reconnues = rapport.variablesReconnues ?? [];
  const inconnues = rapport.variablesInconnues ?? [];
  const manquantes = rapport.variablesManquantes ?? [];
  const erreurs = rapport.erreurs ?? [];

  return (
    <div
      className="space-y-3 rounded-xl border border-line bg-paper/45 p-4"
      data-cy="rapport-validation-template"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Rapport de validation</p>
        <BadgeStructure valide={Boolean(rapport.structureValide)} />
      </div>
      <ListeVariables titre={`Variables reconnues (${reconnues.length})`} variables={reconnues} ton="accent" />
      <ListeVariables titre={`Variables inconnues (${inconnues.length})`} variables={inconnues} ton="danger" />
      <ListeVariables
        titre={`Obligatoires manquantes (${manquantes.length})`}
        variables={manquantes}
        ton="avertissement"
      />
      {erreurs.length > 0 ? (
        <div className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-danger">Erreurs</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-danger">
            {erreurs.map((erreur) => (
              <li key={erreur}>{erreur}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {manquantes.length > 0 && erreurs.length === 0 ? (
        <p className="text-xs text-warning">
          Avertissement : le modèle sera accepté, mais les champs obligatoires absents apparaîtront vides dans le
          document.
        </p>
      ) : null}
    </div>
  );
}

function ReferenceVariables({ type }: { type: TypeTemplate }) {
  const variables = useVariablesTemplate(type);
  const [copie, setCopie] = useState<string | null>(null);

  useEffect(() => {
    if (!copie) {
      return;
    }
    const minuterie = window.setTimeout(() => setCopie(null), 1_800);
    return () => window.clearTimeout(minuterie);
  }, [copie]);

  async function copier(nom: string) {
    try {
      await navigator.clipboard.writeText(`{{${nom}}}`);
      setCopie(nom);
      toast.succes(`{{${nom}}} copié dans le presse-papiers.`);
    } catch {
      toast.erreur('Impossible de copier dans le presse-papiers. Sélectionnez la variable manuellement.');
    }
  }

  return (
    <details className="group border-t border-line px-5 py-4 sm:px-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink">
        <span className="flex items-center gap-2">
          <FileCode2 size={16} className="text-accent" aria-hidden="true" />
          Référence des variables
          <span className="badge badge-neutre">{variables.data?.length ?? '—'}</span>
        </span>
        <span className="text-xs font-medium text-ink-soft group-open:hidden">Afficher</span>
        <span className="hidden text-xs font-medium text-ink-soft group-open:inline">Masquer</span>
      </summary>

      {variables.isPending ? (
        <p className="mt-3 text-xs text-ink-soft">Chargement des variables…</p>
      ) : variables.isError ? (
        <p className="mt-3 text-xs text-danger">{messageErreur(variables.error)}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-ink-soft">
            Les montants sont déjà formatés en français par le backend : le template ne calcule rien. Les expressions
            non échappées, scripts, iframes, ressources distantes et expressions Thymeleaf/JSP sont refusés.
          </p>
          {type === 'NOTE_FRAIS' ? (
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
                Dans la boucle <code className="font-mono">{'{{#lignes}}'}</code>, les variables internes s’écrivent{' '}
                <code className="font-mono">{'{{poste}}'}</code>, <code className="font-mono">{'{{fournisseur}}'}</code>,{' '}
                <code className="font-mono">{'{{periode}}'}</code>, <code className="font-mono">{'{{montant_ttc}}'}</code>,{' '}
                <code className="font-mono">{'{{prorata}}'}</code> et <code className="font-mono">{'{{montant_retenu}}'}</code>.
              </p>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="tableau-frais">
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
                  const nom = variable.nom ?? '';
                  return (
                    <tr key={nom}>
                      <td>
                        <code className="rounded bg-paper-deep/60 px-1.5 py-0.5 font-mono text-[11.5px] text-ink">
                          {`{{${nom}}}`}
                        </code>
                        {variable.obligatoire ? (
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-copper">requis</span>
                        ) : null}
                      </td>
                      <td className="text-xs text-ink-soft">{variable.description}</td>
                      <td className="text-xs text-ink-soft/80">{variable.exemple || '—'}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => void copier(nom)}
                          className="rounded-lg p-1.5 text-ink-soft transition hover:bg-accent-soft hover:text-accent"
                          aria-label={`Copier la variable ${nom}`}
                          title="Copier"
                        >
                          {copie === nom ? <Check size={15} /> : <Clipboard size={15} />}
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

function ApercuModele({
  template,
  url,
  onFermer,
  onActiver,
  activationEnCours,
}: {
  template: TemplateDto;
  url: string;
  onFermer: () => void;
  onActiver: () => void;
  activationEnCours: boolean;
}) {
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        onFermer();
      }
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[3px] sm:p-6"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) {
          onFermer();
        }
      }}
    >
      <div
        className="animation-fondu flex max-h-[94vh] w-full max-w-4xl flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apercu-template-titre"
        data-cy="apercu-template"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-strong px-4 py-3 text-white">
          <div className="min-w-0">
            <h2 id="apercu-template-titre" className="truncate text-lg text-white">
              Aperçu — {template.nom} · v{template.version}
            </h2>
            <p className="text-[11px] text-white/60">Données d’exemple · filigrane « APERÇU » · rien n’est persisté.</p>
          </div>
          <div className="flex items-center gap-2">
            {!template.actif ? (
              <Bouton
                variante="secondaire"
                petit
                onClick={onActiver}
                chargement={activationEnCours}
                icone={<Check size={14} />}
              >
                Activer ce modèle
              </Bouton>
            ) : null}
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer l’aperçu"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <PdfViewer url={url} dataCy="apercu-template-pdf" className="min-h-0 flex-1" />
      </div>
    </div>,
    document.body,
  );
}

function CarteTemplates({ configuration }: { configuration: ConfigurationType }) {
  const { type, titre, description, dropzone, icone: Icone } = configuration;
  const queryClient = useQueryClient();
  const templates = useTemplates(type);
  const [nom, setNom] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [rapport, setRapport] = useState<RapportValidationDto | null>(null);
  const [dernierImport, setDernierImport] = useState<TemplateDto | null>(null);
  const [erreurUpload, setErreurUpload] = useState<string | null>(null);
  const [apercu, setApercu] = useState<{ template: TemplateDto; url: string } | null>(null);
  const [apercuEnCours, setApercuEnCours] = useState<number | null>(null);
  const [aSupprimer, setASupprimer] = useState<TemplateDto | null>(null);
  const [reinitialisationOuverte, setReinitialisationOuverte] = useState(false);

  useEffect(() => {
    return () => {
      if (apercu) {
        URL.revokeObjectURL(apercu.url);
      }
    };
  }, [apercu]);

  const versions = templates.data ?? [];
  const actif = versions.find((template) => template.actif) ?? versions.find((template) => template.integre) ?? null;
  const modeleIntegre = versions.find((template) => template.integre) ?? null;

  function invalider() {
    void queryClient.invalidateQueries({ queryKey: cles.templates(type) });
  }

  const televerser = useMutation({
    mutationFn: ({ nomTemplate, fichierTemplate }: { nomTemplate: string; fichierTemplate: File }) =>
      api.templates.uploader(type, nomTemplate, fichierTemplate),
    onSuccess: (template) => {
      invalider();
      setRapport(template.rapport ?? null);
      setDernierImport(template);
      setFichier(null);
      setErreurUpload(null);
      toast.succes(`Version v${template.version} importée. Vérifiez l’aperçu puis activez-la.`);
    },
    onError: (error) => {
      setRapport(null);
      setDernierImport(null);
      setErreurUpload(messageErreur(error));
    },
  });

  const activer = useMutation({
    mutationFn: (template: TemplateDto) => api.templates.activer(template.id as number),
    onSuccess: (template) => {
      invalider();
      setApercu(null);
      toast.succes(`Le modèle « ${template.nom} » v${template.version} est désormais actif.`);
    },
    onError: (error) => toast.erreur(messageErreur(error)),
  });

  const supprimer = useMutation({
    mutationFn: (template: TemplateDto) => api.templates.supprimer(template.id as number),
    onSuccess: () => {
      invalider();
      setASupprimer(null);
      toast.succes('Version supprimée. Le fichier reste archivé côté stockage.');
    },
    onError: (error) => {
      setASupprimer(null);
      toast.erreur(messageErreur(error));
    },
  });

  const reinitialiser = useMutation({
    mutationFn: () => api.templates.reinitialiser(type),
    onSuccess: (template) => {
      invalider();
      setReinitialisationOuverte(false);
      toast.succes(`Modèle intégré restauré et activé (v${template.version}).`);
    },
    onError: (error) => {
      setReinitialisationOuverte(false);
      toast.erreur(messageErreur(error));
    },
  });

  const telecharger = useMutation({
    mutationFn: (template: TemplateDto) => api.templates.fichier(template.id as number),
    onSuccess: (reponse, template) => {
      telechargerBlob(reponse.blob, nomFichierSur(template.nom, template.version));
    },
    onError: (error) => toast.erreur(messageErreur(error)),
  });

  const telechargerDefaut = useMutation({
    mutationFn: () => api.templates.defaut(type),
    onSuccess: (reponse) => {
      telechargerBlob(
        reponse.blob,
        type === 'QUITTANCE' ? 'modele-quittance-defaut.html' : 'modele-note-frais-defaut.html',
      );
    },
    onError: (error) => toast.erreur(messageErreur(error)),
  });

  async function ouvrirApercu(template: TemplateDto) {
    if (!template.id || apercuEnCours !== null) {
      return;
    }
    setApercuEnCours(template.id);
    try {
      const reponse = await api.templates.apercu(template.id);
      setApercu({ template, url: URL.createObjectURL(reponse.blob) });
    } catch (error) {
      toast.erreur(messageErreur(error));
    } finally {
      setApercuEnCours(null);
    }
  }

  function choisirFichier(nouveau: File) {
    setFichier(nouveau);
    setErreurUpload(null);
    setRapport(null);
    setDernierImport(null);
    if (!nom.trim()) {
      setNom(nouveau.name.replace(/\.html?$/i, ''));
    }
  }

  const peutTeleverser = fichier !== null && nom.trim().length > 0 && !televerser.isPending;
  const versionsPrecedentes = versions.filter((template) => !template.actif);

  return (
    <section className="carte overflow-hidden">
      <div className="carte-entete">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icone size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">{titre}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
          </div>
        </div>
        <span className="badge badge-neutre">
          <ShieldCheck size={12} aria-hidden="true" />
          HTML + CSS
        </span>
      </div>

      <div className="carte-corps space-y-5">
        {templates.isError ? (
          <EtatErreur message={messageErreur(templates.error)} onReessayer={() => void templates.refetch()} />
        ) : templates.isPending ? (
          <EtatChargement message="Chargement des modèles…" />
        ) : (
          <>
            <div className="rounded-xl border border-accent/15 bg-accent-soft/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-accent">
                    Modèle actif
                  </p>
                  {actif ? (
                    <>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                        {actif.nom}
                        <span className="badge badge-accent">v{actif.version}</span>
                        {actif.integre ? <span className="badge badge-neutre">intégré</span> : null}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {actif.format ?? 'HTML'} · importé le {formatDateHeure(actif.createdAt)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-warning">Aucun modèle actif.</p>
                  )}
                </div>
                {actif ? (
                  <div className="flex flex-wrap gap-2">
                    <Bouton
                      variante="secondaire"
                      petit
                      icone={<Eye size={14} />}
                      chargement={apercuEnCours === actif.id}
                      onClick={() => void ouvrirApercu(actif)}
                      data-cy="btn-apercu-template-actif"
                    >
                      Aperçu
                    </Bouton>
                    <Bouton
                      variante="secondaire"
                      petit
                      icone={<Download size={14} />}
                      chargement={telecharger.isPending && telecharger.variables?.id === actif.id}
                      onClick={() => telecharger.mutate(actif)}
                    >
                      Télécharger
                    </Bouton>
                  </div>
                ) : (
                  <Bouton
                    variante="primaire"
                    petit
                    icone={<RotateCcw size={14} />}
                    onClick={() => setReinitialisationOuverte(true)}
                  >
                    Restaurer le modèle intégré
                  </Bouton>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Bouton
                variante="secondaire"
                petit
                icone={<Download size={14} />}
                chargement={telechargerDefaut.isPending}
                onClick={() => telechargerDefaut.mutate()}
              >
                Télécharger le modèle par défaut intégré
              </Bouton>
              <Bouton
                variante="secondaire"
                petit
                icone={<RotateCcw size={14} />}
                onClick={() => setReinitialisationOuverte(true)}
                disabled={Boolean(actif?.integre)}
                title={actif?.integre ? 'Le modèle intégré est déjà actif.' : undefined}
                data-cy="btn-modele-defaut"
              >
                Revenir au modèle par défaut
              </Bouton>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold text-ink">Versions</h3>
                <span className="text-xs text-ink-soft">{versions.length} version{versions.length > 1 ? 's' : ''}</span>
              </div>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {versions.map((template) => {
                  const estActif = Boolean(template.actif);
                  const suppressionImpossible = estActif || Boolean(template.integre);
                  return (
                    <li
                      key={template.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                          <span className="truncate">{template.nom}</span>
                          <span className={cn('badge', estActif ? 'badge-accent' : 'badge-neutre')}>
                            v{template.version}
                          </span>
                          {template.integre ? <span className="badge badge-neutre">intégré</span> : null}
                          {estActif ? <span className="text-[10px] font-bold uppercase text-accent">active</span> : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">
                          {template.format ?? 'HTML'} · {formatDateHeure(template.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Bouton
                          variante="fantome"
                          petit
                          icone={<Eye size={13} />}
                          chargement={apercuEnCours === template.id}
                          onClick={() => void ouvrirApercu(template)}
                        >
                          Aperçu
                        </Bouton>
                        <Bouton
                          variante="fantome"
                          petit
                          icone={<Download size={13} />}
                          chargement={telecharger.isPending && telecharger.variables?.id === template.id}
                          onClick={() => telecharger.mutate(template)}
                        >
                          Télécharger
                        </Bouton>
                        {!estActif ? (
                          <Bouton
                            variante="fantome"
                            petit
                            icone={<Check size={13} />}
                            chargement={activer.isPending && activer.variables?.id === template.id}
                            onClick={() => activer.mutate(template)}
                            data-cy="btn-activer-template"
                          >
                            Activer
                          </Bouton>
                        ) : null}
                        <Bouton
                          variante="fantome"
                          petit
                          className={cn(!suppressionImpossible && 'text-danger hover:bg-danger-soft')}
                          icone={<Trash2 size={13} />}
                          disabled={suppressionImpossible}
                          title={
                            suppressionImpossible
                              ? template.integre
                                ? 'Le modèle intégré ne peut pas être supprimé.'
                                : 'Le modèle actif ne peut pas être supprimé.'
                              : undefined
                          }
                          onClick={() => setASupprimer(template)}
                        >
                          Supprimer
                        </Bouton>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {versionsPrecedentes.length === 0 ? (
                <p className="mt-2 text-xs text-ink-soft">Aucune version précédente archivée.</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-line bg-paper/35 p-4">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <UploadCloud size={16} className="text-accent" aria-hidden="true" />
                Importer une nouvelle version
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Fichier HTML UTF-8, 5 Mo maximum. Le nouveau modèle est validé puis importé sans être activé : vous
                pouvez d’abord l’aperçu avec des données d’exemple.
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="label-champ" htmlFor={`nom-template-${type}`}>
                    Nom de la version
                  </label>
                  <input
                    id={`nom-template-${type}`}
                    className="champ"
                    value={nom}
                    maxLength={120}
                    placeholder="Ex. Quittance — version 2027"
                    onChange={(evenement) => setNom(evenement.target.value)}
                    data-cy="input-template-nom"
                  />
                </div>

                {fichier ? (
                  <FichierSelectionne
                    nom={fichier.name}
                    taille={fichier.size}
                    typeMime={fichier.type}
                    enCours={televerser.isPending}
                    onRetirer={() => setFichier(null)}
                  />
                ) : (
                  <FileDropzone
                    onFichier={choisirFichier}
                    disabled={televerser.isPending}
                    dataCy={dropzone}
                    accept={FORMATS_TEMPLATE}
                    tailleMax={TAILLE_MAX_TEMPLATE}
                    descriptionFormats="HTML, HTM"
                    texte="Déposez votre template HTML"
                    ariaLabel="Choisir un fichier template HTML"
                  />
                )}

                {erreurUpload ? (
                  <p className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs font-medium text-danger" role="alert">
                    {erreurUpload}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Bouton
                    variante="primaire"
                    icone={<UploadCloud size={15} />}
                    chargement={televerser.isPending}
                    disabled={!peutTeleverser}
                    onClick={() => {
                      if (fichier && nom.trim()) {
                        televerser.mutate({ nomTemplate: nom.trim(), fichierTemplate: fichier });
                      }
                    }}
                    data-cy="btn-televerser-template"
                  >
                    Valider et importer
                  </Bouton>
                  <span className="text-[11px] text-ink-soft">
                    Une version importée doit être activée explicitement.
                  </span>
                </div>

                {rapport ? <RapportValidation rapport={rapport} /> : null}

                {rapport && dernierImport?.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Bouton
                      variante="secondaire"
                      petit
                      icone={<Eye size={14} />}
                      chargement={apercuEnCours === dernierImport.id}
                      onClick={() => void ouvrirApercu(dernierImport)}
                    >
                      Aperçu de la version v{dernierImport.version}
                    </Bouton>
                    <Bouton
                      variante="secondaire"
                      petit
                      icone={<Check size={14} />}
                      chargement={activer.isPending && activer.variables?.id === dernierImport.id}
                      onClick={() => activer.mutate(dernierImport)}
                    >
                      Activer la version v{dernierImport.version}
                    </Bouton>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/30 p-3 text-[11.5px] leading-relaxed text-ink-soft">
              <Info size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <p>
                Un seul modèle actif par type. Les documents déjà générés conservent la référence de leur version. La
                suppression est logique : aucune version n’est réellement effacée.
              </p>
            </div>
          </>
        )}
      </div>

      <ReferenceVariables type={type} />

      <DialogueConfirmation
        ouvert={aSupprimer !== null}
        titre="Supprimer cette version ?"
        message={
          aSupprimer
            ? `La version v${aSupprimer.version} de « ${aSupprimer.nom} » ne sera plus proposée. Les documents qui l’utilisent restent inchangés.`
            : ''
        }
        libelleConfirmer="Supprimer"
        variante="danger"
        onConfirmer={() => {
          if (aSupprimer) {
            supprimer.mutate(aSupprimer);
          }
        }}
        onAnnuler={() => setASupprimer(null)}
        dataCy="dialogue-supprimer-template"
      />

      <DialogueConfirmation
        ouvert={reinitialisationOuverte}
        titre="Revenir au modèle par défaut ?"
        message={
          modeleIntegre
            ? `Le modèle intégré « ${modeleIntegre.nom} » (v${modeleIntegre.version}) redeviendra actif. Vos versions importées restent disponibles.`
            : 'Le modèle intégré redeviendra actif. Vos versions importées restent disponibles.'
        }
        libelleConfirmer="Restaurer le modèle"
        onConfirmer={() => reinitialiser.mutate()}
        onAnnuler={() => setReinitialisationOuverte(false)}
        dataCy="dialogue-modele-defaut"
      />

      {apercu ? (
        <ApercuModele
          template={apercu.template}
          url={apercu.url}
          onFermer={() => setApercu(null)}
          onActiver={() => activer.mutate(apercu.template)}
          activationEnCours={activer.isPending}
        />
      ) : null}
    </section>
  );
}

export function TemplatesPage() {
  return (
    <>
      <PageHeader
        surTitre="Réglages"
        titre="Templates"
        description="Personnalisez les documents générés sans toucher au calcul : le backend fournit les montants déjà formatés, votre modèle HTML ne fait que les mettre en page."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {TYPES.map((configuration) => (
          <CarteTemplates key={configuration.type} configuration={configuration} />
        ))}
      </div>
      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning-soft/50 px-4 py-3 text-xs leading-relaxed text-warning">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Les templates ne peuvent exécuter aucun code : Mustache sans logique, HTML assaini, images en data URI
          uniquement, aucune ressource distante. Un fichier refusé affiche les erreurs de validation sans être
          enregistré.
        </p>
      </div>
    </>
  );
}
