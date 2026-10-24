package fr.hkof.homeofficeexpenses.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CompanyTest {

    @Test
    @DisplayName("A company carries its identity, home-office data and issue place")
    void carriesCompanyProfile() {
        Company company = new Company();
        company.setId(2L);
        company.setName("HKOF");
        company.setLegalForm("EURL");
        company.setSiren("123 456 789");
        company.setAddress("12 rue de la République, 75000 Paris");
        company.setManagerName("Gérant");
        company.setHomeAddress("12 rue de la République, 75000 Paris");
        company.setTotalArea(new BigDecimal("70.00"));
        company.setBusinessArea(new BigDecimal("25.00"));
        company.setIssuePlace("Paris");
        company.setDeleted(false);

        assertThat(company.getId()).isEqualTo(2L);
        assertThat(company.getName()).isEqualTo("HKOF");
        assertThat(company.getLegalForm()).isEqualTo("EURL");
        assertThat(company.getSiren()).isEqualTo("123 456 789");
        assertThat(company.getAddress()).contains("République");
        assertThat(company.getManagerName()).isEqualTo("Gérant");
        assertThat(company.getHomeAddress()).contains("République");
        assertThat(company.getTotalArea()).isEqualByComparingTo("70.00");
        assertThat(company.getBusinessArea()).isEqualByComparingTo("25.00");
        assertThat(company.getIssuePlace()).isEqualTo("Paris");
        assertThat(company.isDeleted()).isFalse();
    }

    @Test
    @DisplayName("Employee titles are descriptive and stable in the API")
    void employeeTitles() {
        assertThat(EmployeeTitle.values()).containsExactly(
                EmployeeTitle.CEO, EmployeeTitle.CFO, EmployeeTitle.ACCOUNTANT, EmployeeTitle.EMPLOYEE);
    }
}
