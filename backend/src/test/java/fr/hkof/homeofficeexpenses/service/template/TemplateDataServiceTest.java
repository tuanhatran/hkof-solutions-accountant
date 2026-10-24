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

import fr.hkof.homeofficeexpenses.domain.ExpenseItem;
import fr.hkof.homeofficeexpenses.domain.ExpenseLine;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.service.RentConfigurationService;
import fr.hkof.homeofficeexpenses.service.SettingsService;
import fr.hkof.homeofficeexpenses.service.SignatureService;

class TemplateDataServiceTest {

    private SettingsService settingsService;
    private SignatureService signatureService;
    private RentConfigurationService rentConfigurationService;
    private TemplateDataService service;

    @BeforeEach
    void setUp() {
        settingsService = mock(SettingsService.class);
        signatureService = mock(SignatureService.class);
        rentConfigurationService = mock(RentConfigurationService.class);
        service = new TemplateDataService(settingsService, signatureService, rentConfigurationService);
    }

    private Settings settings() {
        Settings settings = new Settings();
        settings.setCompanyName("HKOF");
        settings.setSiren("000 000 000");
        settings.setCompanyAddress("12 rue de la République, 75000 Paris");
        settings.setManagerName("Gérant");
        settings.setHomeAddress("12 rue de la République, 75000 Paris");
        settings.setTotalArea(new BigDecimal("70.00"));
        settings.setBusinessArea(new BigDecimal("25.00"));
        settings.setIssuePlace("Paris");
        return settings;
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

    private Lease lease() {
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setLandlord(landlord());
        lease.setTenant(tenant());
        lease.setPropertyAddress("12 rue de la République, 75000 Paris");
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
        Map<String, Object> data = service.dataRentReceipt(settings(), landlord(), tenant(), lease(), rentReceipt(),
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
        Settings settings = settings();
        RentReceipt receipt = rentReceipt();

        Map<String, Object> data = service.dataRentReceipt(settings, null, null, null, receipt, null);

        assertThat(data.get("bailleur")).isEqualTo(Map.of("nom", "", "adresse", ""));
        assertThat(data.get("locataire")).isEqualTo(Map.of("nom", "", "adresse", ""));
        assertThat(data.get("logement")).isEqualTo(Map.of("adresse", settings.getHomeAddress()));
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
        when(settingsService.proRataDetail(any(), any())).thenReturn("Surface pro 25 m² / 70 m² = 35,71 %");

        Map<String, Object> data = service.dataStatement(settings(), statement, true, "signature");

        assertThat(data.get("numero")).isEqualTo("NF-2026-10");
        assertThat(data.get("total")).isEqualTo("42,85\u00A0€");
        assertThat(data.get("complete")).isEqualTo(true);
        assertThat((List<?>) data.get("lignes")).hasSize(1);
        assertThat(data.get("base_prorata")).isEqualTo("Surface pro 25 m² / 70 m² = 35,71 %");
    }

    @Test
    @DisplayName("The preview example for a rent receipt uses the stored signature and example lease")
    void rentReceiptExample() {
        when(settingsService.entity()).thenReturn(settings());
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolve(null, SignatureType.LANDLORD)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");
        when(rentConfigurationService.exampleLease()).thenReturn(lease());

        Map<String, Object> data = service.dataExample(TemplateType.RENT_RECEIPT);

        assertThat(data.get("signature")).isEqualTo("data:image/png;base64,AAAA");
        assertThat(data.get("loyer_hc")).isEqualTo("900,00\u00A0€");
    }

    @Test
    @DisplayName("The preview example falls back to a transparent signature and default amounts")
    void rentReceiptExampleFallbacks() {
        when(settingsService.entity()).thenReturn(settings());
        when(signatureService.resolve(null, SignatureType.LANDLORD)).thenReturn(Optional.empty());
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
        when(settingsService.entity()).thenReturn(settings());
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolve(null, SignatureType.LANDLORD)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn(" ");
        when(rentConfigurationService.exampleLease()).thenReturn(null);

        Map<String, Object> data = service.dataExample(TemplateType.RENT_RECEIPT);

        assertThat((String) data.get("signature")).startsWith("data:image/png;base64,");
    }

    @Test
    @DisplayName("The preview example for a statement maps the sample lines")
    void statementExample() {
        when(settingsService.entity()).thenReturn(settings());
        when(signatureService.resolve(null, SignatureType.ENTREPRISE_CEO)).thenReturn(Optional.empty());
        when(settingsService.proRataDetail(any(), any())).thenReturn("Surface pro 25 m² / 70 m² = 35,71 %");

        Map<String, Object> data = service.dataExample(TemplateType.EXPENSE_STATEMENT);

        assertThat(data.get("numero")).isEqualTo("NF-2026-10");
        assertThat(data.get("mois_libelle")).isEqualTo("Octobre 2026");
        assertThat((List<?>) data.get("lignes")).hasSize(6);
        assertThat(data.get("total")).isEqualTo("1 112,47 €");
    }

    @Test
    @DisplayName("The pro-rata detail delegates to the settings service")
    void proRataDetail() {
        when(settingsService.proRataDetail(any(), any())).thenReturn("détail");
        assertThat(service.proRataDetail(settings())).isEqualTo("détail");
    }
}
