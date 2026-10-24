package fr.hkof.homeofficeexpenses.web.dto;

public final class EmployeeDtos {

    private EmployeeDtos() {
    }

    public record EmployeeRequest(
            Long companyId,
            String firstName,
            String lastName,
            String email,
            String title) {
    }

    public record EmployeeDto(
            Long id,
            Long companyId,
            String firstName,
            String lastName,
            String email,
            String title) {
    }
}
