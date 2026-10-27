package fr.hkof.homeofficeexpenses.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class NotFoundException extends RuntimeException {

    public static final String DEFAULT_CODE = "RESOURCE_NOT_FOUND";

    private final String code;
    private final Map<String, Object> params;

    public NotFoundException(String message) {
        this(DEFAULT_CODE, message);
    }

    public NotFoundException(String code, String message) {
        this(code, message, Map.of());
    }

    public NotFoundException(String code, String message, Map<String, Object> params) {
        super(message);
        this.code = code;
        this.params = params == null || params.isEmpty()
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(params));
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
