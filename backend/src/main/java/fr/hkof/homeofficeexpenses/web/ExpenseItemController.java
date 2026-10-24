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
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemDto;
import fr.hkof.homeofficeexpenses.web.dto.ExpenseItemDtos.ExpenseItemRequest;

@RestController
@RequestMapping("/api/expense-items")
public class ExpenseItemController {

    private final ExpenseItemService service;

    public ExpenseItemController(ExpenseItemService service) {
        this.service = service;
    }

    @GetMapping
    public List<ExpenseItemDto> listExpenseItems(@RequestParam(defaultValue = "false") boolean all) {
        return service.list(all);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseItemDto createExpenseItem(@RequestBody ExpenseItemRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ExpenseItemDto updateExpenseItem(@PathVariable Long id, @RequestBody ExpenseItemRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpenseItem(@PathVariable Long id) {
        service.delete(id);
    }
}
