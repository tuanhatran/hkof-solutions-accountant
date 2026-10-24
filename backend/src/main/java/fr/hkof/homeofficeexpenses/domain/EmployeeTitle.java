package fr.hkof.homeofficeexpenses.domain;

/**
 * Descriptive employee title. It grants no right until the deferred RBAC task is
 * implemented; see {@code product_prompt.md}.
 */
public enum EmployeeTitle {
    CEO,
    CFO,
    ACCOUNTANT,
    EMPLOYEE
}
