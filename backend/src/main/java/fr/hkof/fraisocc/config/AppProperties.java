package fr.hkof.fraisocc.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String dataDir, List<String> corsAllowedOrigins, Llm llm) {

    public record Llm(String defaultUrl, String defaultModel) {
    }
}
