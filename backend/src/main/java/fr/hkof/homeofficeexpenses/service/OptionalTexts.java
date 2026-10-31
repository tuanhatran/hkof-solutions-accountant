package fr.hkof.homeofficeexpenses.service;

/** Trimming and preservation rules shared by the person and company profile fields. */
final class OptionalTexts {

    private OptionalTexts() {
    }

    /** Trims a provided value; null and blank both become null. */
    static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /**
     * An omitted (null) incoming value keeps the stored one, so a client that does not know the
     * field never erases it. Any provided value replaces it, an explicit blank clearing it.
     */
    static String preserve(String incoming, String stored) {
        return incoming == null ? stored : trimToNull(incoming);
    }
}
