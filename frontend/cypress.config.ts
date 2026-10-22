import { defineConfig } from 'cypress';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

const RACINE = process.cwd();
const DOSSIER_TELECHARGEMENTS = path.resolve(RACINE, 'cypress/downloads');

function cheminSur(cheminRelatif: string): string {
  const absolu = path.resolve(RACINE, cheminRelatif);
  if (!absolu.startsWith(RACINE + path.sep)) {
    throw new Error(`Chemin hors du projet refusé : ${cheminRelatif}`);
  }
  return absolu;
}

async function attendreFichier(nom: string, timeoutMs = 30_000): Promise<string> {
  if (nom.includes('/') || nom.includes('\\')) {
    throw new Error(`Nom de fichier attendu sans dossier : ${nom}`);
  }
  const cible = path.join(DOSSIER_TELECHARGEMENTS, nom);
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    try {
      const statut = await fs.stat(cible);
      if (statut.isFile() && statut.size > 0) {
        return cible;
      }
    } catch {
      // Le téléchargement n'a pas encore commencé ou est en cours d'écriture.
    }
    await new Promise((resoudre) => setTimeout(resoudre, 150));
  }
  throw new Error(`Téléchargement absent après ${timeoutMs} ms : ${nom}`);
}

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    downloadsFolder: 'cypress/downloads',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: false,
    viewportWidth: 1440,
    viewportHeight: 1000,
    defaultCommandTimeout: 12_000,
    requestTimeout: 20_000,
    responseTimeout: 30_000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on) {
      on('task', {
        async lirePdf(chemin: string): Promise<string> {
          const absolu = chemin.startsWith(RACINE) ? chemin : cheminSur(chemin);
          const donnees = await fs.readFile(absolu);
          const parseur = new PDFParse({ data: donnees });
          const resultat = await parseur.getText();
          await parseur.destroy();
          return resultat.text;
        },
        async tailleFichier(chemin: string): Promise<number> {
          const absolu = chemin.startsWith(RACINE) ? chemin : cheminSur(chemin);
          const statut = await fs.stat(absolu);
          return statut.size;
        },
        async attendreFichier(nom: string): Promise<string> {
          return attendreFichier(nom);
        },
        async nettoyerTelechargements(): Promise<number> {
          await fs.mkdir(DOSSIER_TELECHARGEMENTS, { recursive: true });
          const entrees = await fs.readdir(DOSSIER_TELECHARGEMENTS);
          let supprimes = 0;
          for (const entree of entrees) {
            const cible = path.join(DOSSIER_TELECHARGEMENTS, entree);
            const statut = await fs.stat(cible);
            if (statut.isFile()) {
              await fs.unlink(cible);
              supprimes += 1;
            }
          }
          return supprimes;
        },
        async supprimerFichier(chemin: string): Promise<boolean> {
          try {
            await fs.unlink(cheminSur(chemin));
            return true;
          } catch {
            return false;
          }
        },
        async creerFichierGeant(chemin: string): Promise<string> {
          const absolu = cheminSur(chemin);
          await fs.mkdir(path.dirname(absolu), { recursive: true });
          const contenu = Buffer.alloc(11 * 1024 * 1024, 'a');
          await fs.writeFile(absolu, contenu);
          return absolu;
        },
      });
    },
  },
});
