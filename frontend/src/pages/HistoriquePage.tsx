import {
  Archive,
  Download,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileText,
  History,
  PencilLine,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageErreur } from '@/api/client';
import { api } from '@/api/endpoints';
import { useNotes, useQuittances } from '@/api/queries';
import type { NoteDto, QuittanceDto } from '@/api/types';
import { Bouton } from '@/components/Bouton';
import { DialogueConfirmation } from '@/components/DialogueConfirmation';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/Etats';
import { PageHeader } from '@/components/PageHeader';
import { formatDateHeure, formatEUR, formatMois } from '@/lib/format';
import { useNoteDraft } from '@/state/noteDraft';
import { useQuittanceDraft } from '@/state/quittanceDraft';
import { toast } from '@/state/toasts';

interface GroupeMois {
  mois: string;
  quittances: QuittanceDto[];
  notes: NoteDto[];
}

function courante<T extends { statut?: string }>(documents: T[]): T | null {
  return documents.find((document) => document.statut === 'ACTIVE') ?? documents[0] ?? null;
}

function BadgeVersion({ version, active }: { version: number; active: boolean }) {
  return active ? (
    <span className="badge badge-accent">v{version} · active</span>
  ) : (
    <span className="badge badge-neutre">v{version} · archivée</span>
  );
}

function ActionsPdf({
  href,
  libelle,
  dataCy,
}: {
  href: string;
  libelle: string;
  dataCy?: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent-soft"
      data-cy={dataCy}
    >
      <Download size={12} aria-hidden="true" />
      {libelle}
    </a>
  );
}

export function HistoriquePage() {
  const navigate = useNavigate();
  const quittancesQuery = useQuittances();
  const notesQuery = useNotes();
  const [noteARecharger, setNoteARecharger] = useState<NoteDto | null>(null);

  const groupes = useMemo<GroupeMois[]>(() => {
    const parMois = new Map<string, GroupeMois>();
    for (const quittance of quittancesQuery.data ?? []) {
      if (!quittance.mois) {
        continue;
      }
      const groupe = parMois.get(quittance.mois) ?? {
        mois: quittance.mois,
        quittances: [],
        notes: [],
      };
      groupe.quittances.push(quittance);
      parMois.set(quittance.mois, groupe);
    }
    for (const note of notesQuery.data ?? []) {
      if (!note.mois) {
        continue;
      }
      const groupe = parMois.get(note.mois) ?? { mois: note.mois, quittances: [], notes: [] };
      groupe.notes.push(note);
      parMois.set(note.mois, groupe);
    }
    return [...parMois.values()].sort((a, b) => b.mois.localeCompare(a.mois));
  }, [quittancesQuery.data, notesQuery.data]);

  const chargement = quittancesQuery.isPending || notesQuery.isPending;
  const erreur = quittancesQuery.isError
    ? messageErreur(quittancesQuery.error)
    : notesQuery.isError
      ? messageErreur(notesQuery.error)
      : null;

  function recharger() {
    void quittancesQuery.refetch();
    void notesQuery.refetch();
  }

  function creerQuittance(mois: string) {
    useQuittanceDraft.getState().changerMois(mois);
    navigate('/generer/quittance');
  }

  function creerNote(mois: string) {
    useNoteDraft.getState().changerMois(mois);
    navigate('/generer/note-frais');
  }

  function confirmerRechargement() {
    if (!noteARecharger?.mois) {
      return;
    }
    const quittance = courante(
      groupes.find((groupe) => groupe.mois === noteARecharger.mois)?.quittances ?? [],
    );
    useNoteDraft.getState().chargerDepuisNote(noteARecharger, quittance?.id ?? null);
    setNoteARecharger(null);
    toast.info(`Lignes de ${formatMois(noteARecharger.mois)} rechargées dans le brouillon.`);
    navigate('/generer/note-frais');
  }

  return (
    <>
      <PageHeader
        surTitre="Suivi"
        titre="Historique"
        description="Toutes les versions de vos quittances et notes de frais, classées par mois. Les versions archivées restent téléchargeables et consultables."
        actions={
          <span className="badge badge-neutre">
            <History size={12} aria-hidden="true" />
            {groupes.length} mois suivi{groupes.length > 1 ? 's' : ''}
          </span>
        }
      />

      {erreur ? (
        <div className="mb-4">
          <EtatErreur message={erreur} onReessayer={recharger} />
        </div>
      ) : null}

      {chargement && groupes.length === 0 ? (
        <EtatChargement message="Chargement de l’historique…" />
      ) : groupes.length === 0 && !erreur ? (
        <EtatVide
          titre="Aucun document pour le moment"
          description="Générez une quittance ou une note de frais : elle apparaîtra ici, avec toutes ses versions."
          icone={<Archive size={22} aria-hidden="true" />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Bouton variante="primaire" onClick={() => navigate('/generer/quittance')}>
                Générer une quittance
              </Bouton>
              <Bouton variante="secondaire" onClick={() => navigate('/generer/note-frais')}>
                Générer une note de frais
              </Bouton>
            </div>
          }
        />
      ) : (
        <div className="space-y-4" data-cy="historique">
          {groupes.map((groupe) => {
            const quittance = courante(groupe.quittances);
            const note = courante(groupe.notes);
            return (
              <section
                key={groupe.mois}
                className="carte overflow-hidden"
                data-cy={`historique-mois-${groupe.mois}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/45 px-5 py-3.5 sm:px-6">
                  <div>
                    <p className="eyebrow">Mois</p>
                    <h2 className="mt-1 text-[22px] text-ink">{formatMois(groupe.mois)}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={quittance ? 'badge badge-accent' : 'badge badge-neutre'}>
                      Quittance {quittance ? `v${quittance.version ?? 1}` : 'non générée'}
                    </span>
                    <span className={note ? 'badge badge-accent' : 'badge badge-neutre'}>
                      Note {note ? `v${note.version ?? 1}` : 'non générée'}
                    </span>
                  </div>
                </div>

                <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                          <FileText size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-semibold text-ink">Quittance de loyer</h3>
                          {quittance ? (
                            <p className="text-xs text-ink-soft">
                              Version {quittance.version ?? 1} · {formatDateHeure(quittance.createdAt)}
                            </p>
                          ) : (
                            <p className="text-xs text-ink-soft">Aucune version pour ce mois.</p>
                          )}
                        </div>
                      </div>
                      {quittance ? (
                        <p className="font-display text-xl text-ink nombre">{formatEUR(quittance.total)}</p>
                      ) : null}
                    </div>

                    {quittance ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {quittance.id ? (
                          <>
                            <ActionsPdf
                              href={api.quittances.urlPdf(quittance.id)}
                              libelle="Télécharger le PDF"
                              dataCy={`btn-telecharger-quittance-${groupe.mois}`}
                            />
                            <a
                              href={api.quittances.urlPdf(quittance.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              Ouvrir
                            </a>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <Bouton
                        variante="secondaire"
                        petit
                        icone={<FilePlus2 size={13} />}
                        className="mt-4"
                        onClick={() => creerQuittance(groupe.mois)}
                      >
                        Générer la quittance
                      </Bouton>
                    )}

                    {groupe.quittances.length > 1 ? (
                      <details className="mt-4 rounded-xl border border-line bg-paper/35 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                          Toutes les versions ({groupe.quittances.length})
                        </summary>
                        <ul className="mt-2 space-y-1.5">
                          {groupe.quittances.map((version) => (
                            <li
                              key={version.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs"
                            >
                              <span className="flex items-center gap-2">
                                <BadgeVersion
                                  version={version.version ?? 1}
                                  active={version.statut === 'ACTIVE'}
                                />
                                <span className="text-ink-soft">{formatDateHeure(version.createdAt)}</span>
                                <span className="font-medium text-ink nombre">{formatEUR(version.total)}</span>
                              </span>
                              {version.id ? (
                                <ActionsPdf href={api.quittances.urlPdf(version.id)} libelle="PDF" />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-copper-soft text-copper">
                          <FileCheck2 size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-semibold text-ink">Note de frais d’occupation</h3>
                          {note ? (
                            <p className="text-xs text-ink-soft">
                              Version {note.version ?? 1} · {formatDateHeure(note.createdAt)}
                              {note.templateNom
                                ? ` · ${note.templateNom} v${note.templateVersion ?? 1}`
                                : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-ink-soft">Aucune version pour ce mois.</p>
                          )}
                        </div>
                      </div>
                      {note ? (
                        <p className="font-display text-xl text-ink nombre">{formatEUR(note.total)}</p>
                      ) : null}
                    </div>

                    {note ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {note.id ? (
                          <>
                            <ActionsPdf
                              href={api.notes.urlPdf(note.id, false)}
                              libelle="Note seule"
                              dataCy={`btn-telecharger-note-${groupe.mois}`}
                            />
                            <ActionsPdf
                              href={api.notes.urlPdf(note.id, true)}
                              libelle="Note complète"
                              dataCy={`btn-telecharger-note-complete-${groupe.mois}`}
                            />
                            <a
                              href={api.notes.urlPdf(note.id, true)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              Ouvrir
                            </a>
                          </>
                        ) : null}
                        <Bouton
                          variante="fantome"
                          petit
                          icone={<PencilLine size={13} />}
                          onClick={() => setNoteARecharger(note)}
                          data-cy={`btn-rouvrir-note-${groupe.mois}`}
                        >
                          Rouvrir et modifier
                        </Bouton>
                      </div>
                    ) : (
                      <Bouton
                        variante="secondaire"
                        petit
                        icone={<FilePlus2 size={13} />}
                        className="mt-4"
                        onClick={() => creerNote(groupe.mois)}
                      >
                        Générer la note
                      </Bouton>
                    )}

                    {groupe.notes.length > 1 ? (
                      <details className="mt-4 rounded-xl border border-line bg-paper/35 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                          Toutes les versions ({groupe.notes.length})
                        </summary>
                        <ul className="mt-2 space-y-1.5">
                          {groupe.notes.map((version) => (
                            <li
                              key={version.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs"
                            >
                              <span className="flex flex-wrap items-center gap-2">
                                <BadgeVersion
                                  version={version.version ?? 1}
                                  active={version.statut === 'ACTIVE'}
                                />
                                <span className="text-ink-soft">{formatDateHeure(version.createdAt)}</span>
                                <span className="font-medium text-ink nombre">{formatEUR(version.total)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                {version.id ? (
                                  <>
                                    <ActionsPdf href={api.notes.urlPdf(version.id, false)} libelle="PDF" />
                                    <ActionsPdf
                                      href={api.notes.urlPdf(version.id, true)}
                                      libelle="Complète"
                                    />
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-lg px-1.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent-soft"
                                  onClick={() => setNoteARecharger(version)}
                                >
                                  Charger
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <DialogueConfirmation
        ouvert={noteARecharger !== null}
        titre="Rouvrir cette note ?"
        message={
          noteARecharger ? (
            <>
              Les lignes de la version {noteARecharger.version ?? 1} de{' '}
              {formatMois(noteARecharger.mois)} remplaceront le brouillon de ce mois dans l’onglet
              Note de frais. Les brouillons des autres mois sont conservés.
            </>
          ) : null
        }
        libelleConfirmer="Charger les lignes"
        onConfirmer={confirmerRechargement}
        onAnnuler={() => setNoteARecharger(null)}
        dataCy="dialogue-rouvrir-note"
      />
    </>
  );
}
