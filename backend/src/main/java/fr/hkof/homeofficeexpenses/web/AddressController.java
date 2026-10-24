package fr.hkof.homeofficeexpenses.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.AddressService;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.AddressDto;

@RestController
@RequestMapping("/api")
public class AddressController {

    private final AddressService service;

    public AddressController(AddressService service) {
        this.service = service;
    }

    @GetMapping("/addresses")
    public List<AddressDto> listAddresses() {
        return service.list();
    }
}
