package fr.hkof.homeofficeexpenses.service.template;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import com.samskivert.mustache.Mustache;

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.ValidationReportDto;

/**
 * Validates template content: variable discovery against the catalog and the security
 * checks that keep user templates logic-less and self-contained.
 */
class TemplateValidator {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([#\\^/!]?)\\s*([^{}]+?)\\s*\\}\\}");
    private static final List<String> FORBIDDEN_TAGS = List.of("script", "iframe", "object", "embed", "form", "base");
    private static final Pattern REMOTE_CSS_URL = Pattern.compile("url\\(\\s*['\"]?\\s*(https?:|//|file:)", Pattern.CASE_INSENSITIVE);

    ValidationReportDto validate(TemplateType type, String content) {
        List<String> recognized = new ArrayList<>();
        List<String> unknown = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Set<String> allowed = TemplateCatalog.allowedNames(type);
        Set<String> requires = TemplateCatalog.requiredNames(type);
        Set<String> presentVariables = new TreeSet<>();

        Matcher matcher = VARIABLE.matcher(content);
        Deque<String> sections = new ArrayDeque<>();
        while (matcher.find()) {
            String prefix = matcher.group(1);
            String name = matcher.group(2).trim();
            if ("!".equals(prefix)) {
                continue;
            }
            if ("/".equals(prefix)) {
                if (!sections.isEmpty() && sections.peek().equals(name)) {
                    sections.pop();
                }
                continue;
            }
            String canonical = name;
            if (!allowed.contains(canonical)) {
                for (String section : sections) {
                    if (allowed.contains(section + "." + name)) {
                        canonical = section + "." + name;
                        break;
                    }
                }
            }
            if (!allowed.contains(canonical)) {
                if (!unknown.contains(name)) {
                    unknown.add(name);
                }
                continue;
            }
            presentVariables.add(canonical);
            if (!recognized.contains(canonical)) {
                recognized.add(canonical);
            }
            if ("#".equals(prefix) && isSection(allowed, name)) {
                sections.push(name);
            }
        }
        for (String required : requires) {
            if (!presentVariables.contains(required)) {
                missing.add(required);
            }
        }

        errors.addAll(checkSecurity(content));
        try {
            Mustache.compiler().compile(content);
        } catch (RuntimeException ex) {
            errors.add("Structure Mustache invalide : " + ex.getMessage());
        }
        if (!unknown.isEmpty()) {
            errors.add("Variables inconnues : " + String.join(", ", unknown));
        }
        return new ValidationReportDto(recognized, unknown, missing, errors.isEmpty(), errors);
    }

    private static boolean isSection(Set<String> allowed, String name) {
        return allowed.stream().anyMatch(variable -> variable.startsWith(name + "."));
    }

    private List<String> checkSecurity(String content) {
        List<String> errors = new ArrayList<>();
        String lowercaseContent = content.toLowerCase(Locale.ROOT);
        if (lowercaseContent.contains("{{{") || lowercaseContent.contains("{{&")) {
            errors.add("Les expressions non échappées ({{{...}}} ou {{&...}}) sont interdites.");
        }
        if (lowercaseContent.contains("#{") || lowercaseContent.contains("<%")) {
            errors.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
        }
        if (lowercaseContent.contains("javascript:")) {
            errors.add("Les liens JavaScript sont interdits.");
        }
        if (REMOTE_CSS_URL.matcher(content).find()) {
            errors.add("Les ressources distantes sont interdites.");
        }
        Document document = Jsoup.parse(content);
        for (String tag : FORBIDDEN_TAGS) {
            if (!document.select(tag).isEmpty()) {
                errors.add("La balise <" + tag + "> est interdite.");
            }
        }
        for (Element element : document.getAllElements()) {
            for (Attribute attribute : element.attributes()) {
                String key = attribute.getKey().toLowerCase(Locale.ROOT);
                String value = attribute.getValue().toLowerCase(Locale.ROOT).trim();
                if (key.startsWith("on")) {
                    errors.add("Les attributs d'événement (« " + key + " ») sont interdits.");
                }
                if (key.startsWith("th:") || key.startsWith("data-th-")) {
                    errors.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
                }
                if (key.equals("href") && !value.startsWith("#")) {
                    errors.add("Les liens externes sont interdits dans un template.");
                }
                if (key.equals("src") || key.equals("data")) {
                    boolean embeddedImage = value.startsWith("data:image/")
                            || (key.equals("src") && "{{signature}}".equals(value.trim()));
                    if (!embeddedImage) {
                        errors.add("Les images doivent être intégrées en data URI.");
                    }
                }
            }
        }
        return errors.stream().distinct().toList();
    }
}
