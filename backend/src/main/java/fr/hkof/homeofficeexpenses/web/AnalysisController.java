package fr.hkof.homeofficeexpenses.web;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.llm.AnalysisJobService;
import fr.hkof.homeofficeexpenses.web.dto.ExtractionDtos.AnalysisDto;

@RestController
@RequestMapping("/api/analyses")
public class AnalysisController {

    private final AnalysisJobService service;

    public AnalysisController(AnalysisJobService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public AnalysisDto getAnalysis(@PathVariable Long id) {
        return service.get(id);
    }

    @DeleteMapping("/{id}")
    public AnalysisDto cancelAnalysis(@PathVariable Long id) {
        return service.cancel(id);
    }
}
