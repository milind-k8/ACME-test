CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE CHECK (length(email) > 0 AND email = lower(trim(email))),
  password_hash TEXT NOT NULL
) STRICT;
