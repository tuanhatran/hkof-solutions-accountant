import {
  MOIS,
  ajouterFrais,
  ajouterLoyer,
  attendreFichierSelectionne,
  attendreMontant,
  attendreValeur,
  creerQuittance,
  deposerJustificatif,
  desactiverLlm,
  normaliser,
  teledechargerEtLirePdf,
} from '../support/helpers';

function verifierApercu(total: string): void {
  cy.get('[data-cy="total-retenu"]').invoke('text').then((texte) => {
    const totalAffiche = normaliser(texte);
    teledechargerEtLirePdf(
      '[data-cy="btn-telecharger-apercu"]',
      'note_frais_apercu.pdf',
      (pdf) => {
        expect(pdf).to.contain('APERÇU');
        expect(pdf).to.contain(totalAffiche);
        expect(pdf).to.contain(`${total} €`);
      },
    );
  });
}

describe('Note de frais — saisie et aperçu', () => {
  it('conserve les frais ajoutés en passant par la quittance et en revenant', () => {
    desactiverLlm();
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);

    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');
    ajouterLoyer();
    ajouterFrais({ type: 'gaz', fixture: 'facture-gaz.txt', montant: '120.00' });
    attendreMontant('[data-cy="total-retenu"]', '992,85');

    cy.get('[data-cy="tab-quittance"]').click();
    cy.get('[data-cy="tab-note-frais"]').click();

    cy.get('[data-cy="ligne-frais-loyer"]').should('exist');
    cy.get('[data-cy="ligne-frais-gaz"]').should('exist');
    attendreMontant('[data-cy="total-retenu"]', '992,85');
  });

  it('bloque le loyer sans quittance puis le verrouille sur la quittance active', () => {
    desactiverLlm();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);

    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled').select('loyer');
    cy.get('[data-cy="alerte-quittance-manquante"]').should('be.visible');
    cy.get('[data-cy="input-montant-ttc"]').should('have.value', '');
    cy.get('[data-cy="dropzone-fichier"]').should('not.exist');
    cy.get('[data-cy="btn-ajouter-frais"]').should('be.disabled');

    creerQuittance();
    cy.reload();

    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled').select('loyer');
    attendreValeur('[data-cy="input-montant-ttc"]', '950.00');
    cy.get('[data-cy="input-montant-ttc"]').should('have.prop', 'readOnly', true);
    cy.get('[data-cy="dropzone-fichier"]').should('not.exist');
    cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();

    cy.get('[data-cy="ligne-frais-loyer"]').should('exist');
    attendreMontant('[data-cy="total-retenu"]', '950,00');
  });

  it('accepte les prorata 35,71 % et 35.71, refuse 120 et abc', () => {
    desactiverLlm();
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');

    ajouterFrais({
      type: 'gaz',
      fixture: 'facture-gaz.txt',
      montant: '130.00',
      prorata: '35,71 %',
    });
    attendreMontant('[data-cy="ligne-frais-gaz"]', '46,42');

    ajouterFrais({
      type: 'electricite',
      fixture: 'facture-electricite.txt',
      montant: '88.20',
      prorata: '35.71',
    });
    attendreMontant('[data-cy="ligne-frais-electricite"]', '31,50');

    cy.get('[data-cy="select-type-frais"]').select('fibre');
    deposerJustificatif('facture-fibre.txt');
    attendreFichierSelectionne('facture-fibre.txt');
    cy.get('[data-cy="input-montant-ttc"]').clear().type('39.99');

    cy.get('[data-cy="input-prorata"]').clear().type('120');
    cy.contains('Prorata attendu entre 0 et 100 (2 décimales max).').should('be.visible');
    cy.get('[data-cy="btn-ajouter-frais"]').should('be.disabled');

    cy.get('[data-cy="input-prorata"]').clear().type('abc');
    cy.contains('Prorata attendu entre 0 et 100 (2 décimales max).').should('be.visible');
    cy.get('[data-cy="btn-ajouter-frais"]').should('be.disabled');
  });

  it('refuse un fichier .exe sans créer de frais', () => {
    desactiverLlm();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled').select('gaz');

    cy.get('[data-cy="dropzone-fichier"]').selectFile('cypress/fixtures/fichier-interdit.exe', {
      force: true,
    });
    cy.contains('Format non accepté.', { timeout: 10_000 }).should('be.visible');
    cy.get('[data-cy="dropzone-fichier"]').should('exist');

    cy.get('[data-cy="input-montant-ttc"]').clear().type('120.00');
    cy.get('[data-cy="btn-ajouter-frais"]').should('be.disabled');
    cy.get('[data-cy="ligne-frais-gaz"]').should('not.exist');
  });

  it('refuse un faux .docx dont le contenu ne correspond pas', () => {
    desactiverLlm();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled').select('gaz');

    cy.get('[data-cy="dropzone-fichier"]').selectFile('cypress/fixtures/facture-piegee.docx', {
      force: true,
    });
    cy.contains('Le contenu du fichier ne correspond pas à son extension', {
      timeout: 20_000,
    }).should('be.visible');
    cy.get('[data-cy="dropzone-fichier"]').should('exist');

    cy.get('[data-cy="input-montant-ttc"]').clear().type('120.00');
    cy.get('[data-cy="btn-ajouter-frais"]').should('be.disabled');
    cy.get('[data-cy="ligne-frais-gaz"]').should('not.exist');
  });

  it('refuse un fichier de plus de 10 Mo', () => {
    desactiverLlm();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled').select('gaz');

    cy.task<string>('creerFichierGeant', 'cypress/fixtures/fichier-geant.pdf').then((chemin) => {
      cy.get('[data-cy="dropzone-fichier"]').selectFile(chemin, { force: true });
    });
    cy.contains('Fichier trop volumineux (10 Mo maximum).', { timeout: 15_000 }).should(
      'be.visible',
    );

    cy.get('[data-cy="input-montant-ttc"]').clear().type('120.00');
    cy.get('[data-cy="btn-ajouter-frais"]').should('be.disabled');
    cy.get('[data-cy="ligne-frais-gaz"]').should('not.exist');
  });

  it('pré-remplit les champs avec l’IA et permet de corriger le montant', () => {
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');
    ajouterLoyer();

    deposerJustificatif('facture-gaz.txt');
    cy.get('[data-cy="analyse-statut"]', { timeout: 35_000 }).should(
      'contain.text',
      'Analyse terminée',
    );
    attendreFichierSelectionne('facture-gaz.txt');

    attendreValeur('[data-cy="select-type-frais"]', 'gaz');
    attendreValeur('[data-cy="input-montant-ttc"]', '120.00');
    attendreValeur('[data-cy="input-prorata"]', '35.71');
    attendreValeur('[data-cy="input-periode-debut"]', '2026-01-01');
    attendreValeur('[data-cy="input-periode-fin"]', '2026-01-31');
    cy.contains('Fournisseur détecté : EDF').should('be.visible');
    cy.get('[data-cy="badge-ia-detecte"]').should(($badges) => {
      expect($badges.length).to.be.at.least(2);
    });

    cy.get('[data-cy="input-montant-ttc"]').clear().type('125.50');
    cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();

    attendreMontant('[data-cy="ligne-frais-gaz"]', '44,82');
    attendreMontant('[data-cy="total-retenu"]', '994,82');
  });

  it('reste utilisable quand l’analyse échoue', () => {
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');
    ajouterLoyer();

    deposerJustificatif('facture-illisible.txt');
    cy.get('[data-cy="analyse-statut"]', { timeout: 40_000 }).should(
      'contain.text',
      'saisie manuelle',
    );
    attendreFichierSelectionne('facture-illisible.txt');

    cy.get('[data-cy="select-type-frais"]').select('electricite');
    cy.get('[data-cy="input-montant-ttc"]').clear().type('88.20');
    cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();

    attendreMontant('[data-cy="ligne-frais-electricite"]', '31,50');
    attendreMontant('[data-cy="total-retenu"]', '981,50');
  });

  it('annule une analyse en cours et permet la saisie manuelle', () => {
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');

    deposerJustificatif('facture-lente.txt');
    cy.get('[data-cy="analyse-statut"]', { timeout: 20_000 }).should(
      'contain.text',
      'Analyse IA en cours',
    );
    cy.get('[data-cy="btn-annuler-analyse"]').click();

    cy.get('[data-cy="analyse-statut"]', { timeout: 20_000 }).should(
      'contain.text',
      'Analyse annulée.',
    );
    attendreFichierSelectionne('facture-lente.txt');

    cy.get('[data-cy="select-type-frais"]').select('telephone');
    cy.get('[data-cy="input-montant-ttc"]').clear().type('29.99');
    cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();

    attendreMontant('[data-cy="ligne-frais-telephone"]', '10,71');
  });

  it('met à jour l’aperçu à chaque ajout, modification de prorata et suppression', () => {
    desactiverLlm();
    creerQuittance();
    cy.intercept('POST', '/api/notes-frais/apercu').as('apercu');

    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');

    ajouterLoyer();
    cy.wait('@apercu', { timeout: 30_000 });
    cy.attendreApercu();
    attendreMontant('[data-cy="total-retenu"]', '950,00');
    verifierApercu('950,00');

    ajouterFrais({ type: 'gaz', fixture: 'facture-gaz.txt', montant: '120.00' });
    cy.wait('@apercu', { timeout: 30_000 });
    cy.attendreApercu();
    attendreMontant('[data-cy="total-retenu"]', '992,85');
    verifierApercu('992,85');

    cy.get('[aria-label="Prorata de Gaz"]').clear().type('50');
    cy.wait('@apercu', { timeout: 30_000 });
    cy.attendreApercu();
    attendreMontant('[data-cy="total-retenu"]', '1 010,00');
    verifierApercu('1 010,00');

    cy.get('[data-cy="btn-supprimer-gaz"]').click();
    cy.get('[data-cy="dialogue-suppression-frais"]').should('be.visible');
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.get('[data-cy="ligne-frais-gaz"]').should('not.exist');
    cy.wait('@apercu', { timeout: 30_000 });
    cy.attendreApercu();
    attendreMontant('[data-cy="total-retenu"]', '950,00');
    verifierApercu('950,00');
  });

  afterEach(() => {
    cy.task('supprimerFichier', 'cypress/fixtures/fichier-geant.pdf');
  });
});
