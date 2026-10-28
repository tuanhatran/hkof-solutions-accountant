import {
  FEBRUARY,
  MONTHS,
  SEED_RENT,
  SEED_TOTAL,
  normalLease,
  waitForText,
  waitForValue,
  downloadAndReadPdf,
} from "../support/helpers";

interface RentReceiptSummary {
  id?: number;
  version?: number;
  status?: string;
  landlordId?: number;
  tenantId?: number | null;
  tenantCompanyId?: number | null;
  landlordName?: string;
  tenantName?: string;
}

describe("Rent receipt", () => {
  it("adds an additional charge to the total and the generated PDF", () => {
    normalLease().then((lease) => {
      cy.visit("/generer/quittance");
      cy.get('[data-cy="select-bailleur"]').select(String(lease.landlordId));
      cy.get('[data-cy="select-locataire"]').select(`person:${lease.tenantId}`);
      cy.chooseMonth(FEBRUARY);
      waitForValue("#quittance-loyer", SEED_RENT);

      cy.get('[data-cy="btn-ajouter-charge-supplementaire"]').click();
      cy.get('[data-cy="input-charge-supplementaire-libelle"]').type("Eau");
      cy.get('[data-cy="input-charge-supplementaire-montant"]').type("20,00");
      cy.get('[data-cy="btn-ajouter-charge-supplementaire"]').should(
        "be.disabled",
      );
      cy.get('[data-cy="btn-generer-quittance"]').should("be.disabled");
      cy.contains("1 300,00 €").should("be.visible");

      cy.get('[data-cy="btn-enregistrer-charge-supplementaire"]').click();
      cy.get('[data-cy="charge-supplementaire-0"]')
        .should("be.visible")
        .and("contain.text", "Eau")
        .and("contain.text", "20,00");
      cy.get('[data-cy="input-charge-supplementaire-libelle"]').should(
        "not.exist",
      );
      cy.get('[data-cy="btn-ajouter-charge-supplementaire"]').should(
        "not.be.disabled",
      );
      cy.contains("1 320,00 €").should("be.visible");

      // Editing keeps the saved charge effective until the new value is saved.
      cy.get('[data-cy="btn-modifier-charge-supplementaire-0"]').click();
      cy.get('[data-cy="input-charge-supplementaire-libelle"]').should(
        "have.value",
        "Eau",
      );
      cy.get('[data-cy="input-charge-supplementaire-montant"]')
        .should("have.value", "20.00")
        .clear()
        .type("25,00");
      cy.contains("1 320,00 €").should("be.visible");
      cy.get('[data-cy="btn-enregistrer-charge-supplementaire"]').click();
      cy.get('[data-cy="charge-supplementaire-0"]')
        .should("be.visible")
        .and("contain.text", "25,00");

      cy.get('[data-cy="btn-generer-quittance"]')
        .should("not.be.disabled")
        .click();
      cy.contains("Quittance générée", { timeout: 25_000 }).should(
        "be.visible",
      );

      downloadAndReadPdf(
        '[data-cy="btn-telecharger-quittance"]',
        "quittance_2026-02.pdf",
        (text) => {
          expect(text).to.contain("Eau");
          expect(text).to.contain("1 325,00 €");
          expect(text).to.contain("1 325,00");
        },
      );
    });
  });

  it("keeps several active receipts for the same pair in one month", () => {
    normalLease().then((lease) => {
      cy.visit("/generer/quittance");

      // The reset seeds a company lease and a normal lease: select the normal
      // pair explicitly instead of relying on a single-lease auto-selection.
      cy.get('[data-cy="select-bailleur"]')
        .find("option")
        .should("have.length.greaterThan", 1);
      cy.get('[data-cy="select-bailleur"]').select(String(lease.landlordId));
      cy.get('[data-cy="select-locataire"]').select(`person:${lease.tenantId}`);

      waitForValue("#quittance-loyer", SEED_RENT);
      waitForText('[data-cy="detail-bail"]', "12 rue de la République");
      // A lease between natural persons has no company: no company chip.
      cy.get('[data-cy="societe-quittance"]').should("not.exist");
      cy.get('[data-cy="select-signature"] option:selected').should(
        "contain.text",
        "Signature du bailleur (e2e)",
      );

      cy.intercept("POST", "/api/rent-receipts/preview", (request) => {
        const body = request.body as { month?: string } | null;
        if (body?.month === MONTHS) {
          request.alias = "previewQuittance";
        }
      });
      cy.chooseMonth(MONTHS);
      cy.wait("@previewQuittance").its("request.body").should("include", {
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      });
      cy.get("#quittance-debut").should("not.exist");
      cy.get("#quittance-fin").should("not.exist");

      cy.get('[data-cy="btn-generer-quittance"]')
        .should("not.be.disabled")
        .click();
      cy.contains("Quittance générée", { timeout: 25_000 }).should(
        "be.visible",
      );

      downloadAndReadPdf(
        '[data-cy="btn-telecharger-quittance"]',
        "quittance_2026-01.pdf",
        (text) => {
          expect(text).to.contain("QUITTANCE DE LOYER");
          expect(text).to.contain("Janvier 2026");
          expect(text).to.contain("01/01/2026");
          expect(text).to.contain("31/01/2026");
          expect(text).to.contain(SEED_TOTAL);
          expect(text).to.contain("Nom du bailleur");
          expect(text).to.contain("Nom du locataire");
          expect(text).to.contain("12 rue de la République");
          // No lease company: "Fait à" uses the landlord's issue place (the
          // e2e reset seeds "Paris" on the synthetic landlord). Bold runs are
          // extracted after the plain text, so match any "Paris" after it.
          expect(text).to.match(/Fait à[\s\S]*?Paris/);
        },
      );

      cy.contains("version 1", { timeout: 20_000 }).should("be.visible");

      // Unlimited ACTIVE receipts: no regeneration dialog, a second click
      // generates a new active receipt immediately.
      cy.get('[data-cy="btn-generer-quittance"]')
        .should("not.be.disabled")
        .click();
      cy.get('[data-cy="dialogue-regeneration-quittance"]').should("not.exist");
      cy.contains("version 2", { timeout: 25_000 }).should("be.visible");

      cy.request<RentReceiptSummary[]>(
        `/api/rent-receipts?month=${MONTHS}`,
      ).then(({ body }) => {
        expect(body, "receipts of the month").to.have.length(2);
        expect(body.map((receipt) => receipt.status)).to.deep.eq([
          "ACTIVE",
          "ACTIVE",
        ]);
        expect(body.map((receipt) => receipt.version)).to.deep.eq([2, 1]);
        const pair = body[0];
        expect(pair.landlordName).to.eq("Nom du bailleur");
        expect(pair.tenantName).to.eq("Nom du locataire");
        expect(pair.tenantId).to.eq(lease.tenantId);
        expect(pair.tenantCompanyId ?? null).to.eq(null);

        cy.request<RentReceiptSummary>(
          `/api/rent-receipts/active?month=${MONTHS}&landlordId=${pair.landlordId}&tenantId=${pair.tenantId}`,
        ).then(({ body: active }) => {
          expect(active.version).to.eq(2);
          expect(active.status).to.eq("ACTIVE");
        });
      });

      cy.get('[data-cy="tab-historique"]').click();
      const group = '[data-cy="historique-mois-2026-01"]';
      cy.get(group, { timeout: 20_000 }).should(
        "contain.text",
        "Quittance (2)",
      );
      cy.get(group).contains("Nom du bailleur → Nom du locataire (2)").click();
      cy.get('[data-cy^="historique-quittance-"]').should("have.length", 2);
      cy.get('[data-cy="quittances-mois-2026-01"]')
        .contains("v2")
        .should("be.visible");
      cy.get('[data-cy="quittances-mois-2026-01"]')
        .contains("v1")
        .should("be.visible");
    });
  });
});
