CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    confirmation_token_hash VARCHAR(64),
    confirmation_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX ux_app_user_email ON app_user (email);
