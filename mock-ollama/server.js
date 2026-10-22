const http = require('node:http');

const PORT = Number(process.env.PORT || 11434);
const MODELE_TEXTE = process.env.MOCK_MODEL || 'mock-extract:latest';
const MODELE_VISION = 'mock-vision:latest';
const MOIS_FIGE = /^\d{4}-(0[1-9]|1[0-2])$/.test(process.env.MOCK_MOIS || '')
  ? process.env.MOCK_MOIS
  : null;
const DELAI_DEFAUT = Number(process.env.MOCK_DELAI_MS || 0);

const MODELES = [
  {
    name: MODELE_TEXTE,
    model: MODELE_TEXTE,
    modified_at: '2026-01-01T00:00:00Z',
    size: 1073741824,
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    details: { family: 'mock', parameter_size: '7B', quantization_level: 'Q4_0' },
  },
  {
    name: MODELE_VISION,
    model: MODELE_VISION,
    modified_at: '2026-01-01T00:00:00Z',
    size: 2147483648,
    digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    details: { family: 'mock-vision', parameter_size: '7B', quantization_level: 'Q4_0' },
  },
];

let compteurChat = 0;

function moisReference(decale = 0) {
  if (MOIS_FIGE) {
    const [annee, mois] = MOIS_FIGE.split('-').map(Number);
    return { annee, mois: mois - 1 + decale };
  }
  const maintenant = new Date();
  return { annee: maintenant.getUTCFullYear(), mois: maintenant.getUTCMonth() + decale };
}

function premierJourMois(decale = 0) {
  const { annee, mois } = moisReference(decale);
  return new Date(Date.UTC(annee, mois, 1));
}

function dernierJourMois(decale = 0) {
  const { annee, mois } = moisReference(decale);
  return new Date(Date.UTC(annee, mois + 1, 0));
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function normaliserMontant(brut) {
  if (!brut) {
    return null;
  }
  const compact = brut.replace(/[€\s]/g, '');
  const nettoye = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye) || Number(nettoye) <= 0) {
    return null;
  }
  return Number(nettoye).toFixed(2);
}

function extraire(contenu) {
  if (contenu.includes('MOCK_ERREUR')) {
    return { erreur: true };
  }
  if (contenu.includes('MOCK_ECHEC')) {
    return { erreur: false, contenu: 'Désolé, je ne peux pas analyser ce document.' };
  }
  const texte = contenu.replace(/<document>([\s\S]*?)<\/document>/, '$1');
  const montantBrut = /Montant\s*TTC\s*:\s*([0-9][0-9 .,]*[0-9])/i.exec(texte);
  const montant = normaliserMontant(montantBrut ? montantBrut[1] : null);
  const fournisseur = /Fournisseur\s*:\s*([^\r\n]+)/i.exec(texte);
  const type = /Type(?:\s+de\s+frais)?\s*:\s*([^\r\n]+)/i.exec(texte);
  const fin = /Fin\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(texte);
  const debut = /Début\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(texte);
  const resultat = {
    type_suggere: type ? type[1].trim().toLowerCase() : null,
    fournisseur: fournisseur ? fournisseur[1].trim() : null,
    numero_facture: null,
    date_facture: null,
    periode_debut: debut ? debut[1] : iso(premierJourMois()),
    periode_fin: fin ? fin[1] : iso(dernierJourMois()),
    montant_ttc: montant,
    montant_ht: null,
    devise: 'EUR',
    extrait_source: montantBrut ? montantBrut[0].trim() : null,
    confiance: montant ? 'haute' : 'basse',
  };
  return { erreur: false, contenu: JSON.stringify(resultat) };
}

function repondre(reponse, statut, corps) {
  const charge = JSON.stringify(corps);
  reponse.writeHead(statut, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(charge),
  });
  reponse.end(charge);
}

function lireCorps(requete) {
  return new Promise((resoudre, rejeter) => {
    const morceaux = [];
    let taille = 0;
    requete.on('data', (morceau) => {
      taille += morceau.length;
      if (taille > 20 * 1024 * 1024) {
        rejeter(new Error('Corps trop volumineux'));
        requete.destroy();
        return;
      }
      morceaux.push(morceau);
    });
    requete.on('end', () => resoudre(Buffer.concat(morceaux).toString('utf8')));
    requete.on('error', rejeter);
  });
}

const serveur = http.createServer(async (requete, reponse) => {
  const url = new URL(requete.url, `http://localhost:${PORT}`);
  if (requete.method === 'GET' && url.pathname === '/health') {
    return repondre(reponse, 200, { statut: 'ok' });
  }
  if (requete.method === 'GET' && url.pathname === '/api/version') {
    return repondre(reponse, 200, { version: '0.0.0-mock' });
  }
  if (requete.method === 'GET' && url.pathname === '/api/tags') {
    return repondre(reponse, 200, { models: MODELES });
  }
  if (requete.method === 'POST' && url.pathname === '/api/show') {
    let corps = {};
    try {
      corps = JSON.parse(await lireCorps(requete));
    } catch {
      corps = {};
    }
    const vision = String(corps.model || '').includes('vision');
    return repondre(reponse, 200, {
      model: corps.model || MODELE_TEXTE,
      capabilities: vision ? ['completion', 'vision'] : ['completion'],
      details: { family: vision ? 'mock-vision' : 'mock' },
    });
  }
  if (requete.method === 'POST' && url.pathname === '/api/chat') {
    let corps;
    try {
      corps = JSON.parse(await lireCorps(requete));
    } catch {
      return repondre(reponse, 400, { error: 'Corps JSON invalide' });
    }
    const messages = Array.isArray(corps.messages) ? corps.messages : [];
    const utilisateur = [...messages].reverse().find((message) => message.role === 'user');
    const contenu = utilisateur && typeof utilisateur.content === 'string' ? utilisateur.content : '';
    compteurChat += 1;
    const resultat = extraire(contenu);
    const delai = contenu.includes('MOCK_LENT') ? Math.max(DELAI_DEFAUT, 4000) : DELAI_DEFAUT;
    if (delai > 0) {
      await new Promise((resoudre) => setTimeout(resoudre, delai));
    }
    if (resultat.erreur) {
      return repondre(reponse, 500, { error: 'Erreur simulée par mock-ollama' });
    }
    return repondre(reponse, 200, {
      model: corps.model || MODELE_TEXTE,
      created_at: '2026-01-01T00:00:00Z',
      message: { role: 'assistant', content: resultat.contenu },
      done: true,
      total_duration: 1000000,
      eval_count: compteurChat,
    });
  }
  return repondre(reponse, 404, { error: 'Route mock inconnue : ' + requete.method + ' ' + url.pathname });
});

serveur.listen(PORT, '0.0.0.0', () => {
  console.log(
    `mock-ollama à l'écoute sur http://0.0.0.0:${PORT} (modèle ${MODELE_TEXTE}, mois ${MOIS_FIGE ?? 'courant'})`,
  );
});
