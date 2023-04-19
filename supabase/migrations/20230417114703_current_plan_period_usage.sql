CREATE OR REPLACE VIEW current_plan_period_usage AS
SELECT
  u.id AS user_id,
  COALESCE(s.price_id, 'free') AS plan_id,
  DATE(COALESCE(s.current_period_start, CURRENT_DATE)) AS date,
  COALESCE(SUM(pu.usage), 0) AS total_usage,
  CASE
    WHEN COALESCE(s.price_id, 'free') = 'price_1MtZEaFX2CGyoHQv54EefwEk' THEN 50
    ELSE 5
  END AS "limit"
FROM
  auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN plan_usages pu ON u.id = pu.user_id
  AND DATE(pu.created_at) = DATE(COALESCE(s.current_period_start, CURRENT_DATE))
GROUP BY
  u.id,
  s.price_id,
  DATE(COALESCE(s.current_period_start, CURRENT_DATE))
ORDER BY
  u.id, date;