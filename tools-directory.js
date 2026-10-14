(() => {
  const style = document.createElement("style");
  style.textContent = `
    .tool-directory { padding: 42px 0 30px; scroll-margin-top: 88px; }
    .tool-directory-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:14px; margin-top:22px; }
    .tool-directory-card { display:flex; align-items:flex-start; gap:13px; width:100%; min-height:92px; padding:18px; text-align:left; border:1px solid #e8defb; border-radius:18px; background:rgba(255,255,255,.88); color:#27213b; text-decoration:none; box-shadow:0 6px 22px rgba(79,48,130,.05); transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease; cursor:pointer; font:inherit; }
    .tool-directory-card:hover,.tool-directory-card:focus-visible { transform:translateY(-2px); border-color:#b49ae9; box-shadow:0 10px 26px rgba(79,48,130,.12); outline:none; }
    .tool-directory-icon { display:grid; place-items:center; flex:0 0 42px; height:42px; border-radius:13px; background:#f0e9ff; color:#6d45b5; font-size:21px; font-weight:700; }
    .tool-directory-copy { display:flex; flex-direction:column; gap:5px; min-width:0; }
    .tool-directory-copy strong { font-size:15px; line-height:1.35; }
    .tool-directory-copy small { color:#746b85; font-size:12px; line-height:1.45; }
    .tool-directory-search { width:100%; max-width:460px; margin-top:16px; padding:13px 16px; border:1px solid #ded3f4; border-radius:13px; background:white; color:#27213b; font:inherit; }
    .tool-directory-empty { padding:16px 0; color:#746b85; }
  `;
  document.head.append(style);

  const nav = document.querySelector(".nav-links");
  if (nav) {
    const allToolsLink = [...nav.querySelectorAll("a")].find(a => /all tools|more tools/i.test(a.textContent));
    if (allToolsLink) { allToolsLink.textContent = "All tools"; allToolsLink.href = "#tool-directory"; }
    else {
      const link = document.createElement("a");
      link.href = "#tool-directory"; link.textContent = "All tools";
      nav.append(link);
    }
  }

  const toolbox = document.querySelector(".tools-section");
  if (!toolbox) return;
  const section = document.createElement("section");
  section.className = "tool-directory shell";
  section.id = "tool-directory";
  section.setAttribute("aria-labelledby", "tool-directory-title");
  section.innerHTML = '<div class="section-heading"><div><p class="eyebrow">TOOL FINDER</p><h2 id="tool-directory-title">All <span class="gradient">tools.</span></h2></div><p class="section-desc">Choose a tool to jump straight to it. This list updates automatically when tools are added to the page.</p></div><label class="sr-only" for="tool-directory-search">Search all tools</label><input class="tool-directory-search" id="tool-directory-search" type="search" placeholder="Search tools…" autocomplete="off"><div class="tool-directory-grid" id="tool-directory-grid"></div><p class="tool-directory-empty" id="tool-directory-empty" hidden>No tools match your search.</p>';
  toolbox.before(section);

  const grid = section.querySelector("#tool-directory-grid");
  const search = section.querySelector("#tool-directory-search");
  const empty = section.querySelector("#tool-directory-empty");
  const items = [];
  const seen = new Set();
  const iconFor = (name, fallback) => {
    const match = name.match(/calculator|convert|unit/i);
    if (match && /calculator/i.test(name)) return "÷";
    if (/qr/i.test(name)) return "▦";
    if (/python/i.test(name)) return "Py";
    if (/image/i.test(name)) return "✦";
    if (/pdf|file/i.test(name)) return "⇧";
    if (/note/i.test(name)) return "✎";
    if (/word/i.test(name)) return "Aa";
    if (/focus|timer/i.test(name)) return "◷";
    if (/idea|mission/i.test(name)) return "✧";
    return fallback || "✦";
  };
  const addItem = item => {
    if (!item.title || !item.href || seen.has(item.title.toLowerCase())) return;
    seen.add(item.title.toLowerCase()); items.push(item);
  };

  document.querySelectorAll(".tool-card, .focus-card").forEach((card, index) => {
    const title = card.querySelector("h3")?.textContent?.trim();
    if (!title) return;
    if (!card.id) card.id = "tool-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const desc = card.querySelector(".tool-heading p")?.textContent?.trim() || "Open this tool";
    const pageLink = card.querySelector('a[href$=".html"]')?.getAttribute("href");
    addItem({title, description:desc, href:pageLink || "#"+card.id, icon:iconFor(title, String(index+1).padStart(2,"0")), kind:pageLink ? "external" : "internal"});
  });

  const qrLink = [...document.querySelectorAll('a[href*="qr-tools.html"]')][0];
  if (qrLink) addItem({title:"QR Scanner & Generator",description:"Scan a QR code or create one",href:qrLink.getAttribute("href"),icon:"▦",kind:"external"});
  document.querySelectorAll(".quick-ai a.ai-card").forEach(a => {
    const title = a.querySelector("strong")?.textContent?.trim();
    if (title) addItem({title,description:a.querySelector("small")?.textContent?.trim() || "Open website",href:a.href,icon:iconFor(title,"✦"),kind:"external"});
  });

  function render() {
    const query = search.value.trim().toLowerCase();
    grid.replaceChildren();
    const filtered = items.filter(item => (item.title+" "+item.description).toLowerCase().includes(query));
    for (const item of filtered) {
      const link = document.createElement("a");
      link.className = "tool-directory-card";
      link.href = item.href;
      if (item.kind === "external") { link.target = "_blank"; link.rel = "noopener noreferrer"; }
      const icon = document.createElement("span"); icon.className = "tool-directory-icon"; icon.setAttribute("aria-hidden","true"); icon.textContent = item.icon;
      const copy = document.createElement("span"); copy.className = "tool-directory-copy";
      const title = document.createElement("strong"); title.textContent = item.title;
      const desc = document.createElement("small"); desc.textContent = item.description;
      copy.append(title,desc); link.append(icon,copy); grid.append(link);
    }
    empty.hidden = filtered.length !== 0;
  }
  search.addEventListener("input", render);
  render();
})();