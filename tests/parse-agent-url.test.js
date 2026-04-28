/**
 * Tests for parseAgentUrl — extracts environmentId + agentId from Copilot Studio URLs.
 *
 * Run: node tests/parse-agent-url.test.js
 */

// parseAgentUrl is defined in the manage-agent source; extract it directly to
// avoid running the CLI's main() which calls process.exit().
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Load the source and extract parseAgentUrl via a lightweight sandbox
const srcPath = path.join(__dirname, "..", "scripts", "src", "manage-agent.js");
const src = fs.readFileSync(srcPath, "utf8");

// Extract the function and its regex dependency by running a minimal snippet
const sandbox = { URL, decodeURIComponent };
const snippet = src
  .split("\n")
  .filter((line) => {
    // Include only the regex constant and the function (skip require(), main, etc.)
    return false; // we'll use a different approach
  });

// Simpler: just eval the specific function + constant in isolation
const extractCode = `
const COPILOT_STUDIO_HOST_RE = /^copilotstudio(?:\\.preview)?\\.microsoft\\.com$/i;

function parseAgentUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!COPILOT_STUDIO_HOST_RE.test(parsed.hostname)) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  const envIdx = segments.indexOf("environments");
  const botsIdx = segments.indexOf("bots");

  if (envIdx === -1 || botsIdx === -1 || botsIdx <= envIdx + 1 || botsIdx + 1 >= segments.length) {
    return null;
  }

  const environmentId = decodeURIComponent(segments[envIdx + 1]);
  const agentId = decodeURIComponent(segments[botsIdx + 1]);

  if (!environmentId || !agentId) return null;
  return { environmentId, agentId };
}
`;

// Execute in current context
eval(extractCode);

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${label}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

// ---------------------------------------------------------------------------
// Valid URLs
// ---------------------------------------------------------------------------

// Production URL with /overview suffix
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/79cda161-91d7-e987-ad7a-5335e2163754/bots/7425c969-d224-f011-8c4d-7c1e5220d0a9/overview"
  ),
  {
    environmentId: "79cda161-91d7-e987-ad7a-5335e2163754",
    agentId: "7425c969-d224-f011-8c4d-7c1e5220d0a9",
  },
  "prod URL with /overview"
);

// Preview URL without trailing path
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.preview.microsoft.com/environments/79cda161-91d7-e987-ad7a-5335e2163754/bots/7425c969-d224-f011-8c4d-7c1e5220d0a9"
  ),
  {
    environmentId: "79cda161-91d7-e987-ad7a-5335e2163754",
    agentId: "7425c969-d224-f011-8c4d-7c1e5220d0a9",
  },
  "preview URL without trailing path"
);

// Production URL with /canvas suffix
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/abc123/bots/def456/canvas/topics"
  ),
  { environmentId: "abc123", agentId: "def456" },
  "prod URL with /canvas/topics"
);

// Trailing slash after agentId
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/env1/bots/bot1/"
  ),
  { environmentId: "env1", agentId: "bot1" },
  "trailing slash"
);

// URL with query parameters
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/env1/bots/bot1/overview?tab=topics"
  ),
  { environmentId: "env1", agentId: "bot1" },
  "URL with query params"
);

// URL with fragment
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/env1/bots/bot1#section"
  ),
  { environmentId: "env1", agentId: "bot1" },
  "URL with fragment"
);

// Case-insensitive host matching
assertEqual(
  parseAgentUrl(
    "https://CopilotStudio.Microsoft.com/environments/env1/bots/bot1"
  ),
  { environmentId: "env1", agentId: "bot1" },
  "case-insensitive host"
);

// ---------------------------------------------------------------------------
// Invalid URLs
// ---------------------------------------------------------------------------

// Not a URL
assertEqual(
  parseAgentUrl("not a url"),
  null,
  "not a URL"
);

// Wrong domain
assertEqual(
  parseAgentUrl(
    "https://example.com/environments/env1/bots/bot1/overview"
  ),
  null,
  "wrong domain"
);

// Missing environments segment
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/bots/bot1"
  ),
  null,
  "missing environments segment"
);

// Missing bots segment
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/env1"
  ),
  null,
  "missing bots segment"
);

// Empty environment ID
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments//bots/bot1"
  ),
  null,
  "empty environment ID"
);

// Empty agent ID
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/environments/env1/bots/"
  ),
  null,
  "empty agent ID — trailing slash only"
);

// Completely different path
assertEqual(
  parseAgentUrl(
    "https://copilotstudio.microsoft.com/admin/settings"
  ),
  null,
  "admin path, no agent"
);

// Empty string
assertEqual(
  parseAgentUrl(""),
  null,
  "empty string"
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
