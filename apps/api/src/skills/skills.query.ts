import type { RequesterScope, SkillListQuery, SkillListQueryPlan } from "./skills.types";

export interface SkillListQueryOptions {
  requester?: RequesterScope;
  requirePublished?: boolean;
}

export function positiveInt(value: string | undefined, fallback: number, max = 100): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export function buildSkillListQueryPlan(query: SkillListQuery, options: SkillListQueryOptions = {}): SkillListQueryPlan {
  const page = positiveInt(query.page, 1);
  const pageSize = positiveInt(query.pageSize, 20, 100);
  const offset = (page - 1) * pageSize;
  const values: unknown[] = [];
  const conditions: string[] = [];
  const searchTerm = query.q?.trim();

  const push = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  const searchParam = searchTerm ? push(searchTerm) : null;

  if (searchParam) {
    conditions.push(
      `(doc.search_vector @@ websearch_to_tsquery('simple', ${searchParam}) OR POSITION(LOWER(${searchParam}) IN LOWER(doc.document)) > 0)`
    );
  }

  if (options.requirePublished) {
    conditions.push("s.status = 'published'");
  }

  if (query.departmentID) {
    conditions.push(`d.name = ${push(query.departmentID)}`);
  }

  if (query.compatibleTool) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM skill_tool_compatibilities tc_filter
        WHERE tc_filter.skill_id = s.id AND tc_filter.tool_id = ${push(query.compatibleTool)}
      )`
    );
  }

  if (query.category) {
    conditions.push(`s.category = ${push(query.category)}`);
  }

  if (query.riskLevel) {
    conditions.push(`v.risk_level = ${push(query.riskLevel)}`);
  }

  if (query.publishedSince) {
    conditions.push(`v.published_at >= ${push(query.publishedSince)}`);
  }

  if (query.updatedSince) {
    conditions.push(`s.updated_at >= ${push(query.updatedSince)}`);
  }

  if (options.requester) {
    conditions.push(buildRequesterVisibilityCondition(options.requester, query.accessScope === "authorized_only", push));
  } else if (query.accessScope === "authorized_only") {
    conditions.push(`s.visibility_level <> 'private'`);
  }

  const whereClause = conditions.length > 0 ? conditions.join("\n        AND ") : "TRUE";
  const orderByClause = buildSkillOrderClause(query.sort ?? "composite", searchParam);
  const limitParam = push(pageSize);
  const offsetParam = push(offset);

  return {
    page,
    pageSize,
    values,
    text: `
      WITH star_counts AS (
        SELECT skill_id, count(*)::bigint AS star_count
        FROM skill_stars
        GROUP BY skill_id
      ),
      download_counts AS (
        SELECT skill_id, count(*)::bigint AS download_count
        FROM download_events
        GROUP BY skill_id
      ),
      base AS (
        SELECT
          s.id,
          s.skill_id,
          s.display_name,
          s.description,
          s.status,
          s.visibility_level,
          s.category,
          s.updated_at,
          v.version,
          v.risk_level,
          v.risk_description,
          v.review_summary,
          v.published_at,
          u.display_name AS author_name,
          d.name AS author_department,
          COALESCE(array_agg(DISTINCT st.tag) FILTER (WHERE st.tag IS NOT NULL), '{}') AS tags,
          COALESCE(array_agg(DISTINCT tc.tool_id) FILTER (WHERE tc.tool_id IS NOT NULL), '{}') AS compatible_tools,
          COALESCE(array_agg(DISTINCT tc.system) FILTER (WHERE tc.system IS NOT NULL), '{}') AS compatible_systems,
          auth.scope_type,
          auth.scope_department_ids,
          auth.scope_department_paths,
          COALESCE(stars.star_count, 0)::text AS star_count,
          COALESCE(downloads.download_count, 0)::text AS download_count,
          doc.document,
          ${searchParam ? `ts_rank_cd(doc.search_vector, websearch_to_tsquery('simple', ${searchParam}))` : "0"} AS search_rank
        FROM skills s
        JOIN skill_versions v ON v.id = s.current_version_id
        LEFT JOIN users u ON u.id = s.author_id
        LEFT JOIN departments d ON d.id = s.department_id
        LEFT JOIN skill_tags st ON st.skill_id = s.id
        LEFT JOIN skill_tool_compatibilities tc ON tc.skill_id = s.id
        LEFT JOIN LATERAL (
          SELECT
            sa.scope_type,
            array_remove(array_agg(sa.department_id ORDER BY sa.department_id), NULL) AS scope_department_ids,
            array_remove(array_agg(scope_department.path ORDER BY scope_department.path), NULL) AS scope_department_paths
          FROM skill_authorizations sa
          LEFT JOIN departments scope_department ON scope_department.id = sa.department_id
          WHERE sa.skill_id = s.id
          GROUP BY sa.scope_type
          ORDER BY count(*) DESC, sa.scope_type ASC
          LIMIT 1
        ) auth ON true
        LEFT JOIN skill_search_documents doc ON doc.skill_id = s.id
        LEFT JOIN star_counts stars ON stars.skill_id = s.id
        LEFT JOIN download_counts downloads ON downloads.skill_id = s.id
        WHERE ${whereClause}
        GROUP BY
          s.id,
          v.id,
          u.display_name,
          d.name,
          auth.scope_type,
          auth.scope_department_ids,
          auth.scope_department_paths,
          doc.document,
          doc.search_vector,
          stars.star_count,
          downloads.download_count
      )
      SELECT
        base.id,
        base.skill_id,
        base.display_name,
        base.description,
        base.status,
        base.visibility_level,
        base.category,
        base.updated_at,
        base.version,
        base.risk_level,
        base.risk_description,
        base.review_summary,
        base.published_at,
        base.author_name,
        base.author_department,
        base.tags,
        base.compatible_tools,
        base.compatible_systems,
        base.scope_type,
        base.scope_department_ids,
        base.scope_department_paths,
        base.star_count,
        base.download_count,
        count(*) OVER()::text AS total_count
      FROM base
      ORDER BY ${orderByClause}
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `
  };
}

function buildRequesterVisibilityCondition(
  requester: RequesterScope,
  authorizedOnly: boolean,
  push: (value: unknown) => string,
): string {
  const departmentID = push(requester.department_id);
  const departmentPath = push(requester.department_path);
  const departmentPathLike = push(requester.department_path);
  const authorizedCondition = `(
    auth.scope_type = 'all_employees'
    OR (auth.scope_type IN ('current_department', 'selected_departments') AND ${departmentID} = ANY(auth.scope_department_ids))
    OR (auth.scope_type = 'department_tree' AND EXISTS (
      SELECT 1
      FROM unnest(auth.scope_department_paths) AS scope_path
      WHERE ${departmentPath} = scope_path OR ${departmentPathLike} LIKE scope_path || '/%'
    ))
    OR (auth.scope_type IS NULL AND s.visibility_level = 'public_installable')
  )`;

  if (authorizedOnly) {
    return `(s.visibility_level <> 'private' AND ${authorizedCondition})`;
  }

  return `(
    s.visibility_level IN ('public_installable', 'detail_visible', 'summary_visible')
    OR ${authorizedCondition}
  )`;
}

function buildSkillOrderClause(sort: string, searchParam: string | null): string {
  const searchBoost = searchParam
    ? `CASE WHEN POSITION(LOWER(${searchParam}) IN LOWER(base.document)) > 0 THEN 100 ELSE 0 END`
    : "0";
  const publishedBoost = `CASE WHEN base.status = 'published' THEN 10 ELSE 0 END`;
  const composite = `(${searchBoost} + ${publishedBoost} + base.star_count::bigint + (base.download_count::bigint / 10.0)) DESC, base.updated_at DESC, base.skill_id ASC`;

  switch (sort) {
    case "latest_published":
      return `base.published_at DESC, base.updated_at DESC, base.skill_id ASC`;
    case "recently_updated":
      return `base.updated_at DESC, base.skill_id ASC`;
    case "download_count":
      return `base.download_count::bigint DESC, base.updated_at DESC, base.skill_id ASC`;
    case "star_count":
      return `base.star_count::bigint DESC, base.updated_at DESC, base.skill_id ASC`;
    case "relevance":
      return searchParam
        ? `base.search_rank DESC, ${searchBoost} DESC, ${publishedBoost} DESC, base.star_count::bigint DESC, base.download_count::bigint DESC, base.updated_at DESC, base.skill_id ASC`
        : composite;
    case "composite":
    default:
      return composite;
  }
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
