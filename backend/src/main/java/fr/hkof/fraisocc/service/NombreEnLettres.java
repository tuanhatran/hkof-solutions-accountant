package fr.hkof.fraisocc.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class NombreEnLettres {

    private static final String[] UNITES = {
            "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
            "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"
    };
    private static final String[] DIZAINES = {
            "", "", "vingt", "trente", "quarante", "cinquante", "soixante"
    };

    private NombreEnLettres() {
    }

    public static String enLettres(BigDecimal montant) {
        if (montant == null) {
            return "";
        }
        BigDecimal arrondi = montant.setScale(2, RoundingMode.HALF_UP);
        boolean negatif = arrondi.signum() < 0;
        arrondi = arrondi.abs();
        long euros = arrondi.longValue();
        int centimes = arrondi.subtract(BigDecimal.valueOf(euros)).movePointRight(2).intValue();

        StringBuilder resultat = new StringBuilder();
        if (negatif) {
            resultat.append("moins ");
        }
        resultat.append(enLettresEntier(euros));
        resultat.append(euros == 1 ? " euro" : " euros");
        if (centimes > 0) {
            resultat.append(" et ").append(enLettresEntier(centimes));
            resultat.append(centimes == 1 ? " centime" : " centimes");
        }
        return resultat.toString();
    }

    public static String enLettresEntier(long nombre) {
        if (nombre == 0) {
            return UNITES[0];
        }
        if (nombre < 0) {
            throw new IllegalArgumentException("Nombre négatif");
        }
        StringBuilder mots = new StringBuilder();
        long milliards = nombre / 1_000_000_000L;
        long millions = (nombre % 1_000_000_000L) / 1_000_000L;
        long milliers = (nombre % 1_000_000L) / 1_000L;
        long reste = nombre % 1_000L;

        if (milliards > 0) {
            ajouter(mots, enLettresMilliers(milliards) + " milliard" + (milliards > 1 ? "s" : ""));
        }
        if (millions > 0) {
            ajouter(mots, enLettresMilliers(millions) + " million" + (millions > 1 ? "s" : ""));
        }
        if (milliers > 0) {
            if (milliers == 1) {
                ajouter(mots, "mille");
            } else {
                String base = enLettresCentaines((int) milliers);
                if (base.endsWith("cents")) {
                    base = base.substring(0, base.length() - 1);
                } else if (base.endsWith("vingts")) {
                    base = base.substring(0, base.length() - 1);
                }
                ajouter(mots, base + " mille");
            }
        }
        if (reste > 0) {
            ajouter(mots, enLettresCentaines((int) reste));
        }
        return mots.toString();
    }

    private static String enLettresMilliers(long nombre) {
        if (nombre == 1) {
            return "un";
        }
        return enLettresCentaines((int) nombre);
    }

    private static String enLettresCentaines(int nombre) {
        if (nombre < 100) {
            return enLettresDizaines(nombre);
        }
        int centaines = nombre / 100;
        int reste = nombre % 100;
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

    private static String enLettresDizaines(int nombre) {
        if (nombre < 17) {
            return UNITES[nombre];
        }
        if (nombre < 20) {
            return "dix-" + UNITES[nombre - 10];
        }
        if (nombre < 70) {
            int dizaine = nombre / 10;
            int unite = nombre % 10;
            if (unite == 0) {
                return DIZAINES[dizaine];
            }
            if (unite == 1) {
                return DIZAINES[dizaine] + " et un";
            }
            return DIZAINES[dizaine] + "-" + UNITES[unite];
        }
        if (nombre < 80) {
            if (nombre == 71) {
                return "soixante et onze";
            }
            return "soixante-" + enLettresDizaines(nombre - 60);
        }
        if (nombre == 80) {
            return "quatre-vingts";
        }
        if (nombre < 100) {
            return "quatre-vingt-" + enLettresDizaines(nombre - 80);
        }
        throw new IllegalArgumentException("Nombre hors plage : " + nombre);
    }

    private static void ajouter(StringBuilder mots, String fragment) {
        if (!mots.isEmpty()) {
            mots.append(' ');
        }
        mots.append(fragment);
    }
}
