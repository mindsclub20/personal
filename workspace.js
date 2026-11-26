(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const app=document.createElement("div");app.className="ws-app";app.innerHTML=`
<aside class="ws-sidebar" aria-label="Workspace navigation">
 <div class="ws-brand"><span class="ws-mark">✳</span><span>Shyam Personal</span></div>
 <button class="ws-new" id="ws-new"><span class="ws-nav-icon">＋</span> New chat <span style="margin-left:auto;color:var(--ws-muted)">⌘K</span></button>
 <button class="ws-nav-btn active" data-view="chat"><span class="ws-nav-icon">◫</span> Chat</button>
 <button class="ws-nav-btn" data-view="tools"><span class="ws-nav-icon">▦</span> All tools</button>
 <a class="ws-nav-btn" href="/internet-tester.html" aria-label="Open Internet Tester"><span class="ws-nav-icon">⌁</span> Internet Tester</a>
 <div class="ws-sidebar-label">Recent conversations</div><div class="ws-history" id="ws-history"></div>
 <div class="ws-side-spacer"></div><div class="ws-side-bottom">
  <button id="ws-theme"><span class="ws-nav-icon">◐</span><span>Switch appearance</span></button>
  <button data-view="tools"><span class="ws-nav-icon">⚙</span> Toolbox settings & tools</button>
 </div><div class="ws-profile"><span class="ws-avatar">S</span><span><strong style="color:var(--ws-text);display:block">Personal workspace</strong><span>Local conversations</span></span></div>
</aside>
<section class="ws-main">
 <header class="ws-topbar"><div class="ws-top-left"><button class="ws-icon-btn ws-mobile-menu" id="ws-menu" aria-label="Open sidebar">☰</button><button class="ws-collapse-btn" id="ws-collapse" type="button" title="Collapse sidebar" aria-label="Collapse sidebar" aria-expanded="true">◧</button><div class="ws-model">Robotics, Electronics &amp; Python Bench <small>Shyam Personal</small></div></div><div class="ws-top-actions"><button class="ws-icon-btn" id="ws-top-theme" title="Toggle light/dark theme" aria-label="Toggle theme">◐</button></div></header>
 <div class="ws-chat-scroll" id="ws-chat-scroll"><div class="ws-chat-inner" id="ws-chat-inner">
 <section class="ws-welcome" id="ws-welcome"><div class="ws-orb">✳</div><h1>Your Robotics, Electronics &amp; Python Bench</h1><p>One workspace for robotics learning, electronics concepts, Python practice, and building intelligent projects.</p>
 <div class="ws-suggestions">
 <button class="ws-suggestion" data-prompt="Plan a 30-minute robotics, electronics, or Python study session with one clear learning goal."><span class="ws-s-icon">◷</span><span><strong>Plan bench practice</strong><small>Set a focused robotics or Python session</small></span></button>
 <button class="ws-suggestion" data-prompt="Give me a beginner-friendly Python project related to robotics, with steps and a test."><span class="ws-s-icon">⌘</span><span><strong>Python practice</strong><small>Build a small robotics coding project</small></span></button>
 <button class="ws-suggestion" data-prompt="Explain an electronics concept used in robotics with a safe beginner example."><span class="ws-s-icon">✧</span><span><strong>Electronics concepts</strong><small>Understand sensors, circuits, and control</small></span></button>
 <button class="ws-suggestion" data-view="tools"><span class="ws-s-icon">▦</span><span><strong>Open my toolbox</strong><small>Calculator, Python, files, notes, and more</small></span></button>
 </div></section><div class="ws-messages" id="ws-messages"></div></div></div>
 <section class="ws-tool-view" id="ws-tool-view"><div class="ws-tool-head"><div><h2>Robotics, Electronics &amp; Python Bench</h2><p>Use the tools for Python practice, electronics learning, robotics planning, and engineering projects.</p></div><button class="ws-back-chat" id="ws-back-chat">← Back to chat</button></div><div class="ws-tool-grid" id="ws-tool-grid"></div></section>
 <footer class="ws-composer-wrap" id="ws-composer-wrap"><form class="ws-composer-box" id="ws-form"><textarea class="ws-composer" id="ws-composer" rows="1" maxlength="8000" placeholder="Message your workspace…" aria-label="Write a message"></textarea><div class="ws-composer-tools"><div class="ws-composer-left"><button class="ws-composer-tool" type="button" id="ws-add-tool">＋ Tools</button><button class="ws-composer-tool" type="button" id="ws-focus-prompt">✧ Help me focus</button><button class="ws-composer-tool" type="button" id="ws-load-model">Load local AI</button></div><div class="ws-composer-right"><span style="font-size:10px;color:var(--ws-muted);padding-right:5px">Enter to send</span><button class="ws-send" id="ws-send" type="submit" aria-label="Send message" disabled>↑</button></div></div></form><div class="ws-local-model-bar"><span class="ws-local-dot" aria-hidden="true"></span><span id="ws-model-status" role="status">Local model not loaded · WebGPU required · first download about 1 GB</span></div><p class="ws-disclaimer">AI inference runs in this browser. The model is downloaded once and cached on this device; chats remain in this browser.</p></footer>
</section></div>`;
document.body.append(app);
const originalTools=$(".tools-layout");
if(originalTools){$("#ws-tool-grid").append(originalTools);originalTools.className="ws-tool-grid";originalTools.querySelectorAll(".tool-card").forEach(c=>c.hidden=false);}
const themeKey="shyam-ws-theme",historyKey="shyam-ws-conversations";let currentId=null,conversations=[];
try{conversations=JSON.parse(localStorage.getItem(historyKey)||"[]");if(!Array.isArray(conversations))conversations=[];}catch{conversations=[]}
try{if(localStorage.getItem(themeKey)==="dark")document.body.classList.add("ws-dark");}catch{}
const persist=()=>{try{localStorage.setItem(historyKey,JSON.stringify(conversations.slice(0,30)))}catch{}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function active(){return conversations.find(c=>c.id===currentId)}
function deleteChat(id){const chat=conversations.find(c=>c.id===id);if(!chat)return;const title=chat.title||"this conversation";if(!window.confirm("Delete “"+title+"”? This cannot be undone."))return;conversations=conversations.filter(c=>c.id!==id);if(currentId===id)currentId=null;persist();renderHistory();renderMessages();if(!active()){$("#ws-composer").value="";resizeComposer();showView("chat")}}
function showChatMenu(id,anchor){document.querySelectorAll(".ws-chat-menu").forEach(n=>n.remove());const menu=document.createElement("div");menu.className="ws-chat-menu";menu.setAttribute("role","menu");const del=document.createElement("button");del.type="button";del.setAttribute("role","menuitem");del.textContent="🗑 Delete chat";del.addEventListener("click",()=>{menu.remove();deleteChat(id)});menu.append(del);anchor.append(menu);const close=e=>{if(!menu.contains(e.target)&&e.target!==anchor){menu.remove();document.removeEventListener("pointerdown",close,true)}};setTimeout(()=>document.addEventListener("pointerdown",close,true),0)}
function renderHistory(){const el=$("#ws-history");el.replaceChildren();if(!conversations.length){const p=document.createElement("div");p.style.cssText="font-size:12px;color:var(--ws-muted);padding:8px 10px";p.textContent="Your chats will appear here";el.append(p);return}conversations.slice(0,20).forEach(c=>{const wrap=document.createElement("div");wrap.className="ws-history-wrap";const b=document.createElement("button");b.type="button";b.className="ws-history-item"+(c.id===currentId?" selected":"");b.textContent=c.title||"New conversation";b.title=b.textContent;b.setAttribute("aria-label",b.textContent+" — long press for options");b.addEventListener("click",()=>openChat(c.id));let pressTimer=null,longPressed=false;const startPress=()=>{longPressed=false;pressTimer=setTimeout(()=>{longPressed=true;showChatMenu(c.id,wrap)},550)};const cancelPress=()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null}};b.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;startPress()});["pointerup","pointerleave","pointercancel"].forEach(evt=>b.addEventListener(evt,cancelPress));b.addEventListener("click",e=>{if(longPressed){e.preventDefault();e.stopImmediatePropagation();longPressed=false}} ,true);b.addEventListener("contextmenu",e=>{e.preventDefault();showChatMenu(c.id,wrap)});wrap.append(b);el.append(wrap)})}
function renderMessages(){const c=active(),host=$("#ws-messages");host.replaceChildren();$("#ws-welcome").style.display=c&&c.messages.length?"none":"flex";if(!c)return;c.messages.forEach(m=>{const row=document.createElement("div");row.className="ws-message "+m.role+(m.role==="assistant"&&m.text==="Thinking with Gemini…"?" pending":m.role==="assistant"&&m.text.startsWith("⚠ ")?" error":"");const avatar=m.role==="assistant"?'<div class="ws-msg-avatar">✳</div>':"";const body='<div class="ws-msg-content">'+(m.role==="assistant"?'<div class="ws-msg-label">Workspace</div>':"")+esc(m.text)+'</div>';row.innerHTML=m.role==="assistant"?avatar+body:body;host.append(row)});$("#ws-chat-scroll").scrollTop=$("#ws-chat-scroll").scrollHeight}
function openChat(id){currentId=id;renderHistory();renderMessages();showView("tools");}
function newChat(){currentId=null;renderHistory();renderMessages();$("#ws-composer").value="";$("#ws-composer").focus();showView("chat")}
function addMessage(role,text){let c=active();if(!c){c={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:text.slice(0,44)+(text.length>44?"…":""),messages:[],updated:Date.now()};conversations.unshift(c);currentId=c.id}c.messages.push({role,text});c.updated=Date.now();conversations.sort((a,b)=>b.updated-a.updated);persist();renderHistory();renderMessages()}
function showView(view){const isTools=view==="tools";$("#ws-tool-view").classList.toggle("open",isTools);$("#ws-chat-scroll").style.display=isTools?"none":"block";$("#ws-composer-wrap").style.display=isTools?"none":"block";$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));app.classList.remove("sidebar-open")}
let localEngine=null,localLLMModule=null,loadingLocalModel=false,sendingLocalMessage=false;
const LOCAL_SYSTEM_PROMPT="You are Shyam Personal, an educational assistant for a student learning robotics engineering, electronics, and Python. Explain concepts accurately in clear, age-appropriate language. Prioritize safe, low-voltage beginner electronics and responsible robotics practice. Teach step by step, encourage testing and debugging, and distinguish facts from uncertainty. Do not claim to access the internet, files, hardware, or live data unless a connected tool actually provides it.";
function setLocalModelStatus(message,isReady=false){const status=$("#ws-model-status");if(status)status.textContent=message;const dot=$(".ws-local-dot");if(dot){dot.classList.toggle("ready",isReady);dot.classList.toggle("busy",loadingLocalModel)}}
async function loadLocalModel(){
 if(localEngine||loadingLocalModel)return localEngine;
 if(!navigator.gpu){setLocalModelStatus("WebGPU is unavailable in this browser. Try an up-to-date Chrome or Edge browser on a supported device.");throw new Error("This browser or device does not currently support WebGPU local inference.");}
 loadingLocalModel=true;const button=$("#ws-load-model");if(button){button.disabled=true;button.textContent="Loading…"}
 setLocalModelStatus("Preparing the local AI runtime…");
 try{
  if(!localLLMModule)localLLMModule=await import("./local-llm.js");
  localEngine=await localLLMModule.createLocalEngine({onProgress:progress=>setLocalModelStatus(progress.text||"Downloading model…")});
  setLocalModelStatus("Local model ready · running on this device",true);
  if(button)button.textContent="Local AI ready";
  return localEngine;
 }catch(error){
  setLocalModelStatus("Model could not load · "+(error.message||"Check WebGPU and internet access"));
  if(button){button.disabled=false;button.textContent="Retry local AI"}
  throw error;
 }finally{loadingLocalModel=false;if(button&&localEngine)button.disabled=true;}
}
$("#ws-load-model").addEventListener("click",()=>loadLocalModel().catch(error=>{console.warn("Local model initialization failed:",error)}));
async function sendMessage(text){
 const v=(text||"").trim();
 if(!v||sendingLocalMessage)return;
 if(!localEngine){
  addMessage("assistant","Load the local AI model first using the “Load local AI” button. Its first download is about 1 GB and requires an internet connection. After caching, the model can be reused on this device.");
  return;
 }
 $("#ws-composer").value="";resizeComposer();addMessage("user",v);
 const conversation=active();if(!conversation)return;
 const conversationId=conversation.id;const pendingText="Generating locally on this device…";
 addMessage("assistant",pendingText);sendingLocalMessage=true;resizeComposer();
 try{
  const target=conversations.find(c=>c.id===conversationId);
  const history=(target?target.messages:[]).filter(m=>!(m.role==="assistant"&&m.text===pendingText)).slice(-12).map(m=>({role:m.role,content:m.text}));
  while(history.length&&history[0].role==="assistant")history.shift();
  const reply=await localLLMModule.generateLocalReply(localEngine,history,LOCAL_SYSTEM_PROMPT);
  const current=conversations.find(c=>c.id===conversationId);
  if(current){const index=current.messages.findIndex(m=>m.role==="assistant"&&m.text===pendingText);if(index!==-1)current.messages[index].text=reply||"The local model returned an empty response.";current.updated=Date.now();persist();renderHistory();if(currentId===conversationId)renderMessages();}
 }catch(error){
  const current=conversations.find(c=>c.id===conversationId);
  if(current){const index=current.messages.findIndex(m=>m.role==="assistant"&&m.text===pendingText);if(index!==-1)current.messages[index].text="⚠ "+(error.message||"Local generation failed. Try loading the model again.");current.updated=Date.now();persist();renderHistory();if(currentId===conversationId)renderMessages();}
 }finally{sendingLocalMessage=false;resizeComposer();}
}
function resizeComposer(){const el=$("#ws-composer");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,160)+"px";$("#ws-send").disabled=!el.value.trim()}
$("#ws-form").addEventListener("submit",e=>{e.preventDefault();sendMessage($("#ws-composer").value)});
$("#ws-composer").addEventListener("input",resizeComposer);$("#ws-composer").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage($("#ws-composer").value)}});
$("#ws-new").addEventListener("click",newChat);$("#ws-menu").addEventListener("click",()=>app.classList.toggle("sidebar-open"));$("#ws-collapse").addEventListener("click",()=>{const collapsed=app.classList.toggle("sidebar-collapsed");$("#ws-collapse").setAttribute("aria-expanded",String(!collapsed));$("#ws-collapse").setAttribute("aria-label",collapsed?"Expand sidebar":"Collapse sidebar");$("#ws-collapse").title=collapsed?"Expand sidebar":"Collapse sidebar";$("#ws-collapse").textContent=collapsed?"▣":"◧";});
$("#ws-theme").addEventListener("click",toggleTheme);$("#ws-top-theme").addEventListener("click",toggleTheme);
function toggleTheme(){document.body.classList.toggle("ws-dark");try{localStorage.setItem(themeKey,document.body.classList.contains("ws-dark")?"dark":"light")}catch{}}
$("#ws-add-tool").addEventListener("click",()=>showView("tools"));$("#ws-back-chat").addEventListener("click",()=>showView("chat"));$$("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("#ws-focus-prompt").addEventListener("click",()=>{const el=$("#ws-composer");el.value="Help me choose one realistic task to focus on for the next 25 minutes.";resizeComposer();el.focus()});
$$("[data-prompt]").forEach(b=>b.addEventListener("click",()=>{const el=$("#ws-composer");el.value=b.dataset.prompt;resizeComposer();el.focus()}));
$$(".ws-suggestion[data-view='tools']").forEach(b=>b.addEventListener("click",()=>showView("tools")));
document.addEventListener("keydown",e=>{if(e.key==="Escape")app.classList.remove("sidebar-open")});

/* Quick launcher + local daily planner */
const quickLauncher=document.createElement("div");
quickLauncher.className="ws-command-overlay";
quickLauncher.id="ws-command-overlay";
quickLauncher.hidden=true;
quickLauncher.innerHTML='<section class="ws-command" role="dialog" aria-modal="true" aria-labelledby="ws-command-title"><div class="ws-command-top"><span id="ws-command-title">⌕ Find a tool</span><button type="button" class="ws-command-close" aria-label="Close tool finder">Esc</button></div><input id="ws-command-input" type="search" placeholder="Search calculator, notes, Python…" autocomplete="off"><div id="ws-command-results" class="ws-command-results" role="listbox" aria-label="Tools"></div><p class="ws-command-hint">Tip: press Ctrl/⌘ + K anytime</p></section>';
app.append(quickLauncher);
const commandInput=$("#ws-command-input"),commandResults=$("#ws-command-results");
const commandItems=[
 {name:"Daily planner",desc:"Plan today and check off tasks",icon:"☑",action:()=>openToolCard("ws-daily-planner")},
 {name:"Smart calculator",desc:"Quick arithmetic",icon:"÷",action:()=>openToolCard("calculator")},
 {name:"AI image studio",desc:"Create image prompts and images",icon:"✦",action:()=>openToolCard("image-studio")},
 {name:"File converter",desc:"Convert local files",icon:"⇧",action:()=>openToolCard("pdf-tool")},
 {name:"Idea Spark Lab",desc:"Get a small challenge",icon:"✧",action:()=>openToolCard("idea-lab")},
 {name:"Python Playground",desc:"Write and run Python",icon:"Py",action:()=>{showView("tools");location.href="/python.html"}},
 {name:"Quick notes",desc:"Capture thoughts on this device",icon:"✎",action:()=>openToolCard("more-tools")},
 {name:"Word counter",desc:"Count words and characters",icon:"Aa",action:()=>openToolCard("word-counter")},
 {name:"Unit converter",desc:"Convert measurements",icon:"↔",action:()=>openToolCard("converter")},
 {name:"Focus timer",desc:"Start a 25-minute focus session",icon:"◷",action:()=>openToolCard("focus-card")},
 {name:"Internet Tester",desc:"Check connectivity, latency, and website reachability",icon:"⌁",action:()=>{location.href="/internet-tester.html"}}
];
function openToolCard(id){
 showView("tools");
 const card=id==="ws-daily-planner"?$("#ws-daily-planner"):id==="focus-card"?$(".focus-card"):$("#"+id);
 quickLauncher.hidden=true;
 if(card){card.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});card.classList.add("ws-tool-highlight");setTimeout(()=>card.classList.remove("ws-tool-highlight"),1200)}
}
function renderCommandResults(query=""){
 commandResults.replaceChildren();
 const matches=commandItems.filter(x=>(x.name+" "+x.desc).toLowerCase().includes(query.trim().toLowerCase()));
 if(!matches.length){const empty=document.createElement("p");empty.className="ws-command-empty";empty.textContent="No matching tools. Try a shorter search.";commandResults.append(empty);return}
 matches.forEach((item,index)=>{const b=document.createElement("button");b.type="button";b.className="ws-command-item";b.setAttribute("role","option");b.innerHTML='<span class="ws-command-icon">'+esc(item.icon)+'</span><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.desc)+'</small></span><span class="ws-command-arrow">↵</span>';b.addEventListener("click",item.action);if(index===0)b.dataset.first="true";commandResults.append(b)});
}
function openCommand(){quickLauncher.hidden=false;renderCommandResults(commandInput.value);commandInput.focus();commandInput.select()}
function closeCommand(){quickLauncher.hidden=true}
commandInput.addEventListener("input",()=>renderCommandResults(commandInput.value));
$(".ws-command-close").addEventListener("click",closeCommand);
quickLauncher.addEventListener("click",e=>{if(e.target===quickLauncher)closeCommand()});
const finderButton=document.createElement("button");
finderButton.type="button";finderButton.className="ws-command-open";finderButton.innerHTML='<span>⌕</span><span>Find a tool</span><kbd>Ctrl K</kbd>';
finderButton.addEventListener("click",openCommand);
$("#ws-new").insertAdjacentElement("afterend",finderButton);
function installDailyPlanner(){
 const card=document.createElement("article");
 card.id="ws-daily-planner";card.className="tool-card ws-planner-card";
 card.innerHTML='<div class="tool-heading"><span class="tool-icon ws-planner-icon">☑</span><div><h3>Daily Robotics, Electronics &amp; Python Schedule</h3><p>Study session: 7:00–7:30 PM IST · Monday–Saturday</p></div><span class="tool-index">WEEKLY</span></div><div class="ws-planner-date" id="ws-planner-date"></div><section class="ws-weekly-schedule" aria-label="Weekly learning timetable"><div class="ws-schedule-blocks"><div><strong>7:00–7:05</strong><span>Review yesterday</span></div><div><strong>7:05–7:20</strong><span>Learn today’s topic</span></div><div><strong>7:20–7:30</strong><span>Practice and test</span></div></div><ul class="ws-weekly-days"><li data-schedule-day="1"><b>Monday</b><span>Volume 1 · Robotics Fundamentals</span></li><li data-schedule-day="2"><b>Tuesday</b><span>Volume 2 · Electronics for Robotics</span></li><li data-schedule-day="3"><b>Wednesday</b><span>Volume 3 · Mechanical Robotics</span></li><li data-schedule-day="4"><b>Thursday</b><span>Volume 4 · LEGO EV3 and Arduino Robotics</span></li><li data-schedule-day="5"><b>Friday</b><span>Volume 5 · Autonomous Robotics</span></li><li data-schedule-day="6"><b>Saturday</b><span>Integration, review and Python support practice</span></li><li data-schedule-day="0"><b>Sunday</b><span>Rest or optional review</span></li></ul><p class="ws-schedule-note" id="ws-schedule-note">Sunday is a rest day. No compulsory new lesson.</p><p class="ws-schedule-note">Learning references: <a href="https://education.lego.com/en-us/lessons/ev3-dep/make-it-move-with-wheels/" target="_blank" rel="noopener noreferrer">LEGO wheel distance and motor rotations</a> · <a href="https://modernrobotics.northwestern.edu/nu-gm-book-resource/13-1-wheeled-mobile-robots/" target="_blank" rel="noopener noreferrer">Northwestern wheeled-robot kinematics</a> · <a href="https://control.ros.org/master/doc/ros2_controllers/diff_drive_controller/doc/userdoc.html" target="_blank" rel="noopener noreferrer">ROS 2 differential-drive parameters (advanced development docs)</a> · <a href="https://web.mae.ufl.edu/designlab/Class%20Projects/Background%20Information/Center%20of%20gravity.htm" target="_blank" rel="noopener noreferrer">University of Florida robot centre of gravity</a>.</p><button class="btn outline" id="ws-add-today" type="button">Add today’s session to my tasks</button></section><section class="ws-improvement-loop" aria-label="Daily robotics learning improvement loop"><div class="ws-loop-heading"><div><h4>Scheduled research &amp; maintenance automation</h4><p>Separate external task · daily at 7:00 PM IST · not run by this webpage</p></div><span class="ws-loop-status">Daily</span></div><p class="ws-loop-copy">Each scheduled run researches and verifies learning resources, checks all five study volumes, refreshes the worksheet/PDF when meaningful changes are found, and reviews this bench timetable for accuracy. When GitHub access is available, it updates the Shyam Personal development branch with verified planner or learning-content improvements, tests the changes, and reports the preview/PR. No production deployment or merge is performed automatically.</p><div class="ws-volume-grid"><div><b>Volume 1</b><span>Robotics Fundamentals</span></div><div><b>Volume 2</b><span>Electronics for Robotics</span></div><div><b>Volume 3</b><span>Mechanical Robotics</span></div><div><b>Volume 4</b><span>LEGO EV3 &amp; Arduino Robotics</span></div><div><b>Volume 5</b><span>Autonomous Robotics</span></div></div><p class="ws-loop-footnote">Python is a supporting programming track, not a sixth volume or a separate weekday. Use it within EV3/Arduino, autonomous-robotics and Saturday integration practice. Sunday remains a rest or optional review day. The external research task currently starts at the same clock time as the study session; it is not triggered by this page and does not count as study time.</p></section><div class="ws-planner-presets" aria-label="Quick-add learning tasks"><button type="button" data-plan-task="Robotics theory practice">＋ Robotics</button><button type="button" data-plan-task="Electronics fundamentals practice">＋ Electronics</button><button type="button" data-plan-task="Python coding practice">＋ Python</button></div><form class="ws-planner-form" id="ws-planner-form"><label class="field-label" for="ws-planner-input">Add a task</label><div class="ws-planner-entry"><input id="ws-planner-input" class="text-input" maxlength="140" placeholder="e.g. Revise sensor fundamentals for 20 minutes" required><button class="btn primary" type="submit">Add</button></div></form><div class="ws-planner-progress"><div><span id="ws-planner-count">0 of 0 complete</span><strong id="ws-planner-percent">0%</strong></div><div class="ws-planner-track"><span id="ws-planner-bar"></span></div></div><ul class="ws-planner-list" id="ws-planner-list" aria-live="polite"></ul><div class="ws-planner-footer"><span>Saved on this device</span><button class="btn outline" id="ws-planner-clear" type="button">Clear completed</button></div>';
 $("#ws-tool-grid").prepend(card);
 const storageKey="shyam-daily-planner-v1";
 let tasks=[];try{tasks=JSON.parse(localStorage.getItem(storageKey)||"[]");if(!Array.isArray(tasks))tasks=[]}catch{tasks=[]}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(tasks))}catch{}};
 const indiaDateFormatter=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",weekday:"long",month:"short",day:"numeric"});
 const indiaDateParts=()=>Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kolkata",weekday:"short",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(part=>[part.type,part.value]));
 const getIndiaDay=()=>({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[indiaDateParts().weekday];
 $("#ws-planner-date").textContent=indiaDateFormatter.format(new Date());
 const weeklyTopics={1:"Volume 1 — Robotics Fundamentals: robot systems, components, sensors and motion",2:"Volume 2 — Electronics for Robotics: voltage, current, components, circuits and sensor interfaces",3:"Volume 3 — Mechanical Robotics: chassis, gears, mechanisms and basic kinematics; gear ratio and the speed–torque trade-off (8-tooth driver → 24-tooth driven gear = ideal 3:1 reduction); wheel geometry (circumference C = π × diameter; ideal travel = wheel rotations × C, adjusted for any gearbox ratio); wheel separation and centre-of-mass placement affect turning, traction and stability",4:"Volume 4 — LEGO Mindstorms EV3 and Arduino Robotics: controllers, motors, sensors, programming and serial communication (I²C, SPI, UART), including 7-bit I²C address-space limits and reserved-address concepts (128 patterns are not 128 guaranteed usable devices; duplicate module addresses matter), open-drain SDA/SCL with pull-ups, bus-capacitance effects, and board-specific datasheet checks such as the Nano ESP32 3.3 V pin-level limit; EV3 Classroom remains the school default when already installed through the school; LEGO classifies EV3 as retired and unsupported, and its help page says the Classroom download window ran through July 2026, so verify any new installation with the teacher; EV3 MicroPython is optional only with teacher-approved compatible setup",5:"Volume 5 — Autonomous Robotics: sensing, feedback, differential-drive kinematics (equal wheel speeds → straight; unequal speeds → curve; opposite directions → ideal pivot turn), wheel radius and wheel separation, encoder odometry and drift; cross-check wheel-based estimates with external sensors such as cameras or range sensors",6:"Integration and review — connect all five volumes; use Python for a small robotics-related exercise",0:"Rest or optional review — no compulsory new lesson"};
 const today=getIndiaDay();
 $(".ws-weekly-days li").forEach(item=>item.classList.toggle("today",Number(item.dataset.scheduleDay)===today));
 $("#ws-schedule-note").textContent=today===0?"Today is a rest day. Use it for optional weekly review.":"Today’s focus: "+weeklyTopics[today]+". Target time: 7:00–7:30 PM IST.";
 $("#ws-add-today").addEventListener("click",()=>{
  if(today===0){const note=$("#ws-schedule-note");note.textContent="Sunday is reserved for rest or optional review; no tasks were added.";return;}
  const blocks=["7:00–7:05 PM · Review yesterday’s concepts","7:05–7:20 PM · "+weeklyTopics[today],"7:20–7:30 PM · Complete one practice question or mini-exercise"];
  const parts=indiaDateParts();const prefix=`${parts.year}-${parts.month}-${parts.day}`;
  blocks.forEach((text,index)=>{const taskText=prefix+" · "+text;if(!tasks.some(t=>t.text===taskText))tasks.unshift({id:Date.now().toString(36)+index+Math.random().toString(36).slice(2,5),text:taskText,done:false})});
  save();draw();$("#ws-schedule-note").textContent="Today’s 30-minute session has been added to your task list.";
 });
 function draw(){
  const list=$("#ws-planner-list");list.replaceChildren();
  tasks.forEach(task=>{const li=document.createElement("li");li.className="ws-planner-task"+(task.done?" done":"");const label=document.createElement("label");label.className="ws-planner-label";const check=document.createElement("input");check.type="checkbox";check.checked=!!task.done;check.addEventListener("change",()=>{task.done=check.checked;save();draw()});const title=document.createElement("span");title.textContent=task.text;label.append(check,title);const del=document.createElement("button");del.type="button";del.className="ws-planner-delete";del.textContent="×";del.setAttribute("aria-label","Delete task: "+task.text);del.addEventListener("click",()=>{tasks=tasks.filter(t=>t.id!==task.id);save();draw()});li.append(label,del);list.append(li)});
  const done=tasks.filter(t=>t.done).length,pct=tasks.length?Math.round(done/tasks.length*100):0;
  $("#ws-planner-count").textContent=done+" of "+tasks.length+" complete";$("#ws-planner-percent").textContent=pct+"%";$("#ws-planner-bar").style.width=pct+"%";
  if(!tasks.length){const empty=document.createElement("li");empty.className="ws-planner-empty";empty.textContent="Your plan is clear. Add one small task to get started.";list.append(empty)}
 }
 $("#ws-planner-form").addEventListener("submit",e=>{e.preventDefault();const input=$("#ws-planner-input"),value=input.value.trim();if(!value)return;tasks.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),text:value,done:false});save();draw();input.value="";input.focus()});
 $("#ws-planner-clear").addEventListener("click",()=>{tasks=tasks.filter(t=>!t.done);save();draw()});$("[data-plan-task]").forEach(button=>button.addEventListener("click",()=>{tasks.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),text:button.dataset.planTask,done:false});save();draw()}));draw();
}
installDailyPlanner();
document.addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openCommand()}
 if(e.key==="Escape"&&!quickLauncher.hidden){closeCommand();finderButton.focus()}
});

renderHistory();renderMessages();showView("chat");
})();