import assert from "node:assert/strict";
import test from "node:test";
import { getAPIBase, P1ApiError, requestJSON } from "../src/services/p1Client/core.ts";
import { createClientUpdatesClient } from "../src/services/p1Client/clientUpdates.ts";
import { createDesktopSyncClient } from "../src/services/p1Client/desktopSync.ts";
import { isConnectionUnavailableError, isServerUnavailableError } from "../src/services/p1Client/shared.ts";

class MemoryStorage {
  #map = new Map<string, string>();

  getItem(key: string) {
    return this.#map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.#map.set(key, String(value));
  }

  removeItem(key: string) {
    this.#map.delete(key);
  }
}

function installWindow(apiBase?: string) {
  const storage = new MemoryStorage();
  if (apiBase !== undefined) {
    storage.setItem("enterprise-agent-hub:p1-api-base", apiBase);
  }
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      setTimeout,
      clearTimeout,
    },
  });
  return () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: previousWindow,
    });
  };
}

test("getAPIBase leaves the service URL empty when no address is configured", () => {
  const restoreWindow = installWindow();

  try {
    assert.equal(getAPIBase(), "");
  } finally {
    restoreWindow();
  }
});

test("requestJSON uses the configured service URL without rewriting port", async () => {
  const restoreWindow = installWindow("http://127.0.0.1:3000");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL) => {
    assert.equal(String(input), "http://127.0.0.1:3000/auth/login");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }) as typeof fetch;

  try {
    await assert.doesNotReject(() => requestJSON("/auth/login", { method: "POST" }));
  } finally {
    globalThis.fetch = previousFetch;
    restoreWindow();
  }
});

test("requestJSON turns hung requests into a retryable timeout error", async () => {
  const restoreWindow = installWindow("http://127.0.0.1:3000");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = ((_: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Request timed out", "AbortError")),
        { once: true }
      );
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => requestJSON("/auth/login", { method: "POST", timeoutMs: 10 }),
      (error: unknown) => {
        assert.ok(error instanceof P1ApiError);
        assert.equal(error.code, "server_unavailable");
        assert.equal(error.retryable, true);
        assert.match(error.message, /请求超时/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = previousFetch;
    restoreWindow();
  }
});

test("requestJSON turns fetch failures into a retryable connectivity error", async () => {
  const restoreWindow = installWindow("http://127.0.0.1:3000");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new TypeError("fetch failed"))) as typeof fetch;

  try {
    await assert.rejects(
      () => requestJSON("/auth/login", { method: "POST", timeoutMs: 10 }),
      (error: unknown) => {
        assert.ok(error instanceof P1ApiError);
        assert.equal(error.code, "server_unavailable");
        assert.equal(error.retryable, true);
        assert.match(error.message, /无法连接服务/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = previousFetch;
    restoreWindow();
  }
});

test("connection unavailable classification only covers missing HTTP responses", () => {
  assert.equal(
    isConnectionUnavailableError(
      new P1ApiError({
        status: 0,
        code: "server_unavailable",
        message: "无法连接服务",
        retryable: true
      })
    ),
    true
  );
  assert.equal(
    isConnectionUnavailableError(
      new P1ApiError({
        status: 503,
        code: "server_unavailable",
        message: "服务端暂时不可用",
        retryable: true
      })
    ),
    false
  );
  assert.equal(
    isServerUnavailableError(
      new P1ApiError({
        status: 503,
        code: "server_unavailable",
        message: "服务端暂时不可用",
        retryable: true
      })
    ),
    true
  );
});

test("syncLocalEvents normalizes legacy p1-local timestamps before upload", async () => {
  const restoreWindow = installWindow("http://127.0.0.1:3000");
  window.localStorage.setItem("enterprise-agent-hub:p1-token", "token-1");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://127.0.0.1:3000/desktop/local-events");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      deviceID: "desktop_p1_default",
      events: [
        {
          eventID: "evt-legacy-time",
          eventType: "enable_result",
          skillID: "codex-review-helper",
          version: "1.2.0",
          targetType: "tool",
          targetID: "codex",
          targetPath: "/Users/example/.codex/skills",
          requestedMode: "copy",
          resolvedMode: "copy",
          fallbackReason: null,
          occurredAt: new Date(1776611970174).toISOString(),
          result: "success"
        }
      ]
    });
    return new Response(
      JSON.stringify({ acceptedEventIDs: ["evt-legacy-time"], rejectedEvents: [], serverStateChanged: true }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  }) as typeof fetch;

  try {
    const result = await createDesktopSyncClient().syncLocalEvents([
      {
        eventID: "evt-legacy-time",
        eventType: "enable_result",
        skillID: "codex-review-helper",
        version: "1.2.0",
        targetType: "tool",
        targetID: "codex",
        targetPath: "/Users/example/.codex/skills",
        requestedMode: "copy",
        resolvedMode: "copy",
        fallbackReason: null,
        occurredAt: "p1-local-1776611970174",
        result: "success"
      }
    ]);
    assert.deepEqual(result.acceptedEventIDs, ["evt-legacy-time"]);
  } finally {
    globalThis.fetch = previousFetch;
    restoreWindow();
  }
});

test("pushAdminClientUpdateExe creates, uploads, and publishes a stable exe release", async () => {
  const restoreWindow = installWindow("http://127.0.0.1:3000");
  window.localStorage.setItem("enterprise-agent-hub:p1-token", "token-1");
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: BodyInit | null | undefined }> = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET", body: init?.body });

    if (url.endsWith("/admin/client-updates/releases") && (init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.endsWith("/admin/client-updates/releases") && init?.method === "POST") {
      assert.deepEqual(JSON.parse(String(init.body)), {
        version: "1.2.3",
        platform: "windows",
        arch: "x64",
        channel: "stable",
        mandatory: false,
        rolloutPercent: 100,
        releaseNotes: "客户端更新 1.2.3"
      });
      return new Response(JSON.stringify({ releaseID: "rel-123" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.endsWith("/admin/client-updates/releases/rel-123/artifact") && init?.method === "POST") {
      assert.ok(init.body instanceof FormData);
      assert.equal(init.body.get("packageName"), "EnterpriseAgentHub-1.2.3.exe");
      assert.equal(init.body.get("signatureStatus"), "unknown");
      assert.ok(init.body.get("file") instanceof File);
      return new Response(JSON.stringify({ releaseID: "rel-123" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.endsWith("/admin/client-updates/releases/rel-123/publish") && init?.method === "POST") {
      assert.deepEqual(JSON.parse(String(init.body)), {
        mandatory: false,
        rolloutPercent: 100
      });
      return new Response(JSON.stringify({ releaseID: "rel-123", version: "1.2.3", status: "published" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: { message: "unexpected request" } }), { status: 500 });
  }) as typeof fetch;

  try {
    const result = await createClientUpdatesClient().pushAdminClientUpdateExe({
      file: new File(["MZ"], "EnterpriseAgentHub-1.2.3.exe"),
      version: " 1.2.3 "
    });
    assert.equal(result.releaseID, "rel-123");
    assert.deepEqual(
      calls.map((call) => [call.method, new URL(call.url).pathname]),
      [
        ["GET", "/admin/client-updates/releases"],
        ["POST", "/admin/client-updates/releases"],
        ["POST", "/admin/client-updates/releases/rel-123/artifact"],
        ["POST", "/admin/client-updates/releases/rel-123/publish"]
      ]
    );
  } finally {
    globalThis.fetch = previousFetch;
    restoreWindow();
  }
});
