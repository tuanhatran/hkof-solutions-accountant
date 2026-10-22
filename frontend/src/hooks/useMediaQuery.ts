import { useEffect, useState } from 'react';

export function useMediaQuery(requete: string): boolean {
  const [correspond, setCorrespond] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(requete).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(requete);
    const changer = (evenement: MediaQueryListEvent) => setCorrespond(evenement.matches);
    setCorrespond(media.matches);
    media.addEventListener('change', changer);
    return () => media.removeEventListener('change', changer);
  }, [requete]);

  return correspond;
}
