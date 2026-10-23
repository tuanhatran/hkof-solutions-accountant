package fr.hkof.homeofficeexpenses.service.llm;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import fr.hkof.homeofficeexpenses.service.CalculationService;

/**
 * Deterministic TTC resolver. It scans total-labelled lines and checks whether
 * two printed amounts form an HT/TTC pair for a known French VAT rate. The LLM
 * never owns the final amount when the document itself proves the TTC.
 */
public final class TotalAmountResolver {

    private static final int MAX_LINES = 400;
    private static final int MAX_EXCERPT = 500;

    private static final List<BigDecimal> VAT_RATES = List.of(
            new BigDecimal("5.5"), new BigDecimal("10"), new BigDecimal("20"));

    private static final List<String> TOTAL_LABELS = List.of(
            "total a payer", "net a payer", "montant a payer", "montant total",
            "total ttc", "total aupres", "total facture", "total de la facture");

    private static final List<String> REJECTED_LABELS = List.of(
            "total ht", "total hors taxe", "total tva", "solde", "cumul");

    /**
     * An amount is a group of digits with optional space thousand separators and
     * exactly two decimals. The lookbehind refuses to start inside a longer number
     * and the greedy thousand group keeps the whole spaced number together.
     */
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?<![\\d.,])\\d{1,3}(?:[ \\u00A0\\u202F]\\d{3})*[.,]\\d{2}(?!\\d)");

    private TotalAmountResolver() {
    }

    public record Resolution(String ttc, String ht, String excerpt) {
    }

    private record LabelledLine(String line, List<BigDecimal> amounts) {
    }

    /**
     * Resolves the unique TTC candidate found on total-labelled lines.
     *
     * @return the resolution, or {@code null} when there is no unique candidate
     */
    public static Resolution resolve(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        List<LabelledLine> labelledLines = new ArrayList<>();
        text.lines().limit(MAX_LINES).forEach(line -> {
            if (!isTotalLine(line)) {
                return;
            }
            List<BigDecimal> amounts = amounts(line);
            if (!amounts.isEmpty()) {
                labelledLines.add(new LabelledLine(line, amounts));
            }
        });

        Map<String, Resolution> pairs = new LinkedHashMap<>();
        for (LabelledLine labelled : labelledLines) {
            if (labelled.amounts().size() < 2) {
                continue;
            }
            String excerpt = excerpt(labelled.line());
            for (int i = 0; i < labelled.amounts().size(); i++) {
                for (int j = 0; j < labelled.amounts().size(); j++) {
                    if (i == j) {
                        continue;
                    }
                    BigDecimal net = labelled.amounts().get(i);
                    BigDecimal gross = labelled.amounts().get(j);
                    for (BigDecimal rate : VAT_RATES) {
                        if (CalculationService.grossFromNet(net, rate).compareTo(gross) == 0) {
                            String ttc = format(gross);
                            String ht = format(net);
                            pairs.putIfAbsent(ttc + "|" + ht, new Resolution(ttc, ht, excerpt));
                        }
                    }
                }
            }
        }
        if (pairs.size() == 1) {
            return pairs.values().iterator().next();
        }
        if (pairs.size() > 1) {
            return null;
        }

        Map<String, Resolution> singles = new LinkedHashMap<>();
        for (LabelledLine labelled : labelledLines) {
            if (labelled.amounts().size() != 1) {
                continue;
            }
            String ttc = format(labelled.amounts().get(0));
            singles.putIfAbsent(ttc, new Resolution(ttc, null, excerpt(labelled.line())));
        }
        return singles.size() == 1 ? singles.values().iterator().next() : null;
    }

    private static boolean isTotalLine(String line) {
        String normalized = normalize(line);
        if (REJECTED_LABELS.stream().anyMatch(normalized::contains)) {
            return false;
        }
        return TOTAL_LABELS.stream().anyMatch(normalized::contains);
    }

    private static String normalize(String line) {
        return Normalizer.normalize(line, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('\u00A0', ' ')
                .replace('\u202F', ' ')
                .toLowerCase(Locale.ROOT);
    }

    private static List<BigDecimal> amounts(String line) {
        List<BigDecimal> amounts = new ArrayList<>();
        Matcher matcher = AMOUNT_PATTERN.matcher(line);
        while (matcher.find()) {
            String raw = matcher.group()
                    .replace(" ", "")
                    .replace("\u00A0", "")
                    .replace("\u202F", "")
                    .replace(',', '.');
            amounts.add(new BigDecimal(raw));
        }
        return amounts;
    }

    private static String format(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String excerpt(String line) {
        String stripped = line.strip();
        return stripped.length() > MAX_EXCERPT ? stripped.substring(0, MAX_EXCERPT) : stripped;
    }
}
