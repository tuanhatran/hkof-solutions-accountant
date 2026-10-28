package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.AmountSource;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.ReceiptRepository;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineDto;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

class ExpenseStatementLineCalculatorTest {

    private static final Long COMPANY_ID = 1L;

    private ExpenseItemService expenseItemService;
    private ReceiptService receiptService;
    private ExpenseStatementLineCalculator calculator;

    @BeforeEach
    void setUp() {
        expenseItemService = mock(ExpenseItemService.class);
        receiptService = mock(ReceiptService.class);
        calculator = new ExpenseStatementLineCalculator(expenseItemService, receiptService);
    }

    private ExpenseItem item(String code, String label, int sortOrder, boolean multiple) {
        ExpenseItem item = new ExpenseItem();
        item.setId((long) sortOrder);
        item.setCode(code);
        item.setLabel(label);
        item.setSupplier("Fournisseur");
        item.setProRataPct(new BigDecimal("35.71"));
        item.setSortOrder(sortOrder);
        item.setMultipleLinesAllowed(multiple);
        return item;
    }

    private ExpenseLineRequest request(String code, String amount, String proRata) {
        return new ExpenseLineRequest(code, amount, proRata, null, null, null, null);
    }

    @Test
    @DisplayName("No request produces no line")
    void emptyRequests() {
        assertThat(calculator.calculateLines(COMPANY_ID, null, null)).isEmpty();
        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of())).isEmpty();
    }

    @Test
    @DisplayName("A missing item code is rejected in French")
    void itemCodeRequired() {
        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(request(null, "10", "50"))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le type de frais est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("EXPENSE_ITEM_REQUIRED"));
        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(request(" ", "10", "50"))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le type de frais est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("EXPENSE_ITEM_REQUIRED"));
    }

    @Test
    @DisplayName("A single-use item cannot be added twice but a multi-line one can")
    void duplicateItems() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));
        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(
                request("gaz", "10", "50"), request("gaz", "20", "50"))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le type « Gaz » ne peut être ajouté qu'une fois.")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("EXPENSE_ITEM_SINGLE_USE");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("label", "Gaz");
                });

        when(expenseItemService.entity(COMPANY_ID, null, "peage")).thenReturn(item("peage", "Péage", 30, true));
        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                request("peage", "10", "50"), request("peage", "20", "50")))).hasSize(2);
    }

    @Test
    @DisplayName("The item of the selected lease backs every line of that lease")
    void resolvesSelectedLeaseItem() {
        when(expenseItemService.entity(COMPANY_ID, 4L, "loyer"))
                .thenReturn(item("loyer", "Loyer du bail 4", 10, false));

        List<CalculatedLine> lines = calculator.calculateLines(COMPANY_ID, 4L, List.of(
                request("loyer", "100", "100")));

        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).expenseItem().getLabel()).isEqualTo("Loyer du bail 4");
        verify(expenseItemService).entity(COMPANY_ID, 4L, "loyer");
    }

    @Test
    @DisplayName("Amounts and pro-rata go through the shared parsers")
    void invalidAmounts() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));

        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(request("gaz", "-1", "50"))))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("AMOUNT_MUST_BE_STRICTLY_POSITIVE"));
        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(request("gaz", "10", "101"))))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("PRO_RATA_OUT_OF_RANGE"));
    }

    @Test
    @DisplayName("A receipt is resolved only when an identifier is given")
    void receiptResolution() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));
        Receipt receipt = new Receipt();
        receipt.setId(5L);
        receipt.setFileName("facture.pdf");
        when(receiptService.entity(5L)).thenReturn(receipt);

        List<CalculatedLine> lines = calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", 5L, "manual", null, null)));

        assertThat(lines.get(0).receipt()).isSameAs(receipt);
    }

    @Test
    @DisplayName("The amount source defaults to manual and accepts case-insensitive values")
    void amountSources() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));

        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, null, null, null))).get(0).source())
                .isEqualTo(AmountSource.MANUAL);
        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, " ", null, null))).get(0).source())
                .isEqualTo(AmountSource.MANUAL);
        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, "ai", null, null))).get(0).source())
                .isEqualTo(AmountSource.AI);
    }

    @Test
    @DisplayName("An invalid amount source is rejected in French")
    void invalidSource() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));
        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, "magique", null, null))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Source de montant invalide : magique")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("STATEMENT_AMOUNT_SOURCE_INVALID");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("source", "magique");
                });
    }

    @Test
    @DisplayName("AI confidence is optional, normalized and validated")
    void confidence() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));

        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, null, "12.00", null))).get(0).confidence())
                .isNull();
        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, null, "12.00", " "))).get(0).confidence())
                .isNull();
        assertThat(calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, null, "12.00", " HAUTE "))).get(0).confidence())
                .isEqualTo("haute");
        assertThatThrownBy(() -> calculator.calculateLines(COMPANY_ID, null, List.of(
                new ExpenseLineRequest("gaz", "10", "50", null, null, "12.00", "certaine"))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Niveau de confiance IA invalide : certaine")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("STATEMENT_AI_CONFIDENCE_INVALID");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("confidence", "certaine");
                });
    }

    @Test
    @DisplayName("Lines are sorted by configured display order")
    void sortsBySortOrder() {
        when(expenseItemService.entity(COMPANY_ID, null, "gaz")).thenReturn(item("gaz", "Gaz", 20, false));
        when(expenseItemService.entity(COMPANY_ID, null, "loyer")).thenReturn(item("loyer", "Loyer", 10, false));

        List<CalculatedLine> lines = calculator.calculateLines(COMPANY_ID, null, List.of(
                request("gaz", "10", "50"), request("loyer", "20", "100")));

        assertThat(lines).extracting(line -> line.expenseItem().getCode()).containsExactly("loyer", "gaz");
    }

    @Test
    @DisplayName("Mapping a line exposes null receipt fields when there is no receipt")
    void toDto() {
        ExpenseItem item = item("gaz", "Gaz", 20, false);
        CalculatedLine line = new CalculatedLine(item, new BigDecimal("10.00"), new BigDecimal("10.00"),
                new BigDecimal("50.00"), new BigDecimal("5.00"), null, AmountSource.MANUAL, null, "haute");

        ExpenseLineDto dto = calculator.toDto(line);

        assertThat(dto.itemCode()).isEqualTo("gaz");
        assertThat(dto.receiptId()).isNull();
        assertThat(dto.receiptName()).isNull();
        assertThat(dto.aiConfidence()).isEqualTo("haute");
    }
}
