package fr.hkof.homeofficeexpenses;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class HomeOfficeExpensesApplication {

    public static void main(String[] args) {
        SpringApplication.run(HomeOfficeExpensesApplication.class, args);
    }
}
