package fr.hkof.homeofficeexpenses.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.ApplicationArguments;

import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.ExpenseItemRepository;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.repository.SettingsRepository;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;

class DataInitializerTest {

    private SettingsRepository settingsRepository;
    private LandlordRepository landlordRepository;
    private TenantRepository tenantRepository;
    private LeaseRepository leaseRepository;
    private ExpenseItemRepository expenseItemRepository;
    private TemplateDocumentRepository templateRepository;
    private LlmConfigRepository llmConfigRepository;
    private DataInitializer initializer;

    @BeforeEach
    void setUp() {
        settingsRepository = mock(SettingsRepository.class);
        landlordRepository = mock(LandlordRepository.class);
        tenantRepository = mock(TenantRepository.class);
        leaseRepository = mock(LeaseRepository.class);
        expenseItemRepository = mock(ExpenseItemRepository.class);
        templateRepository = mock(TemplateDocumentRepository.class);
        llmConfigRepository = mock(LlmConfigRepository.class);
        AppProperties properties = new AppProperties("data", List.of(),
                new AppProperties.Llm("http://localhost:11434", "qwen2.5vl"));
        initializer = new DataInitializer(settingsRepository, landlordRepository, tenantRepository, leaseRepository,
                expenseItemRepository, templateRepository, llmConfigRepository, properties,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    @DisplayName("An empty database is seeded with settings, rent configuration, items, templates and LLM")
    void seedsEmptyDatabase() {
        when(settingsRepository.existsById(1L)).thenReturn(false);
        when(landlordRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.empty());
        when(landlordRepository.save(any(Landlord.class))).thenAnswer(invocation -> {
            Landlord landlord = invocation.getArgument(0);
            landlord.setId(1L);
            return landlord;
        });
        when(tenantRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.empty());
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> {
            Tenant tenant = invocation.getArgument(0);
            tenant.setId(1L);
            return tenant;
        });
        when(leaseRepository.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.empty());
        when(expenseItemRepository.findFirstByCode(any())).thenReturn(Optional.empty());
        when(templateRepository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(any())).thenReturn(Optional.empty());
        when(templateRepository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(templateRepository.findFirstByTypeAndActiveTrueAndDeletedFalse(any())).thenReturn(Optional.empty());
        when(llmConfigRepository.existsById(1L)).thenReturn(false);

        initializer.run(mock(ApplicationArguments.class));

        verify(settingsRepository).save(any());
        verify(leaseRepository).save(any(Lease.class));
        verify(expenseItemRepository, org.mockito.Mockito.times(6)).save(any());
        verify(llmConfigRepository).save(any());

        ArgumentCaptor<TemplateDocument> templates = ArgumentCaptor.forClass(TemplateDocument.class);
        verify(templateRepository, org.mockito.Mockito.times(4)).save(templates.capture());
        assertThat(templates.getAllValues()).extracting(TemplateDocument::getType)
                .contains(TemplateType.RENT_RECEIPT, TemplateType.EXPENSE_STATEMENT);
        assertThat(templates.getAllValues()).anyMatch(TemplateDocument::isActive);
    }

    @Test
    @DisplayName("An already seeded database is left untouched")
    void keepsExistingData() {
        when(settingsRepository.existsById(1L)).thenReturn(true);
        Landlord landlord = new Landlord();
        landlord.setId(1L);
        Tenant tenant = new Tenant();
        tenant.setId(1L);
        when(landlordRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.of(landlord));
        when(tenantRepository.findFirstByDeletedFalseOrderByNameAsc()).thenReturn(Optional.of(tenant));
        when(leaseRepository.findFirstByDeletedFalseOrderByIdAsc()).thenReturn(Optional.of(new Lease()));
        when(expenseItemRepository.findFirstByCode(any()))
                .thenReturn(Optional.of(new fr.hkof.homeofficeexpenses.domain.ExpenseItem()));
        when(templateRepository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(templateRepository.findFirstByTypeAndActiveTrueAndDeletedFalse(any()))
                .thenReturn(Optional.of(new TemplateDocument()));
        when(llmConfigRepository.existsById(1L)).thenReturn(true);

        initializer.run(mock(ApplicationArguments.class));

        verify(settingsRepository, org.mockito.Mockito.never()).save(any());
        verify(leaseRepository, org.mockito.Mockito.never()).save(any());
        verify(expenseItemRepository, org.mockito.Mockito.never()).save(any());
        verify(llmConfigRepository, org.mockito.Mockito.never()).save(any());
        verify(templateRepository, org.mockito.Mockito.never()).save(any());
    }
}
