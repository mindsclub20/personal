(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const app=document.createElement("div");app.className="ws-app";app.innerHTML=`
<aside class="ws-sidebar" aria-label="Workspace navigation">
 <div class="ws-brand"><span class="ws-mark">✳</span><span>Shyam AI Workspace</span></div>
 <button class="ws-new" id="ws-new"><span class="ws-nav-icon">＋</span> New chat <span style="margin-left:auto;color:var(--ws-muted)">⌘K</span></button>
 <button class="ws-nav-btn active" data-view="chat"><span class="ws-nav-icon">◫</span> Chat</button>
 <button class="ws-nav-btn" data-view="tools"><span class="ws-nav-icon">▦</span> All tools</button>
 <div class="ws-sidebar-label">Recent conversations</div><div class="ws-history" id="ws-history"></div>
 <div class="ws-side-spacer"></div><div class="ws-side-bottom">
  <button id="ws-theme"><span class="ws-nav-icon">◐</span><span>Switch appearance</span></button>
  <button data-view="tools"><span class="ws-nav-icon">⚙</span> Toolbox settings & tools</button>
 </div><div class="ws-profile"><span class="ws-avatar">S</span><span><strong style="color:var(--ws-text);display:block">Personal workspace</strong><span>Local conversations</span></span></div>
</aside>
<section class="ws-main">
 <header class="ws-topbar"><div class="ws-top-left"><button class="ws-icon-btn ws-mobile-menu" id="ws-menu" aria-label="Open sidebar">☰</button><div class="ws-model">Workspace <small>Gemini AI</small></div></div><div class="ws-top-actions"><button class="ws-icon-btn" id="ws-top-theme" title="Toggle light/dark theme" aria-label="Toggle theme">◐</button></div></header>
 <div class="ws-chat-scroll" id="ws-chat-scroll"><div class="ws-chat-inner" id="ws-chat-inner">
 <section class="ws-welcome" id="ws-welcome"><div class="ws-orb">✳</div><h1>What are we working on?</h1><p>Your personal AI-style workspace for learning, coding, creating, and getting things done.</p>
 <div class="ws-suggestions">
 <button class="ws-suggestion" data-prompt="Help me plan a focused 30-minute study session."><span class="ws-s-icon">◷</span><span><strong>Plan a study session</strong><small>Make a practical plan with a clear next step</small></span></button>
 <button class="ws-suggestion" data-prompt="Give me a small Python project idea for robotics practice."><span class="ws-s-icon">⌘</span><span><strong>Build with Python</strong><small>Pick a mini-project to practise coding</small></span></button>
 <button class="ws-suggestion" data-prompt="Help me brainstorm a robotics engineering project."><span class="ws-s-icon">✧</span><span><strong>Explore an idea</strong><small>Turn a rough idea into useful steps</small></span></button>
 <button class="ws-suggestion" data-view="tools"><span class="ws-s-icon">▦</span><span><strong>Open my toolbox</strong><small>Calculator, Python, files, notes, and more</small></span></button>
 </div></section><div class="ws-messages" id="ws-messages"></div></div></div>
 <section class="ws-tool-view" id="ws-tool-view"><div class="ws-tool-head"><div><h2>Your tools</h2><p>Utilities from your existing toolbox, kept in this workspace.</p></div><button class="ws-back-chat" id="ws-back-chat">← Back to chat</button></div><div class="ws-tool-grid" id="ws-tool-grid"></div></section>
 <footer class="ws-composer-wrap" id="ws-composer-wrap"><form class="ws-composer-box" id="ws-form"><textarea class="ws-composer" id="ws-composer" rows="1" maxlength="8000" placeholder="Message Gemini…" aria-label="Write a message"></textarea><div class="ws-composer-tools"><div class="ws-composer-left"><button class="ws-composer-tool" type="button" id="ws-add-tool">＋ Tools</button><button class="ws-composer-tool" type="button" id="ws-focus-prompt">✧ Help me focus</button></div><div class="ws-composer-right"><span style="font-size:10px;color:var(--ws-muted);padding-right:5px">Enter to send</span><button class="ws-send" id="ws-send" type="submit" aria-label="Send message" disabled>↑</button></div></div></form><p class="ws-disclaimer">Powered by Gemini. Your API key stays on the server and is never sent to your browser.</p></footer>
</section></div>`;
document.body.append(app);
const originalTools=$(".tools-layout");
if(originalTools){$("#ws-tool-grid").append(originalTools);originalTools.className="ws-tool-grid";originalTools.querySelectorAll(".tool-card").forEach(c=>c.hidden=false);}
const themeKey="shyam-ws-theme",historyKey="shyam-ws-conversations";let currentId=null,conversations=[],busy=false;
try{conversations=JSON.parse(localStorage.getItem(historyKey)||"[]");if(!Array.isArray(conversations))conversations=[];}catch{conversations=[]}
try{if(localStorage.getItem(themeKey)==="dark")document.body.classList.add("ws-dark");}catch{}
const persist=()=>{try{localStorage.setItem(historyKey,JSON.stringify(conversations.slice(0,30)))}catch{}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function active(){return conversations.find(c=>c.id===currentId)}
function renderHistory(){const el=$("#ws-history");el.replaceChildren();if(!conversations.length){const p=document.createElement("div");p.style.cssText="font-size:12px;color:var(--ws-muted);padding:8px 10px";p.textContent="Your chats will appear here";el.append(p);return}conversations.slice(0,20).forEach(c=>{const b=document.createElement("button");b.className="ws-history-item"+(c.id===currentId?" selected":"");b.textContent=c.title||"New conversation";b.title=b.textContent;b.addEventListener("click",()=>openChat(c.id));el.append(b)})}
function renderMessages(){const c=active(),host=$("#ws-messages");host.replaceChildren();$("#ws-welcome").style.display=c&&c.messages.length?"none":"flex";if(!c)return;c.messages.forEach(m=>{const row=document.createElement("div");row.className="ws-message "+m.role;const avatar=m.role==="assistant"?'<div class="ws-msg-avatar">✳</div>':"";const body='<div class="ws-msg-content">'+(m.role==="assistant"?'<div class="ws-msg-label">Workspace</div>':"")+esc(m.text)+'</div>';row.innerHTML=m.role==="assistant"?avatar+body:body;host.append(row)});$("#ws-chat-scroll").scrollTop=$("#ws-chat-scroll").scrollHeight}
function openChat(id){currentId=id;renderHistory();renderMessages();showView("chat");}
function newChat(){currentId=null;renderHistory();renderMessages();$("#ws-composer").value="";$("#ws-composer").focus();showView("chat")}
function addMessage(role,text){let c=active();if(!c){c={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:text.slice(0,44)+(text.length>44?"…":""),messages:[],updated:Date.now()};conversations.unshift(c);currentId=c.id}c.messages.push({role,text});c.updated=Date.now();conversations.sort((a,b)=>b.updated-a.updated);persist();renderHistory();renderMessages()}
function showView(view){const isTools=view==="tools";$("#ws-tool-view").classList.toggle("open",isTools);$("#ws-chat-scroll").style.display=isTools?"none":"block";$("#ws-composer-wrap").style.display=isTools?"none":"block";$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));app.classList.remove("sidebar-open")}
async async function sendMessage(text){const v=(text||"").trim();if(!v||busy)return;$("#ws-composer").value="";resizeComposer();busy=true;$("#ws-send").disabled=true;const chatId=(active()||{}).id;addMessage("user",v);const c=active();addMessage("assistant","Thinking…");const history=c.messages.slice(0,-2).filter(m=>m.text!=="Thinking…").slice(-12).map(m=>({role:m.role==="assistant"?"model":"user",text:m.text}));try{const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v,history})});let data={};try{data=await response.json()}catch{}if(!response.ok)throw new Error(data.error||"AI request failed ("+response.status+").");const target=conversations.find(x=>x.id===chatId)||active();if(target){const pending=[...target.messages].reverse().find(m=>m.text==="Thinking…");if(pending)pending.text=data.reply||"I couldn't produce a response. Please try again.";target.updated=Date.now();persist();renderHistory();renderMessages()}}catch(err){const target=conversations.find(x=>x.id===chatId)||active();if(target){const pending=[...target.messages].reverse().find(m=>m.text==="Thinking…");if(pending)pending.text="I couldn't connect to Gemini. "+(err.message||"Please try again.")+" Check that GEMINI_API_KEY is set for Production in Vercel, then redeploy.";persist();renderMessages()}}finally{busy=false;resizeComposer()}}
function resizeComposer(){const el=$("#ws-composer");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,160)+"px";$("#ws-send").disabled=busy||!el.value.trim()}
$("#ws-form").addEventListener("submit",e=>{e.preventDefault();sendMessage($("#ws-composer").value)});
$("#ws-composer").addEventListener("input",resizeComposer);$("#ws-composer").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage($("#ws-composer").value)}});
$("#ws-new").addEventListener("click",newChat);$("#ws-menu").addEventListener("click",()=>app.classList.toggle("sidebar-open"));
$("#ws-theme").addEventListener("click",toggleTheme);$("#ws-top-theme").addEventListener("click",toggleTheme);
function toggleTheme(){document.body.classList.toggle("ws-dark");try{localStorage.setItem(themeKey,document.body.classList.contains("ws-dark")?"dark":"light")}catch{}}
$("#ws-add-tool").addEventListener("click",()=>showView("tools"));$("#ws-back-chat").addEventListener("click",()=>showView("chat"));$$("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("#ws-focus-prompt").addEventListener("click",()=>{const el=$("#ws-composer");el.value="Help me choose one realistic task to focus on for the next 25 minutes.";resizeComposer();el.focus()});
$$("[data-prompt]").forEach(b=>b.addEventListener("click",()=>{const el=$("#ws-composer");el.value=b.dataset.prompt;resizeComposer();el.focus()}));
$$(".ws-suggestion[data-view='tools']").forEach(b=>b.addEventListener("click",()=>showView("tools")));
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat()}if(e.key==="Escape")app.classList.remove("sidebar-open")});
renderHistory();renderMessages();showView("chat");
})();