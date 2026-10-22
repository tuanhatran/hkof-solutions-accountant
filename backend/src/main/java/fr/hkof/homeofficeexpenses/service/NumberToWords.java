package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class NumberToWords {

    private static final String[] UNITS = {
            "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
            "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"
    };
    private static final String[] TENS = {
            "", "", "vingt", "trente", "quarante", "cinquante", "soixante"
    };

    private NumberToWords() {
    }

    public static String toWords(BigDecimal amount) {
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
        result.append(wholeToWords(euros));
        result.append(euros == 1 ? " euro" : " euros");
        if (centimes > 0) {
            result.append(" et ").append(wholeToWords(centimes));
            result.append(centimes == 1 ? " centime" : " centimes");
        }
        return result.toString();
    }

    public static String wholeToWords(long count) {
        if (count == 0) {
            return UNITS[0];
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
            add(mots, thousandsToWords(milliards) + " milliard" + (milliards > 1 ? "s" : ""));
        }
        if (millions > 0) {
            add(mots, thousandsToWords(millions) + " million" + (millions > 1 ? "s" : ""));
        }
        if (milliers > 0) {
            if (milliers == 1) {
                add(mots, "mille");
            } else {
                String base = hundredsToWords((int) milliers);
                if (base.endsWith("cents")) {
                    base = base.substring(0, base.length() - 1);
                } else if (base.endsWith("vingts")) {
                    base = base.substring(0, base.length() - 1);
                }
                add(mots, base + " mille");
            }
        }
        if (reste > 0) {
            add(mots, hundredsToWords((int) reste));
        }
        return mots.toString();
    }

    private static String thousandsToWords(long count) {
        if (count == 1) {
            return "un";
        }
        return hundredsToWords((int) count);
    }

    private static String hundredsToWords(int count) {
        if (count < 100) {
            return tensToWords(count);
        }
        int centaines = count / 100;
        int reste = count % 100;
        StringBuilder mots = new StringBuilder();
        if (centaines == 1) {
            mots.append("cent");
        } else {
            mots.append(UNITS[centaines]).append(" cent");
            if (reste == 0) {
                mots.append('s');
            }
        }
        if (reste > 0) {
            mots.append(' ').append(tensToWords(reste));
        }
        return mots.toString();
    }

    private static String tensToWords(int count) {
        if (count < 17) {
            return UNITS[count];
        }
        if (count < 20) {
            return "dix-" + UNITS[count - 10];
        }
        if (count < 70) {
            int dizaine = count / 10;
            int unite = count % 10;
            if (unite == 0) {
                return TENS[dizaine];
            }
            if (unite == 1) {
                return TENS[dizaine] + " et un";
            }
            return TENS[dizaine] + "-" + UNITS[unite];
        }
        if (count < 80) {
            if (count == 71) {
                return "soixante et onze";
            }
            return "soixante-" + tensToWords(count - 60);
        }
        if (count == 80) {
            return "quatre-vingts";
        }
        if (count < 100) {
            return "quatre-vingt-" + tensToWords(count - 80);
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
