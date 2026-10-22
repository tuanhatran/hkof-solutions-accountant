import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  Home,
  Landmark,
  PencilLine,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { messageErreur } from '@/api/client';
import { api } from '@/api/endpoints';
import { cles, useParametres, usePostes } from '@/api/queries';
import type { ParametresDto, ParametresRequest, PosteDto, PosteRequest } from '@/api/types';
import { Bouton } from '@/components/Bouton';
import { DialogueConfirmation } from '@/components/DialogueConfirmation';
import { EtatChargement, EtatErreur } from '@/components/Etats';
import { GroupeChamp } from '@/components/GroupeChamp';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/cn';
import { formatEUR, formatPourcentage, parseMontant, parsePourcentage } from '@/lib/format';
import { parametresSchema, posteSchema, type ParametresFormValues, type PosteFormValues } from '@/lib/validation';
import { toast } from '@/state/toasts';

const PERIODICITES = [
  { valeur: 'MENSUELLE', libelle: 'Mensuelle' },
  { valeur: 'BIMESTRIELLE', libelle: 'Bimestrielle' },
  { valeur: 'TRIMESTRIELLE', libelle: 'Trimestrielle' },
  { valeur: 'ANNUELLE', libelle: 'Annuelle' },
] as const;

type Periodicite = (typeof PERIODICITES)[number]['valeur'];

function decimalFr(valeur: string | undefined): string {
  return valeur ? valeur.replace('.', ',') : '';
}

function valeursDepuisParametres(parametres: ParametresDto | undefined): ParametresFormValues {
  return {
    raisonSociale: parametres?.raisonSociale ?? '',
    formeJuridique: parametres?.formeJuridique ?? '',
    siren: parametres?.siren ?? '',
    societeAdresse: parametres?.societeAdresse ?? '',
    gerant: parametres?.gerant ?? '',
    logementAdresse: parametres?.logementAdresse ?? '',
    surfaceTotale: decimalFr(parametres?.surfaceTotale),
    surfacePro: decimalFr(parametres?.surfacePro),
    bailleurNom: parametres?.bailleurNom ?? '',
    bailleurAdresse: parametres?.bailleurAdresse ?? '',
    locataireNom: parametres?.locataireNom ?? '',
    locataireAdresse: parametres?.locataireAdresse ?? '',
    loyerHc: decimalFr(parametres?.loyerHc),
    provisionCharges: decimalFr(parametres?.provisionCharges),
    lieuEmission: parametres?.lieuEmission ?? '',
  };
}

function centimes(valeur: string): number {
  const normalise = parseMontant(valeur);
  return normalise === null ? 0 : Math.round(Number(normalise) * 100);
}

function EnTeteSection({
  icone: Icone,
  titre,
  description,
}: {
  icone: typeof Building2;
  titre: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icone size={17} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg text-ink">{titre}</h2>
        <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

function SwitchChamp({
  id,
  libelle,
  description,
  register,
}: {
  id: string;
  libelle: string;
  description: string;
  register: ReturnType<typeof useForm<PosteFormValues>>['register'];
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/35 p-3 transition hover:border-line-forte"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent accent-[#1b5b49]"
        {...register(id === 'poste-actif' ? 'actif' : 'plusieursLignesAutorisees')}
      />
      <span>
        <span className="block text-sm font-medium text-ink">{libelle}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">{description}</span>
      </span>
    </label>
  );
}

function FormulairePoste({
  poste,
  prorataDefaut,
  ordreDefaut,
  onFermer,
}: {
  poste: PosteDto | null;
  prorataDefaut: string;
  ordreDefaut: number;
  onFermer: () => void;
}) {
  const queryClient = useQueryClient();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PosteFormValues>({
    resolver: zodResolver(posteSchema),
    mode: 'onChange',
    defaultValues: {
      code: poste?.code ?? '',
      libelle: poste?.libelle ?? '',
      fournisseur: poste?.fournisseur ?? '',
      prorataPct: decimalFr(poste?.prorataPct ?? prorataDefaut),
      periodicite: (poste?.periodicite as Periodicite | undefined) ?? 'MENSUELLE',
      ordre: poste?.ordre ?? ordreDefaut,
      actif: poste?.actif ?? true,
      plusieursLignesAutorisees: poste?.plusieursLignesAutorisees ?? false,
    },
  });

  const enregistrer = useMutation({
    mutationFn: (valeurs: PosteFormValues) => {
      const corps: PosteRequest = {
        libelle: valeurs.libelle.trim(),
        fournisseur: valeurs.fournisseur.trim() || undefined,
        prorataPct: parsePourcentage(valeurs.prorataPct) ?? '0',
        periodicite: valeurs.periodicite,
        ordre: valeurs.ordre,
        actif: valeurs.actif,
        plusieursLignesAutorisees: valeurs.plusieursLignesAutorisees,
      };
      if (!poste && valeurs.code.trim()) {
        corps.code = valeurs.code.trim();
      }
      return poste?.id ? api.postes.modifier(poste.id, corps) : api.postes.creer(corps);
    },
    onSuccess: (resultat) => {
      void queryClient.invalidateQueries({ queryKey: ['postes'] });
      toast.succes(
        poste
          ? `Poste « ${resultat.libelle} » mis à jour.`
          : `Poste « ${resultat.libelle} » ajouté à la liste des frais.`,
      );
      onFermer();
    },
    onError: (error) => setErreur(messageErreur(error)),
  });

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent-soft/25 p-4"
      onSubmit={handleSubmit((valeurs) => {
        setErreur(null);
        enregistrer.mutate(valeurs);
      })}
      data-cy="formulaire-poste"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">
          {poste ? `Modifier le poste « ${poste.libelle} »` : 'Ajouter un type de frais'}
        </h3>
        {poste ? (
          <span className="badge badge-neutre">
            <PencilLine size={11} aria-hidden="true" />
            {poste.code}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <GroupeChamp
          id="poste-code"
          label="Code"
          erreur={errors.code?.message}
          aide={poste ? 'Le code est immuable après création.' : 'Facultatif : généré depuis le libellé si vide.'}
        >
          <input
            id="poste-code"
            className={cn('champ font-mono text-[13px]', errors.code && 'champ-erreur')}
            placeholder="gaz"
            readOnly={Boolean(poste)}
            disabled={Boolean(poste)}
            {...register('code')}
          />
        </GroupeChamp>
        <GroupeChamp id="poste-libelle" label="Libellé affiché" erreur={errors.libelle?.message}>
          <input
            id="poste-libelle"
            className={cn('champ', errors.libelle && 'champ-erreur')}
            placeholder="Gaz"
            {...register('libelle')}
            data-cy="input-poste-libelle"
          />
        </GroupeChamp>
        <GroupeChamp id="poste-fournisseur" label="Fournisseur" erreur={errors.fournisseur?.message}>
          <input
            id="poste-fournisseur"
            className="champ"
            placeholder="EDF"
            {...register('fournisseur')}
            data-cy="input-poste-fournisseur"
          />
        </GroupeChamp>
        <GroupeChamp
          id="poste-prorata"
          label="Prorata par défaut (%)"
          erreur={errors.prorataPct?.message}
          aide="Pré-remplit le champ lors de l’ajout d’un frais ; modifiable au cas par cas."
        >
          <input
            id="poste-prorata"
            className={cn('champ', errors.prorataPct && 'champ-erreur')}
            inputMode="decimal"
            placeholder="35,71"
            {...register('prorataPct')}
            data-cy="input-poste-prorata"
          />
        </GroupeChamp>
        <GroupeChamp id="poste-periodicite" label="Périodicité" erreur={errors.periodicite?.message}>
          <select id="poste-periodicite" className="champ" {...register('periodicite')}>
            {PERIODICITES.map((periodicite) => (
              <option key={periodicite.valeur} value={periodicite.valeur}>
                {periodicite.libelle}
              </option>
            ))}
          </select>
        </GroupeChamp>
        <GroupeChamp id="poste-ordre" label="Ordre d’affichage" erreur={errors.ordre?.message}>
          <input
            id="poste-ordre"
            type="number"
            min={0}
            step={1}
            className={cn('champ', errors.ordre && 'champ-erreur')}
            {...register('ordre', { valueAsNumber: true })}
          />
        </GroupeChamp>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SwitchChamp
          id="poste-actif"
          libelle="Poste actif"
          description="Apparaît dans la liste déroulante de la note de frais."
          register={register}
        />
        <SwitchChamp
          id="poste-plusieurs-lignes"
          libelle="Plusieurs lignes autorisées"
          description="Autorise plusieurs frais de ce type pour un même mois (ex. téléphone)."
          register={register}
        />
      </div>

      {erreur ? (
        <p className="mt-3 rounded-lg border border-danger/20 bg-danger-soft/60 p-2.5 text-xs text-danger" role="alert">
          {erreur}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Bouton variante="fantome" petit onClick={onFermer} disabled={enregistrer.isPending}>
          Annuler
        </Bouton>
        <Bouton
          variante="primaire"
          petit
          type="submit"
          chargement={enregistrer.isPending}
          icone={<Check size={14} />}
          data-cy="btn-enregistrer-poste"
        >
          {poste ? 'Enregistrer le poste' : 'Ajouter le poste'}
        </Bouton>
      </div>
    </form>
  );
}

function GestionPostes({ prorataDefaut }: { prorataDefaut: string }) {
  const queryClient = useQueryClient();
  const postes = usePostes(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [posteEdite, setPosteEdite] = useState<PosteDto | null>(null);
  const [aSupprimer, setASupprimer] = useState<PosteDto | null>(null);

  const supprimer = useMutation({
    mutationFn: (poste: PosteDto) => api.postes.supprimer(poste.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['postes'] });
      setASupprimer(null);
      toast.succes('Poste désactivé et retiré de la liste des frais.');
    },
    onError: (error) => {
      setASupprimer(null);
      toast.erreur(messageErreur(error));
    },
  });

  const liste = postes.data ?? [];
  const ordreDefaut = liste.reduce((maximum, poste) => Math.max(maximum, poste.ordre ?? 0), -1) + 1;

  function ouvrirCreation() {
    setPosteEdite(null);
    setFormulaireOuvert(true);
  }

  function ouvrirEdition(poste: PosteDto) {
    setPosteEdite(poste);
    setFormulaireOuvert(true);
  }

  return (
    <section className="carte mt-6 overflow-hidden">
      <div className="carte-entete">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
            <ReceiptText size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">Types de frais</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Libellés, fournisseurs, prorata par défaut et périodicité alimentent la note de frais. Suppression
              logique uniquement.
            </p>
          </div>
        </div>
        <Bouton
          variante="primaire"
          petit
          icone={<Plus size={14} />}
          onClick={ouvrirCreation}
          disabled={formulaireOuvert && posteEdite === null}
          data-cy="btn-ajouter-poste"
        >
          Ajouter un type
        </Bouton>
      </div>

      <div className="carte-corps space-y-4">
        {formulaireOuvert ? (
          <FormulairePoste
            poste={posteEdite}
            prorataDefaut={prorataDefaut}
            ordreDefaut={ordreDefaut}
            onFermer={() => {
              setFormulaireOuvert(false);
              setPosteEdite(null);
            }}
          />
        ) : null}

        {postes.isError ? (
          <EtatErreur message={messageErreur(postes.error)} onReessayer={() => void postes.refetch()} />
        ) : postes.isPending ? (
          <EtatChargement message="Chargement des postes…" />
        ) : liste.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-forte p-6 text-center text-sm text-ink-soft">
            Aucun poste configuré. Ajoutez au moins « Loyer » et vos frais courants.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="tableau-frais">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Fournisseur</th>
                  <th className="text-right">Prorata</th>
                  <th>Périodicité</th>
                  <th className="text-center">Ordre</th>
                  <th>Options</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((poste) => (
                  <tr key={poste.id} className={cn(!poste.actif && 'opacity-60')}>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-ink">{poste.libelle}</span>
                        <code className="rounded bg-paper-deep/60 px-1 py-0.5 font-mono text-[10.5px] text-ink-soft">
                          {poste.code}
                        </code>
                        {!poste.actif ? <span className="badge badge-neutre">inactif</span> : null}
                      </div>
                    </td>
                    <td className="text-ink-soft">{poste.fournisseur || '—'}</td>
                    <td className="nombre text-right text-ink-soft">{formatPourcentage(poste.prorataPct)}</td>
                    <td className="text-xs capitalize text-ink-soft">
                      {PERIODICITES.find((periodicite) => periodicite.valeur === poste.periodicite)?.libelle ??
                        poste.periodicite}
                    </td>
                    <td className="nombre text-center text-ink-soft">{poste.ordre}</td>
                    <td>
                      {poste.plusieursLignesAutorisees ? (
                        <span className="badge badge-accent">multi-lignes</span>
                      ) : (
                        <span className="text-xs text-ink-soft">une ligne</span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Bouton
                          variante="fantome"
                          petit
                          icone={<PencilLine size={13} />}
                          onClick={() => ouvrirEdition(poste)}
                          data-cy={`btn-modifier-poste-${poste.code}`}
                        >
                          Modifier
                        </Bouton>
                        <Bouton
                          variante="fantome"
                          petit
                          icone={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setASupprimer(poste)}
                          data-cy={`btn-supprimer-poste-${poste.code}`}
                        >
                          Retirer
                        </Bouton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DialogueConfirmation
        ouvert={aSupprimer !== null}
        titre="Retirer ce type de frais ?"
        message={
          aSupprimer
            ? `« ${aSupprimer.libelle} » ne sera plus proposé dans la note de frais. Les documents existants conservent leurs lignes et leurs montants.`
            : ''
        }
        libelleConfirmer="Retirer le poste"
        variante="danger"
        onConfirmer={() => {
          if (aSupprimer) {
            supprimer.mutate(aSupprimer);
          }
        }}
        onAnnuler={() => setASupprimer(null)}
        dataCy="dialogue-supprimer-poste"
      />
    </section>
  );
}

export function ConfigurationPage() {
  const queryClient = useQueryClient();
  const parametres = useParametres();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ParametresFormValues>({
    resolver: zodResolver(parametresSchema),
    mode: 'onChange',
    defaultValues: valeursDepuisParametres(undefined),
  });

  useEffect(() => {
    if (parametres.data) {
      reset(valeursDepuisParametres(parametres.data));
    }
  }, [parametres.data, reset]);

  const valeurs = watch();
  const totalQuittance = centimes(valeurs.loyerHc) + centimes(valeurs.provisionCharges);
  const prorataAffiche = useMemo(() => {
    const pro = parseMontant(valeurs.surfacePro);
    const totale = parseMontant(valeurs.surfaceTotale);
    if (pro === null || totale === null || Number(totale) <= 0) {
      return null;
    }
    return (Number(pro) / Number(totale)) * 100;
  }, [valeurs.surfacePro, valeurs.surfaceTotale]);

  const enregistrer = useMutation({
    mutationFn: (valeursSoumises: ParametresFormValues) => {
      const corps: ParametresRequest = {
        raisonSociale: valeursSoumises.raisonSociale.trim(),
        formeJuridique: valeursSoumises.formeJuridique.trim(),
        siren: valeursSoumises.siren.trim(),
        societeAdresse: valeursSoumises.societeAdresse.trim(),
        gerant: valeursSoumises.gerant.trim(),
        logementAdresse: valeursSoumises.logementAdresse.trim(),
        surfaceTotale: parseMontant(valeursSoumises.surfaceTotale) ?? undefined,
        surfacePro: parseMontant(valeursSoumises.surfacePro) ?? undefined,
        bailleurNom: valeursSoumises.bailleurNom.trim(),
        bailleurAdresse: valeursSoumises.bailleurAdresse.trim(),
        locataireNom: valeursSoumises.locataireNom.trim(),
        locataireAdresse: valeursSoumises.locataireAdresse.trim(),
        loyerHc: parseMontant(valeursSoumises.loyerHc) ?? undefined,
        provisionCharges: parseMontant(valeursSoumises.provisionCharges) ?? undefined,
        lieuEmission: valeursSoumises.lieuEmission.trim(),
      };
      return api.parametres.enregistrer(corps);
    },
    onSuccess: (donnees) => {
      queryClient.setQueryData(cles.parametres, donnees);
      toast.succes('Configuration enregistrée. Les prochains documents utiliseront ces valeurs.');
    },
  });

  return (
    <>
      <PageHeader
        surTitre="Réglages"
        titre="Configuration"
        description="Ces informations alimentent les quittances, les notes de frais et les valeurs par défaut. Les calculs restent effectués par le backend."
        actions={
          <Bouton
            variante="primaire"
            type="submit"
            form="form-parametres"
            formNoValidate
            icone={<Save size={15} />}
            chargement={enregistrer.isPending}
            data-cy="btn-enregistrer-configuration"
          >
            Enregistrer
          </Bouton>
        }
      />

      {parametres.isError ? (
        <EtatErreur message={messageErreur(parametres.error)} onReessayer={() => void parametres.refetch()} />
      ) : parametres.isPending ? (
        <EtatChargement message="Chargement de la configuration…" />
      ) : (
        <form
          id="form-parametres"
          className="space-y-6"
          onSubmit={handleSubmit((valeursSoumises) => enregistrer.mutate(valeursSoumises))}
          noValidate
        >
          <section className="carte overflow-hidden">
            <EnTeteSection
              icone={Building2}
              titre="Société"
              description="Identité de l’EURL utilisée en en-tête de la note de frais."
            />
            <div className="carte-corps grid gap-4 sm:grid-cols-2">
              <GroupeChamp
                id="param-raison-sociale"
                label="Raison sociale"
                erreur={errors.raisonSociale?.message}
                className="sm:col-span-1"
              >
                <input
                  id="param-raison-sociale"
                  className={cn('champ', errors.raisonSociale && 'champ-erreur')}
                  {...register('raisonSociale')}
                  data-cy="input-raison-sociale"
                />
              </GroupeChamp>
              <GroupeChamp
                id="param-forme-juridique"
                label="Forme juridique"
                erreur={errors.formeJuridique?.message}
              >
                <input
                  id="param-forme-juridique"
                  className={cn('champ', errors.formeJuridique && 'champ-erreur')}
                  {...register('formeJuridique')}
                />
              </GroupeChamp>
              <GroupeChamp
                id="param-siren"
                label="SIREN"
                erreur={errors.siren?.message}
                aide="9 chiffres, espaces autorisés."
              >
                <input
                  id="param-siren"
                  className={cn('champ font-mono', errors.siren && 'champ-erreur')}
                  inputMode="numeric"
                  placeholder="000 000 000"
                  {...register('siren')}
                  data-cy="input-siren"
                />
              </GroupeChamp>
              <GroupeChamp id="param-gerant" label="Gérant" erreur={errors.gerant?.message}>
                <input
                  id="param-gerant"
                  className={cn('champ', errors.gerant && 'champ-erreur')}
                  {...register('gerant')}
                  data-cy="input-gerant"
                />
              </GroupeChamp>
              <GroupeChamp
                id="param-societe-adresse"
                label="Adresse de la société"
                erreur={errors.societeAdresse?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="param-societe-adresse"
                  rows={2}
                  className={cn('champ resize-y', errors.societeAdresse && 'champ-erreur')}
                  {...register('societeAdresse')}
                  data-cy="input-societe-adresse"
                />
              </GroupeChamp>
            </div>
          </section>

          <section className="carte overflow-hidden">
            <EnTeteSection
              icone={Home}
              titre="Logement et quote-part professionnelle"
              description="La surface professionnelle divisée par la surface totale fixe le prorata de référence."
            />
            <div className="carte-corps grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <GroupeChamp
                id="param-logement-adresse"
                label="Adresse du logement"
                erreur={errors.logementAdresse?.message}
                className="sm:col-span-2 lg:col-span-4"
              >
                <textarea
                  id="param-logement-adresse"
                  rows={2}
                  className={cn('champ resize-y', errors.logementAdresse && 'champ-erreur')}
                  {...register('logementAdresse')}
                  data-cy="input-logement-adresse"
                />
              </GroupeChamp>
              <GroupeChamp
                id="param-surface-totale"
                label="Surface totale (m²)"
                erreur={errors.surfaceTotale?.message}
              >
                <input
                  id="param-surface-totale"
                  className={cn('champ', errors.surfaceTotale && 'champ-erreur')}
                  inputMode="decimal"
                  placeholder="70,00"
                  {...register('surfaceTotale')}
                  data-cy="input-surface-totale"
                />
              </GroupeChamp>
              <GroupeChamp
                id="param-surface-pro"
                label="Surface professionnelle (m²)"
                erreur={errors.surfacePro?.message}
              >
                <input
                  id="param-surface-pro"
                  className={cn('champ', errors.surfacePro && 'champ-erreur')}
                  inputMode="decimal"
                  placeholder="25,00"
                  {...register('surfacePro')}
                  data-cy="input-surface-pro"
                />
              </GroupeChamp>
              <GroupeChamp id="param-lieu" label="Lieu d’émission" erreur={errors.lieuEmission?.message}>
                <input
                  id="param-lieu"
                  className={cn('champ', errors.lieuEmission && 'champ-erreur')}
                  placeholder="Paris"
                  {...register('lieuEmission')}
                  data-cy="input-lieu-emission"
                />
              </GroupeChamp>
              <div className="flex flex-col justify-center rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent">Prorata indicatif</p>
                <p className="mt-1 font-display text-2xl text-accent-strong" data-cy="prorata-indicatif">
                  {prorataAffiche === null ? '—' : formatPourcentage(prorataAffiche)}
                </p>
                <p className="text-[10.5px] text-ink-soft">Calculé et arrondi côté backend à l’enregistrement.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="carte overflow-hidden">
              <EnTeteSection
                icone={Landmark}
                titre="Bailleur"
                description="Propriétaire du logement, crédité dans la quittance."
              />
              <div className="carte-corps grid gap-4">
                <GroupeChamp id="param-bailleur-nom" label="Nom du bailleur" erreur={errors.bailleurNom?.message}>
                  <input
                    id="param-bailleur-nom"
                    className={cn('champ', errors.bailleurNom && 'champ-erreur')}
                    {...register('bailleurNom')}
                  />
                </GroupeChamp>
                <GroupeChamp
                  id="param-bailleur-adresse"
                  label="Adresse du bailleur"
                  erreur={errors.bailleurAdresse?.message}
                >
                  <textarea
                    id="param-bailleur-adresse"
                    rows={2}
                    className={cn('champ resize-y', errors.bailleurAdresse && 'champ-erreur')}
                    {...register('bailleurAdresse')}
                  />
                </GroupeChamp>
              </div>
            </section>

            <section className="carte overflow-hidden">
              <EnTeteSection
                icone={UsersRound}
                titre="Locataire"
                description="Occupant du logement, débiteur de la quittance."
              />
              <div className="carte-corps grid gap-4">
                <GroupeChamp id="param-locataire-nom" label="Nom du locataire" erreur={errors.locataireNom?.message}>
                  <input
                    id="param-locataire-nom"
                    className={cn('champ', errors.locataireNom && 'champ-erreur')}
                    {...register('locataireNom')}
                  />
                </GroupeChamp>
                <GroupeChamp
                  id="param-locataire-adresse"
                  label="Adresse du locataire"
                  erreur={errors.locataireAdresse?.message}
                >
                  <textarea
                    id="param-locataire-adresse"
                    rows={2}
                    className={cn('champ resize-y', errors.locataireAdresse && 'champ-erreur')}
                    {...register('locataireAdresse')}
                  />
                </GroupeChamp>
              </div>
            </section>
          </div>

          <section className="carte overflow-hidden">
            <EnTeteSection
              icone={UserRound}
              titre="Loyer et charges"
              description="Valeurs pré-remplies dans l’onglet Quittance ; elles restent modifiables ponctuellement."
            />
            <div className="carte-corps grid gap-4 sm:grid-cols-3">
              <GroupeChamp id="param-loyer-hc" label="Loyer hors charges (€)" erreur={errors.loyerHc?.message}>
                <input
                  id="param-loyer-hc"
                  className={cn('champ', errors.loyerHc && 'champ-erreur')}
                  inputMode="decimal"
                  placeholder="900,00"
                  {...register('loyerHc')}
                  data-cy="input-loyer-hc"
                />
              </GroupeChamp>
              <GroupeChamp
                id="param-provision"
                label="Provision pour charges (€)"
                erreur={errors.provisionCharges?.message}
              >
                <input
                  id="param-provision"
                  className={cn('champ', errors.provisionCharges && 'champ-erreur')}
                  inputMode="decimal"
                  placeholder="50,00"
                  {...register('provisionCharges')}
                  data-cy="input-provision-charges"
                />
              </GroupeChamp>
              <div className="flex flex-col justify-center rounded-xl border border-line bg-paper/45 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Total quittance</p>
                <p className="mt-1 font-display text-2xl text-ink" data-cy="total-quittance-config">
                  {formatEUR(totalQuittance / 100)}
                </p>
                <p className="text-[10.5px] text-ink-soft">Loyer + provision, recalculé par le backend.</p>
              </div>
            </div>
          </section>

          {enregistrer.isError ? (
            <p className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger" role="alert">
              {messageErreur(enregistrer.error)}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
            <p className="text-xs text-ink-soft" aria-live="polite">
              {isDirty ? 'Modifications non enregistrées.' : 'Toutes les valeurs sont à jour.'}
            </p>
            <Bouton
              variante="primaire"
              type="submit"
              icone={<Save size={15} />}
              chargement={enregistrer.isPending}
              data-cy="btn-enregistrer-configuration-bas"
            >
              Enregistrer la configuration
            </Bouton>
          </div>
        </form>
      )}

      <GestionPostes prorataDefaut={parametres.data?.prorataBase ?? '100.00'} />
    </>
  );
}
