const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

test("middleware keeps the exact owner-authentication allowlist", () => {
  const middleware = read("middleware.js");
  assert.match(middleware, /path === "\/" \|\| path === "\/login\.html" \|\| path === "\/api\/login"/);
});

test("VisualRobotics APIs require an authenticated owner", () => {
  for (const file of ["api/visualrobotics.js", "api/esp32-compile.js"]) {
    assert.match(read(file), /if \(!ownerAuthenticated\(req\)\) return res\.status\(401\)/, file);
  }
});

test("browser-delivered root files do not expose secret values or secret configuration", () => {
  const files = fs.readdirSync(root).filter(name => /\.html$|\.js$/.test(name) && name !== "middleware.js");
  for (const name of files) {
    const content = read(name);
    assert.doesNotMatch(content, /SERVICE_ROLE|SESSION_SECRET|OWNER_PASSWORD_HASH|OWNER_USERNAME/, name);
    // dashboard.html intentionally documents the required environment-variable NAME; no value is present.
    if (name !== "dashboard.html") assert.doesNotMatch(content, /GITHUB_ACTIONS_TOKEN/, name);
  }
});

test("native build workflow passes the sketch through SKETCH_INPUT exactly once", () => {
  const workflow = read(".github/workflows/esp32-compile.yml");
  assert.equal((workflow.match(/\$\{\{ inputs\.sketch \}\}/g) || []).length, 1);
  assert.match(workflow, /SKETCH_INPUT:\s*\$\{\{ inputs\.sketch \}\}/);
});

test("compiler API only accepts the supported ESP32 targets", () => {
  assert.match(read("api/esp32-compile.js"), /!\["esp32",\s*"esp32c3"\]\.includes\(board\)/);
});

test("lab clearly states that the browser simulator does not execute compiled firmware", () => {
  assert.match(read("visualrobotics-lab.html"), /does not execute the compiled binary/);
});
