-- FX snapshot (ADR-002). usd_cents_per_minor absorbs each currency's decimal places (JPY has none).
-- Updating rates is a new migration, never an edit here.
CREATE TABLE fx_rates (
  currency            TEXT PRIMARY KEY CHECK (length(currency) = 3 AND currency = upper(currency)),
  usd_cents_per_minor REAL NOT NULL CHECK (usd_cents_per_minor > 0),
  as_of               TEXT NOT NULL CHECK (date(as_of) = as_of)
) STRICT;

INSERT INTO fx_rates (currency, usd_cents_per_minor, as_of) VALUES
  ('USD', 1.0,   '2026-10-01'),
  ('EUR', 1.08,  '2026-10-01'),
  ('GBP', 1.27,  '2026-10-01'),
  ('CAD', 0.73,  '2026-10-01'),
  ('BRL', 0.18,  '2026-10-01'),
  ('INR', 0.012, '2026-10-01'),
  ('JPY', 0.67,  '2026-10-01');

CREATE TABLE employees (
  id              INTEGER PRIMARY KEY,
  employee_number TEXT    NOT NULL UNIQUE CHECK (length(employee_number) > 0),
  first_name      TEXT    NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name       TEXT    NOT NULL CHECK (length(trim(last_name)) > 0),
  job_title       TEXT    NOT NULL CHECK (length(trim(job_title)) > 0),
  department      TEXT    NOT NULL CHECK (length(trim(department)) > 0),
  country         TEXT    NOT NULL CHECK (length(country) = 2 AND country = upper(country)),
  salary_minor    INTEGER NOT NULL CHECK (salary_minor > 0),
  currency        TEXT    NOT NULL REFERENCES fx_rates(currency),
  hired_at        TEXT    NOT NULL CHECK (date(hired_at) = hired_at)
) STRICT;
