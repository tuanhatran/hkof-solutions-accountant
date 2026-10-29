package fr.hkof.homeofficeexpenses.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends the confirmation e-mail through the configured SMTP relay (Mailpit locally).
 * Tokens and passwords are never logged; a delivery failure is reported generically so the
 * account stays usable and the e-mail can be resent.
 */
@Service
public class EmailService {

    private static final Logger LOG = LoggerFactory.getLogger(EmailService.class);

    private static final String SUBJECT = "Confirmez votre adresse e-mail — HomeOfficeExpenses";

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendConfirmation(String recipient, String confirmationLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(recipient);
        message.setSubject(SUBJECT);
        message.setText("""
                Bonjour,

                Pour confirmer votre adresse e-mail et activer votre compte HomeOfficeExpenses,
                ouvrez ce lien :

                %s

                Ce lien est valable 24 heures et ne peut servir qu'une fois.
                Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.

                HomeOfficeExpenses
                """.formatted(confirmationLink));
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            LOG.warn("Confirmation e-mail could not be sent ({})", ex.getClass().getSimpleName());
        }
    }
}
