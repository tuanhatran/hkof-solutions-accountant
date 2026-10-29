package fr.hkof.homeofficeexpenses.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String dataDir, List<String> corsAllowedOrigins, Llm llm) {

    public record Llm(String defaultUrl, String defaultModel) {
    }

    /** Authentication settings: confirmation link target and token lifetime. */
    @ConfigurationProperties(prefix = "app.auth")
    public record Auth(String confirmationUrl, Duration confirmationTtl) {
    }
}
