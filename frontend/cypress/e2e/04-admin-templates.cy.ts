import {
  MOIS,
  ajouterFrais,
  ajouterLoyer,
  attendreApercu,
  attendreFichierSelectionne,
  attendreMontant,
  attendreValeur,
  configurerLlm,
  creerQuittance,
  desactiverLlm,
  teledechargerEtLirePdf,
} from '../support/helpers';

describe('Admin IA et templates', () => {
  it('charge les modèles du mock et réussit le test de connexion', () => {
    cy.visit('/admin');

    cy.get('[data-cy="select-llm-model"]', { timeout: 25_000 }).should('be.visible');
    cy.get('[data-cy="select-llm-model"] option[value="mock-extract:latest"]').should('exist');
    cy.get('[data-cy="select-llm-model"] option[value="mock-vision:latest"]').should('exist');
    cy.get('[data-cy="select-llm-model"]').select('mock-extract:latest');
    cy.get('[data-cy="alerte-llm-distante"]').should('not.exist');

    cy.get('[data-cy="btn-test-llm"]').click();
    cy.get('[data-cy="resultat-test-llm"]', { timeout: 30_000 }).should(
      'contain.text',
      'Connexion réussie',
    );
    cy.get('[data-cy="badge-llm-statut-admin"]', { timeout: 20_000 }).should(
      'contain.text',
      'Connecté',
    );
  });

  it('affiche un avertissement dès que l’URL du LLM n’est plus locale', () => {
    cy.visit('/admin');
    cy.get('[data-cy="input-llm-url"]', { timeout: 20_000 }).should('be.visible');

    cy.get('[data-cy="alerte-llm-distante"]').should('not.exist');
    cy.get('[data-cy="input-llm-url"]').clear().type('http://ollama-distant.invalid:11434');
    cy.get('[data-cy="alerte-llm-distante"]').should('be.visible');
    cy.get('[data-cy="alerte-llm-distante"]').should(
      'contain.text',
      'Les justificatifs seront envoyés à un serveur distant.',
    );
  });

  it('reste utilisable en manuel quand Ollama est injoignable', () => {
    configurerLlm({ url: 'http://127.0.0.1:11499' });
    creerQuittance();
    cy.visit('/admin');
    cy.get('[data-cy="badge-llm-status"]', { timeout: 30_000 })
      .first()
      .should('contain.text', 'IA injoignable');
    cy.get('[data-cy="llm-statut"]').should('contain.text', 'Injoignable');

    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');
    ajouterLoyer();
    ajouterFrais({ type: 'gaz', fixture: 'facture-gaz.txt', montant: '120.00' });
    attendreMontant('[data-cy="total-retenu"]', '992,85');
  });

  it('reste utilisable en manuel quand l’IA est désactivée', () => {
    desactiverLlm();
    creerQuittance();
    cy.visit('/generer/note-frais');
    cy.choisirMois(MOIS);

    cy.get('[data-cy="badge-llm-status"]', { timeout: 20_000 })
      .first()
      .should('contain.text', 'IA désactivée');
    cy.get('[data-cy="select-type-frais"]').should('not.be.disabled');
    ajouterLoyer();

    cy.get('[data-cy="dropzone-fichier"]').selectFile('cypress/fixtures/facture-gaz.txt', {
      force: true,
    });
    cy.get('[data-cy="analyse-statut"]', { timeout: 25_000 }).should(
      'contain.text',
      'désactivée',
    );
    attendreFichierSelectionne('facture-gaz.txt');

    cy.get('[data-cy="input-montant-ttc"]').clear().type('120.00');
    cy.get('[data-cy="btn-ajouter-frais"]').should('not.be.disabled').click();
    attendreMontant('[data-cy="total-retenu"]', '992,85');
  });

  it('importe, prévisualise, active un template puis revient au modèle intégré', () => {
    cy.visit('/templates');
    cy.get('[data-cy="dropzone-template-quittance"]', { timeout: 20_000 }).should('exist');

    cy.get('[data-cy="input-template-nom"]').first().clear().type('Quittance E2E');
    cy.get('[data-cy="dropzone-template-quittance"]').selectFile(
      'cypress/fixtures/template-quittance-valide.html',
      { force: true },
    );
    cy.get('[data-cy="btn-televerser-template"]').first().click();

    cy.get('[data-cy="rapport-validation-template"]', { timeout: 20_000 })
      .first()
      .should('contain.text', 'Structure valide');
    cy.get('[data-cy="rapport-validation-template"]')
      .first()
      .should('contain.text', 'Variables reconnues');

    cy.contains('button', 'Aperçu de la version v2').click();
    cy.get('[data-cy="apercu-template"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-cy="apercu-template"]')
      .find('button[aria-label="Fermer l’aperçu"]')
      .click();
    cy.get('[data-cy="apercu-template"]').should('not.exist');

    cy.get('[data-cy="btn-activer-template"]', { timeout: 20_000 }).first().click();
    cy.contains('li', 'Quittance E2E', { timeout: 20_000 }).should('contain.text', 'active');
    cy.get('[data-cy="btn-modele-defaut"]').first().should('not.be.disabled');

    cy.intercept('POST', '/api/quittances/apercu').as('apercu');
    cy.get('[data-cy="tab-quittance"]').click();
    attendreValeur('#quittance-loyer', '900.00');
    cy.wait('@apercu', { timeout: 30_000 });
    attendreApercu();
    cy.get('[data-cy="select-template"] option:selected', { timeout: 20_000 }).should(
      'contain.text',
      'Quittance E2E',
    );

    teledechargerEtLirePdf(
      '[data-cy="btn-telecharger-apercu"]',
      'quittance_apercu.pdf',
      (texte) => {
        expect(texte).to.contain('QUITTANCE TEST E2E');
        expect(texte).to.contain('APERÇU');
      },
    );

    cy.choisirMois(MOIS);
    cy.get('[data-cy="btn-generer-quittance"]').should('not.be.disabled').click();
    cy.contains('Quittance générée', { timeout: 25_000 }).should('be.visible');

    teledechargerEtLirePdf(
      '[data-cy="btn-telecharger-quittance"]',
      'quittance_2026-01.pdf',
      (texte) => {
        expect(texte).to.contain('QUITTANCE TEST E2E');
        expect(texte).to.contain('Janvier 2026');
        expect(texte).to.contain('950,00 €');
        expect(texte).not.to.contain('APERÇU');
      },
    );

    cy.get('[data-cy="tab-templates"]').click();
    cy.get('[data-cy="input-template-nom"]', { timeout: 20_000 }).first().clear().type('Quittance invalide');
    cy.get('[data-cy="dropzone-template-quittance"]').selectFile(
      'cypress/fixtures/template-quittance-invalide.html',
      { force: true },
    );
    cy.get('[data-cy="btn-televerser-template"]').first().click();
    cy.contains('Variables inconnues : variable_inconnue', { timeout: 20_000 }).should(
      'be.visible',
    );

    cy.get('[data-cy="btn-modele-defaut"]').first().click();
    cy.get('[data-cy="dialogue-modele-defaut"]').should('be.visible');
    cy.get('[data-cy="dialogue-confirmer"]').click();
    cy.contains('li', 'Quittance — modèle intégré', { timeout: 20_000 }).should(
      'contain.text',
      'active',
    );
    cy.get('[data-cy="btn-modele-defaut"]').first().should('be.disabled');
  });
});
