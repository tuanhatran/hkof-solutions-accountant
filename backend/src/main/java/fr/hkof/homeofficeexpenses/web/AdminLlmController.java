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
import fr.hkof.homeofficeexpenses.web.dto.Dtos.LlmConfigDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.LlmConfigRequest;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.LlmModelDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.LlmStatusDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.LlmTestResponse;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.PromptDefautDto;

@RestController
@RequestMapping("/api/admin/llm")
public class AdminLlmController {

    private final LlmConfigService service;

    public AdminLlmController(LlmConfigService service) {
        this.service = service;
    }

    @GetMapping
    public LlmConfigDto obtenir() {
        return service.obtenir();
    }

    @PutMapping
    public LlmConfigDto mettreAJour(@RequestBody LlmConfigRequest request) {
        return service.mettreAJour(request);
    }

    @GetMapping("/models")
    public List<LlmModelDto> modeles() {
        return service.modeles();
    }

    @PostMapping("/test")
    public LlmTestResponse tester() {
        return service.tester();
    }

    @GetMapping("/status")
    public LlmStatusDto statut() {
        return service.statut();
    }

    @GetMapping("/prompt-defaut")
    public PromptDefautDto promptDefaut() {
        return new PromptDefautDto(DefaultPrompt.SYSTEM);
    }
}
