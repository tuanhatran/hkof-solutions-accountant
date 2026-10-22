-- Renomme les valeurs persistées des énumérations du domaine en anglais.
-- Les valeurs sont stockées en VARCHAR (EnumType.STRING) : seules les données sont mises à jour.

UPDATE expense_item
SET periodicity = CASE periodicity
    WHEN 'MENSUELLE' THEN 'MONTHLY'
    WHEN 'BIMESTRIELLE' THEN 'BIMONTHLY'
    WHEN 'ANNUELLE' THEN 'ANNUAL'
    ELSE periodicity
END;

UPDATE document_analysis
SET status = CASE status
    WHEN 'EN_ATTENTE' THEN 'PENDING'
    WHEN 'EN_COURS' THEN 'RUNNING'
    WHEN 'TERMINEE' THEN 'DONE'
    WHEN 'ECHEC' THEN 'FAILED'
    WHEN 'ANNULEE' THEN 'CANCELLED'
    ELSE status
END;

UPDATE rent_receipt SET status = 'ARCHIVED' WHERE status = 'ARCHIVEE';

UPDATE expense_statement SET status = 'ARCHIVED' WHERE status = 'ARCHIVEE';

UPDATE template_document
SET type = CASE type
    WHEN 'QUITTANCE' THEN 'RENT_RECEIPT'
    WHEN 'NOTE_FRAIS' THEN 'EXPENSE_STATEMENT'
    ELSE type
END;
