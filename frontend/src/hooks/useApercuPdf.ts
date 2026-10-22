import { useCallback, useEffect, useRef, useState } from 'react';
import { estAnnulation, messageErreur, type ReponseBlob } from '@/api/client';

interface EtatApercu {
  url: string | null;
  chargement: boolean;
  erreur: string | null;
  misAJour: Date | null;
}

interface OptionsApercu {
  debounceMs?: number;
  actif?: boolean;
}

export function useApercuPdf(
  charger: (signal: AbortSignal) => Promise<ReponseBlob>,
  signature: string,
  options: OptionsApercu = {},
) {
  const { debounceMs = 400, actif = true } = options;
  const chargerRef = useRef(charger);
  chargerRef.current = charger;
  const [etat, setEtat] = useState<EtatApercu>({
    url: null,
    chargement: false,
    erreur: null,
    misAJour: null,
  });
  const urlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const nomRef = useRef<string>('apercu.pdf');
  const generationRef = useRef(0);
  const controleurRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!actif) {
      setEtat((precedent) =>
        precedent.chargement ? { ...precedent, chargement: false } : precedent,
      );
      return;
    }
    controleurRef.current?.abort();
    const generation = ++generationRef.current;
    setEtat((precedent) => ({ ...precedent, chargement: true, erreur: null }));
    let controleur: AbortController | null = null;

    const timer = window.setTimeout(async () => {
      controleur = new AbortController();
      controleurRef.current = controleur;
      try {
        const reponse = await chargerRef.current(controleur.signal);
        if (controleur.signal.aborted || generation !== generationRef.current) {
          return;
        }
        const url = URL.createObjectURL(reponse.blob);
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        urlRef.current = url;
        blobRef.current = reponse.blob;
        if (reponse.nomFichier) {
          nomRef.current = reponse.nomFichier;
        }
        setEtat({ url, chargement: false, erreur: null, misAJour: new Date() });
      } catch (error) {
        if (estAnnulation(error) || generation !== generationRef.current) {
          return;
        }
        setEtat((precedent) => ({
          ...precedent,
          chargement: false,
          erreur: messageErreur(error),
        }));
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controleur?.abort();
    };
  }, [signature, actif, debounceMs]);

  useEffect(() => {
    return () => {
      controleurRef.current?.abort();
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  const telecharger = useCallback(() => {
    const blob = blobRef.current;
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomRef.current;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, []);

  return { ...etat, telecharger };
}
