create or replace function match_documents (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  query_dataset_ids text[],
  query_user_id text default null
)
returns table (
  id text,
  data text,
  score float,
  hash text,
  embedding vector(1536),
  metadata json
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.data,
    (1 - (documents.embedding <=> query_embedding)) as similarity,
    documents.hash,
    documents.embedding,
    documents.metadata
  from documents
  where 1 - (documents.embedding <=> query_embedding) > similarity_threshold
    and documents.dataset_id = any(query_dataset_ids)
    and (query_user_id is null or query_user_id = documents.user_id)
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
