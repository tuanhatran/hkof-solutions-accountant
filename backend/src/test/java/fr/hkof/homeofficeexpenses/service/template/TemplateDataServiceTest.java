package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.ExpenseLine;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.service.CompanyService;
import fr.hkof.homeofficeexpenses.service.RentConfigurationService;
import fr.hkof.homeofficeexpenses.service.SignatureService;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyDto;

class TemplateDataServiceTest {

    private static final Long COMPANY_ID = 1L;

    private CompanyService companyService;
    private SignatureService signatureService;
    private RentConfigurationService rentConfigurationService;
    private TemplateDataService service;

    @BeforeEach
    void setUp() {
        companyService = mock(CompanyService.class);
        signatureService = mock(SignatureService.class);
        rentConfigurationService = mock(RentConfigurationService.class);
        service = new TemplateDataService(companyService, signatureService, rentConfigurationService);
    }

    private Company company() {
        Company company = new Company();
        company.setId(COMPANY_ID);
        company.setName("HKOF");
        company.setSiren("000 000 000");
        company.setAddress("12 rue de la République, 75000 Paris");
        company.setManagerName("Gérant");
        company.setHomeAddress("12 rue de la République, 75000 Paris");
        company.setTotalArea(new BigDecimal("70.00"));
        company.setBusinessArea(new BigDecimal("25.00"));
        company.setIssuePlace("Paris");
        return company;
    }

    private CompanyDto companyDto() {
        return new CompanyDto(COMPANY_ID, "HKOF", "EURL", "000 000 000", "12 rue de la République",
                "Gérant", 5L, "35.71", "détail", "Paris");
    }

    private void stubExampleCompany() {
        when(companyService.list()).thenReturn(List.of(companyDto()));
        when(companyService.entity(COMPANY_ID)).thenReturn(company());
    }

    private Landlord landlord() {
        Landlord landlord = new Landlord();
        landlord.setId(1L);
        landlord.setName("Bailleur");
        landlord.setAddress("1 rue du Bail");
        return landlord;
    }

    private Tenant tenant() {
        Tenant tenant = new Tenant();
        tenant.setId(2L);
        tenant.setName("Locataire");
        tenant.setAddress("2 rue du Locataire");
        return tenant;
    }

    private Address address(String label) {
        Address address = new Address();
        address.setId(4L);
        address.setLabel(label);
        return address;
    }

    private Lease lease() {
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setLandlord(landlord());
        lease.setTenant(tenant());
        lease.setAddress(address("12 rue de la République, 75000 Paris"));
        lease.setRentExclCharges(new BigDecimal("900.00"));
        lease.setCharges(new BigDecimal("50.00"));
        return lease;
    }

    private RentReceipt rentReceipt() {
        RentReceipt receipt = new RentReceipt();
        receipt.setMonth("2026-10");
        receipt.setPeriodStart(LocalDate.of(2026, 10, 1));
        receipt.setPeriodEnd(LocalDate.of(2026, 10, 31));
        receipt.setRentExclCharges(new BigDecimal("900.00"));
        receipt.setCharges(new BigDecimal("50.00"));
        receipt.setTotal(new BigDecimal("950.00"));
        receipt.setPaymentDate(LocalDate.of(2026, 10, 5));
        receipt.setIssueDate(LocalDate.of(2026, 10, 1));
        return receipt;
    }

    @Test
    @DisplayName("Rent receipt data maps every documented variable")
    void rentReceiptData() {
        Map<String, Object> data = service.dataRentReceipt(company(), landlord(), tenant(), lease(), rentReceipt(),
                "data:image/png;base64,AAAA");

        assertThat(data).containsKeys("bailleur", "locataire", "logement", "mois_libelle", "periode", "loyer_hc",
                "charges", "total", "total_en_lettres", "date_paiement", "date_emission", "lieu", "signature");
        assertThat(data.get("mois_libelle")).isEqualTo("Octobre 2026");
        assertThat(data.get("total")).isEqualTo("950,00\u00A0€");
        assertThat(data.get("total_en_lettres")).isEqualTo("neuf cent cinquante euros");
        assertThat(data.get("lieu")).isEqualTo("Paris");
    }

    @Test
    @DisplayName("Rent receipt data tolerates a missing landlord, tenant or lease")
    void rentReceiptDataWithNulls() {
        Company company = company();
        RentReceipt receipt = rentReceipt();

        Map<String, Object> data = service.dataRentReceipt(company, null, null, null, receipt, null);

        assertThat(data.get("bailleur")).isEqualTo(Map.of("nom", "", "adresse", ""));
        assertThat(data.get("locataire")).isEqualTo(Map.of("nom", "", "adresse", ""));
        assertThat(data.get("logement")).isEqualTo(Map.of("adresse", ""));
        assertThat(data.get("signature")).isEqualTo("");
    }

    @Test
    @DisplayName("Statement data maps lines, prorata and amounts")
    void statementData() {
        ExpenseItem item = new ExpenseItem();
        item.setLabel("Gaz");
        item.setSupplier("EDF");
        ExpenseLine line = new ExpenseLine();
        line.setExpenseItem(item);
        line.setAmountInclVat(new BigDecimal("120.00"));
        line.setProRataPct(new BigDecimal("35.71"));
        line.setClaimedAmount(new BigDecimal("42.85"));
        ExpenseStatement statement = new ExpenseStatement();
        statement.setMonth("2026-10");
        statement.setNumber("NF-2026-10");
        statement.setTotal(new BigDecimal("42.85"));
        statement.setLines(List.of(line));
        when(companyService.proRataDetail(any())).thenReturn("Surface pro 25 m² / 70 m² = 35,71 %");

        Map<String, Object> data = service.dataStatement(company(), statement, true, "signature");

        assertThat(data.get("numero")).isEqualTo("NF-2026-10");
        assertThat(data.get("total")).isEqualTo("42,85\u00A0€");
        assertThat(data.get("complete")).isEqualTo(true);
        assertThat((List<?>) data.get("lignes")).hasSize(1);
        assertThat(data.get("base_prorata")).isEqualTo("Surface pro 25 m² / 70 m² = 35,71 %");
    }

    @Test
    @DisplayName("The preview example for a rent receipt uses the stored signature and example lease")
    void rentReceiptExample() {
        stubExampleCompany();
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForCompany(COMPANY_ID, null)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");
        when(rentConfigurationService.exampleLease()).thenReturn(lease());

        Map<String, Object> data = service.dataExample(TemplateType.RENT_RECEIPT);

        assertThat(data.get("signature")).isEqualTo("data:image/png;base64,AAAA");
        assertThat(data.get("loyer_hc")).isEqualTo("900,00\u00A0€");
    }

    @Test
    @DisplayName("The preview example falls back to a transparent signature and default amounts")
    void rentReceiptExampleFallbacks() {
        stubExampleCompany();
        when(signatureService.resolveForCompany(COMPANY_ID, null)).thenReturn(Optional.empty());
        when(rentConfigurationService.exampleLease()).thenReturn(null);

        Map<String, Object> data = service.dataExample(TemplateType.RENT_RECEIPT);

        assertThat((String) data.get("signature")).startsWith("data:image/png;base64,");
        assertThat(data.get("loyer_hc")).isEqualTo("900,00\u00A0€");
        assertThat(data.get("charges")).isEqualTo("50,00\u00A0€");
        assertThat(data.get("bailleur")).isEqualTo(Map.of("nom", "", "adresse", ""));
    }

    @Test
    @DisplayName("The preview example falls back to the preview signature when the stored one is blank")
    void rentReceiptExampleBlankSignature() {
        stubExampleCompany();
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForCompany(COMPANY_ID, null)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn(" ");
        when(rentConfigurationService.exampleLease()).thenReturn(null);

        Map<String, Object> data = service.dataExample(TemplateType.RENT_RECEIPT);

        assertThat((String) data.get("signature")).startsWith("data:image/png;base64,");
    }

    @Test
    @DisplayName("The preview example for a statement maps the sample lines")
    void statementExample() {
        stubExampleCompany();
        when(signatureService.resolveForCompany(COMPANY_ID, null)).thenReturn(Optional.empty());
        when(companyService.proRataDetail(any())).thenReturn("Surface pro 25 m² / 70 m² = 35,71 %");

        Map<String, Object> data = service.dataExample(TemplateType.EXPENSE_STATEMENT);

        assertThat(data.get("numero")).isEqualTo("NF-2026-10");
        assertThat(data.get("mois_libelle")).isEqualTo("Octobre 2026");
        assertThat((List<?>) data.get("lignes")).hasSize(6);
        assertThat(data.get("total")).isEqualTo("1 112,47 €");
    }

    @Test
    @DisplayName("The pro-rata detail delegates to the company service")
    void proRataDetail() {
        when(companyService.proRataDetail(any())).thenReturn("détail");
        assertThat(service.proRataDetail(company())).isEqualTo("détail");
    }
}
