package fr.hkof.homeofficeexpenses.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI homeOfficeExpensesOpenApi() {
        return new OpenAPI().info(new Info()
                .title("HomeOfficeExpenses API")
                .version("1.0.0")
                .description("API locale de génération de quittances et de notes de frais d'occupation."));
    }
}
