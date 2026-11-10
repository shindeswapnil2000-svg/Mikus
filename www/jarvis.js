/* Jarvis: the assistant layer. A persona, a memory that learns from articles and from you, proactive nudges, voice. */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc, N } = T;
  const S = () => T.S();
  const $ = (s) => document.querySelector(s);
  const DAY = 864e5;

  const jv = () => {
    const s = S();
    s.jv = Object.assign({ name: "Jarvis", voice: false, pings: true, hours: Array(24).fill(0), first: Date.now(), days: [], lastReview: 0, notes: [], pinged: "", n: 0 }, s.jv || {});
    return s.jv;
  };
  const mem = () => {
    const s = S();
    s.mem = Object.assign({ facts: [], src: [] }, s.mem || {});
    return s.mem;
  };
  const tone = () => (S().tone == "brutal" ? "brutal" : S().tone == "firm" ? "firm" : "jarvis");

  // ------------------------------------------------------------ reading a page
  async function fetchPage(url) {
    let html;
    if (N) { const r = await N.httpGet({ url, accept: "text/html,application/xhtml+xml", timeout: 15000 }); if (r.status >= 400) throw new Error("HTTP " + r.status); html = r.body; }
    else { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); html = await r.text(); }
    return html;
  }
  function extract(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script,style,noscript,nav,footer,header,aside,form,iframe,svg").forEach((e) => e.remove());
    const og = doc.querySelector('meta[property="og:title"]');
    const title = ((og && og.getAttribute("content")) || doc.title || "").replace(/\s+/g, " ").trim();
    const root = doc.querySelector("article") || doc.querySelector("main") || doc.body;
    let txt = Array.from(root.querySelectorAll("p,h2,h3,li,blockquote")).map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter((t) => t.length > 35).join("\n");
    if (txt.length < 300) txt = (root.textContent || "").replace(/\s+/g, " ").trim();
    return { title, text: txt.slice(0, 12000) };
  }
  T.fetchPage = fetchPage; T.extractPage = extract;
  const STOP = new Set("this that with have from they them were been will would there their what when which about into your more some than then also just only very much such these those over after before because while where being does done doing could should might said says like make made many most other".split(" "));
  const words = (s) => String(s || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  function jsonOf(s) {
    const m = String(s).match(/[\[{][\s\S]*[\]}]/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }

  async function learn(o) {
    const M = mem();
    if (M.src.length >= 80) return T.toast("Memory is full (80 sources). Delete a few in Me, Memory.");
    T.toast("Reading...");
    let title = o.title || "", text = o.text || "", url = o.url || "";
    try {
      if (!text && url) { const p = extract(await fetchPage(url)); text = p.text; title = title || p.title; }
    } catch (e) {
      if (!text) return T.toast("I could not open that page (" + String(e.message || e).slice(0, 40) + "). Paste the text and I will learn that instead.");
    }
    if (!text || text.length < 80) text = [title, o.hint].filter(Boolean).join(". ");
    if (text.length < 40) return T.toast("Not enough text to learn from.");
    let sum = "", pts = [], tags = [], rel = "";
    try {
      const r = await T.ai([{ role: "user", content: `Read this for my long-term memory. About me: ${T.profileLine ? T.profileLine() : "a student and researcher"}.\n\nTITLE: ${title}\nTEXT:\n${text.slice(0, 7000)}\n\nReturn ONLY JSON: {"summary":"max 70 words","points":["3 to 6 key claims or facts"],"tags":["3 to 6 lowercase topic tags"],"relevance":"one sentence on why this matters to me"}` }], "You compress documents faithfully. Never add facts that are not in the text. Output JSON only.", 700);
      const j = jsonOf(r) || {};
      sum = j.summary || ""; pts = Array.isArray(j.points) ? j.points.slice(0, 6) : []; tags = Array.isArray(j.tags) ? j.tags.slice(0, 6) : []; rel = j.relevance || "";
    } catch (e) { /* fall back to a plain summary below */ }
    if (!sum) {
      const freq = {}; words(text).forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
      tags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]);
      sum = text.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ").slice(0, 400);
    }
    M.src.unshift({ id: T.uid(), url, title: title || url || "Pasted text", sum, pts, tags, rel, txt: text.slice(0, 5000), at: Date.now() });
    T.logA("learn", "Learned: " + (title || url || "pasted text"));
    T.save(); T.toast("Learned. I will refer to it."); T.ui.jvtext = ""; T.render();
  }

  // ------------------------------------------------------------ recall
  function recall(query, k) {
    const q = new Set(words(query));
    if (!q.size) return [];
    return mem().src.map((s) => {
      let sc = 0;
      words(s.title).forEach((w) => { if (q.has(w)) sc += 3; });
      (s.tags || []).forEach((t) => words(t).forEach((w) => { if (q.has(w)) sc += 2; }));
      words(s.sum + " " + (s.pts || []).join(" ")).forEach((w) => { if (q.has(w)) sc += 1; });
      let n = 0; words(s.txt).forEach((w) => { if (q.has(w) && n < 6) { sc += 0.5; n++; } });
      return { s, sc };
    }).filter((x) => x.sc >= 2).sort((a, b) => b.sc - a.sc).slice(0, k || 3).map((x) => x.s);
  }

  // ------------------------------------------------------------ context for the model
  function context(query) {
    const s = S(), M = mem(), out = [];
    const o = T.open();
    out.push(`Now: ${new Date().toLocaleString()}. Open tasks: ${o.length}, overdue: ${o.filter(T.late).length}.`);
    if (T.profileLine) out.push("About the user: " + T.profileLine());
    if (T.pathLine) out.push("Career plan: " + T.pathLine());
    if (T.bodyLine) out.push("Body and mind: " + T.bodyLine());
    if (T.readCount) out.push(`Canon read: ${T.readCount()}. Next suggested: ${T.nextRead() ? T.nextRead()[2] : "none"}.`);
    if (M.facts.length) out.push("What I know about the user:\n" + M.facts.slice(0, 25).map((f) => "- " + f.t).join("\n"));
    const r = recall(query, 3);
    if (r.length) out.push("Relevant things the user taught me (cite by title when you use them):\n" + r.map((x) => `* "${x.title}": ${x.sum} ${(x.pts || []).slice(0, 3).join("; ")}`).join("\n"));
    return out.join("\n");
  }
  function persona(mode, query) {
    const j = jv(), s = S();
    const toneLine = { jarvis: "Manner: calm, courteous, dry-witted, quietly confident, like a brilliant chief of staff. Light humour is welcome. Never grovelling, never theatrical.", firm: "Manner: firm and direct, no padding.", brutal: "Manner: blunt and exacting about excuses, never about the person's worth, body, identity or family." }[mode == "tm" ? "brutal" : tone()];
    const base = `You are ${j.name}, ${s.name}'s personal AI assistant, built into their phone app. ${toneLine} Be concise by default and lead with the useful thing; end with one concrete next step when that helps. Be honest before agreeable and say when you are unsure. Use what you remember about the user, and when you draw on something they taught you, name it. Never invent facts about the user. You cannot place calls or send messages from inside chat; the app does that from commands like "call Mom" and from buttons. You do not browse the web in chat. You are not a doctor, lawyer or immigration adviser: for health, legal and visa matters give general information, point to official sources, and say to verify. If the user seems distressed or unsafe, drop the wit, respond warmly, suggest someone they trust or a local helpline, and mention the SOS button if there is danger. Do not give crash-diet or extreme exercise advice.`;
    const mentor = mode == "mentor" ? `\nRole now: academic mentor for a social scientist heading toward an anthropology PhD, a postdoc and a professorship abroad, working on hatred, anti-minority politics, Hindu nationalism, religious populism, youth, friendship and kinship. Be rigorous. Name theorists and works precisely and say when you are unsure of a citation. Critique like a good supervisor: specific, kind, demanding. For funding, deadlines, visas and affiliations, give what you know and tell them to verify on the official page, since these change.` : "";
    return base + mentor + "\n\n" + context(query);
  }
  T.sysFor = persona;
  T.mentorSys = () => persona("mentor", (T.ui.lastq || ""));
  T.sysDefault = () => persona(T.ui.mode == "tm" ? "tm" : "j", (T.ui.lastq || ""));
  T.jvName = () => jv().name;

  // ------------------------------------------------------------ facts
  function addFact(t, k) {
    t = String(t || "").trim().slice(0, 200); if (t.length < 6) return false;
    const M = mem(), low = t.toLowerCase();
    if (M.facts.some((f) => f.t.toLowerCase() == low || (low.length > 20 && f.t.toLowerCase().includes(low.slice(0, 20))))) return false;
    M.facts.unshift({ id: T.uid(), t, k: k || "fact", at: Date.now() }); M.facts = M.facts.slice(0, 120); T.save(); return true;
  }
  T.remember = addFact;
  T.on("jarvis:note", (t) => { const j = jv(); j.notes.unshift({ t: Date.now(), x: t }); j.notes = j.notes.slice(0, 30); T.save(); });
  T.on("jarvis:learn", learn);
  async function extractFacts(user, reply) {
    try {
      const r = await T.ai([{ role: "user", content: `From this exchange, extract at most 3 durable facts about the USER worth remembering (goals, preferences, constraints, people, plans, health habits they chose to share). Skip anything trivial or one-off. Return ONLY a JSON array of short strings, or [].\n\nUSER: ${user}\nASSISTANT: ${reply.slice(0, 600)}` }], "You extract facts faithfully. Output JSON only.", 250);
      const a = jsonOf(r);
      if (Array.isArray(a)) a.slice(0, 3).forEach((x) => typeof x == "string" && addFact(x));
    } catch (e) { /* learning is best effort */ }
  }
  T.on("chat:done", (o) => {
    const j = jv(); j.n++; T.ui.lastq = "";
    const m = o.user.match(/^(?:remember(?: that)?|note that|keep in mind(?: that)?)[:,]?\s+(.+)$/i);
    if (m && addFact(m[1])) T.toast("Noted.");
    else if (j.n % 4 == 0 || /\b(my goal|i want to|i prefer|i am allergic|i don'?t eat|i have a|my (?:mother|father|sister|brother|supervisor|partner)|i'?m planning|i decided)\b/i.test(o.user)) extractFacts(o.user, o.reply);
    if (j.voice) speak(o.reply);
  });
  T.on("chat:before", (t) => { T.ui.lastq = t; });

  // ------------------------------------------------------------ voice
  function speak(t) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(t).replace(/[*_#`>-]+/g, " ").slice(0, 900));
      u.rate = 1; u.lang = S().lang || "en-IN"; speechSynthesis.speak(u);
    } catch (e) { /* speech is optional */ }
  }
  async function listen() {
    if (N) { try { const r = await N.listen({ lang: S().lang }); if (r && r.text) T.fire("chat", r.text); } catch (e) { T.toast("Mic: " + (e.message || e)); } return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return T.toast("Voice input is not supported in this browser.");
    const r = new R(); r.lang = S().lang; r.onresult = (e) => T.fire("chat", e.results[0][0].transcript); r.onerror = (e) => T.toast("Mic: " + e.error); r.start();
  }

  // ------------------------------------------------------------ nudges: what Jarvis notices
  const hr = () => new Date().getHours();
  const greet = () => { const h = hr(); return (h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good evening") + ", " + S().name; };
  function insights() {
    const s = S(), out = [], o = T.open(), late = o.filter(T.late);
    const b = T.body ? T.body() : null, pl = T.pathNext ? T.pathNext() : null;
    if (!(s.sos && s.sos.contacts && s.sos.contacts.length)) out.push({ p: 95, x: "You have no emergency contacts set up. It takes two minutes and could matter a great deal.", a: "Set up SOS", go: ["safety"] });
    if (late.length) out.push({ p: 90, x: `${late.length} overdue. "${late[0].t}" first.`, a: "Start it", fn: "focus", v: late[0].id });
    if (b && b.waterBehind) out.push({ p: 70, x: `Water is behind schedule: ${b.water} of ${b.goal} ml. A glass now keeps you ahead.`, a: "Log 250 ml", fn: "bwater", v: "250" });
    if (b && !b.mood && hr() >= 19) out.push({ p: 65, x: "You have not checked in with yourself today. Sixty seconds, and I will remember it.", a: "Reflect", go: ["body", "mind"] });
    if (b && b.sleepLow) out.push({ p: 60, x: "Sleep has been short this week. I would protect tonight.", a: "Open Body", go: ["body"] });
    if (pl && pl.soon) out.push({ p: 75, x: pl.soon, a: "Open Path", go: ["path"] });
    if (T.nextRead && T.nextRead()) { const n = T.nextRead(); out.push({ p: 40, x: `Reading block: ${n[1]}, ${n[2]}. Twenty-five pages and one line of notes.`, a: "Open canon", go: ["scholar", "canon"] }); }
    if (!(s.pp && s.pp.done)) out.push({ p: 55, x: "I cannot plan your PhD, postdoc and professorship properly until you answer my questions. Ten minutes.", a: "Start the interview", go: ["path"] });
    if (!out.length) out.push({ p: 1, x: "Nothing urgent. A good moment to read something hard.", a: "Open Scholar", go: ["scholar"] });
    return out.sort((a, b) => b.p - a.p);
  }
  T.homeCard = function () {
    const j = jv(), ins = insights().slice(0, 2), M = mem();
    return `<div class="card jcard"><div class="row" style="align-items:flex-start"><div><div class="eyebrow">${esc(j.name)}</div><b style="font-size:17px">${esc(greet())}.</b></div><button class="chip" data-a="tab" data-v="coach">Talk</button></div>
      ${ins.map((i) => `<div class="row" style="margin-top:10px;gap:10px;align-items:flex-start"><span class="sm" style="flex:1">${esc(i.x)}</span><button class="chip" data-a="jvgo" data-v="${esc(JSON.stringify(i.go || [i.fn, i.v]))}" data-k="${i.fn ? "fn" : "go"}">${esc(i.a)}</button></div>`).join("")}
      ${M.facts.length ? `<div class="sm soft" style="margin-top:10px">I remember ${M.facts.length} thing${M.facts.length == 1 ? "" : "s"} about you and ${M.src.length} source${M.src.length == 1 ? "" : "s"} you taught me.</div>` : ""}</div>`;
  };

  // ------------------------------------------------------------ scheduled check-ins, rebuilt on each open so the wording keeps moving
  const POOL = {
    water: ["Water check. A glass, then back to work.", "Hydration is the cheapest performance upgrade you own. Drink.", "Your future self asks for a glass of water."],
    eve: ["Evening. Sixty seconds: how was today, honestly? Open the app and tell me.", "Day nearly done. What went well, and what are you carrying into tomorrow?", "Reflection time. I keep the notes so you do not have to."],
    wk: ["Sunday review: let us look at your week and set up the next one.", "Week's end. Shall we see what actually moved?"]
  };
  function pings() {
    if (!N || !jv().pings) return;
    const j = jv(), today = T.ymd(Date.now());
    if (j.pinged == today) return; j.pinged = today;
    const h = j.hours.slice(19, 23), best = h.some((x) => x > 2) ? 19 + h.indexOf(Math.max(...h)) : 21;
    const slots = [[11, "water", "Water"], [15, "water", "Water"], [best, "eve", "Reflect"]];
    for (let d = 0; d < 7; d++) {
      const day = new Date(); day.setDate(day.getDate() + d);
      slots.forEach(([hh, k, title], i) => {
        const at = new Date(day); at.setHours(hh, k == "eve" ? 30 : 0, 0, 0);
        if (at.getTime() < Date.now() + 2e4) return;
        const pool = POOL[k], text = pool[(d + i + day.getDate()) % pool.length];
        T.push("jv-" + T.ymd(at.getTime()) + "-" + k + i, text, { at: at.getTime(), title: j.name + " · " + title, p: 3 });
      });
      if (day.getDay() == 0) { const at = new Date(day); at.setHours(19, 0, 0, 0); if (at.getTime() > Date.now() + 2e4) T.push("jv-wk-" + T.ymd(at.getTime()), POOL.wk[d % 2], { at: at.getTime(), title: j.name + " · Weekly review", p: 3 }); }
    }
    T.save();
  }
  function track() { const j = jv(), h = hr(); j.hours[h] = (j.hours[h] || 0) + 1; const d = T.ymd(Date.now()); if (j.days[j.days.length - 1] != d) { j.days.push(d); j.days = j.days.slice(-120); } T.save(); }

  // ------------------------------------------------------------ weekly self-review: Jarvis studies what it has learned and notes how it will adapt
  async function weekly(force) {
    const j = jv();
    if (!force && Date.now() - j.lastReview < 7 * DAY) return;
    if (!force && j.days.length < 3) return;
    j.lastReview = Date.now(); T.save();
    try {
      const r = await T.ai([{ role: "user", content: `Review the past week for ${S().name} using the context. In under 140 words: (1) two patterns you noticed, (2) one thing you have learned about them, (3) one change you will make in how you help next week. Be specific and kind.` }], persona("j", "week review"), 400);
      j.notes.unshift({ t: Date.now(), x: "Weekly review: " + r }); j.notes = j.notes.slice(0, 30); T.save();
      if (force) T.render();
    } catch (e) { /* try again next week */ }
  }

  // ------------------------------------------------------------ screens
  const memView = () => {
    const j = jv(), M = mem(), lvl = Math.min(5, 1 + Math.floor((j.days.length + M.facts.length + M.src.length * 2) / 14));
    const names = ["New", "Acquainted", "Familiar", "Trusted", "Seasoned"];
    return T.meBar() + `<h2 style="margin-bottom:4px">Memory</h2><p class="soft sm" style="margin-top:0">What ${esc(j.name)} knows about you and what you have taught it. You can see and delete all of it.</p>
      <div class="card row"><div class="stat"><b>${M.facts.length}</b><span class="soft sm">facts</span></div><div class="stat"><b>${M.src.length}</b><span class="soft sm">sources</span></div><div class="stat"><b>${j.days.length}</b><span class="soft sm">days together</span></div></div>
      <div class="card"><h3>Relationship: ${names[Math.min(4, lvl - 1)]}</h3><div class="bar"><i style="width:${Math.min(100, (j.days.length + M.facts.length + M.src.length * 2) / 70 * 100)}%"></i></div><p class="sm soft">The more you tell it and teach it, the less it has to ask. It updates its notes every week.</p></div>
      <div class="card"><h3>Teach ${esc(j.name)}</h3><input id="jvu" placeholder="Paste a link to an article, paper page or post" value="${esc(T.ui.jvtext || "")}"><textarea id="jvx" placeholder="...or paste the text itself" style="margin-top:8px"></textarea><div class="chips" style="margin-top:8px"><button class="chip" data-a="jvlearn">Learn this</button></div><p class="sm soft">Pages are read on your phone and summarised by the AI engine you set. PDFs: paste the text.${N ? " You can also share a link from your browser to Taskmaster and it will learn it." : ""}</p></div>
      <div class="card"><h3>Facts</h3>${M.facts.length ? M.facts.slice(0, 40).map((f) => `<div class="row" style="margin:6px 0;align-items:flex-start"><span class="sm">${esc(f.t)}</span><button class="chip" data-a="jvfdel" data-v="${f.id}" aria-label="Forget">&#10005;</button></div>`).join("") : '<p class="sm soft">None yet. Say "remember that I train at 6am" in chat, or just talk to me.</p>'}<div class="row" style="gap:8px;margin-top:8px"><input id="jvf" placeholder="Add a fact about you" data-enter="jvfadd"><button class="btn s" data-a="jvfadd">Add</button></div></div>
      <div class="card"><h3>Sources I learned</h3>${M.src.length ? M.src.map((x) => `<div style="margin:10px 0;border-top:1px solid var(--line);padding-top:10px"><b>${esc(x.title)}</b><div class="sm soft">${new Date(x.at).toLocaleDateString()}${x.tags && x.tags.length ? " · " + esc(x.tags.join(", ")) : ""}</div><p class="sm" style="margin:6px 0">${esc(x.sum)}</p>${x.rel ? `<p class="sm soft" style="margin:0 0 6px">${esc(x.rel)}</p>` : ""}<div class="chips">${x.url ? `<a class="chip" style="text-decoration:none" href="${esc(x.url)}" target="_blank" rel="noopener">Open</a>` : ""}<button class="chip" data-a="jvsdel" data-v="${x.id}">Forget</button></div></div>`).join("") : '<p class="sm soft">Nothing yet.</p>'}</div>
      <div class="card"><h3>Notes from my weekly reviews</h3>${j.notes.length ? j.notes.slice(0, 4).map((n) => `<p class="sm" style="white-space:pre-wrap;margin:8px 0"><span class="soft">${new Date(n.t).toLocaleDateString()}</span> ${esc(n.x)}</p>`).join("") : '<p class="sm soft">The first review appears after a few days of use.</p>'}<div class="chips"><button class="chip" data-a="jvweek">Review now</button></div></div>
      <div class="card"><h3>${esc(j.name)} settings</h3><label class="l" style="margin-top:0">Assistant name</label><input id="jvn" value="${esc(j.name)}"><div class="row" style="margin-top:12px"><span class="sm">Speak replies aloud</span><button class="chip ${j.voice ? "on" : ""}" data-a="jvvoice">${j.voice ? "On" : "Off"}</button></div><div class="row" style="margin-top:10px"><span class="sm">Check-ins: water, evening reflection, weekly review${N ? "" : " (Android app only)"}</span><button class="chip ${j.pings ? "on" : ""}" data-a="jvpings">${j.pings ? "On" : "Off"}</button></div>
      <label class="l">Manner</label><div class="chips">${[["jarvis", "Composed"], ["firm", "Firm"], ["brutal", "Brutal"]].map(([k, l]) => `<button class="chip ${tone() == k ? "on" : ""}" data-a="jvtone" data-v="${k}">${l}</button>`).join("")}</div><div class="chips" style="margin-top:10px"><button class="chip" data-a="jvsave">Save name</button></div>
      <p class="sm soft">Honest limits: Jarvis listens when you tap the mic. It cannot sit awake listening for a wake word, because Android does not allow a normal app to do that without a permanent notification and a lot of battery. Check-ins are scheduled on your phone and their wording is refreshed each time you open the app.</p></div>
      <div class="card"><h3>Privacy</h3><p class="sm soft" style="margin:0">Memory lives on this phone. When you chat, learn a page or ask for a plan, the relevant text (including any health, mood or career details Jarvis adds as context) goes to the AI engine you chose in Me. Use your own Anthropic key if you want that to be a company you trust, and delete anything here that you do not want sent again.</p></div>`;
  };
  T.view("memory", memView);

  T.coachExtras = () => `<details class="card" ${T.ui.jvopen ? "open" : ""}><summary><b>Feed ${esc(jv().name)}</b> <span class="sm soft">link or text</span></summary><input id="jvu" placeholder="Paste an article link" style="margin-top:10px"><textarea id="jvx" placeholder="...or paste text" style="margin-top:8px;min-height:70px"></textarea><div class="chips" style="margin-top:8px"><button class="chip" data-a="jvlearn">Learn this</button><button class="chip" data-a="tab" data-v="memory">What I know</button></div></details>`;

  T.act({
    jvgo(v, el) { const k = el.dataset.k, a = JSON.parse(v); if (k == "fn") { T.A[a[0]] && T.A[a[0]](a[1]); } else { if (a[1]) T.ui[a[0] == "scholar" ? "sch" : a[0] == "body" ? "bt" : "pt"] = a[1]; T.go(a[0]); } },
    jvlearn() { const u = T.val("jvu"), x = T.val("jvx"); if (!u && !x) return T.toast("Paste a link or some text first."); if (/^https?:\/\//.test(u)) learn({ url: u, text: x }); else learn({ text: x || u, title: (x || u).slice(0, 60) }); },
    jvfadd() { const t = T.val("jvf"); if (addFact(t)) { T.render(); } else T.toast("Too short, or I already know that."); },
    jvfdel(v) { mem().facts = mem().facts.filter((f) => f.id != v); T.save(); T.render(); },
    jvsdel(v) { mem().src = mem().src.filter((f) => f.id != v); T.save(); T.render(); },
    jvvoice() { jv().voice = !jv().voice; T.save(); T.render(); }, jvpings() { jv().pings = !jv().pings; jv().pinged = ""; T.save(); T.render(); pings(); },
    jvtone(v) { S().tone = v; T.save(); T.render(); },
    jvsave() { const n = T.val("jvn"); if (n) { jv().name = n.slice(0, 20); T.save(); T.toast("Saved"); T.render(); } },
    jvweek() { T.toast("Reviewing..."); weekly(true); }, jvmic: listen
  });

  T.on("boot", () => {
    track(); pings(); weekly(false);
    if (N && N.addListener) N.addListener("shared", (d) => { if (T.h.share && T.h.share.length) return T.fire("share", d); const t = String((d && d.text) || "").trim(); if (!t) return; const m = t.match(/https?:\/\/\S+/); T.toast("Shared to " + jv().name + ". Reading..."); learn(m ? { url: m[0], title: (d && d.subject) || "" } : { text: t, title: (d && d.subject) || t.slice(0, 60) }); });
  });
  T.on("resume", () => { track(); pings(); });
});
