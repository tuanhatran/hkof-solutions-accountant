import { useCallback, useEffect, useRef, useState } from "react";
import { isCancellation, errorMessage, type ResponseBlob } from "@/api/client";

interface PreviewState {
  url: string | null;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
}

interface PreviewOptions {
  debounceMs?: number;
  active?: boolean;
}

export function usePdfPreview(
  load: (signal: AbortSignal) => Promise<ResponseBlob>,
  signature: string,
  options: PreviewOptions = {},
) {
  const { debounceMs = 400, active = true } = options;
  const loadRef = useRef(load);
  loadRef.current = load;
  const [state, setState] = useState<PreviewState>({
    url: null,
    loading: false,
    error: null,
    updatedAt: null,
  });
  const urlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const nameRef = useRef<string>("apercu.pdf");
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) {
      setState((previous) =>
        previous.loading ? { ...previous, loading: false } : previous,
      );
      return;
    }
    controllerRef.current?.abort();
    const generation = ++generationRef.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    let controller: AbortController | null = null;

    const timer = window.setTimeout(async () => {
      controller = new AbortController();
      controllerRef.current = controller;
      try {
        const reply = await loadRef.current(controller.signal);
        if (controller.signal.aborted || generation !== generationRef.current) {
          return;
        }
        const url = URL.createObjectURL(reply.blob);
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        urlRef.current = url;
        blobRef.current = reply.blob;
        if (reply.fileName) {
          nameRef.current = reply.fileName;
        }
        setState({ url, loading: false, error: null, updatedAt: new Date() });
      } catch (error) {
        if (isCancellation(error) || generation !== generationRef.current) {
          return;
        }
        setState((previous) => ({
          ...previous,
          loading: false,
          error: errorMessage(error),
        }));
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [signature, active, debounceMs]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  const download = useCallback(() => {
    const blob = blobRef.current;
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nameRef.current;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, []);

  return { ...state, download };
}
