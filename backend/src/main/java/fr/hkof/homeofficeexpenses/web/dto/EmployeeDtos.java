package fr.hkof.homeofficeexpenses.web.dto;

public final class EmployeeDtos {

    private EmployeeDtos() {
    }

    public record EmployeeRequest(
            Long companyId,
            String firstName,
            String lastName,
            String email,
            String address,
            String title,
            String issuePlace) {
    }

    public record EmployeeDto(
            Long id,
            Long companyId,
            String firstName,
            String lastName,
            String email,
            String address,
            int signatureCount,
            String title,
            String issuePlace) {
    }
}
