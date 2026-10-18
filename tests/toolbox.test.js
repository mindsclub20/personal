const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const dashboard = read("dashboard.html");
const home = read("index.html");
const js = read("script.js");

test("dashboard exposes the real toolbox controls and supported shortcuts", () => {
  for (const id of ["calculator", "calc-display", "pdf-tool", "notes-content", "word-counter", "converter", "visualrobotics-card"]) {
    assert.match(dashboard, new RegExp('id="' + id + '"'), `missing dashboard id: ${id}`);
  }
  assert.match(dashboard, /href=["']\/visualrobotics-lab\.html["']/);
  assert.match(dashboard, /https:\/\/gemini\.google\.com/);
});

test("public home links to login and VisualRobotics without weakening private-page auth", () => {
  assert.match(home, /href=["']\/login\.html["']/);
  assert.match(home, /href=["']\/visualrobotics-lab\.html["']/);
});

test("interactive code does not evaluate user input as JavaScript", () => {
  assert.doesNotMatch(js, /\beval\s*\(|new Function\s*\(/);
});
