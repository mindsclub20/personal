const STORAGE_KEY = "enrose-powermat-lab-v1";
export function createStepGate() {
  let lastCount = 0;
  return count => {
    const next = Number(count);
    if (!Number.isInteger(next) || next < 0) return 0;
    if (next < lastCount) { lastCount = next; return 0; }
    if (next === lastCount) return 0;
    const delta = next - lastCount;
    lastCount = next;
    return delta;
  };
}
export function makeExperimentRecord({ config = {}, metrics = {}, steps = 0, modelVersion = "powermat-model-v1", timestamp = new Date().toISOString() } = {}) {
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  return {
    id: `SIM-${Date.parse(timestamp) || 0}-${Math.max(0, Math.floor(finite(steps)))}`,
    timestamp, modelVersion, dataType: "SIMULATED",
    parameters: { ...config },
    steps: Math.max(0, Math.floor(finite(steps))),
    finalCapacitorVoltageV: finite(metrics.voltageV),
    estimatedStoredEnergyJ: finite(metrics.energyJ),
    estimatedLoadCurrentMA: finite(metrics.currentMA),
    status: "SIMULATED — NOT A PHYSICAL TEST"
  };
}
const $ = id => document.getElementById(id);
function init() {
  const mat = $("pmInteractiveMat");
  if (!mat) return;
  const status = $("pmFootStatus"), counter = $("pmFootCount"), feet = [...document.querySelectorAll(".pm-foot")];
  let lastFoot = -1, animationTimer = 0, mode = "manual";
  const gate = createStepGate();
  function animateStep(count) {
    const which = (count - 1) % 2;
    lastFoot = which;
    feet.forEach((foot, i) => {
      foot.classList.toggle("landing", i === which);
      foot.classList.toggle("muted-foot", i !== which);
    });
    mat.classList.remove("compressed");
    void mat.offsetWidth;
    mat.classList.add("compressed");
    status.textContent = `${which === 0 ? "Left" : "Right"} foot contact · electrical model updated`;
    window.clearTimeout(animationTimer);
    animationTimer = window.setTimeout(() => {
      mat.classList.remove("compressed");
      feet.forEach(foot => foot.classList.remove("landing"));
    }, 360);
  }
  function readSteps() {
    const count = Number($("steps")?.textContent || 0);
    const delta = gate(count);
    if (!delta) return;
    counter.textContent = String(count);
    for (let i = 0; i < Math.min(delta, 2); i++) animateStep(count - delta + i + 1);
    document.dispatchEvent(new CustomEvent("powermat:footstep", { detail: { count, delta, mode } }));
  }
  const observer = new MutationObserver(readSteps);
  if ($("steps")) observer.observe($("steps"), { childList: true, characterData: true, subtree: true });
  $("pmManualStep")?.addEventListener("click", () => { mode = "manual"; $("step")?.click(); });
  mat.addEventListener("click", e => {
    if (e.target.closest("button")) return;
    mode = "manual";
    $("step")?.click();
  });
  $("pmAutoStart")?.addEventListener("click", () => { mode = "automatic"; $("start")?.click(); status.textContent = "Automatic walking active · each model event animates one foot."; });
  $("pmPause")?.addEventListener("click", () => { $("pause")?.click(); status.textContent = "Paused · no new automatic steps."; });
  $("pmResume")?.addEventListener("click", () => { mode = "automatic"; $("resume")?.click(); });
  $("pmReset")?.addEventListener("click", () => {
    $("reset")?.click(); gate(Number($("steps")?.textContent || 0));
    counter.textContent = "0"; status.textContent = "Reset complete · simulation and step count cleared.";
    feet.forEach(f => f.classList.remove("landing")); mat.classList.remove("compressed");
  });
  const experiments = [];
  const list = $("pmExperimentList");
  const getMetrics = () => ({
    voltageV: Number(($("mCap")?.textContent || "0").replace(/[^d.-]/g, "")) || 0,
    energyJ: Number(($("mEnergy")?.textContent || "0").replace(/[^d.-]/g, "")) || 0,
    currentMA: Number(($("ledI")?.textContent || "0").replace(/[^d.-]/g, "")) || 0
  });
  function renderExperiments() {
    if (!list) return;
    list.replaceChildren();
    if (!experiments.length) { const p=document.createElement("p"); p.className="pm-subtle"; p.textContent="No saved runs yet. Run the model, then save a result."; list.append(p); return; }
    experiments.slice().reverse().forEach(run => {
      const card=document.createElement("article"); card.className="pm-run";
      const title=document.createElement("strong"); title.textContent=run.id;
      const meta=document.createElement("p"); meta.textContent=`${run.steps} steps · ${run.finalCapacitorVoltageV.toFixed(3)} V · ${run.estimatedStoredEnergyJ.toFixed(4)} J`;
      const tag=document.createElement("span"); tag.className="pm-tag"; tag.textContent="SIMULATED";
      card.append(title,tag,meta); list.append(card);
    });
  }
  $("pmSaveExperiment")?.addEventListener("click", () => {
    const config = {};
    ["force","travelMm","stiffnessKNm","damping","duration","turns","peakFluxMWb","coilResistance","internalResistance","diodeDrop","loadResistance","capacitance","initialVoltage","rating","esr","leakageMA","ledForwardVoltage","speed","rate"].forEach(id => { if ($(id)) config[id] = Number($(id).value); });
    const record = makeExperimentRecord({config, metrics:getMetrics(), steps:Number($("steps")?.textContent||0)});
    experiments.push(record);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments)); } catch {}
    renderExperiments();
    $("pmNotebookStatus").textContent = "Saved simulated run locally on this device.";
  });
  $("pmExportExperiments")?.addEventListener("click", () => {
    const rows=[["id","timestamp","modelVersion","dataType","steps","finalCapacitorVoltageV","estimatedStoredEnergyJ","estimatedLoadCurrentMA","status"],...experiments.map(r=>[r.id,r.timestamp,r.modelVersion,r.dataType,r.steps,r.finalCapacitorVoltageV,r.estimatedStoredEnergyJ,r.estimatedLoadCurrentMA,r.status])];
    const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); const a=document.createElement("a"); a.href=url; a.download="powermat-simulated-experiments.csv"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); if(Array.isArray(saved)) { saved.slice(-20).forEach(r=>experiments.push(r)); } } catch {}
  renderExperiments();
  $("pmCompareRuns")?.addEventListener("click", () => {
    $("pmCompareStatus").textContent = experiments.length < 2 ? "Save at least two runs to compare them." : `Comparing ${experiments.length} simulated runs: ${Math.min(...experiments.map(r=>r.estimatedStoredEnergyJ)).toFixed(4)}–${Math.max(...experiments.map(r=>r.estimatedStoredEnergyJ)).toFixed(4)} J stored-energy estimate.`;
  });
  const components = [...document.querySelectorAll("[data-pm-component]")];
  function selectComponent(name) {
    document.querySelectorAll("[data-pm-stage]").forEach(el => el.classList.toggle("active-stage", el.dataset.pmStage === name));
    components.forEach(el => el.classList.toggle("selected-component", el.dataset.pmComponent === name));
    const info = $("pmComponentDetail");
    const source = components.find(el => el.dataset.pmComponent === name);
    if (info && source) info.textContent = source.dataset.description || source.querySelector("h3")?.textContent || "Conceptual component stage.";
  }
  components.forEach(el => el.addEventListener("click", () => selectComponent(el.dataset.pmComponent)));
  document.querySelectorAll("[data-pm-stage]").forEach(el => el.addEventListener("click", () => selectComponent(el.dataset.pmStage)));
  $("pmNotebookSave")?.addEventListener("click", () => {
    const value = $("pmNotebookText")?.value || "";
    try { localStorage.setItem("enrose-powermat-notebook-v1", value); $("pmNotebookStatus").textContent = "Notebook saved locally on this device."; } catch { $("pmNotebookStatus").textContent = "Local save unavailable in this browser."; }
  });
  try { if ($("pmNotebookText")) $("pmNotebookText").value = localStorage.getItem("enrose-powermat-notebook-v1") || "PLANNED: physical prototype and component selection.\nSIMULATED: browser model only.\nIMPLEMENTED IN SOFTWARE: conceptual simulation UI.\nPHYSICALLY TESTED: not yet confirmed.\nVERIFIED: no hardware claims until measurements are recorded."; } catch {}
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
}
