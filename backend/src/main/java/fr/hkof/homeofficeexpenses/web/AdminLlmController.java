package fr.hkof.homeofficeexpenses.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.llm.DefaultPrompt;
import fr.hkof.homeofficeexpenses.service.llm.LlmConfigService;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmConfigDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmConfigRequest;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmModelDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmStatusDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmTestResponse;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.DefaultPromptDto;

@RestController
@RequestMapping("/api/admin/llm")
public class AdminLlmController {

    private final LlmConfigService service;

    public AdminLlmController(LlmConfigService service) {
        this.service = service;
    }

    @GetMapping
    public LlmConfigDto getLlmConfig() {
        return service.get();
    }

    @PutMapping
    public LlmConfigDto updateLlmConfig(@RequestBody LlmConfigRequest request) {
        return service.update(request);
    }

    @GetMapping("/models")
    public List<LlmModelDto> listLlmModels() {
        return service.models();
    }

    @PostMapping("/test")
    public LlmTestResponse testLlm() {
        return service.testConnection();
    }

    @GetMapping("/status")
    public LlmStatusDto getLlmStatus() {
        return service.status();
    }

    @GetMapping("/default-prompt")
    public DefaultPromptDto getDefaultLlmPrompt() {
        return new DefaultPromptDto(DefaultPrompt.SYSTEM);
    }
}
