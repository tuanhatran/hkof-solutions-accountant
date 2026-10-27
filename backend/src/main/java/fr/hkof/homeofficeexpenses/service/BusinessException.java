package fr.hkof.homeofficeexpenses.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class BusinessException extends RuntimeException {

    public static final String DEFAULT_CODE = "BUSINESS_ERROR";

    private final String code;
    private final Map<String, Object> params;

    public BusinessException(String message) {
        this(DEFAULT_CODE, message);
    }

    public BusinessException(String code, String message) {
        this(code, message, Map.of());
    }

    public BusinessException(String code, String message, Map<String, Object> params) {
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
