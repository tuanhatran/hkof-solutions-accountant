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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.EmployeeService;
import fr.hkof.homeofficeexpenses.web.dto.EmployeeDtos.EmployeeDto;
import fr.hkof.homeofficeexpenses.web.dto.EmployeeDtos.EmployeeRequest;

@RestController
@RequestMapping("/api")
public class EmployeeController {

    private final EmployeeService service;

    public EmployeeController(EmployeeService service) {
        this.service = service;
    }

    @GetMapping("/companies/{companyId}/employees")
    public List<EmployeeDto> listEmployees(@PathVariable Long companyId) {
        return service.list(companyId);
    }

    @PostMapping("/companies/{companyId}/employees")
    @ResponseStatus(HttpStatus.CREATED)
    public EmployeeDto createEmployee(@PathVariable Long companyId, @RequestBody EmployeeRequest request) {
        return service.create(companyId, request);
    }

    @PutMapping("/employees/{id}")
    public EmployeeDto updateEmployee(@PathVariable Long id, @RequestBody EmployeeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/employees/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEmployee(@PathVariable Long id) {
        service.delete(id);
    }
}
