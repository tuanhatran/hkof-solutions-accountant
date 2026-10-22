export const MOIS = '2026-01';
export const MOIS_FEVRIER = '2026-02';
export const LIBELLE_MOIS = 'Janvier 2026';

export function normaliser(texte: string | null | undefined): string {
  return (texte ?? '').replace(/[\s\u00a0\u202f]+/g, ' ').trim();
}

interface OptionsAttente {
  timeout?: number;
}

export function attendreTexte(
  selecteur: string,
  attendu: string | RegExp,
  options: OptionsAttente = {},
): void {
  cy.get(selecteur, { timeout: options.timeout ?? 20_000 }).should(($element) => {
    const texte = normaliser($element.text());
    if (attendu instanceof RegExp) {
      expect(texte, selecteur).to.match(attendu);
    } else {
      expect(texte, selecteur).to.contain(attendu);
    }
  });
}

export function attendreMontant(selecteur: string, montant: string): void {
  attendreTexte(selecteur, `${montant} €`);
}

export function attendreValeur(selecteur: string, valeur: string): void {
  cy.get(selecteur).should('have.value', valeur);
}

export function saisirValeur(selecteur: string, valeur: string): void {
  cy.get(selecteur).then(($element) => {
    const input = $element[0] as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, valeur);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function finDuMois(mois: string): string {
  const [annee, numero] = mois.split('-').map(Number);
  return new Date(Date.UTC(annee, numero, 0)).toISOString().slice(0, 10);
}

export function creerQuittance(mois: string = MOIS): void {
  cy.request({
    method: 'POST',
    url: '/api/quittances',
    body: {
      mois,
      periodeDebut: `${mois}-01`,
      periodeFin: finDuMois(mois),
      loyerHc: '900.00',
      charges: '50.00',
    },
  })
    .its('status')
    .should('eq', 201);
}

export interface ConfigurationLlm {
  actif: boolean;
  fournisseur: string;
  url: string;
  modele: string;
  timeoutSeconds: number;
  temperature: string;
  numCtx: number;
  pagesMax: number;
  ocrActif: boolean;
  promptExtraction: string;
}

export function configurerLlm(modifications: Partial<ConfigurationLlm>): void {
  cy.request<ConfigurationLlm>('/api/admin/llm').then(({ body }) => {
    const corps: ConfigurationLlm = {
      actif: body.actif,
      fournisseur: body.fournisseur,
      url: body.url,
      modele: body.modele,
      timeoutSeconds: body.timeoutSeconds,
      temperature: body.temperature,
      numCtx: body.numCtx,
      pagesMax: body.pagesMax,
      ocrActif: body.ocrActif,
      promptExtraction: body.promptExtraction,
      ...modifications,
    };
    cy.request({ method: 'PUT', url: '/api/admin/llm', body: corps })
      .its('status')
      .should('eq', 200);
  });
}

export function desactiverLlm(): void {
  configurerLlm({ actif: false });
}

export function deposerJustificatif(fixture: string): void {
  cy.get('[data-cy="dropzone-fichier"]').selectFile(`cypress/fixtures/${fixture}`, {
    force: true,
  });
}

export function attendreFichierSelectionne(nom: string): void {
  cy.contains(nom, { timeout: 25_000 }).should('be.visible');
}

export interface FraisManuel {
  type: string;
  fixture?: string;
  montant: string;
  prorata?: string;
}

export function ajouterFrais(frais: FraisManuel): void {
  cy.get('[data-cy="select-type-frais"]').select(frais.type);
  if (frais.fixture) {
    deposerJustificatif(frais.fixture);
    attendreFichierSelectionne(frais.fixture);
  }
  cy.get('[data-cy="input-montant-ttc"]').clear().type(frais.montant);
  if (frais.prorata) {
    cy.get('[data-cy="input-prorata"]').clear().type(frais.prorata);
  }
  cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();
  cy.get(`[data-cy="ligne-frais-${frais.type}"]`).should('exist');
}

export function ajouterLoyer(): void {
  cy.get('[data-cy="select-type-frais"]').select('loyer');
  attendreValeur('[data-cy="input-montant-ttc"]', '950.00');
  cy.get('[data-cy="dropzone-fichier"]').should('not.exist');
  cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();
  cy.get('[data-cy="ligne-frais-loyer"]').should('exist');
}

export function teledechargerEtLirePdf(
  declencheur: string,
  nomFichier: string,
  verifier: (texte: string) => void,
): void {
  cy.task('nettoyerTelechargements');
  cy.get(declencheur).click();
  cy.task<string>('attendreFichier', nomFichier)
    .then((chemin) => cy.task<string>('lirePdf', chemin))
    .then((texte) => verifier(normaliser(texte)));
}

export function attendreAnalyseTexte(texte: string | RegExp, timeout = 35_000): void {
  cy.get('[data-cy="analyse-statut"]', { timeout }).should(($element) => {
    expect(normaliser($element.text())).to.match(
      texte instanceof RegExp ? texte : new RegExp(texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  });
}
