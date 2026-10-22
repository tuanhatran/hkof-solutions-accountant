package fr.hkof.homeofficeexpenses.service.template;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.service.CalculationService;
import fr.hkof.homeofficeexpenses.service.Amounts;
import fr.hkof.homeofficeexpenses.service.NumberToWords;
import fr.hkof.homeofficeexpenses.service.SettingsService;

@Service
public class TemplateDataService {

    private final SettingsService settingsService;

    public TemplateDataService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    public Map<String, Object> dataRentReceipt(Settings settings, RentReceipt rentReceipt) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("bailleur", Map.of(
                "nom", text(settings.getLandlordName()),
                "adresse", text(settings.getLandlordAddress())));
        data.put("locataire", Map.of(
                "nom", text(settings.getTenantName()),
                "adresse", text(settings.getTenantAddress())));
        data.put("logement", Map.of("adresse", text(settings.getHomeAddress())));
        data.put("mois_libelle", Amounts.formatMonth(java.time.YearMonth.parse(rentReceipt.getMonth())));
        data.put("periode", Map.of(
                "debut", Amounts.formatDate(rentReceipt.getPeriodStart()),
                "fin", Amounts.formatDate(rentReceipt.getPeriodEnd())));
        data.put("loyer_hc", Amounts.formatEUR(rentReceipt.getRentExclCharges()));
        data.put("charges", Amounts.formatEUR(rentReceipt.getCharges()));
        data.put("total", Amounts.formatEUR(rentReceipt.getTotal()));
        data.put("total_en_lettres", NumberToWords.toWords(rentReceipt.getTotal()));
        data.put("date_paiement", Amounts.formatDate(rentReceipt.getPaymentDate()));
        data.put("date_emission", Amounts.formatDate(rentReceipt.getIssueDate()));
        data.put("lieu", text(settings.getIssuePlace()));
        return data;
    }

    public Map<String, Object> dataStatement(Settings settings, ExpenseStatement statement, boolean complete) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("societe", Map.of(
                "raison_sociale", text(settings.getCompanyName()),
                "siren", text(settings.getSiren()),
                "adresse", text(settings.getCompanyAddress())));
        data.put("gerant", text(settings.getManagerName()));
        data.put("mois_libelle", Amounts.formatMonth(java.time.YearMonth.parse(statement.getMonth())));
        data.put("numero", text(statement.getNumber()));
        List<Map<String, Object>> lines = new ArrayList<>();
        for (var line : statement.getLines()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("poste", line.getExpenseItem().getLabel());
            item.put("fournisseur", text(line.getExpenseItem().getSupplier()));
            item.put("periode", period(line.getPeriodStart(), line.getPeriodEnd()));
            item.put("montant_ttc", Amounts.formatEUR(line.getAmountInclVat()));
            item.put("prorata", Amounts.formatPercentage(line.getProRataPct()));
            item.put("montant_retenu", Amounts.formatEUR(line.getClaimedAmount()));
            lines.add(item);
        }
        data.put("lignes", lines);
        data.put("total", Amounts.formatEUR(statement.getTotal()));
        data.put("total_en_lettres", NumberToWords.toWords(statement.getTotal()));
        data.put("base_prorata", proRataDetail(settings));
        data.put("date_emission", Amounts.formatDate(java.time.LocalDate.now()));
        data.put("lieu", text(settings.getIssuePlace()));
        data.put("complete", complete);
        return data;
    }

    public Map<String, Object> dataExample(fr.hkof.homeofficeexpenses.domain.TemplateType type) {
        Settings settings = settingsService.entity();
        if (type == fr.hkof.homeofficeexpenses.domain.TemplateType.RENT_RECEIPT) {
            RentReceipt rentReceipt = new RentReceipt();
            rentReceipt.setMonth("2026-10");
            rentReceipt.setPeriodStart(java.time.LocalDate.of(2026, 10, 1));
            rentReceipt.setPeriodEnd(java.time.LocalDate.of(2026, 10, 31));
            rentReceipt.setRentExclCharges(settings.getRentExclCharges() == null ? new BigDecimal("900.00") : settings.getRentExclCharges());
            rentReceipt.setCharges(settings.getChargesAdvance() == null ? new BigDecimal("50.00") : settings.getChargesAdvance());
            rentReceipt.setTotal(CalculationService.totalRentReceipt(rentReceipt.getRentExclCharges(), rentReceipt.getCharges()));
            rentReceipt.setPaymentDate(java.time.LocalDate.of(2026, 10, 5));
            rentReceipt.setIssueDate(java.time.LocalDate.of(2026, 10, 1));
            return dataRentReceipt(settings, rentReceipt);
        }
        ExpenseStatement statement = new ExpenseStatement();
        statement.setMonth("2026-10");
        statement.setNumber("NF-2026-10");
        statement.setTotal(new BigDecimal("364.96"));
        dataStatementExample(settings, statement, true);
        return dataStatementExample(settings, statement, true);
    }

    private Map<String, Object> dataStatementExample(Settings settings, ExpenseStatement statement, boolean complete) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("societe", Map.of(
                "raison_sociale", text(settings.getCompanyName()),
                "siren", text(settings.getSiren()),
                "adresse", text(settings.getCompanyAddress())));
        data.put("gerant", text(settings.getManagerName()));
        data.put("mois_libelle", "Octobre 2026");
        data.put("numero", statement.getNumber());
        List<Map<String, Object>> lines = new ArrayList<>();
        lines.add(line("Loyer", "", "01/10/2026 au 31/10/2026", "950,00 €", "100,00 %", "950,00 €"));
        lines.add(line("Gaz", "EDF", "01/09/2026 au 31/10/2026", "120,00 €", "35,71 %", "21,42 €"));
        lines.add(line("Électricité", "Primeo", "01/09/2026 au 31/10/2026", "85,00 €", "35,71 %", "15,18 €"));
        lines.add(line("Téléphone", "Opérateur", "01/10/2026 au 31/10/2026", "29,99 €", "35,71 %", "10,71 €"));
        lines.add(line("Fibre internet", "Opérateur", "01/10/2026 au 31/10/2026", "39,99 €", "35,71 %", "14,28 €"));
        lines.add(line("Assurance habitation", "Assureur", "01/10/2026 au 31/10/2026", "180,00 €", "35,71 %", "64,28 €"));
        data.put("lignes", lines);
        data.put("total", "1 075,87 €");
        data.put("total_en_lettres", "mille soixante-quinze euros et quatre-vingt-sept centimes");
        data.put("base_prorata", proRataDetail(settings));
        data.put("date_emission", Amounts.formatDate(java.time.LocalDate.now()));
        data.put("lieu", text(settings.getIssuePlace()));
        data.put("complete", complete);
        return data;
    }

    private Map<String, Object> line(String expenseItem, String supplier, String period, String amountInclVat,
            String proRata, String claimedAmount) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("poste", expenseItem);
        item.put("fournisseur", supplier);
        item.put("periode", period);
        item.put("montant_ttc", amountInclVat);
        item.put("prorata", proRata);
        item.put("montant_retenu", claimedAmount);
        return item;
    }

    private String period(java.time.LocalDate start, java.time.LocalDate end) {
        if (start == null || end == null) {
            return "";
        }
        return Amounts.formatDate(start) + " au " + Amounts.formatDate(end);
    }

    public String proRataDetail(Settings settings) {
        BigDecimal base = CalculationService.proRataBase(settings.getBusinessArea(), settings.getTotalArea());
        return settingsService.proRataDetail(settings, base);
    }

    private String text(String value) {
        return value == null ? "" : value;
    }
}
