package fr.hkof.homeofficeexpenses.web.dto;

import java.time.Instant;
import java.util.List;

public final class TemplateDtos {

    private TemplateDtos() {
    }

    public record ValidationReportDto(
            List<String> recognizedVariables,
            List<String> unknownVariables,
            List<String> missingVariables,
            boolean structureValid,
            List<String> errors) {
    }

    public record TemplateDto(
            Long id,
            String type,
            String name,
            int version,
            String format,
            boolean active,
            boolean builtIn,
            Instant createdAt,
            ValidationReportDto report) {
    }

    public record TemplateVariableDto(String name, String description, boolean required, String example) {
    }
}
