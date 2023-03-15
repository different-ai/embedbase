import fire
from embedbase.settings import get_settings
from embedbase.supabase_db import Supabase


def create_table(dimensionality: int = 1536):
    """
    Create a table "documents" in the database
    with the following columns:
    - id: text
    - data: text
    - embedding: vector (dimensionality)
    - hash: text
    - dataset_id: text
    - user_id: text
    """
    # settings = get_settings()
    # db = Supabase(
    #     url=settings.supabase_url,
    #     key=settings.supabase_key,
    # )
    q = f"""
create table documents (
    id text primary key,
    data text,
    embedding vector ({dimensionality}),
    hash text,
    dataset_id text
    user_id text
);
    """
    raise NotImplementedError

def create_search_function(dimensionality: int = 1536):
    """
    Create a search function "match_documents" in the database
    """
    q = f"""
create or replace function match_documents (
  query_embedding vector({dimensionality}),
  similarity_threshold float,
  match_count int,
  query_dataset_id text,
  query_user_id text default null
)
returns table (
  id text,
  data text,
  score float,
  hash text,
  embedding vector({dimensionality})
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
    documents.embedding
  from documents
  where 1 - (documents.embedding <=> query_embedding) > similarity_threshold
    and query_dataset_id = documents.dataset_id
    and (query_user_id is null or query_user_id = documents.user_id)
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
""" # TODO: @louis030195: this function might be outdated, will fix ASAP
    raise NotImplementedError

def create_index():
    """
    Create an index on the "embedding" column
    """
    q = """
create index on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
"""
    raise NotImplementedError

def create_distinct_datasets_view():
    """
    Create a view "distinct_datasets" in the database
    """
    q = """
CREATE OR REPLACE VIEW distinct_datasets AS
SELECT dataset_id, user_id, COUNT(*) AS documents_count
FROM documents
GROUP BY dataset_id, user_id;
"""
    raise NotImplementedError

def main():
    fire.Fire({
        "create_table": create_table,
        "create_search_function": create_search_function,
        "create_index": create_index,
        "create_distinct_datasets_view": create_distinct_datasets_view,
    })
