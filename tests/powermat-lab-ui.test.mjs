import test from "node:test";
import assert from "node:assert/strict";
import { createStepGate, makeExperimentRecord } from "../powermat-lab-ui.js";

test("one observed step count produces one event and repeated counts produce none", () => {
  const gate = createStepGate();
  assert.equal(gate(1), 1);
  assert.equal(gate(1), 0);
  assert.equal(gate(2), 1);
});
test("step gate handles reset without generating a negative event", () => {
  const gate = createStepGate();
  assert.equal(gate(4), 4);
  assert.equal(gate(0), 0);
  assert.equal(gate(1), 1);
});
test("experiment records are clearly labeled simulated and contain finite metrics", () => {
  const run = makeExperimentRecord({timestamp:"2026-10-19T00:00:00.000Z",steps:3,metrics:{voltageV:2.4,energyJ:1.2,currentMA:4}});
  assert.equal(run.dataType, "SIMULATED");
  assert.equal(run.status, "SIMULATED — NOT A PHYSICAL TEST");
  assert.equal(run.steps, 3);
  assert.equal(run.finalCapacitorVoltageV, 2.4);
  assert.equal(run.estimatedStoredEnergyJ, 1.2);
});
test("invalid experiment metrics are sanitized rather than leaking NaN or Infinity", () => {
  const run = makeExperimentRecord({steps:-4,metrics:{voltageV:Infinity,energyJ:NaN,currentMA:"bad"}});
  assert.equal(run.steps, 0);
  assert.equal(run.finalCapacitorVoltageV, 0);
  assert.equal(run.estimatedStoredEnergyJ, 0);
  assert.equal(run.estimatedLoadCurrentMA, 0);
});
