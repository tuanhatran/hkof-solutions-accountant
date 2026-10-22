package fr.hkof.fraisocc.service.llm;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LlmConfigServiceTest {

    @Test
    @DisplayName("Reconnaît les URL locales, les IP privées et la boucle locale IPv6")
    void urlLocale() {
        assertThat(LlmConfigService.urlDistante("http://localhost:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://host.docker.internal:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://ollama:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://127.0.0.1:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://[::1]:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://192.168.1.50:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://10.1.2.3:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://172.16.0.9:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://172.31.255.1:11434")).isFalse();
        assertThat(LlmConfigService.urlDistante("http://[fd00::1]:11434")).isFalse();
    }

    @Test
    @DisplayName("Considère comme distantes les URL publiques et les URL invalides")
    void urlDistante() {
        assertThat(LlmConfigService.urlDistante("https://llm.exemple.fr")).isTrue();
        assertThat(LlmConfigService.urlDistante("http://8.8.8.8:11434")).isTrue();
        assertThat(LlmConfigService.urlDistante("http://172.32.0.1:11434")).isTrue();
        assertThat(LlmConfigService.urlDistante("pas une url")).isTrue();
        assertThat(LlmConfigService.urlDistante(null)).isTrue();
    }
}
