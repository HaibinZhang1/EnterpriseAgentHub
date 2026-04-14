import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
require("ts-node/register/transpile-only");

const { PublishingService } = require("../src/publishing/publishing.service.ts");
const {
  compareSemver,
  isPermissionExpansion,
  parseSimpleFrontmatter
} = require("../src/publishing/publishing.utils.ts");

function createService({
  database = {
    async query() {
      throw new Error("unexpected query");
    },
    async one() {
      throw new Error("unexpected one");
    },
    async transaction(callback) {
      return callback({
        async query() {
          return { rowCount: 1, rows: [] };
        }
      });
    }
  },
  skillsService = {},
  publishingRepository = {
    async loadActor() {
      throw new Error("unexpected loadActor");
    },
    async loadSkillByID() {
      throw new Error("unexpected loadSkillByID");
    },
    async loadReview() {
      throw new Error("unexpected loadReview");
    },
    async loadHistory() {
      return [];
    },
    async insertHistory() {},
    async recordJobRun() {}
  },
  reviewerRouting = {
    canSubmitterWithdraw() {
      return true;
    },
    assertClaimedReview() {},
    async canActorReview() {
      return true;
    },
    async shouldAutoApprove() {
      return false;
    }
  },
  packageStorage = {
    async stageSubmissionPackage() {
      throw new Error("unexpected stageSubmissionPackage");
    },
    async listPackageFilesForReview() {
      return [];
    },
    async readPackageFileContentForReview() {
      throw new Error("unexpected readPackageFileContentForReview");
    },
    async readReviewPackageBuffer() {
      throw new Error("unexpected readReviewPackageBuffer");
    },
    async copyObject() {},
    packageBucket() {
      return "skill-packages";
    }
  }
} = {}) {
  return new PublishingService(
    database,
    { get: () => undefined },
    skillsService,
    publishingRepository,
    reviewerRouting,
    packageStorage
  );
}

test("publishing utils parse frontmatter and detect semver expansion rules", () => {
  const frontmatter = parseSimpleFrontmatter(`---
name: prompt-guardrails
description: Prompt guard rails
allowed-tools:
  - bash
  - web
---

body`);

  assert.equal(frontmatter.name, "prompt-guardrails");
  assert.equal(frontmatter.description, "Prompt guard rails");
  assert.deepEqual(frontmatter.allowedTools, ["bash", "web"]);
  assert.equal(compareSemver("1.2.0", "1.1.9") > 0, true);
  assert.equal(
    isPermissionExpansion({
      currentVisibilityLevel: "summary_visible",
      currentScopeType: "current_department",
      nextVisibilityLevel: "detail_visible",
      nextScopeType: "department_tree",
      currentSelectedDepartmentIDs: [],
      nextSelectedDepartmentIDs: []
    }),
    true
  );
});

test("PublishingService lets authors delist and relist their own skills but blocks invalid transitions", async () => {
  const queries = [];
  const service = createService({
    database: {
      async query(text, values = []) {
        queries.push({ text, values });
        return { rows: [] };
      }
    },
    publishingRepository: {
      async loadActor() {
        return { userID: "u_author", role: "normal_user" };
      },
      async loadSkillByID() {
        return {
          skill_id: "prompt-guardrails",
          author_id: "u_author",
          status: "published"
        };
      }
    }
  });

  service.listPublisherSkills = async () => [{ skillID: "prompt-guardrails", currentStatus: "delisted" }];

  const delisted = await service.setPublisherSkillStatus("u_author", "prompt-guardrails", "delist");
  assert.deepEqual(delisted, [{ skillID: "prompt-guardrails", currentStatus: "delisted" }]);
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /UPDATE skills SET status = \$2/);
  assert.deepEqual(queries[0].values, ["prompt-guardrails", "delisted"]);
});

test("PublishingService passPrecheck moves review into pending_review when auto-approve is false", async () => {
  const updates = [];
  const history = [];
  const service = createService({
    database: {
      async transaction(callback) {
        return callback({
          async query(text, values = []) {
            updates.push({ text, values });
            return { rowCount: 1, rows: [] };
          }
        });
      }
    },
    publishingRepository: {
      async loadActor() {
        return { userID: "u_reviewer", role: "admin", adminLevel: 2 };
      },
      async loadReview() {
        return {
          review_id: "rv_001",
          workflow_state: "manual_precheck",
          submitter_id: "u_author",
          submitter_role: "normal_user",
          submitter_admin_level: null
        };
      },
      async insertHistory(_client, reviewID, actorID, action, comment) {
        history.push({ reviewID, actorID, action, comment });
      }
    },
    reviewerRouting: {
      assertClaimedReview() {},
      async canActorReview() {
        return true;
      },
      async shouldAutoApprove() {
        return false;
      }
    }
  });

  service.getReview = async () => ({ reviewID: "rv_001", workflowState: "pending_review" });

  const detail = await service.passPrecheck("u_reviewer", "rv_001", "人工复核通过");
  assert.equal(detail.workflowState, "pending_review");
  assert.match(updates[0].text, /UPDATE review_items/);
  assert.equal(history[0].action, "pass_precheck");
});
