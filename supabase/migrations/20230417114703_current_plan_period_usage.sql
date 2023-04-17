CREATE OR REPLACE VIEW current_plan_period_usage AS
SELECT
  u.id AS user_id,
  COALESCE(s.price_id, 'free') AS plan_id,
  EXTRACT(MONTH FROM COALESCE(s.current_period_start, DATE_TRUNC('month', CURRENT_DATE))) AS month,
  EXTRACT(YEAR FROM COALESCE(s.current_period_start, DATE_TRUNC('month', CURRENT_DATE))) AS year,
  COALESCE(SUM(pu.usage), 0) AS total_usage,
  CASE
    WHEN COALESCE(s.price_id, 'free') = 'price_1MtZEaFX2CGyoHQv54EefwEk' THEN 50
    ELSE 5
  END AS "limit"
FROM
  auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN plan_usages pu ON u.id = pu.user_id
  AND pu.created_at >= COALESCE(s.current_period_start, DATE_TRUNC('month', CURRENT_DATE))
  AND pu.created_at < COALESCE(s.current_period_end, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')
GROUP BY
  u.id,
  s.price_id,
  EXTRACT(MONTH FROM COALESCE(s.current_period_start, DATE_TRUNC('month', CURRENT_DATE))),
  EXTRACT(YEAR FROM COALESCE(s.current_period_start, DATE_TRUNC('month', CURRENT_DATE)))
ORDER BY
  u.id, year, month;
