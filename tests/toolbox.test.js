const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "script.js"), "utf8");

test("toolbox provides the requested AI links", () => {
  for (const name of ["ChatGPT", "Gemini", "Claude"]) assert.match(html, new RegExp(name, "i"));
  assert.match(html, /https:\/\/chatgpt\.com/);
  assert.match(html, /https:\/\/gemini\.google\.com/);
  assert.match(html, /https:\/\/claude\.ai/);
});

test("calculator, PDF creator, notes, word counter, and converter are present", () => {
  for (const id of ["calculator", "pdf-tool", "notes-tool", "word-counter", "converter"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /id="calc-display"/);
  assert.match(html, /id="pdf-content"/);
  assert.match(html, /id="notes-content"/);
});

test("interactive code does not evaluate user input as JavaScript", () => {
  assert.match(js, /function parseExpression|const parseExpression|parseExpression/);
  assert.doesNotMatch(js, /\beval\s*\(|new Function\s*\(/);
});

test("PDF export uses a printable document and escapes user text", () => {
  assert.match(js, /window\.open/);
  assert.match(js, /escapeHtml/);
  assert.match(js, /\.print\(/);
});
