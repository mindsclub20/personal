import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../visualrobotics-lab.html", import.meta.url), "utf8");

test("lab exposes internal 3D simulation, parts gallery, and expenditure controls", () => {
  for (const id of ["runBtn", "partsBtn", "expenditureBtn", "sim3dScene", "partsModal", "expenditureModal"]) {
    assert.match(html, new RegExp('id="' + id + '"'), "missing " + id);
  }
});

test("simulation has a self-contained animated engineering scene", () => {
  assert.match(html, /start3DAnimation\(\)/);
  assert.match(html, /stop3DAnimation\(\)/);
  assert.match(html, /class="sim3d-stage"/);
  assert.match(html, /sim3d-platform/);
  assert.match(html, /sim3d-coil/);
  assert.match(html, /sim3d-capacitor/);
});

test("parts gallery draws inline component illustrations and expenditure uses current inventory", () => {
  assert.match(html, /function partArt\(/);
  assert.match(html, /function openPartsGallery\(/);
  assert.match(html, /function openExpenditure\(/);
  assert.match(html, /project\.parts\.reduce/);
  assert.match(html, /data:image|<svg/);
});


test("simulator uses a focused engineering workspace instead of a crowded card stack", () => {
  for (const marker of ['class="lab-shell"', 'class="lab-sidebar"', 'class="lab-workspace"', 'class="lab-inspector"', 'class="sim-dock"', 'class="row lab-canvas-header"']) {
    assert.ok(html.includes(marker), "missing workspace marker " + marker);
  }
  assert.ok(html.includes('aria-label="Simulation controls"'));
  assert.ok(html.includes('@media(max-width:900px)'));
});
