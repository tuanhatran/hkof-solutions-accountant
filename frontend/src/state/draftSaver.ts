import { useEffect, useRef } from "react";

export type DraftSaver = () => Promise<boolean>;

let activeSaver: DraftSaver | null = null;

/** Registers the saver of the page currently mounted under the shell. */
export function setDraftSaver(saver: DraftSaver | null): void {
  activeSaver = saver;
}

/** Clears the registry only when the leaving page still owns it. */
export function clearDraftSaver(saver: DraftSaver): void {
  if (activeSaver === saver) {
    activeSaver = null;
  }
}

/**
 * Saves the draft of the current generation page. Returns false when no page
 * registered a saver or when the save failed, so the exit dialog keeps the page.
 */
export async function saveActiveDraft(): Promise<boolean> {
  if (activeSaver === null) {
    return false;
  }
  return activeSaver();
}

/** Keeps the latest save callback registered for the exit dialog. */
export function useDraftSaver(save: DraftSaver): void {
  const latest = useRef(save);
  latest.current = save;

  useEffect(() => {
    const saver = () => latest.current();
    setDraftSaver(saver);
    return () => clearDraftSaver(saver);
  }, []);
}
