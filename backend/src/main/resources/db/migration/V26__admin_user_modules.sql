ALTER TABLE app_user
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN company_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN lmnp_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE app_user
    ADD CONSTRAINT ck_app_user_role CHECK (role IN ('ADMIN', 'USER'));

UPDATE app_user
SET role = 'ADMIN'
WHERE lower(email) = 'thtran@homeofficeexpenses.local';
