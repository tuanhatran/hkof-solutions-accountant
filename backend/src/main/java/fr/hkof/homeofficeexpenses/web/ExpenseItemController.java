package fr.hkof.homeofficeexpenses.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.ExpenseItemService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ExpenseItemRequest;

@RestController
@RequestMapping("/api/postes")
public class ExpenseItemController {

    private final ExpenseItemService service;

    public ExpenseItemController(ExpenseItemService service) {
        this.service = service;
    }

    @GetMapping
    public List<ExpenseItemDto> lister(@RequestParam(defaultValue = "false") boolean tous) {
        return service.lister(tous);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseItemDto creer(@RequestBody ExpenseItemRequest request) {
        return service.creer(request);
    }

    @PutMapping("/{id}")
    public ExpenseItemDto mettreAJour(@PathVariable Long id, @RequestBody ExpenseItemRequest request) {
        return service.mettreAJour(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
