create index on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
