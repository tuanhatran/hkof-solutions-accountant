const MOIS_VALIDE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function moisCourant(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function estMoisValide(mois: string): boolean {
  return MOIS_VALIDE.test(mois);
}

export function joursDansMois(mois: string): number {
  if (!estMoisValide(mois)) {
    return 0;
  }
  const [annee, numeroMois] = mois.split('-').map(Number);
  return new Date(annee, numeroMois, 0).getDate();
}

export function periodeDuMois(mois: string): { debut: string; fin: string } {
  if (!estMoisValide(mois)) {
    return { debut: '', fin: '' };
  }
  const jours = joursDansMois(mois);
  return { debut: `${mois}-01`, fin: `${mois}-${String(jours).padStart(2, '0')}` };
}

export function dateAujourdhui(date = new Date()): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export function moisDeDate(date: string): string {
  return date.slice(0, 7);
}

export function estDateValide(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const [annee, mois, jour] = date.split('-').map(Number);
  const candidate = new Date(annee, mois - 1, jour);
  return (
    candidate.getFullYear() === annee &&
    candidate.getMonth() === mois - 1 &&
    candidate.getDate() === jour
  );
}

export function periodeDansLOrdre(debut: string, fin: string): boolean {
  return estDateValide(debut) && estDateValide(fin) && debut <= fin;
}

export function dureeEnJours(debut: string, fin: string): number {
  if (!estDateValide(debut) || !estDateValide(fin) || fin < debut) {
    return 0;
  }
  const [anneeD, moisD, jourD] = debut.split('-').map(Number);
  const [anneeF, moisF, jourF] = fin.split('-').map(Number);
  const millis = Date.UTC(anneeF, moisF - 1, jourF) - Date.UTC(anneeD, moisD - 1, jourD);
  return Math.round(millis / 86_400_000) + 1;
}
