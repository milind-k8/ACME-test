-- Fixed lists HR picks from. Adding a department or country is a new migration.
CREATE TABLE departments (
  name TEXT PRIMARY KEY CHECK (length(trim(name)) > 0)
) STRICT;

INSERT INTO departments (name) VALUES
  ('Data'), ('Engineering'), ('Finance'), ('Marketing'), ('People'), ('Product'), ('Sales'), ('Support');

-- currency is the country's usual pay currency, used to pre-fill the form; employees may still be paid in another.
CREATE TABLE countries (
  code     TEXT PRIMARY KEY CHECK (length(code) = 2 AND code = upper(code)),
  currency TEXT NOT NULL REFERENCES fx_rates(currency)
) STRICT;

INSERT INTO countries (code, currency) VALUES
  ('BR', 'BRL'), ('CA', 'CAD'), ('DE', 'EUR'), ('ES', 'EUR'), ('GB', 'GBP'), ('IN', 'INR'), ('JP', 'JPY'), ('US', 'USD');

-- SQLite can't add a foreign key to an existing column without rebuilding employees (and its FTS triggers),
-- so membership is enforced by triggers instead.
CREATE TRIGGER employees_reference_insert BEFORE INSERT ON employees
WHEN NOT EXISTS (SELECT 1 FROM departments WHERE name = new.department)
  OR NOT EXISTS (SELECT 1 FROM countries WHERE code = new.country)
BEGIN
  SELECT RAISE(ABORT, 'unknown department or country');
END;

CREATE TRIGGER employees_reference_update BEFORE UPDATE OF department, country ON employees
WHEN NOT EXISTS (SELECT 1 FROM departments WHERE name = new.department)
  OR NOT EXISTS (SELECT 1 FROM countries WHERE code = new.country)
BEGIN
  SELECT RAISE(ABORT, 'unknown department or country');
END;
