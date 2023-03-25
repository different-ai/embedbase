CREATE OR REPLACE VIEW distinct_datasets AS
SELECT dataset_id, user_id, COUNT(*) AS documents_count
FROM documents
GROUP BY dataset_id, user_id;
