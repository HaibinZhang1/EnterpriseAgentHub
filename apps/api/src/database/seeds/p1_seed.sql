BEGIN;

INSERT INTO departments (id, parent_id, name, path, level, status)
VALUES
  ('dept_frontend', NULL, '前端组', '/前端组', 0, 'active'),
  ('dept_design', NULL, '设计平台组', '/设计平台组', 0, 'active'),
  ('dept_ops', NULL, '运维组', '/运维组', 0, 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, path = EXCLUDED.path, status = EXCLUDED.status;

INSERT INTO users (id, username, password_hash, display_name, department_id, role, status)
VALUES
  ('u_001', 'demo', 'p1-dev-only-hash', '张三', 'dept_frontend', 'normal_user', 'active'),
  ('u_author_frontend', 'author_frontend', 'p1-dev-only-hash', '李四', 'dept_frontend', 'normal_user', 'active'),
  ('u_author_design', 'author_design', 'p1-dev-only-hash', '王五', 'dept_design', 'normal_user', 'active'),
  ('u_author_ops', 'author_ops', 'p1-dev-only-hash', '赵六', 'dept_ops', 'normal_user', 'active')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, department_id = EXCLUDED.department_id;

WITH upsert_skill AS (
  INSERT INTO skills (skill_id, display_name, description, author_id, department_id, status, visibility_level, category)
  VALUES
    ('codex-review-helper', 'Codex Review Helper', '为 Codex 项目提供代码审查提示和提交前检查清单。', 'u_author_frontend', 'dept_frontend', 'published', 'public_installable', 'engineering'),
    ('design-guideline-lite', 'Design Guideline Lite', '企业 UI 规范摘要，详情仅对授权部门开放。', 'u_author_design', 'dept_design', 'published', 'summary_visible', 'design'),
    ('legacy-dept-runbook', 'Legacy Department Runbook', '已下架的部门运行手册，验证不可安装场景。', 'u_author_ops', 'dept_ops', 'delisted', 'detail_visible', 'operations')
  ON CONFLICT (skill_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        author_id = EXCLUDED.author_id,
        department_id = EXCLUDED.department_id,
        status = EXCLUDED.status,
        visibility_level = EXCLUDED.visibility_level,
        category = EXCLUDED.category,
        updated_at = now()
  RETURNING id, skill_id
), version_rows AS (
  INSERT INTO skill_versions (skill_id, version, readme_object_key, changelog, risk_level, risk_description, review_summary, published_at)
  SELECT id, '1.2.0', 'skills/codex-review-helper/1.2.0/readme.md', 'P1 seed', 'low', '低风险：不含可执行二进制。', 'P1 审核通过：仅包含提示词和 README。', now() FROM upsert_skill WHERE skill_id = 'codex-review-helper'
  UNION ALL
  SELECT id, '0.9.0', 'skills/design-guideline-lite/0.9.0/readme.md', 'P1 seed', 'unknown', NULL, NULL, now() FROM upsert_skill WHERE skill_id = 'design-guideline-lite'
  UNION ALL
  SELECT id, '2.0.1', 'skills/legacy-dept-runbook/2.0.1/readme.md', 'P1 seed', 'medium', NULL, '下架验证数据', now() FROM upsert_skill WHERE skill_id = 'legacy-dept-runbook'
  ON CONFLICT (skill_id, version) DO UPDATE SET changelog = EXCLUDED.changelog
  RETURNING id, skill_id, version
), packages AS (
  INSERT INTO skill_packages (id, skill_version_id, bucket, object_key, sha256, size_bytes, file_count)
  SELECT 'pkg_' || s.skill_id || '_' || replace(v.version, '.', '_'), v.id, 'skill-packages', 'skills/' || s.skill_id || '/' || v.version || '/package.zip', 'sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', 102400, 12
  FROM version_rows v
  JOIN skills s ON s.id = v.skill_id
  ON CONFLICT (id) DO UPDATE SET sha256 = EXCLUDED.sha256, size_bytes = EXCLUDED.size_bytes, file_count = EXCLUDED.file_count
  RETURNING skill_version_id
)
UPDATE skills s
SET current_version_id = v.id
FROM version_rows v
WHERE s.id = v.skill_id;

INSERT INTO skill_tags (skill_id, tag)
SELECT s.id, tag
FROM skills s
CROSS JOIN LATERAL unnest(CASE s.skill_id
  WHEN 'codex-review-helper' THEN ARRAY['codex', 'review', 'quality']
  WHEN 'design-guideline-lite' THEN ARRAY['design', 'restricted']
  ELSE ARRAY['ops', 'delisted']
END) AS tag
ON CONFLICT DO NOTHING;

INSERT INTO skill_tool_compatibilities (skill_id, tool_id, system)
SELECT s.id, tool_id, system
FROM skills s
CROSS JOIN LATERAL (VALUES
  ('codex', 'macos'), ('codex', 'windows'), ('codex', 'linux'), ('custom_directory', 'macos'), ('custom_directory', 'windows'), ('custom_directory', 'linux')
) AS compatibility(tool_id, system)
WHERE s.skill_id = 'codex-review-helper'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (id, user_id, type, title, summary, object_type, object_id, read_at)
VALUES
  ('n_001', 'u_001', 'connection_restored', '服务连接已恢复', 'Desktop 已重新连接到企业内网 API。', 'connection', NULL, NULL),
  ('n_002', 'u_001', 'skill_update_available', 'Skill 有可用更新', 'Codex Review Helper 有新版本可安装。', 'skill', 'codex-review-helper', now())
ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary, read_at = EXCLUDED.read_at;

SELECT refresh_skill_search_document(id) FROM skills;

COMMIT;
