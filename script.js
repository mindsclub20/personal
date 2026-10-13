const menuButton=document.querySelector(".menu-toggle");
const navLinks=document.querySelector(".nav-links");
if(menuButton&&navLinks){
  menuButton.addEventListener("click",()=>{const open=navLinks.classList.toggle("open");menuButton.setAttribute("aria-expanded",String(open));menuButton.setAttribute("aria-label",open?"Close navigation":"Open navigation");});
  navLinks.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{navLinks.classList.remove("open");menuButton.setAttribute("aria-expanded","false");menuButton.setAttribute("aria-label","Open navigation");}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){navLinks.classList.remove("open");menuButton.setAttribute("aria-expanded","false");menuButton.setAttribute("aria-label","Open navigation");}});
}
const year=document.querySelector("#year");if(year)year.textContent=String(new Date().getFullYear());

// Safe arithmetic parser: supports decimals, parentheses and + - * / without eval().
function parseExpression(source){
  const tokens=source.replace(/\s+/g,"").match(/(?:\d*\.\d+|\d+\.?\d*|[()+\-*/])/g)||[];
  if(tokens.join("")!==source.replace(/\s+/g,""))throw new Error("Invalid expression");
  let i=0;
  function primary(){const t=tokens[i++];if(t==="("){const v=addSub();if(tokens[i++]!==")")throw new Error("Missing )");return v;}if(t==="+"||t==="-"){const v=primary();return t==="-"?-v:v;}if(t===undefined||!/^\d*\.?\d+$/.test(t))throw new Error("Enter a number");const n=Number(t);if(!Number.isFinite(n))throw new Error("Number too large");return n;}
  function mulDiv(){let v=primary();while(tokens[i]==="*"||tokens[i]==="/"){const op=tokens[i++],n=primary();if(op==="/"&&n===0)throw new Error("Cannot divide by zero");v=op==="*"?v*n:v/n;}return v;}
  function addSub(){let v=mulDiv();while(tokens[i]==="+"||tokens[i]==="-"){const op=tokens[i++],n=mulDiv();v=op==="+"?v+n:v-n;}return v;}
  if(!tokens.length)throw new Error("Enter a calculation");const result=addSub();if(i!==tokens.length||!Number.isFinite(result))throw new Error("Check the expression");return result;
}
const calcDisplay=document.querySelector("#calc-display"),calcExpression=document.querySelector("#calc-expression");
let calcInput="";
function renderCalc(){calcDisplay.textContent=calcInput||"0";}
function calculate(){try{const result=parseExpression(calcInput);calcExpression.textContent=calcInput+" =";calcInput=String(Number(result.toPrecision(12)));renderCalc();}catch(err){calcExpression.textContent=err.message||"Check the expression";}}
document.querySelector("#calc-keys")?.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const action=b.dataset.action;if(action==="clear"){calcInput="";calcExpression.textContent="Ready for a calculation";renderCalc();return;}if(action==="backspace"){calcInput=calcInput.slice(0,-1);renderCalc();return;}if(action==="equals"){calculate();return;}const v=b.dataset.value;if(v){if(calcInput.length<80){calcInput+=v;renderCalc();}}});
document.addEventListener("keydown",e=>{if(!calcDisplay)return;const tag=e.target?.tagName;if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;if(/^[0-9()+\-*/.]$/.test(e.key)){if(calcInput.length<80){calcInput+=e.key;renderCalc();}}else if(e.key==="Backspace"){calcInput=calcInput.slice(0,-1);renderCalc();}else if(e.key==="Enter"||e.key==="="){e.preventDefault();calculate();}else if(e.key==="Escape"){calcInput="";calcExpression.textContent="Ready for a calculation";renderCalc();}});

// Print a clean, escaped document; the browser's print dialog can save it as PDF.
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
document.querySelector("#export-pdf")?.addEventListener("click",()=>{
  const title=document.querySelector("#pdf-title").value.trim()||"My document";
  const content=document.querySelector("#pdf-content").value;
  const status=document.querySelector("#pdf-status");
  if(!content.trim()){status.textContent="Add some content first, then create your PDF.";return;}
  const win=window.open("","_blank");
  if(!win){status.textContent="Your browser blocked the print window. Allow pop-ups for this page and try again.";return;}
  win.document.open();
  win.document.write("<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+escapeHtml(title)+"</title><style>body{font-family:Arial,sans-serif;color:#222;max-width:760px;margin:48px auto;padding:0 24px;line-height:1.7}h1{font-size:26px;border-bottom:2px solid #ddd;padding-bottom:12px}main{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12pt}@page{size:auto;margin:20mm}@media print{body{margin:0;padding:0}}</style></head><body><h1>"+escapeHtml(title)+"</h1><main>"+escapeHtml(content)+"</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>");
  win.document.close();status.textContent="Print window opened. Choose “Save as PDF” in the print destination.";
});

// Local-only notes, with a graceful fallback if storage is unavailable.
const notes=document.querySelector("#notes-content"),notesStatus=document.querySelector("#notes-status");
try{notes.value=localStorage.getItem("shyam-toolbox-notes")||"";}catch(e){if(notesStatus)notesStatus.textContent="Local saving is unavailable in this browser.";}
let noteSaveDelay;
notes?.addEventListener("input",()=>{clearTimeout(noteSaveDelay);if(notesStatus)notesStatus.textContent="Saving…";noteSaveDelay=setTimeout(()=>{try{localStorage.setItem("shyam-toolbox-notes",notes.value);if(notesStatus)notesStatus.textContent="Saved on this device only";}catch(e){if(notesStatus)notesStatus.textContent="Could not save in this browser";}},180);});
document.querySelector("#clear-notes")?.addEventListener("click",()=>{if(!notes)return;notes.value="";try{localStorage.removeItem("shyam-toolbox-notes");if(notesStatus)notesStatus.textContent="Notes cleared";}catch(e){if(notesStatus)notesStatus.textContent="Cleared for this session";}notes.focus();});

// Live word and character count.
const wordInput=document.querySelector("#word-input");
function updateWordCount(){const value=wordInput.value;const trimmed=value.trim();const words=trimmed?trimmed.split(/\s+/).length:0;document.querySelector("#word-count").textContent=String(words);document.querySelector("#char-count").textContent=String(value.length);document.querySelector("#read-time").textContent=(words?Math.max(1,Math.ceil(words/200)):0)+" min";}
wordInput?.addEventListener("input",updateWordCount);updateWordCount();

// Common measurement conversions. Values are converted through a base unit.
const units={
 length:{m:1,km:1000,cm:.01,mm:.001,mi:1609.344,ft:.3048,in:.0254},
 weight:{kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125},
 temperature:{C:1,F:1,K:1}
};
const unitNames={m:"Meters (m)",km:"Kilometers (km)",cm:"Centimeters (cm)",mm:"Millimeters (mm)",mi:"Miles (mi)",ft:"Feet (ft)",in:"Inches (in)",kg:"Kilograms (kg)",g:"Grams (g)",mg:"Milligrams (mg)",lb:"Pounds (lb)",oz:"Ounces (oz)",C:"Celsius (°C)",F:"Fahrenheit (°F)",K:"Kelvin (K)"};
const typeSelect=document.querySelector("#unit-type"),fromSelect=document.querySelector("#unit-from"),toSelect=document.querySelector("#unit-to"),unitValue=document.querySelector("#unit-value"),unitResult=document.querySelector("#unit-result");
function populateUnits(){const type=typeSelect.value;const keys=Object.keys(units[type]);const previousFrom=fromSelect.value,previousTo=toSelect.value;fromSelect.replaceChildren();toSelect.replaceChildren();for(const key of keys){for(const select of [fromSelect,toSelect]){const option=document.createElement("option");option.value=key;option.textContent=unitNames[key];select.append(option);}}fromSelect.value=keys.includes(previousFrom)?previousFrom:keys[0];toSelect.value=keys.includes(previousTo)&&previousTo!==fromSelect.value?previousTo:(keys[1]||keys[0]);if(type==="temperature"){fromSelect.value="C";toSelect.value="F";}convertUnits();}
function convertTemperature(value,from,to){let c=from==="C"?value:from==="F"?(value-32)*5/9:value-273.15;return to==="C"?c:to==="F"?c*9/5+32:c+273.15;}
function convertUnits(){const value=Number(unitValue.value);if(unitValue.value.trim()===""||!Number.isFinite(value)){unitResult.textContent="—";return;}let result;if(typeSelect.value==="temperature")result=convertTemperature(value,fromSelect.value,toSelect.value);else result=value*units[typeSelect.value][fromSelect.value]/units[typeSelect.value][toSelect.value];unitResult.textContent=Number(result.toPrecision(9)).toLocaleString(undefined,{maximumFractionDigits:8});}
typeSelect?.addEventListener("change",populateUnits);[fromSelect,toSelect,unitValue].forEach(el=>el?.addEventListener("input",convertUnits));document.querySelector("#swap-units")?.addEventListener("click",()=>{const old=fromSelect.value;fromSelect.value=toSelect.value;toSelect.value=old;convertUnits();});populateUnits();

// 25-minute focus timer; no background tracking or network calls.
const timerDisplay=document.querySelector("#timer-display"),timerStart=document.querySelector("#timer-start"),timerReset=document.querySelector("#timer-reset"),timerStatus=document.querySelector("#timer-status");
let secondsLeft=25*60,timerId=null;
function showTimer(){timerDisplay.textContent=String(Math.floor(secondsLeft/60)).padStart(2,"0")+":"+String(secondsLeft%60).padStart(2,"0");}
function stopTimer(){if(timerId!==null){clearInterval(timerId);timerId=null;}timerStart.textContent="Resume focus";}
timerStart?.addEventListener("click",()=>{if(timerId!==null){stopTimer();timerStatus.textContent="Timer paused. Resume whenever you're ready.";return;}if(secondsLeft<=0)secondsLeft=25*60;timerStart.textContent="Pause";timerStatus.textContent="Focus session running — one task at a time.";timerId=setInterval(()=>{secondsLeft--;showTimer();if(secondsLeft<=0){stopTimer();secondsLeft=0;showTimer();timerStatus.textContent="Session complete! Take a short break.";timerStart.textContent="Start again";}},1000);});
timerReset?.addEventListener("click",()=>{stopTimer();secondsLeft=25*60;showTimer();timerStart.textContent="Start focus";timerStatus.textContent="A 25-minute focus session. Pause when you need a break.";});showTimer();
