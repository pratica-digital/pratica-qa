-- Diagnóstico somente de leitura. Não altera nem bloqueia os registros.

SELECT 'total_cases' AS metric, COUNT(*)::bigint AS value FROM test_cases
UNION ALL SELECT 'active_cases', COUNT(*) FROM test_cases WHERE status = 'ACTIVE'
UNION ALL SELECT 'archived_cases', COUNT(*) FROM test_cases WHERE status = 'ARCHIVED'
UNION ALL SELECT 'soft_deleted_cases', COUNT(*) FROM test_cases WHERE "deletedAt" IS NOT NULL
UNION ALL SELECT 'with_suite_id', COUNT(*) FROM test_cases WHERE "suiteId" IS NOT NULL
UNION ALL SELECT 'without_suite_id', COUNT(*) FROM test_cases WHERE "suiteId" IS NULL
UNION ALL
SELECT 'valid_suite_relation', COUNT(*)
FROM test_cases tc
JOIN test_suites ts ON ts.id = tc."suiteId"
UNION ALL
SELECT 'orphan_suite_reference', COUNT(*)
FROM test_cases tc
LEFT JOIN test_suites ts ON ts.id = tc."suiteId"
WHERE ts.id IS NULL
UNION ALL
SELECT 'cases_in_untitled_suite', COUNT(*)
FROM test_cases tc
JOIN test_suites ts ON ts.id = tc."suiteId"
WHERE BTRIM(LOWER(ts.name)) = 'untitled'
UNION ALL
SELECT 'cases_in_soft_deleted_suite', COUNT(*)
FROM test_cases tc
JOIN test_suites ts ON ts.id = tc."suiteId"
WHERE ts."deletedAt" IS NOT NULL
UNION ALL
SELECT 'duplicate_excess_by_suite_title', COALESCE(SUM(copies - 1), 0)
FROM (
  SELECT COUNT(*) AS copies
  FROM test_cases
  WHERE "deletedAt" IS NULL
  GROUP BY "suiteId", LOWER(BTRIM(title))
  HAVING COUNT(*) > 1
) duplicates
ORDER BY metric;

SELECT
  ts.id AS suite_id,
  ts.name AS suite_name,
  ts."projectId" AS project_id,
  p.name AS project_name,
  ts."deletedAt" AS suite_deleted_at,
  COUNT(tc.id)::int AS total_cases,
  COUNT(tc.id) FILTER (
    WHERE tc.status = 'ACTIVE' AND tc."deletedAt" IS NULL
  )::int AS active_cases
FROM test_suites ts
LEFT JOIN test_cases tc ON tc."suiteId" = ts.id
LEFT JOIN projects p ON p.id = ts."projectId"
GROUP BY ts.id, ts.name, ts."projectId", p.name, ts."deletedAt"
ORDER BY total_cases DESC, ts.name;

-- IDs de duplicatas candidatas. Este relatório não remove nenhuma delas.
SELECT
  tc."suiteId" AS suite_id,
  ts.name AS suite_name,
  ts."projectId" AS project_id,
  LOWER(BTRIM(tc.title)) AS normalized_title,
  COUNT(*)::int AS copies,
  ARRAY_AGG(tc.id ORDER BY tc."createdAt") AS case_ids
FROM test_cases tc
JOIN test_suites ts ON ts.id = tc."suiteId"
WHERE tc."deletedAt" IS NULL
GROUP BY tc."suiteId", ts.name, ts."projectId", LOWER(BTRIM(tc.title))
HAVING COUNT(*) > 1
ORDER BY copies DESC, suite_name;

-- Registros Untitled, com contexto suficiente para uma correção manual segura.
SELECT
  ts.id AS suite_id,
  ts.name AS current_suite_name,
  ts."projectId" AS project_id,
  p.name AS project_name,
  ARRAY_AGG(tc.id ORDER BY tc."createdAt") FILTER (WHERE tc.id IS NOT NULL) AS case_ids
FROM test_suites ts
LEFT JOIN projects p ON p.id = ts."projectId"
LEFT JOIN test_cases tc ON tc."suiteId" = ts.id
WHERE BTRIM(LOWER(ts.name)) = 'untitled'
GROUP BY ts.id, ts.name, ts."projectId", p.name;

-- Integridade referencial e política de exclusão efetivamente instaladas.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('test_cases'::regclass, 'test_suites'::regclass)
  AND contype = 'f'
ORDER BY conrelid::regclass::text, conname;
