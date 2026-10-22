package fr.hkof.homeofficeexpenses.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import fr.hkof.homeofficeexpenses.service.llm.AnalysisJobService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.AnalysisDto;

@RestController
@RequestMapping("/api/analyses")
public class AnalysisController {

    private final AnalysisJobService service;

    public AnalysisController(AnalysisJobService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public AnalysisDto obtenir(@PathVariable Long id) {
        return service.obtenir(id);
    }

    @GetMapping(value = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter evenements(@PathVariable Long id) {
        return service.evenements(id);
    }

    @DeleteMapping("/{id}")
    public AnalysisDto cancel(@PathVariable Long id) {
        return service.cancel(id);
    }
}
