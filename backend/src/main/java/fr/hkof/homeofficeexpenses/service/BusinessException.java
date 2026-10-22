package fr.hkof.homeofficeexpenses.service;

public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
