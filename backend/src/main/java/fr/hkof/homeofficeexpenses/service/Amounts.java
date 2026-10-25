package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

public final class Amounts {

    public static final int SCALE = 2;
    public static final RoundingMode ROUND = RoundingMode.HALF_UP;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private Amounts() {
    }

    public static BigDecimal decimal(String value, String field, boolean strictlyPositive) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Le champ « " + field + " » est obligatoire.");
        }
        String normalized = value.trim()
                .replace('\u00A0', ' ')
                .replace('\u202F', ' ')
                .replace(" ", "")
                .replace("€", "")
                .replace(",", ".");
        BigDecimal result;
        try {
            result = new BigDecimal(normalized);
        } catch (NumberFormatException ex) {
            throw new BusinessException("« " + value + " » n'est pas un nombre valide pour « " + field + " ».");
        }
        if (strictlyPositive ? result.signum() <= 0 : result.signum() < 0) {
            throw new BusinessException("Le champ « " + field + " » doit être "
                    + (strictlyPositive ? "strictement positif." : "positif ou nul."));
        }
        return result.setScale(SCALE, ROUND);
    }

    public static BigDecimal optionalDecimal(String value, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return decimal(value, field, false);
    }

    public static BigDecimal percentage(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Le prorata est obligatoire.");
        }
        String normalized = value.trim()
                .replace('\u00A0', ' ')
                .replace('\u202F', ' ')
                .replace(" ", "")
                .replace("%", "")
                .replace(",", ".");
        BigDecimal result;
        try {
            result = new BigDecimal(normalized);
        } catch (NumberFormatException ex) {
            throw new BusinessException("« " + value + " » n'est pas un pourcentage valide.");
        }
        if (result.scale() > SCALE) {
            throw new BusinessException("Le prorata accepte au maximum deux décimales.");
        }
        if (result.compareTo(BigDecimal.ZERO) < 0 || result.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("Le prorata doit être compris entre 0 et 100 %.");
        }
        return result.setScale(SCALE, ROUND);
    }

    public static LocalDate optionalDate(String value, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new BusinessException("La date « " + field + " » doit être au format AAAA-MM-JJ.");
        }
    }

    public static YearMonth month(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Le mois est obligatoire (format AAAA-MM).");
        }
        try {
            return YearMonth.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new BusinessException("Le mois doit être au format AAAA-MM.");
        }
    }

    public static String formatEUR(BigDecimal amount) {
        if (amount == null) {
            return "";
        }
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance(Locale.FRANCE);
        symbols.setGroupingSeparator('\u00A0');
        symbols.setDecimalSeparator(',');
        DecimalFormat format = new DecimalFormat("#,##0.00", symbols);
        return format.format(amount.setScale(SCALE, ROUND)) + "\u00A0€";
    }

    public static String formatPercentage(BigDecimal pct) {
        if (pct == null) {
            return "";
        }
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance(Locale.FRANCE);
        symbols.setDecimalSeparator(',');
        symbols.setGroupingSeparator('\u00A0');
        DecimalFormat format = new DecimalFormat("0.00", symbols);
        return format.format(pct.setScale(SCALE, ROUND)) + "\u00A0%";
    }

    public static String formatDate(LocalDate date) {
        return date == null ? "" : date.format(DATE_FORMAT);
    }

    public static String formatMonth(YearMonth month) {
        String label = month.atDay(1).format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH));
        return Character.toUpperCase(label.charAt(0)) + label.substring(1);
    }

    public static String apiValue(BigDecimal amount) {
        return amount == null ? null : amount.setScale(SCALE, ROUND).toPlainString();
    }

    /**
     * Readable French detail of a pro-rata base computed from dwelling surfaces; shared by the
     * company and lease services so the formatting is never duplicated.
     */
    public static String proRataDetail(BigDecimal businessArea, BigDecimal totalArea, BigDecimal base) {
        if (businessArea == null || totalArea == null) {
            return "Surfaces non configurées";
        }
        return "Surface pro %s m² / %s m² = %s".formatted(
                apiValue(businessArea).replace(".", ","),
                apiValue(totalArea).replace(".", ","),
                formatPercentage(base));
    }
}
