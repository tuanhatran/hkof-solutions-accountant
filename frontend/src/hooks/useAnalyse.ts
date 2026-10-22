import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/endpoints';
import { estAnnulation } from '@/api/client';
import type { AnalyseDto } from '@/api/types';

const INTERVALLE_MS = 1_200;
const DUREE_MAX_MS = 180_000;

export type EtatAnalyse =
  | { statut: 'inactif' }
  | { statut: 'demarrage' }
  | { statut: 'en_cours'; analyseId: number }
  | { statut: 'terminee'; analyse: AnalyseDto }
  | { statut: 'echec'; message: string }
  | { statut: 'annulee'; message: string };

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function estAnalyseEnCours(etat: EtatAnalyse): boolean {
  return etat.statut === 'demarrage' || etat.statut === 'en_cours';
}

export function useAnalyse() {
  const [etat, setEtat] = useState<EtatAnalyse>({ statut: 'inactif' });
  const controleurRef = useRef<AbortController | null>(null);
  const analyseIdRef = useRef<number | null>(null);
  const monteRef = useRef(true);

  useEffect(() => {
    monteRef.current = true;
    return () => {
      monteRef.current = false;
      controleurRef.current?.abort();
    };
  }, []);

  const demarrer = useCallback(async (justificatifId: number) => {
    controleurRef.current?.abort();
    const controleur = new AbortController();
    controleurRef.current = controleur;
    analyseIdRef.current = null;
    setEtat({ statut: 'demarrage' });

    try {
      const lancement = await api.analyses.demarrer(justificatifId);
      if (controleur.signal.aborted || !monteRef.current) {
        return;
      }
      const analyseId = lancement.analyseId;
      if (!analyseId) {
        throw new Error("L'analyse n'a pas pu démarrer.");
      }
      analyseIdRef.current = analyseId;
      setEtat({ statut: 'en_cours', analyseId });

      const debut = Date.now();
      while (!controleur.signal.aborted && Date.now() - debut < DUREE_MAX_MS) {
        const analyse = await api.analyses.obtenir(analyseId, controleur.signal);
        if (controleur.signal.aborted || !monteRef.current) {
          return;
        }
        if (analyse.statut === 'TERMINEE') {
          setEtat({ statut: 'terminee', analyse });
          return;
        }
        if (analyse.statut === 'ECHEC') {
          setEtat({
            statut: 'echec',
            message: analyse.messageErreur || "L'analyse a échoué. Saisissez le montant manuellement.",
          });
          return;
        }
        if (analyse.statut === 'ANNULEE') {
          setEtat({ statut: 'annulee', message: 'Analyse annulée.' });
          return;
        }
        await attendre(INTERVALLE_MS);
      }
      if (!controleur.signal.aborted && monteRef.current) {
        setEtat({
          statut: 'echec',
          message: "L'analyse prend trop de temps. Saisissez le montant manuellement.",
        });
      }
    } catch (error) {
      if (estAnnulation(error) || controleur.signal.aborted || !monteRef.current) {
        return;
      }
      setEtat({
        statut: 'echec',
        message: "Analyse indisponible, saisissez le montant.",
      });
    }
  }, []);

  const annuler = useCallback(async (silencieux = false) => {
    const analyseId = analyseIdRef.current;
    controleurRef.current?.abort();
    analyseIdRef.current = null;
    if (analyseId !== null) {
      try {
        await api.analyses.annuler(analyseId);
      } catch {
        // L'analyse peut déjà être terminée : l'annulation est sans effet.
      }
    }
    if (monteRef.current) {
      setEtat(
        silencieux
          ? { statut: 'inactif' }
          : { statut: 'annulee', message: 'Analyse annulée.' },
      );
    }
  }, []);

  const reinitialiser = useCallback(() => {
    controleurRef.current?.abort();
    analyseIdRef.current = null;
    setEtat({ statut: 'inactif' });
  }, []);

  return { etat, demarrer, annuler, reinitialiser };
}
