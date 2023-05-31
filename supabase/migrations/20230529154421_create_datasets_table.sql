CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  owner TEXT NULL,
  documents_count INTEGER DEFAULT 0,
  public boolean not null default false
);

-- HACK: disabled as doing this in python feels more testable/reliable
-- (even though we lose the advantage of SQL transactions)
-- CREATE OR REPLACE FUNCTION create_dataset_if_not_exists() RETURNS TRIGGER AS $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM datasets WHERE name = NEW.dataset_id AND NEW.user_id) THEN
--     INSERT INTO datasets (name, owner) VALUES (NEW.dataset_id, NEW.user_id);
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER check_dataset_existence
-- BEFORE INSERT ON documents
-- FOR EACH ROW
-- EXECUTE FUNCTION create_dataset_if_not_exists();

CREATE OR REPLACE FUNCTION update_documents_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE datasets SET documents_count = documents_count + 1 WHERE name = NEW.dataset_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE datasets SET documents_count = documents_count - 1 WHERE name = OLD.dataset_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_count_trigger
AFTER INSERT OR DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_documents_count();

INSERT INTO datasets (name, owner)
SELECT DISTINCT dataset_id, user_id
FROM documents
WHERE dataset_id IS NOT NULL;

UPDATE datasets
SET documents_count = (
  SELECT COUNT(*)
  FROM documents
  WHERE documents.dataset_id = datasets.name
);
