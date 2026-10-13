-- Equality filters first. (country, job_title) also serves "WHERE country = ?" alone.
CREATE INDEX employees_country_job_title ON employees (country, job_title);
CREATE INDEX employees_department ON employees (department);
CREATE INDEX employees_job_title ON employees (job_title);
