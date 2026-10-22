package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class NumberToWords {

    private static final String[] UNITES = {
            "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
            "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"
    };
    private static final String[] DIZAINES = {
            "", "", "vingt", "trente", "quarante", "cinquante", "soixante"
    };

    private NumberToWords() {
    }

    public static String enLettres(BigDecimal amount) {
        if (amount == null) {
            return "";
        }
        BigDecimal rounded = amount.setScale(2, RoundingMode.HALF_UP);
        boolean negatif = rounded.signum() < 0;
        rounded = rounded.abs();
        long euros = rounded.longValue();
        int centimes = rounded.subtract(BigDecimal.valueOf(euros)).movePointRight(2).intValue();

        StringBuilder result = new StringBuilder();
        if (negatif) {
            result.append("moins ");
        }
        result.append(enLettresEntier(euros));
        result.append(euros == 1 ? " euro" : " euros");
        if (centimes > 0) {
            result.append(" et ").append(enLettresEntier(centimes));
            result.append(centimes == 1 ? " centime" : " centimes");
        }
        return result.toString();
    }

    public static String enLettresEntier(long count) {
        if (count == 0) {
            return UNITES[0];
        }
        if (count < 0) {
            throw new IllegalArgumentException("Nombre négatif");
        }
        StringBuilder mots = new StringBuilder();
        long milliards = count / 1_000_000_000L;
        long millions = (count % 1_000_000_000L) / 1_000_000L;
        long milliers = (count % 1_000_000L) / 1_000L;
        long reste = count % 1_000L;

        if (milliards > 0) {
            add(mots, enLettresMilliers(milliards) + " milliard" + (milliards > 1 ? "s" : ""));
        }
        if (millions > 0) {
            add(mots, enLettresMilliers(millions) + " million" + (millions > 1 ? "s" : ""));
        }
        if (milliers > 0) {
            if (milliers == 1) {
                add(mots, "mille");
            } else {
                String base = enLettresCentaines((int) milliers);
                if (base.endsWith("cents")) {
                    base = base.substring(0, base.length() - 1);
                } else if (base.endsWith("vingts")) {
                    base = base.substring(0, base.length() - 1);
                }
                add(mots, base + " mille");
            }
        }
        if (reste > 0) {
            add(mots, enLettresCentaines((int) reste));
        }
        return mots.toString();
    }

    private static String enLettresMilliers(long count) {
        if (count == 1) {
            return "un";
        }
        return enLettresCentaines((int) count);
    }

    private static String enLettresCentaines(int count) {
        if (count < 100) {
            return enLettresDizaines(count);
        }
        int centaines = count / 100;
        int reste = count % 100;
        StringBuilder mots = new StringBuilder();
        if (centaines == 1) {
            mots.append("cent");
        } else {
            mots.append(UNITES[centaines]).append(" cent");
            if (reste == 0) {
                mots.append('s');
            }
        }
        if (reste > 0) {
            mots.append(' ').append(enLettresDizaines(reste));
        }
        return mots.toString();
    }

    private static String enLettresDizaines(int count) {
        if (count < 17) {
            return UNITES[count];
        }
        if (count < 20) {
            return "dix-" + UNITES[count - 10];
        }
        if (count < 70) {
            int dizaine = count / 10;
            int unite = count % 10;
            if (unite == 0) {
                return DIZAINES[dizaine];
            }
            if (unite == 1) {
                return DIZAINES[dizaine] + " et un";
            }
            return DIZAINES[dizaine] + "-" + UNITES[unite];
        }
        if (count < 80) {
            if (count == 71) {
                return "soixante et onze";
            }
            return "soixante-" + enLettresDizaines(count - 60);
        }
        if (count == 80) {
            return "quatre-vingts";
        }
        if (count < 100) {
            return "quatre-vingt-" + enLettresDizaines(count - 80);
        }
        throw new IllegalArgumentException("Nombre hors plage : " + count);
    }

    private static void add(StringBuilder mots, String fragment) {
        if (!mots.isEmpty()) {
            mots.append(' ');
        }
        mots.append(fragment);
    }
}
