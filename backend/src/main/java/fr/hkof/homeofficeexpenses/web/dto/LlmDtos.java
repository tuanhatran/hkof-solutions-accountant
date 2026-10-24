package fr.hkof.homeofficeexpenses.web.dto;

public final class LlmDtos {

    private LlmDtos() {
    }

    public record LlmConfigDto(
            boolean active,
            String supplier,
            String url,
            String model,
            int timeoutSeconds,
            String temperature,
            int numCtx,
            int maxPages,
            boolean ocrActive,
            String extractionPrompt,
            boolean apiKeyConfigured,
            boolean remoteUrl,
            String warning) {
    }

    public record LlmConfigRequest(
            Boolean active,
            String supplier,
            String url,
            String model,
            Integer timeoutSeconds,
            String temperature,
            Integer numCtx,
            Integer maxPages,
            Boolean ocrActive,
            String extractionPrompt,
            String apiKey) {
    }

    public record LlmModelDto(String name, String family, String parameters, boolean vision) {
    }

    public record DefaultPromptDto(String prompt) {
    }

    public record LlmStatusDto(
            String status,
            boolean active,
            boolean reachable,
            boolean modelAvailable,
            String message) {
    }

    public record LlmTestResponse(
            boolean success,
            long durationMs,
            String message,
            String detectedAmount) {
    }
}
