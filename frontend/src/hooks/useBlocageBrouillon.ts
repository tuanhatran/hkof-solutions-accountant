import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useNoteDirty } from '@/state/noteDraft';
import { useQuittanceDraft } from '@/state/quittanceDraft';

export function useBlocageBrouillon() {
  const quittanceDirty = useQuittanceDraft((state) => state.dirty);
  const noteDirty = useNoteDirty();
  const brouillonExiste = quittanceDirty || noteDirty;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const depuisGeneration = currentLocation.pathname.startsWith('/generer');
    const versGeneration = nextLocation.pathname.startsWith('/generer');
    return depuisGeneration && !versGeneration && brouillonExiste;
  });

  useEffect(() => {
    if (!brouillonExiste) {
      return;
    }
    const avertir = (evenement: BeforeUnloadEvent) => {
      evenement.preventDefault();
      evenement.returnValue = '';
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [brouillonExiste]);

  return blocker;
}
