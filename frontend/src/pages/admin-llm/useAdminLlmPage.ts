import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useLlmConfig, useLlmModels } from "@/api/queries";
import type { LlmTestResponse } from "@/api/types";
import { llmSchema, type LlmFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import {
  isLocalUrl,
  isValidUrl,
  normalizeUrl,
  requestBodyFromValues,
  valuesFromConfig,
} from "./adminLlmHelpers";

/**
 * Controller for the LLM admin page: config form, model list and connection
 * test. The page component only composes the presentation.
 */
export function useAdminLlmPage() {
  const queryClient = useQueryClient();
  const config = useLlmConfig();
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [testResult, setTestResult] = useState<LlmTestResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [promptInProgress, setPromptInProgress] = useState(false);
  const modelLock = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<LlmFormValues>({
    resolver: zodResolver(llmSchema),
    mode: "onChange",
    defaultValues: valuesFromConfig(undefined),
  });

  const values = watch();
  const active = values.active;
  const removeKey = values.deleteApiKey;
  const remoteUrl = values.url.trim() !== "" && !isLocalUrl(values.url);
  const models = useLlmModels(loadedUrl);

  useEffect(() => {
    if (!config.data) {
      return;
    }
    reset(valuesFromConfig(config.data));
    const url = normalizeUrl(config.data.url ?? "");
    setSavedUrl(url);
    setLoadedUrl(url || null);
  }, [config.data, reset]);

  useEffect(() => {
    if (removeKey) {
      setValue("apiKey", "", { shouldDirty: true });
    }
  }, [removeKey, setValue]);

  useEffect(() => {
    if (models.isError) {
      setManualMode(true);
    }
  }, [models.isError]);

  const save = useMutation({
    mutationFn: (submittedValues: LlmFormValues) =>
      api.llm.update(requestBodyFromValues(submittedValues)),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.llmConfig, payload);
      const url = normalizeUrl(payload.url ?? "");
      setSavedUrl(url);
      setLoadedUrl(url || null);
      setTestResult(null);
      setTestError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatus });
      toast.success("Configuration IA enregistrée.");
    },
  });

  async function refreshModels(force = false) {
    if (modelLock.current) {
      return;
    }
    const url = normalizeUrl(values.url);
    if (!isValidUrl(url)) {
      setModelsError("URL invalide : commencez par http:// ou https://.");
      return;
    }
    setModelsError(null);
    modelLock.current = true;
    setModelsLoading(true);
    try {
      if (url !== savedUrl) {
        await api.llm.update({ url });
        setSavedUrl(url);
        void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatus });
      }
      if (url !== loadedUrl) {
        setLoadedUrl(url);
        setManualMode(false);
      } else if (force) {
        const result = await models.refetch();
        if (result.isError) {
          setModelsError(errorMessage(result.error));
        }
      }
    } catch (error) {
      setModelsError(errorMessage(error));
    } finally {
      modelLock.current = false;
      setModelsLoading(false);
    }
  }

  function onUrlBlur() {
    const url = normalizeUrl(values.url);
    if (isValidUrl(url) && url !== savedUrl) {
      void refreshModels();
    }
  }

  async function resetPrompt() {    setPromptInProgress(true);
    try {
      const reply = await api.llm.defaultPrompt();
      if (!reply.prompt) {
        toast.error("Le prompt par défaut est indisponible.");
        return;
      }
      setValue("extractionPrompt", reply.prompt, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.info("Prompt par défaut chargé. Enregistrez pour l’appliquer.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPromptInProgress(false);
    }
  }

  const runTest = handleSubmit(async (submittedValues) => {
    setTestInProgress(true);
    setTestResult(null);
    setTestError(null);
    try {
      const payload = await api.llm.update(
        requestBodyFromValues(submittedValues),
      );
      queryClient.setQueryData(queryKeys.llmConfig, payload);
      const url = normalizeUrl(payload.url ?? "");
      setSavedUrl(url);
      setLoadedUrl(url || null);
      const result = await api.llm.test();
      setTestResult(result);
      if (result.success) {
        toast.success("Test de connexion réussi.");
      } else {
        toast.error(result.message ?? "Le test de connexion a échoué.");
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.llmStatus });
    } catch (error) {
      setTestError(errorMessage(error));
    } finally {
      setTestInProgress(false);
    }
  });

  const modelOptions = useMemo(() => {
    const options = models.data ?? [];
    if (values.model && !options.some((model) => model.name === values.model)) {
      return [
        {
          name: values.model,
          family: null,
          parameters: null,
          vision: false,
          configure: true,
        },
        ...options.map((model) => ({ ...model, configure: false })),
      ];
    }
    return options.map((model) => ({ ...model, configure: false }));
  }, [models.data, values.model]);

  const selectedModel = modelOptions.find(
    (model) => model.name === values.model,
  );
  const listLoading = modelsLoading || models.isPending;

  return {
    config,
    save,
    runTest,
    refreshModels,
    onUrlBlur,
    resetPrompt,
    testInProgress,
    testResult,
    testError,
    promptInProgress,
    models,
    modelsError,
    modelsLoading,
    manualMode,
    setManualMode,
    remoteUrl,
    register,
    handleSubmit,
    setValue,
    errors,
    isDirty,
    values,
    active,
    removeKey,
    modelOptions,
    selectedModel,
    listLoading,
  };
}

export type AdminLlmController = ReturnType<typeof useAdminLlmPage>;
