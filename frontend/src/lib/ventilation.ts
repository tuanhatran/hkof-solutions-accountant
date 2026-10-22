import { dureeEnJours, joursDansMois } from './dates';
import { formatEUR, montantRetenuEstime, parseMontant } from './format';

export interface EstimationVentilation {
  joursMois: number;
  joursTotal: number;
  montantMois: string;
  montantRetenu: string;
}

/**
 * Estimation locale pour l'aide à la saisie : le calcul de référence est effectué par le backend.
 */
export function estimerVentilation(
  montantTtc: string,
  prorataPct: string,
  debut: string,
  fin: string,
  mois: string,
): EstimationVentilation | null {
  if (!debut || !fin || !mois) {
    return null;
  }
  const montant = parseMontant(montantTtc);
  if (montant === null) {
    return null;
  }
  const joursTotal = dureeEnJours(debut, fin);
  if (joursTotal === 0) {
    return null;
  }
  const dernierJour = String(joursDansMois(mois)).padStart(2, '0');
  const debutMois = `${mois}-01`;
  const finMois = `${mois}-${dernierJour}`;
  const debutChevauchement = debut > debutMois ? debut : debutMois;
  const finChevauchement = fin < finMois ? fin : finMois;
  const joursMois =
    debutChevauchement <= finChevauchement ? dureeEnJours(debutChevauchement, finChevauchement) : 0;
  const centimes = Math.round(Number(montant) * 100);
  const centimesMois = Math.round((centimes * joursMois) / joursTotal);
  const montantMois = (centimesMois / 100).toFixed(2);
  return {
    joursMois,
    joursTotal,
    montantMois: formatEUR(montantMois),
    montantRetenu: montantRetenuEstime(montantMois, prorataPct),
  };
}
