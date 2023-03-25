create table documents (
    id text primary key,
    data text,
    embedding vector (1536),
    hash text,
    dataset_id text,
    user_id text,
    metadata json,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);
