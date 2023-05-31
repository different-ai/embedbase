-- HACK: this will crash if you try to run all at once
-- (concurrently cannot be ran in a single SQL transaction)
CREATE INDEX CONCURRENTLY idx_dataset_id ON documents (dataset_id);
CREATE INDEX CONCURRENTLY idx_user_id ON documents (user_id);
CREATE INDEX CONCURRENTLY idx_embedding_vector ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
