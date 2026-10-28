package fr.hkof.homeofficeexpenses.service.template;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.ExpenseStatement;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.service.Amounts;
import fr.hkof.homeofficeexpenses.service.CalculationService;
import fr.hkof.homeofficeexpenses.service.CompanyService;
import fr.hkof.homeofficeexpenses.service.EmployeeService;
import fr.hkof.homeofficeexpenses.service.LeaseService;
import fr.hkof.homeofficeexpenses.service.NumberToWords;
import fr.hkof.homeofficeexpenses.service.SignatureService;

@Service
public class TemplateDataService {

    /**
     * Preview-only fallback for the admin template preview: a 1x1 transparent PNG so the
     * rendered document always contains an image even when no signature is configured.
     */
    private static final String PREVIEW_SIGNATURE =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";

    private final CompanyService companyService;
    private final SignatureService signatureService;
    private final LeaseService leaseService;
    private final EmployeeService employeeService;

    public TemplateDataService(CompanyService companyService, SignatureService signatureService,
            LeaseService leaseService, EmployeeService employeeService) {
        this.companyService = companyService;
        this.signatureService = signatureService;
        this.leaseService = leaseService;
        this.employeeService = employeeService;
    }

    public Map<String, Object> dataRentReceipt(Company company, Person landlord, Person tenant, Company tenantCompany,
            Lease lease, RentReceipt rentReceipt, String signature) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("bailleur", Map.of(
                "nom", landlord == null ? "" : text(landlord.getName()),
                "adresse", landlord == null ? "" : text(landlord.getAddress())));
        data.put("locataire", Map.of(
                "nom", tenant != null ? text(tenant.getName())
                        : tenantCompany != null ? text(tenantCompany.getName()) : "",
                "adresse", tenant != null ? text(tenant.getAddress())
                        : tenantCompany != null ? text(tenantCompany.getAddress()) : ""));
        data.put("logement", Map.of(
                "adresse", lease == null || lease.getAddress() == null ? "" : text(lease.getAddress().getLabel())));
        data.put("mois_libelle", Amounts.formatMonth(YearMonth.parse(rentReceipt.getMonth())));
        data.put("periode", Map.of(
                "debut", Amounts.formatDate(rentReceipt.getPeriodStart()),
                "fin", Amounts.formatDate(rentReceipt.getPeriodEnd())));
        data.put("loyer_hc", Amounts.formatEUR(rentReceipt.getRentExclCharges()));
        data.put("charges", Amounts.formatEUR(rentReceipt.getCharges()));
        data.put("charges_supplementaires", additionalCharges(rentReceipt));
        data.put("total", Amounts.formatEUR(rentReceipt.getTotal()));
        data.put("total_en_lettres", NumberToWords.toWords(rentReceipt.getTotal()));
        data.put("date_paiement", Amounts.formatDate(rentReceipt.getPaymentDate()));
        data.put("date_emission", Amounts.formatDate(rentReceipt.getIssueDate()));
        data.put("lieu", rentReceiptIssuePlace(company, landlord));
        data.put("signature", text(signature));
        return data;
    }

    /**
     * The landlord issue place wins, then the lease company issue place, then an empty
     * string so a person lease without any company still renders "Fait à".
     */
    private String rentReceiptIssuePlace(Company company, Person landlord) {
        String landlordPlace = landlord == null ? null : landlord.getIssuePlace();
        if (landlordPlace != null && !landlordPlace.isBlank()) {
            return landlordPlace.trim();
        }
        return company == null ? "" : text(company.getIssuePlace());
    }

    /**
     * The first CEO employee place wins, then the company place. The fallback keeps a
     * statement printable when no CEO place is configured.
     */
    private String statementIssuePlace(Company company) {
        String ceoPlace = company == null ? null
                : employeeService.ceoIssuePlace(company.getId()).orElse(null);
        if (ceoPlace != null && !ceoPlace.isBlank()) {
            return ceoPlace.trim();
        }
        return company == null ? "" : text(company.getIssuePlace());
    }

    private List<Map<String, Object>> additionalCharges(RentReceipt rentReceipt) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (var charge : rentReceipt.getAdditionalCharges()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("libelle", text(charge.getLabel()));
            row.put("montant", Amounts.formatEUR(charge.getAmount()));
            rows.add(row);
        }
        return rows;
    }

    public Map<String, Object> dataStatement(Company company, ExpenseStatement statement, boolean complete,
            String signature) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("societe", Map.of(
                "raison_sociale", text(company.getName()),
                "siren", text(company.getSiren()),
                "adresse", text(company.getAddress())));
        data.put("gerant", text(company.getManagerName()));
        data.put("mois_libelle", Amounts.formatMonth(YearMonth.parse(statement.getMonth())));
        data.put("numero", text(statement.getNumber()));
        List<Map<String, Object>> lines = new ArrayList<>();
        for (var line : statement.getLines()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("poste", line.getExpenseItem().getLabel());
            item.put("fournisseur", text(line.getExpenseItem().getSupplier()));
            item.put("periode", statementPeriod(statement.getMonth()));
            item.put("montant_ttc", Amounts.formatEUR(line.getAmountInclVat()));
            item.put("prorata", Amounts.formatPercentage(line.getProRataPct()));
            item.put("montant_retenu", Amounts.formatEUR(line.getClaimedAmount()));
            lines.add(item);
        }
        data.put("lignes", lines);
        data.put("total", Amounts.formatEUR(statement.getTotal()));
        data.put("total_en_lettres", NumberToWords.toWords(statement.getTotal()));
        data.put("base_prorata", statementProRataDetail(company, statement));
        data.put("date_emission", Amounts.formatDate(LocalDate.now()));
        data.put("lieu", statementIssuePlace(company));
        data.put("complete", complete);
        data.put("signature", text(signature));
        return data;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dataExample(TemplateType type) {
        Company company = companyService.list().isEmpty()
                ? new Company()
                : companyService.entity(companyService.list().get(0).id());
        String signature = signatureService.resolveForCompanyCeo(company.getId(), null)
                .map(stored -> signatureService.dataUri(stored.getId()))
                .orElse(null);
        String effectiveSignature = signature == null || signature.isBlank() ? PREVIEW_SIGNATURE : signature;
        if (type == TemplateType.RENT_RECEIPT) {
            Lease lease = leaseService.exampleLease();
            RentReceipt rentReceipt = new RentReceipt();
            rentReceipt.setMonth("2026-10");
            rentReceipt.setPeriodStart(LocalDate.of(2026, 10, 1));
            rentReceipt.setPeriodEnd(LocalDate.of(2026, 10, 31));
            rentReceipt.setRentExclCharges(lease == null ? new BigDecimal("900.00") : lease.getRentExclCharges());
            rentReceipt.setCharges(lease == null ? new BigDecimal("50.00") : lease.getCharges());
            rentReceipt.setTotal(CalculationService.totalRentReceipt(rentReceipt.getRentExclCharges(),
                    rentReceipt.getCharges()));
            rentReceipt.setPaymentDate(LocalDate.of(2026, 10, 5));
            rentReceipt.setIssueDate(LocalDate.of(2026, 10, 1));
            Company tenantCompany = lease == null || !lease.isCompanyLease() || lease.getCompanyId() == null
                    ? null
                    : companyService.find(lease.getCompanyId()).orElse(null);
            return dataRentReceipt(company,
                    lease == null ? null : lease.getLandlord(),
                    lease == null ? null : lease.getTenant(),
                    tenantCompany, lease, rentReceipt, effectiveSignature);
        }
        ExpenseStatement statement = new ExpenseStatement();
        statement.setMonth("2026-10");
        statement.setNumber("NF-2026-10");
        statement.setTotal(new BigDecimal("364.96"));
        return dataStatementExample(company, statement, true, effectiveSignature);
    }

    private Map<String, Object> dataStatementExample(Company company, ExpenseStatement statement, boolean complete,
            String signature) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("societe", Map.of(
                "raison_sociale", text(company.getName()),
                "siren", text(company.getSiren()),
                "adresse", text(company.getAddress())));
        data.put("gerant", text(company.getManagerName()));
        data.put("mois_libelle", "Octobre 2026");
        data.put("numero", statement.getNumber());
        List<Map<String, Object>> lines = new ArrayList<>();
        lines.add(line("Loyer", "", "01/10/2026 au 31/10/2026", "950,00 €", "100,00 %", "950,00 €"));
        lines.add(line("Gaz", "EDF", "01/10/2026 au 31/10/2026", "120,00 €", "35,71 %", "42,85 €"));
        lines.add(line("Électricité", "Primeo", "01/10/2026 au 31/10/2026", "85,00 €", "35,71 %", "30,35 €"));
        lines.add(line("Téléphone", "Opérateur", "01/10/2026 au 31/10/2026", "29,99 €", "35,71 %", "10,71 €"));
        lines.add(line("Fibre internet", "Opérateur", "01/10/2026 au 31/10/2026", "39,99 €", "35,71 %", "14,28 €"));
        lines.add(line("Assurance habitation", "Assureur", "01/10/2026 au 31/10/2026", "180,00 €", "35,71 %",
                "64,28 €"));
        data.put("lignes", lines);
        data.put("total", "1 112,47 €");
        data.put("total_en_lettres", "mille cent douze euros et quarante-sept centimes");
        data.put("base_prorata", proRataDetail(company));
        data.put("date_emission", Amounts.formatDate(LocalDate.now()));
        data.put("lieu", statementIssuePlace(company));
        data.put("complete", complete);
        data.put("signature", text(signature));
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

    private String period(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            return "";
        }
        return Amounts.formatDate(start) + " au " + Amounts.formatDate(end);
    }

    private String statementPeriod(String month) {
        YearMonth yearMonth = YearMonth.parse(month);
        return period(yearMonth.atDay(1), yearMonth.atEndOfMonth());
    }

    public String proRataDetail(Company company) {
        return companyService.proRataDetail(company);
    }

    /**
     * Pro-rata detail of the lease attached to the statement; a statement without lease keeps the
     * historical base, so screen, preview and generated PDF always show one backend calculation.
     */
    private String statementProRataDetail(Company company, ExpenseStatement statement) {
        return leaseService.proRata(company.getId(), statement.getLeaseId()).detail();
    }

    private String text(String value) {
        return value == null ? "" : value;
    }
}
