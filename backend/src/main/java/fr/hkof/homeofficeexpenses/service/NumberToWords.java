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
        boolean negative = rounded.signum() < 0;
        rounded = rounded.abs();
        long euros = rounded.longValue();
        int cents = rounded.subtract(BigDecimal.valueOf(euros)).movePointRight(2).intValue();

        StringBuilder result = new StringBuilder();
        if (negative) {
            result.append("moins ");
        }
        result.append(wholeToWords(euros));
        result.append(euros == 1 ? " euro" : " euros");
        if (cents > 0) {
            result.append(" et ").append(wholeToWords(cents));
            result.append(cents == 1 ? " centime" : " centimes");
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
        StringBuilder words = new StringBuilder();
        long billions = count / 1_000_000_000L;
        long millions = (count % 1_000_000_000L) / 1_000_000L;
        long thousands = (count % 1_000_000L) / 1_000L;
        long remainder = count % 1_000L;

        if (billions > 0) {
            add(words, thousandsToWords(billions) + " milliard" + (billions > 1 ? "s" : ""));
        }
        if (millions > 0) {
            add(words, thousandsToWords(millions) + " million" + (millions > 1 ? "s" : ""));
        }
        if (thousands > 0) {
            if (thousands == 1) {
                add(words, "mille");
            } else {
                String base = hundredsToWords((int) thousands);
                if (base.endsWith("cents")) {
                    base = base.substring(0, base.length() - 1);
                } else if (base.endsWith("vingts")) {
                    base = base.substring(0, base.length() - 1);
                }
                add(words, base + " mille");
            }
        }
        if (remainder > 0) {
            add(words, hundredsToWords((int) remainder));
        }
        return words.toString();
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
        int hundreds = count / 100;
        int remainder = count % 100;
        StringBuilder words = new StringBuilder();
        if (hundreds == 1) {
            words.append("cent");
        } else {
            words.append(UNITS[hundreds]).append(" cent");
            if (remainder == 0) {
                words.append('s');
            }
        }
        if (remainder > 0) {
            words.append(' ').append(tensToWords(remainder));
        }
        return words.toString();
    }

    private static String tensToWords(int count) {
        if (count < 17) {
            return UNITS[count];
        }
        if (count < 20) {
            return "dix-" + UNITS[count - 10];
        }
        if (count < 70) {
            int tens = count / 10;
            int unit = count % 10;
            if (unit == 0) {
                return TENS[tens];
            }
            if (unit == 1) {
                return TENS[tens] + " et un";
            }
            return TENS[tens] + "-" + UNITS[unit];
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

    private static void add(StringBuilder words, String fragment) {
        if (!words.isEmpty()) {
            words.append(' ');
        }
        words.append(fragment);
    }
}
