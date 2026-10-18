import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, validateConfig, energyOf, rectifiedVoltage, motionAt, createState, runSingleStep, runModelTests } from "../powermat-model.js";

test("default configuration is valid", () => assert.equal(validateConfig({...DEFAULT_CONFIG}), true));
test("configuration bounds reject invalid capacitance", () => assert.throws(() => validateConfig({...DEFAULT_CONFIG, capacitance: 0})));
test("initial voltage cannot exceed capacitor rating", () => assert.throws(() => validateConfig({...DEFAULT_CONFIG, initialVoltage: 5, rating: 4})));
test("rectifier output is polarity-independent", () => assert.equal(rectifiedVoltage(4, .65), rectifiedVoltage(-4, .65)));
test("bridge blocks voltage below diode threshold", () => assert.equal(rectifiedVoltage(1, .65), 0));
test("stored energy follows one-half C V squared", () => assert.equal(energyOf(10, 3), 45));
test("footstep displacement peaks at midpoint", () => assert.ok(Math.abs(motionAt(DEFAULT_CONFIG.duration/2, 0, DEFAULT_CONFIG).x - DEFAULT_CONFIG.travelMm/1000) < 1e-12));
test("single step advances time and yields finite outputs", () => {
  const s = runSingleStep(DEFAULT_CONFIG);
  assert.ok(s.t >= DEFAULT_CONFIG.duration);
  for (const key of ["vc", "energy", "emf", "rectified", "chargeCurrent", "ledCurrent", "losses"]) assert.ok(Number.isFinite(s[key]), key);
});
test("capacitor remains within voltage rating", () => {
  const c = {...DEFAULT_CONFIG, initialVoltage: 0};
  const s = runSingleStep(c, createState(c));
  assert.ok(s.vc >= 0 && s.vc <= c.rating);
});
test("model invariant suite reports all passes", () => {
  const results = runModelTests(DEFAULT_CONFIG);
  assert.ok(results.length >= 10);
  assert.deepEqual(results.filter(r => r.status !== "PASS"), []);
});
