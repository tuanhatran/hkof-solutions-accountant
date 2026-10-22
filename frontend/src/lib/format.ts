const ESPACES = /[\s\u00a0\u202f]/g;

const NOMBRE_EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NOMBRE_DECIMAL = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
});

const DATE_FR = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_HEURE_FR = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const MOIS_FR = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
});

function nettoyerNombre(brut: string): string {
  return brut
    .trim()
    .replace(ESPACES, '')
    .replace(/[€%]/g, '')
    .replace(',', '.');
}

/**
 * Normalise un montant saisi en chaîne décimale à deux décimales.
 * Retourne null si la saisie n'est pas un montant positif ou nul à deux décimales.
 */
export function parseMontant(brut: string): string | null {
  if (!brut || brut.trim() === '') {
    return null;
  }
  const valeur = nettoyerNombre(brut);
  if (!/^\d+(?:\.\d{1,2})?$/.test(valeur)) {
    return null;
  }
  const [entier, decimales = ''] = valeur.split('.');
  const entierNormalise = entier.replace(/^0+(?=\d)/, '');
  return `${entierNormalise}.${(decimales + '00').slice(0, 2)}`;
}

/**
 * Normalise un pourcentage (0 à 100, deux décimales maximum).
 */
export function parsePourcentage(brut: string): string | null {
  if (!brut || brut.trim() === '') {
    return null;
  }
  const valeur = nettoyerNombre(brut);
  if (!/^\d+(?:\.\d{1,2})?$/.test(valeur)) {
    return null;
  }
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre) || nombre < 0 || nombre > 100) {
    return null;
  }
  const [entier, decimales] = valeur.split('.');
  if (!decimales) {
    return entier.replace(/^0+(?=\d)/, '');
  }
  const decimalesNettes = decimales.replace(/0+$/, '');
  const entierNormalise = entier.replace(/^0+(?=\d)/, '');
  return decimalesNettes === '' ? entierNormalise : `${entierNormalise}.${decimalesNettes}`;
}

export function formatEUR(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === '') {
    return '—';
  }
  const nombre = typeof valeur === 'number' ? valeur : Number(valeur);
  if (!Number.isFinite(nombre)) {
    return '—';
  }
  return NOMBRE_EURO.format(nombre);
}

export function formatPourcentage(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === '') {
    return '—';
  }
  const nombre = typeof valeur === 'number' ? valeur : Number(valeur);
  if (!Number.isFinite(nombre)) {
    return '—';
  }
  return `${NOMBRE_DECIMAL.format(nombre)} %`;
}

export function parseDateIso(valeur: string | null | undefined): Date | null {
  if (!valeur) {
    return null;
  }
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})/.exec(valeur);
  if (!correspondance) {
    return null;
  }
  const [, annee, mois, jour] = correspondance;
  const date = new Date(Number(annee), Number(mois) - 1, Number(jour));
  if (
    date.getFullYear() !== Number(annee) ||
    date.getMonth() !== Number(mois) - 1 ||
    date.getDate() !== Number(jour)
  ) {
    return null;
  }
  return date;
}

export function formatDateFR(valeur: string | null | undefined): string {
  const date = parseDateIso(valeur);
  return date ? DATE_FR.format(date) : '—';
}

export function formatDateHeure(valeur: string | null | undefined): string {
  if (!valeur) {
    return '—';
  }
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? '—' : DATE_HEURE_FR.format(date);
}

export function formatMois(mois: string | null | undefined): string {
  if (!mois || !/^\d{4}-\d{2}$/.test(mois)) {
    return '—';
  }
  const [annee, numeroMois] = mois.split('-').map(Number);
  const date = new Date(annee, numeroMois - 1, 1);
  const libelle = MOIS_FR.format(date);
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

export function formatPeriode(
  debut: string | null | undefined,
  fin: string | null | undefined,
): string {
  if (!debut || !fin) {
    return '—';
  }
  return `du ${formatDateFR(debut)} au ${formatDateFR(fin)}`;
}

export function formatOctets(octets: number): string {
  if (octets < 1024) {
    return `${octets} o`;
  }
  if (octets < 1024 * 1024) {
    return `${NOMBRE_DECIMAL.format(octets / 1024)} Ko`;
  }
  return `${NOMBRE_DECIMAL.format(octets / (1024 * 1024))} Mo`;
}

/**
 * Estimation d'affichage uniquement : le backend reste la seule source de vérité.
 */
export function montantRetenuEstime(
  montantTtc: string | null | undefined,
  prorataPct: string | null | undefined,
): string {
  const montant = montantTtc ? Number(parseMontant(montantTtc) ?? '') : Number.NaN;
  const pourcentage = prorataPct ? Number(parsePourcentage(prorataPct) ?? '') : Number.NaN;
  if (!Number.isFinite(montant) || !Number.isFinite(pourcentage)) {
    return '—';
  }
  const centimes = Math.round(montant * 100);
  const centiemesPct = Math.round(pourcentage * 100);
  const retenus = Math.round((centimes * centiemesPct) / 10_000);
  return formatEUR(retenus / 100);
}

export function initiales(nom: string | null | undefined): string {
  if (!nom) {
    return 'FO';
  }
  const parties = nom.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parties.map((partie) => partie.charAt(0).toUpperCase()).join('') || 'FO';
}
