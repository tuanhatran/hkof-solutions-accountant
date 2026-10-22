package fr.hkof.fraisocc.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

public final class Montants {

    public static final int ECHELLE = 2;
    public static final RoundingMode ARRONDI = RoundingMode.HALF_UP;
    private static final DateTimeFormatter DATE_FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private Montants() {
    }

    public static BigDecimal decimal(String valeur, String champ, boolean positifStrict) {
        if (valeur == null || valeur.isBlank()) {
            throw new BusinessException("Le champ « " + champ + " » est obligatoire.");
        }
        String nettoye = valeur.trim()
                .replace('\u00A0', ' ')
                .replace('\u202F', ' ')
                .replace(" ", "")
                .replace("€", "")
                .replace(",", ".");
        BigDecimal resultat;
        try {
            resultat = new BigDecimal(nettoye);
        } catch (NumberFormatException ex) {
            throw new BusinessException("« " + valeur + " » n'est pas un nombre valide pour « " + champ + " ».");
        }
        if (positifStrict ? resultat.signum() <= 0 : resultat.signum() < 0) {
            throw new BusinessException("Le champ « " + champ + " » doit être "
                    + (positifStrict ? "strictement positif." : "positif ou nul."));
        }
        return resultat.setScale(ECHELLE, ARRONDI);
    }

    public static BigDecimal decimalOptionnel(String valeur, String champ) {
        if (valeur == null || valeur.isBlank()) {
            return null;
        }
        return decimal(valeur, champ, false);
    }

    public static BigDecimal pourcentage(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            throw new BusinessException("Le prorata est obligatoire.");
        }
        String nettoye = valeur.trim()
                .replace('\u00A0', ' ')
                .replace('\u202F', ' ')
                .replace(" ", "")
                .replace("%", "")
                .replace(",", ".");
        BigDecimal resultat;
        try {
            resultat = new BigDecimal(nettoye);
        } catch (NumberFormatException ex) {
            throw new BusinessException("« " + valeur + " » n'est pas un pourcentage valide.");
        }
        if (resultat.scale() > ECHELLE) {
            throw new BusinessException("Le prorata accepte au maximum deux décimales.");
        }
        if (resultat.compareTo(BigDecimal.ZERO) < 0 || resultat.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("Le prorata doit être compris entre 0 et 100 %.");
        }
        return resultat.setScale(ECHELLE, ARRONDI);
    }

    public static LocalDate dateOptionnelle(String valeur, String champ) {
        if (valeur == null || valeur.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(valeur);
        } catch (DateTimeParseException ex) {
            throw new BusinessException("La date « " + champ + " » doit être au format AAAA-MM-JJ.");
        }
    }

    public static YearMonth mois(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            throw new BusinessException("Le mois est obligatoire (format AAAA-MM).");
        }
        try {
            return YearMonth.parse(valeur.trim());
        } catch (DateTimeParseException ex) {
            throw new BusinessException("Le mois doit être au format AAAA-MM.");
        }
    }

    public static String formatEUR(BigDecimal montant) {
        if (montant == null) {
            return "";
        }
        DecimalFormatSymbols symboles = DecimalFormatSymbols.getInstance(Locale.FRANCE);
        symboles.setGroupingSeparator('\u00A0');
        symboles.setDecimalSeparator(',');
        DecimalFormat format = new DecimalFormat("#,##0.00", symboles);
        return format.format(montant.setScale(ECHELLE, ARRONDI)) + "\u00A0€";
    }

    public static String formatPourcentage(BigDecimal pct) {
        if (pct == null) {
            return "";
        }
        DecimalFormatSymbols symboles = DecimalFormatSymbols.getInstance(Locale.FRANCE);
        symboles.setDecimalSeparator(',');
        symboles.setGroupingSeparator('\u00A0');
        DecimalFormat format = new DecimalFormat("0.00", symboles);
        return format.format(pct.setScale(ECHELLE, ARRONDI)) + "\u00A0%";
    }

    public static String formatDate(LocalDate date) {
        return date == null ? "" : date.format(DATE_FR);
    }

    public static String formatMois(YearMonth mois) {
        String libelle = mois.atDay(1).format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH));
        return Character.toUpperCase(libelle.charAt(0)) + libelle.substring(1);
    }

    public static String valeurApi(BigDecimal montant) {
        return montant == null ? null : montant.setScale(ECHELLE, ARRONDI).toPlainString();
    }
}
