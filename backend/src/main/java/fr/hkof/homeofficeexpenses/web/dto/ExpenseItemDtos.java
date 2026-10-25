package fr.hkof.homeofficeexpenses.web.dto;

public final class ExpenseItemDtos {

    private ExpenseItemDtos() {
    }

    public record ExpenseItemDto(
            Long id,
            Long companyId,
            Long leaseId,
            String code,
            String label,
            String supplier,
            String proRataPct,
            String periodicity,
            boolean active,
            int sortOrder,
            boolean multipleLinesAllowed) {
    }

    public record ExpenseItemRequest(
            Long companyId,
            Long leaseId,
            String code,
            String label,
            String supplier,
            String proRataPct,
            String periodicity,
            Boolean active,
            Integer sortOrder,
            Boolean multipleLinesAllowed) {
    }
}
