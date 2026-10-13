-- Name search. External-content FTS5 over employees: the triggers keep the index in step with the table.
-- remove_diacritics 2 makes "jose" match "José"; unicode61 is case-insensitive.
CREATE VIRTUAL TABLE employees_fts USING fts5(
  first_name,
  last_name,
  content = 'employees',
  content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER employees_fts_insert AFTER INSERT ON employees BEGIN
  INSERT INTO employees_fts (rowid, first_name, last_name) VALUES (new.id, new.first_name, new.last_name);
END;

CREATE TRIGGER employees_fts_delete AFTER DELETE ON employees BEGIN
  INSERT INTO employees_fts (employees_fts, rowid, first_name, last_name)
  VALUES ('delete', old.id, old.first_name, old.last_name);
END;

CREATE TRIGGER employees_fts_update AFTER UPDATE OF first_name, last_name ON employees BEGIN
  INSERT INTO employees_fts (employees_fts, rowid, first_name, last_name)
  VALUES ('delete', old.id, old.first_name, old.last_name);
  INSERT INTO employees_fts (rowid, first_name, last_name) VALUES (new.id, new.first_name, new.last_name);
END;

-- Index any rows that existed before this migration.
INSERT INTO employees_fts (employees_fts) VALUES ('rebuild');
