import type {
  ConfianceIa,
  JustificatifDto,
  LigneDto,
  LigneRequest,
  PosteDto,
  SourceMontant,
} from '@/api/types';
import { estDateValide } from './dates';
import { parseMontant, parsePourcentage } from './format';

export interface LigneBrouillon {
  cle: string;
  posteCode: string;
  montantTtc: string;
  prorataPct: string;
  periodeDebut: string;
  periodeFin: string;
  montantMoisSurcharge: string;
  justificatifId: number | null;
  justificatifNom: string | null;
  sourceMontant: SourceMontant;
  montantDetecteIa: string | null;
  confianceIa: ConfianceIa | null;
  fournisseurDetecte: string | null;
}

export function nouvelleCle(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ligne-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function depuisLigneDto(ligne: LigneDto): LigneBrouillon {
  return {
    cle: nouvelleCle(),
    posteCode: ligne.posteCode ?? '',
    montantTtc: ligne.montantTtc ?? '',
    prorataPct: ligne.prorataPct ?? '100',
    periodeDebut: ligne.periodeDebut ?? '',
    periodeFin: ligne.periodeFin ?? '',
    montantMoisSurcharge: '',
    justificatifId: ligne.justificatifId ?? null,
    justificatifNom: ligne.justificatifNom ?? null,
    sourceMontant: (ligne.sourceMontant as SourceMontant) ?? 'MANUEL',
    montantDetecteIa: ligne.montantDetecteIa ?? null,
    confianceIa: (ligne.confianceIa as ConfianceIa) ?? null,
    fournisseurDetecte: null,
  };
}

export function versLigneRequest(ligne: LigneBrouillon): LigneRequest {
  const montantTtc = parseMontant(ligne.montantTtc);
  const prorataPct = parsePourcentage(ligne.prorataPct);
  if (montantTtc === null) {
    throw new Error('Le montant TTC est invalide.');
  }
  if (prorataPct === null) {
    throw new Error('Le prorata est invalide.');
  }
  const requete: LigneRequest = {
    posteCode: ligne.posteCode,
    montantTtc,
    prorataPct,
  };
  if (ligne.periodeDebut && ligne.periodeFin) {
    if (!estDateValide(ligne.periodeDebut) || !estDateValide(ligne.periodeFin)) {
      throw new Error('La période facturée est invalide.');
    }
    requete.periodeDebut = ligne.periodeDebut;
    requete.periodeFin = ligne.periodeFin;
  }
  if (ligne.montantMoisSurcharge.trim() !== '') {
    const surcharge = parseMontant(ligne.montantMoisSurcharge);
    if (surcharge === null) {
      throw new Error('Le montant du mois est invalide.');
    }
    requete.montantMoisSurcharge = surcharge;
  }
  if (ligne.justificatifId !== null) {
    requete.justificatifId = ligne.justificatifId;
  }
  requete.sourceMontant = ligne.sourceMontant;
  if (ligne.montantDetecteIa) {
    requete.montantDetecteIa = ligne.montantDetecteIa;
  }
  if (ligne.confianceIa) {
    requete.confianceIa = ligne.confianceIa;
  }
  return requete;
}

export function lignesVersRequetes(lignes: LigneBrouillon[]): LigneRequest[] {
  return lignes.map(versLigneRequest);
}

export function typeDejaAjoute(lignes: LigneBrouillon[], posteCode: string): boolean {
  return lignes.some((ligne) => ligne.posteCode === posteCode);
}

export function typesManquants(postes: PosteDto[], lignes: LigneBrouillon[]): string[] {
  const codes = new Set(lignes.map((ligne) => ligne.posteCode));
  return postes
    .filter((poste) => poste.code && !poste.plusieursLignesAutorisees && !codes.has(poste.code))
    .map((poste) => poste.libelle?.toLowerCase() ?? poste.code ?? '')
    .filter(Boolean);
}

export function construireLigneLoyer(montant: string, prorataPct: string): LigneBrouillon {
  return {
    cle: nouvelleCle(),
    posteCode: 'loyer',
    montantTtc: montant,
    prorataPct,
    periodeDebut: '',
    periodeFin: '',
    montantMoisSurcharge: '',
    justificatifId: null,
    justificatifNom: null,
    sourceMontant: 'MANUEL',
    montantDetecteIa: null,
    confianceIa: null,
    fournisseurDetecte: null,
  };
}

export function nomJustificatif(justificatif: JustificatifDto | null): string | null {
  return justificatif?.nomFichier ?? null;
}
