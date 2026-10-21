(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const app=document.createElement("div");app.className="ws-app";app.innerHTML=`
<aside class="ws-sidebar" aria-label="Workspace navigation">
 <div class="ws-brand"><span class="ws-mark">✳</span><span>Shyam Tool Bench</span></div>
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
 <header class="ws-topbar"><div class="ws-top-left"><button class="ws-icon-btn ws-mobile-menu" id="ws-menu" aria-label="Open sidebar">☰</button><button class="ws-collapse-btn" id="ws-collapse" type="button" title="Collapse sidebar" aria-label="Collapse sidebar" aria-expanded="true">◧</button><div class="ws-model">Engineering bench <small>Personal toolbox</small></div></div><div class="ws-top-actions"><button class="ws-icon-btn" id="ws-top-theme" title="Toggle light/dark theme" aria-label="Toggle theme">◐</button></div></header>
 <div class="ws-chat-scroll" id="ws-chat-scroll"><div class="ws-chat-inner" id="ws-chat-inner">
 <section class="ws-welcome" id="ws-welcome"><div class="ws-orb">✳</div><h1>What are we working on?</h1><p>Your personal AI-style workspace for learning, coding, creating, and getting things done.</p>
 <div class="ws-suggestions">
 <button class="ws-suggestion" data-prompt="Help me plan a focused 30-minute study session."><span class="ws-s-icon">◷</span><span><strong>Plan a study session</strong><small>Make a practical plan with a clear next step</small></span></button>
 <button class="ws-suggestion" data-prompt="Give me a small Python project idea for robotics practice."><span class="ws-s-icon">⌘</span><span><strong>Build with Python</strong><small>Pick a mini-project to practise coding</small></span></button>
 <button class="ws-suggestion" data-prompt="Help me brainstorm a robotics engineering project."><span class="ws-s-icon">✧</span><span><strong>Explore an idea</strong><small>Turn a rough idea into useful steps</small></span></button>
 <button class="ws-suggestion" data-view="tools"><span class="ws-s-icon">▦</span><span><strong>Open my toolbox</strong><small>Calculator, Python, files, notes, and more</small></span></button>
 </div></section><div class="ws-messages" id="ws-messages"></div></div></div>
 <section class="ws-tool-view" id="ws-tool-view"><div class="ws-tool-head"><div><h2>Engineering workspace</h2><p>Choose a tool for coding, productivity, robotics ideas, or network diagnostics.</p></div><button class="ws-back-chat" id="ws-back-chat">← Back to chat</button></div><div class="ws-tool-grid" id="ws-tool-grid"></div></section>
 <footer class="ws-composer-wrap" id="ws-composer-wrap"><form class="ws-composer-box" id="ws-form"><textarea class="ws-composer" id="ws-composer" rows="1" maxlength="8000" placeholder="Message your workspace…" aria-label="Write a message"></textarea><div class="ws-composer-tools"><div class="ws-composer-left"><button class="ws-composer-tool" type="button" id="ws-add-tool">＋ Tools</button><button class="ws-composer-tool" type="button" id="ws-focus-prompt">✧ Help me focus</button></div><div class="ws-composer-right"><span style="font-size:10px;color:var(--ws-muted);padding-right:5px">Enter to send</span><button class="ws-send" id="ws-send" type="submit" aria-label="Send message" disabled>↑</button></div></div></form><p class="ws-disclaimer">Powered by Google Gemini. Sign in through Owner login to send messages; the API key stays on the server.</p></footer>
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
let sendingToGemini=false;
async function sendMessage(text){
 const v=(text||"").trim();
 if(!v||sendingToGemini)return;
 $("#ws-composer").value="";
 resizeComposer();
 addMessage("user",v);
 const conversation=active();
 if(!conversation)return;
 const conversationId=conversation.id;
 const pendingText="Thinking with Gemini…";
 addMessage("assistant",pendingText);
 sendingToGemini=true;
 resizeComposer();
 try{
  const target=conversations.find(c=>c.id===conversationId);
  const history=(target?target.messages:[])
   .filter(m=>!(m.role==="assistant"&&m.text===pendingText))
   .slice(-12)
   .map(m=>({role:m.role,text:m.text}));
  while(history.length&&history[0].role==="assistant")history.shift();
  const response=await fetch("/api/chat",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   credentials:"same-origin",
   body:JSON.stringify({messages:history})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Gemini could not answer. Please try again.");
  const current=conversations.find(c=>c.id===conversationId);
  if(current){
   const index=current.messages.findIndex(m=>m.role==="assistant"&&m.text===pendingText);
   if(index!==-1)current.messages[index].text=String(data.reply||"Gemini returned an empty reply.");
   current.updated=Date.now();
   persist();
   renderHistory();
   if(currentId===conversationId)renderMessages();
  }
 }catch(error){
  const current=conversations.find(c=>c.id===conversationId);
  if(current){
   const index=current.messages.findIndex(m=>m.role==="assistant"&&m.text===pendingText);
   if(index!==-1)current.messages[index].text="⚠ "+(error.message||"Could not reach Gemini. Please try again.");
   current.updated=Date.now();
   persist();
   renderHistory();
   if(currentId===conversationId)renderMessages();
  }
 }finally{
  sendingToGemini=false;
  resizeComposer();
 }
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
 card.innerHTML='<div class="tool-heading"><span class="tool-icon ws-planner-icon">☑</span><div><h3>Daily planner</h3><p>Keep today simple: choose a few doable tasks.</p></div><span class="tool-index">NEW</span></div><div class="ws-planner-date" id="ws-planner-date"></div><form class="ws-planner-form" id="ws-planner-form"><label class="field-label" for="ws-planner-input">Add a task</label><div class="ws-planner-entry"><input id="ws-planner-input" class="text-input" maxlength="140" placeholder="e.g. Practise Python for 20 minutes" required><button class="btn primary" type="submit">Add</button></div></form><div class="ws-planner-progress"><div><span id="ws-planner-count">0 of 0 complete</span><strong id="ws-planner-percent">0%</strong></div><div class="ws-planner-track"><span id="ws-planner-bar"></span></div></div><ul class="ws-planner-list" id="ws-planner-list" aria-live="polite"></ul><div class="ws-planner-footer"><span>Saved on this device</span><button class="btn outline" id="ws-planner-clear" type="button">Clear completed</button></div>';
 $("#ws-tool-grid").prepend(card);
 const storageKey="shyam-daily-planner-v1";
 let tasks=[];try{tasks=JSON.parse(localStorage.getItem(storageKey)||"[]");if(!Array.isArray(tasks))tasks=[]}catch{tasks=[]}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(tasks))}catch{}};
 $("#ws-planner-date").textContent=new Intl.DateTimeFormat(undefined,{weekday:"long",month:"short",day:"numeric"}).format(new Date());
 function draw(){
  const list=$("#ws-planner-list");list.replaceChildren();
  tasks.forEach(task=>{const li=document.createElement("li");li.className="ws-planner-task"+(task.done?" done":"");const label=document.createElement("label");label.className="ws-planner-label";const check=document.createElement("input");check.type="checkbox";check.checked=!!task.done;check.addEventListener("change",()=>{task.done=check.checked;save();draw()});const title=document.createElement("span");title.textContent=task.text;label.append(check,title);const del=document.createElement("button");del.type="button";del.className="ws-planner-delete";del.textContent="×";del.setAttribute("aria-label","Delete task: "+task.text);del.addEventListener("click",()=>{tasks=tasks.filter(t=>t.id!==task.id);save();draw()});li.append(label,del);list.append(li)});
  const done=tasks.filter(t=>t.done).length,pct=tasks.length?Math.round(done/tasks.length*100):0;
  $("#ws-planner-count").textContent=done+" of "+tasks.length+" complete";$("#ws-planner-percent").textContent=pct+"%";$("#ws-planner-bar").style.width=pct+"%";
  if(!tasks.length){const empty=document.createElement("li");empty.className="ws-planner-empty";empty.textContent="Your plan is clear. Add one small task to get started.";list.append(empty)}
 }
 $("#ws-planner-form").addEventListener("submit",e=>{e.preventDefault();const input=$("#ws-planner-input"),value=input.value.trim();if(!value)return;tasks.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),text:value,done:false});save();draw();input.value="";input.focus()});
 $("#ws-planner-clear").addEventListener("click",()=>{tasks=tasks.filter(t=>!t.done);save();draw()});draw();
}
installDailyPlanner();
document.addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openCommand()}
 if(e.key==="Escape"&&!quickLauncher.hidden){closeCommand();finderButton.focus()}
});

renderHistory();renderMessages();showView("chat");
})();