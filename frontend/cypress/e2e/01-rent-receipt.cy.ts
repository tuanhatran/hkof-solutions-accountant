import {
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
      cy.get('[data-cy="select-signature"] option:selected').should(
        "contain.text",
        "Signature du bailleur (e2e)",
      );

      cy.chooseMonth(MONTHS);
      waitForValue("#quittance-debut", "2026-01-01");
      waitForValue("#quittance-fin", "2026-01-31");

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
      waitForText(
        '[data-cy="quittance-active-2026-01"]',
        "Nom du bailleur → Nom du locataire",
      );
      cy.get(group).contains("Toutes les quittances du mois (2)").click();
      cy.get('[data-cy^="historique-quittance-"]').should("have.length", 2);
      cy.get('[data-cy="quittances-mois-2026-01"]')
        .contains("v2 · active")
        .should("be.visible");
      cy.get('[data-cy="quittances-mois-2026-01"]')
        .contains("v1 · active")
        .should("be.visible");
    });
  });
});
