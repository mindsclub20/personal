export const DEFAULT_CONFIG = Object.freeze({
  force: 600, travelMm: 8, stiffnessKNm: 75, damping: 45, duration: 0.35,
  turns: 1500, peakFluxMWb: 0.45, coilResistance: 18, internalResistance: 2,
  diodeDrop: 0.65, loadResistance: 220, capacitance: 10, initialVoltage: 0,
  rating: 5.5, esr: 0.15, leakageMA: 0.1, ledForwardVoltage: 2,
  speed: 1, rate: 1.5
});

const LIMITS = {
  force:[100,1200], travelMm:[2,20], stiffnessKNm:[20,180], damping:[5,150],
  duration:[0.15,0.8], turns:[100,20000], peakFluxMWb:[0.01,10],
  coilResistance:[0.1,200], internalResistance:[0.1,200], diodeDrop:[0.1,1.5],
  loadResistance:[10,5000], capacitance:[0.1,100], initialVoltage:[0,5.5],
  rating:[0.5,5.5], esr:[0.01,20], leakageMA:[0,10],
  ledForwardVoltage:[1,3.5], speed:[0.25,3], rate:[0.25,3]
};
export function validateConfig(input) {
  for (const [key, range] of Object.entries(LIMITS)) {
    const n = Number(input[key]);
    if (!Number.isFinite(n) || n < range[0] || n > range[1]) {
      throw new Error(key + " must be between " + range[0] + " and " + range[1] + ".");
    }
  }
  if (input.initialVoltage > input.rating) throw new Error("Initial voltage must not exceed the capacitor rating.");
  return true;
}
export function energyOf(capacitance, voltage) {
  return 0.5 * capacitance * voltage * voltage;
}
export function rectifiedVoltage(emf, diodeDrop) {
  return Math.max(0, Math.abs(emf) - 2 * diodeDrop);
}
export function motionAt(time, stepStart, c) {
  if (stepStart === null || time < stepStart) return {x:0, velocity:0};
  const u = (time - stepStart) / c.duration;
  if (u < 0 || u > 1) return {x:0, velocity:0};
  const d = c.travelMm / 1000;
  if (u <= 0.5) return {x:d * (0.5 - 0.5 * Math.cos(2 * Math.PI * u)), velocity:d * Math.PI * Math.sin(2 * Math.PI * u) / c.duration};
  const q = u - 0.5;
  return {x:d * (0.5 + 0.5 * Math.cos(2 * Math.PI * q)), velocity:-d * Math.PI * Math.sin(2 * Math.PI * q) / c.duration};
}
export function createState(c) {
  validateConfig(c);
  const e = energyOf(c.capacitance, c.initialVoltage);
  return {t:0,x:0,velocity:0,vc:c.initialVoltage,emf:0,rectified:0,chargeCurrent:0,ledCurrent:0,
    energy:e,mechanicalWork:0,losses:0,peakChargeCurrent:0,steps:0,stepStart:null,
    nextStepAt:0,stepStartEnergy:e,stepWork:0,stepChanges:[],samples:[]};
}
export function triggerStep(s) {
  if (s.stepStart !== null) return false;
  s.stepStart = s.t; s.stepStartEnergy = s.energy; s.stepWork = 0; s.steps += 1;
  return true;
}
export function advance(s, c, dt) {
  if (!Number.isFinite(dt) || dt < 0 || dt > 1) throw new Error("Time increment must be in [0, 1] seconds.");
  let remaining = dt;
  while (remaining > 1e-10) {
    const h = Math.min(0.002, remaining);
    const oldX = s.x;
    const m = motionAt(s.t, s.stepStart, c);
    s.x = m.x; s.velocity = m.velocity;
    const dx = s.x - oldX;
    if (dx > 0) {
      // The motion is prescribed; estimate input work as applied force × compression travel.
      const inputWork = c.force * dx;
      s.stepWork += inputWork;
      s.mechanicalWork += inputWork;
    }
    const d = c.travelMm / 1000;
    const flux = c.peakFluxMWb / 1000;
    const dPhidx = -flux * Math.PI / d * Math.sin(Math.PI * s.x / d);
    s.emf = -c.turns * dPhidx * s.velocity;
    s.rectified = rectifiedVoltage(s.emf, c.diodeDrop);
    const resistance = c.coilResistance + c.internalResistance + c.esr;
    s.chargeCurrent = s.rectified > s.vc ? Math.max(0,(s.rectified-s.vc)/resistance) : 0;
    s.ledCurrent = s.vc > c.ledForwardVoltage ? Math.max(0,(s.vc-c.ledForwardVoltage)/c.loadResistance) : 0;
    const leakage = c.leakageMA / 1000;
    s.vc = Math.max(0, Math.min(c.rating, s.vc + (s.chargeCurrent-s.ledCurrent-leakage)/c.capacitance*h));
    s.energy = energyOf(c.capacitance, s.vc);
    s.losses += h * (s.chargeCurrent*s.chargeCurrent*resistance + s.chargeCurrent*2*c.diodeDrop);
    s.peakChargeCurrent = Math.max(s.peakChargeCurrent,s.chargeCurrent);
    s.t += h;
    s.samples.push({t:s.t,emf:s.emf,rectified:s.rectified,chargeCurrent:s.chargeCurrent,ledCurrent:s.ledCurrent,vc:s.vc,energy:s.energy});
    if (s.samples.length > 6000) s.samples.shift();
    if (s.stepStart !== null && s.t - s.stepStart > c.duration) {
      s.stepChanges.push({time:s.t,step:s.steps,netJ:s.energy-s.stepStartEnergy,workJ:s.stepWork,voltage:s.vc,energy:s.energy});
      if (s.stepChanges.length > 500) s.stepChanges.shift();
      s.stepStart = null;
    }
    remaining -= h;
  }
  return s;
}
export function runSingleStep(c, initialState) {
  const s = initialState || createState(c);
  if (!triggerStep(s)) throw new Error("A footstep is already in progress.");
  const duration = c.duration + 0.01;
  for (let t = 0; t < duration; t += 0.002) advance(s,c,Math.min(0.002,duration-t));
  return s;
}
export function runModelTests(c = DEFAULT_CONFIG) {
  const results = [];
  const test = (name, fn) => { try { results.push({name,status:fn() ? "PASS":"FAIL"}); } catch (e) { results.push({name,status:"FAIL",detail:String(e.message||e)}); } };
  test("Rejects zero capacitance", () => { try { validateConfig({...c,capacitance:0}); return false; } catch { return true; } });
  test("Rejects initial voltage above rating", () => { try { validateConfig({...c,initialVoltage:5.5,rating:3}); return false; } catch { return true; } });
  test("Rectifier handles positive and negative polarity", () => rectifiedVoltage(4,0.65)===rectifiedVoltage(-4,0.65));
  test("Bridge blocks voltage below two diode drops", () => rectifiedVoltage(1,0.65)===0);
  test("Capacitor energy is one-half C V squared", () => energyOf(10,3)===45);
  test("Motion is zero before and after a footstep", () => motionAt(0,null,c).x===0 && motionAt(2,0,c).x===0);
  test("Motion peaks at configured displacement midpoint", () => Math.abs(motionAt(c.duration/2,0,c).x-c.travelMm/1000)<1e-12);
  test("Zero velocity yields zero induced emf", () => { const s=createState(c); advance(s,c,0.002); return s.emf===0; });
  test("Model stays finite during a full step", () => { const s=runSingleStep(c); return [s.t,s.vc,s.energy,s.losses,s.mechanicalWork].every(Number.isFinite); });
  test("Applied force and compression produce positive input work", () => { const s=runSingleStep(c); return s.mechanicalWork > 0 && s.stepChanges[0].workJ > 0; });
  test("Capacitor voltage never exceeds its rating", () => { const s=createState({...c,initialVoltage:0}); runSingleStep({...c,initialVoltage:0},s); return s.vc<=c.rating; });
  test("Identical input produces deterministic state", () => { const a=runSingleStep(c), b=runSingleStep(c); return JSON.stringify(a)===JSON.stringify(b); });
  return results;
}
