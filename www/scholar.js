/* Scholar: live news and journal feeds, recent papers on your topics, the theory canon, and a saved list. */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc, N } = T;
  const S = () => T.S();
  const K = window.KB;
  const $ = (s) => document.querySelector(s);
  const CK = "taskmaster-cache";

  const DEFTOPICS = ["Hindu nationalism", "anti-minority politics India", "religious populism", "communal violence", "online hate speech India", "youth and politics India", "anthropology of hatred"];
  const rs = () => {
    const s = S();
    s.rs = Object.assign({ topics: DEFTOPICS.slice(), off: {}, oakey: "", brief: null }, s.rs || {});
    return s.rs;
  };

  // ------------------------------------------------------------ cache
  let D = { items: [], status: {}, ts: 0, papers: {}, pts: 0, loading: false, ploading: false, briefing: false };
  try { const c = JSON.parse(localStorage.getItem(CK) || "null"); if (c) D = Object.assign(D, c, { loading: false, ploading: false, briefing: false }); } catch (e) { /* no cache yet */ }
  const keep = () => { try { localStorage.setItem(CK, JSON.stringify({ items: D.items.slice(0, 400), status: D.status, ts: D.ts, papers: D.papers, pts: D.pts })); } catch (e) { /* cache is optional */ } };

  // ------------------------------------------------------------ fetching
  async function getText(url, accept) {
    if (N) {
      const r = await N.httpGet({ url, accept: accept || "", timeout: 14000 });
      if (r.status >= 400) throw new Error("HTTP " + r.status);
      return r.body;
    }
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 14000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } finally { clearTimeout(t); }
  }
  const strip = (h) => { const d = document.createElement("div"); d.innerHTML = String(h || "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, ""); return (d.textContent || "").replace(/\s+/g, " ").trim(); };
  function parseFeed(xml, src) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("not a feed");
    const out = [];
    doc.querySelectorAll("item, entry").forEach((it) => {
      const g = (sel) => { const e = it.querySelector(sel); return e ? e.textContent : ""; };
      let link = g("link");
      if (!link || !/^http/.test(link.trim())) { const l = it.querySelector("link[rel=alternate], link[href]"); link = l ? l.getAttribute("href") : ""; }
      const date = Date.parse(g("pubDate") || g("published") || g("updated") || g("date")) || 0;
      const title = strip(g("title"));
      if (!title || !link) return;
      out.push({ id: link.trim(), t: title, u: link.trim(), d: date, s: strip(g("description") || g("summary") || g("encoded") || g("content")).slice(0, 280), src: src.n, cat: src.c });
    });
    return out;
  }
  const hits = (it) => { const x = (it.t + " " + it.s).toLowerCase(); return K.FOCUS.filter((w) => x.includes(w)); };

  async function loadFeeds(force) {
    if (D.loading) return;
    if (!force && Date.now() - D.ts < 2 * 36e5 && D.items.length) return;
    D.loading = true; D.status = {}; T.ui.tab == "scholar" && T.render();
    const R = rs(), list = K.FEEDS.filter((f) => !R.off[f.id]), all = [];
    let i = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (i < list.length) {
        const f = list[i++];
        try { const items = parseFeed(await getText(f.u), f).slice(0, 14); D.status[f.id] = { ok: true, n: items.length }; all.push(...items); }
        catch (e) { D.status[f.id] = { ok: false, err: String(e.message || e).slice(0, 40) }; }
      }
    }));
    const seen = new Set();
    D.items = all.filter((x) => !seen.has(x.id) && seen.add(x.id)).map((x) => Object.assign(x, { h: hits(x) })).sort((a, b) => b.d - a.d);
    D.ts = Date.now(); D.loading = false; keep();
    T.ui.tab == "scholar" && T.render();
  }

  const q = encodeURIComponent;
  const iso = (d) => new Date(d).toISOString().slice(0, 10);
  function abstractOf(inv) {
    if (!inv) return "";
    const w = []; Object.keys(inv).forEach((k) => inv[k].forEach((p) => { w[p] = k; }));
    return w.filter(Boolean).join(" ").slice(0, 320);
  }
  async function paperQuery(topic) {
    const since = iso(Date.now() - 180 * 864e5), R = rs();
    try {
      const u = "https://api.openalex.org/works?search=" + q(topic) + "&filter=from_publication_date:" + since + ",type:article&sort=publication_date:desc&per-page=6&select=id,title,publication_date,doi,primary_location,authorships,cited_by_count,abstract_inverted_index" + (R.oakey ? "&api_key=" + q(R.oakey) : "");
      const j = JSON.parse(await getText(u, "application/json"));
      const r = (j.results || []).map((w) => ({ id: w.doi || w.id, t: w.title || "(untitled)", u: w.doi || w.id, d: Date.parse(w.publication_date) || 0, v: (((w.primary_location || {}).source) || {}).display_name || "", a: (w.authorships || []).slice(0, 3).map((x) => x.author && x.author.display_name).filter(Boolean).join(", "), c: w.cited_by_count || 0, s: abstractOf(w.abstract_inverted_index) }));
      if (r.length) return r;
    } catch (e) { /* fall back to Crossref */ }
    const u2 = "https://api.crossref.org/works?query.bibliographic=" + q(topic) + "&filter=from-pub-date:" + since + ",type:journal-article&sort=published&order=desc&rows=6&select=title,author,issued,DOI,container-title,abstract,URL";
    const j2 = JSON.parse(await getText(u2, "application/json"));
    return ((j2.message || {}).items || []).map((w) => ({ id: w.DOI, t: (w.title || ["(untitled)"])[0], u: w.URL || "https://doi.org/" + w.DOI, d: Date.UTC(...((w.issued && w.issued["date-parts"] && w.issued["date-parts"][0]) || [1970, 0]).map((v, i) => i == 1 ? v - 1 : v)), v: (w["container-title"] || [""])[0], a: (w.author || []).slice(0, 3).map((x) => (x.given || "") + " " + (x.family || "")).join(", "), c: 0, s: strip(w.abstract || "").slice(0, 320) }));
  }
  async function loadPapers(force) {
    if (D.ploading) return;
    if (!force && Date.now() - D.pts < 6 * 36e5 && Object.keys(D.papers).length) return;
    D.ploading = true; T.ui.tab == "scholar" && T.render();
    const topics = rs().topics.slice(0, 4);
    await Promise.all(topics.map(async (t) => { try { D.papers[t] = await paperQuery(t); } catch (e) { D.papers[t] = { err: String(e.message || e).slice(0, 50) }; } }));
    D.pts = Date.now(); D.ploading = false; keep(); T.ui.tab == "scholar" && T.render();
  }

  // ------------------------------------------------------------ saved items and memory
  const saved = (id) => S().rd.some((x) => x.id == id);
  function save(it) { if (!saved(it.id)) S().rd.unshift({ id: it.id, t: it.t, u: it.u, src: it.src || it.v || "", d: it.d, note: "", at: Date.now() }); T.save(); }
  const find = (id) => D.items.find((x) => x.id == id) || [].concat(...Object.values(D.papers).filter(Array.isArray)).find((x) => x.id == id) || S().rd.find((x) => x.id == id);

  // ------------------------------------------------------------ canon progress
  const rc = (id) => S().rc[id] || (S().rc[id] = { st: "unread", note: "", d: 0 });
  const readCount = () => K.CANON.filter((c) => (S().rc[c[0]] || {}).st == "read").length;
  function nextRead() {
    const core = ["hate", "india", "nat", "kin", "emo", "pop"];
    const left = K.CANON.filter((c) => !S().rc[c[0]] || S().rc[c[0]].st == "unread");
    const reading = K.CANON.find((c) => (S().rc[c[0]] || {}).st == "reading");
    return reading || left.sort((a, b) => b[4].filter((t) => core.includes(t)).length - a[4].filter((t) => core.includes(t)).length)[0] || null;
  }
  T.nextRead = nextRead; T.readCount = readCount;

  // ------------------------------------------------------------ view
  const ago = (ms) => { if (!ms) return ""; const m = Math.round((Date.now() - ms) / 6e4); return m < 60 ? Math.max(1, m) + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
  const link = (u) => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const segs = [["pulse", "Pulse"], ["papers", "Papers"], ["canon", "Canon"], ["saved", "Saved"]];

  function itemCard(it, kind) {
    const sv = saved(it.id);
    return `<div class="card item"><div class="sm soft">${esc(it.src || it.v || "")}${it.d ? " · " + ago(it.d) : ""}${it.c ? " · " + it.c + " citations" : ""}</div>
      <a class="ititle" ${link(it.u)} data-a="scopen" data-v="${esc(it.u)}">${esc(it.t)}</a>
      ${it.a ? `<div class="sm soft">${esc(it.a)}</div>` : ""}${it.s ? `<p class="sm" style="margin:6px 0">${esc(it.s)}</p>` : ""}
      ${(it.h && it.h.length) ? `<div class="chips" style="margin:6px 0">${it.h.slice(0, 3).map((h) => `<span class="tag">${esc(h)}</span>`).join("")}</div>` : ""}
      <div class="chips" style="margin-top:8px"><button class="chip ${sv ? "on" : ""}" data-a="scsave" data-v="${esc(it.id)}">${sv ? "Saved" : "Save"}</button><button class="chip" data-a="sclearn" data-v="${esc(it.id)}">Teach Jarvis</button><button class="chip" data-a="scask" data-v="${esc(it.id)}">Ask mentor</button></div></div>`;
  }

  function pulse() {
    const R = rs(), cat = T.ui.sf || "all", only = !!T.ui.sfocus, qq = (T.ui.sq || "").toLowerCase();
    let items = D.items.filter((x) => (cat == "all" || x.cat == cat) && (!only || x.h.length) && (!qq || (x.t + " " + x.s).toLowerCase().includes(qq)));
    const mine = items.filter((x) => x.h.length).length;
    const ok = Object.values(D.status).filter((s) => s.ok).length, bad = Object.values(D.status).filter((s) => !s.ok).length;
    const b = R.brief && R.brief.d == T.ymd(Date.now()) ? R.brief.text : "";
    return `<div class="card hero"><div class="eyebrow">Daily brief</div>${b ? `<p style="white-space:pre-wrap;margin:6px 0">${esc(b)}</p>` : `<p class="sm soft" style="margin:6px 0">A short briefing on India and the world, read through your research lens, built from today's headlines.</p>`}<button class="btn s" data-a="scbrief">${D.briefing ? "Reading the news..." : b ? "Refresh brief" : "Brief me"}</button></div>
      <div class="chips" style="margin-bottom:10px">${K.FEED_CATS.map(([k, l]) => `<button class="chip ${cat == k ? "on" : ""}" data-a="scfcat" data-v="${k}">${l}</button>`).join("")}<button class="chip ${only ? "on" : ""}" data-a="scfocus">On my topics${mine ? " (" + mine + ")" : ""}</button></div>
      <div class="row" style="gap:8px;margin-bottom:10px"><input id="rq" placeholder="Search headlines" value="${esc(T.ui.sq || "")}" data-enter="scsearch"><button class="btn s" data-a="scsearch">Find</button></div>
      <div class="row sm soft" style="margin-bottom:10px"><span>${D.loading ? "Loading sources..." : D.ts ? ok + " sources live" + (bad ? ", " + bad + " unavailable" : "") + " · updated " + ago(D.ts) : "Not loaded yet"}</span><button class="chip" data-a="screfresh">Refresh</button></div>
      ${D.loading && !items.length ? '<div class="card soft">Fetching feeds...</div>' : ""}
      ${items.slice(0, 40).map((x) => itemCard(x)).join("") || (!D.loading ? `<div class="card"><b>Nothing to show.</b><p class="sm soft" style="margin:6px 0 0">${N ? "Check your connection and tap Refresh." : "In a browser most news sites block direct reading. The Android app reads them natively."}</p></div>` : "")}
      <details class="card"><summary><b>Sources</b></summary><div class="chips" style="margin-top:10px">${K.FEEDS.map((f) => `<button class="chip ${R.off[f.id] ? "" : "on"}" data-a="scsrc" data-v="${f.id}">${esc(f.n)}${D.status[f.id] && !D.status[f.id].ok ? " (down)" : ""}</button>`).join("")}</div><p class="sm soft">The Organiser feed is a Hindu nationalist weekly. It is there as a primary source for discourse analysis, not as endorsement. Read across the spectrum.</p></details>`;
  }

  function papers() {
    const R = rs();
    return `<div class="card"><div class="eyebrow">Your topics</div><div class="chips" style="margin:8px 0">${R.topics.map((t, i) => `<span class="chip on">${esc(t)} <b data-a="sctdel" data-v="${i}" style="margin-left:6px;cursor:pointer">&#10005;</b></span>`).join("")}</div>
      <div class="row" style="gap:8px"><input id="rt" placeholder="Add a topic (for example: kinship and caste)" data-enter="sctadd"><button class="btn s" data-a="sctadd">Add</button></div>
      <p class="sm soft" style="margin:8px 0 0">Papers from the last six months, newest first, from OpenAlex (then Crossref as a backup). Only the first four topics are searched.</p>
      <label class="l">OpenAlex API key (optional, free)</label><input id="roa" type="password" placeholder="Paste a free key to get more results" value="${esc(R.oakey)}"><div class="chips" style="margin-top:8px"><button class="chip" data-a="scoakey">Save key</button></div></div>
      <div class="row sm soft" style="margin-bottom:10px"><span>${D.ploading ? "Searching journals..." : D.pts ? "updated " + ago(D.pts) : "Not loaded yet"}</span><button class="chip" data-a="scpref">Refresh</button></div>
      ${R.topics.slice(0, 4).map((t) => { const r = D.papers[t]; return `<h3 style="margin:14px 0 8px">${esc(t)}</h3>` + (Array.isArray(r) ? (r.map((x) => itemCard(x)).join("") || '<p class="sm soft">No new papers found.</p>') : r ? `<p class="sm late">Could not load: ${esc(r.err)}</p>` : '<p class="sm soft">...</p>'); }).join("")}`;
  }

  function canon() {
    const tag = T.ui.stag || "all", n = readCount(), nx = nextRead();
    const L = K.CANON.filter((c) => tag == "all" || c[4].includes(tag));
    const lab = { unread: "To read", reading: "Reading", read: "Read" };
    return `<div class="card hero"><div class="row"><div><div class="eyebrow">Canon progress</div><b style="font-size:20px">${n} of ${K.CANON.length} read</b></div><div class="bar" style="width:40%"><i style="width:${n / K.CANON.length * 100}%"></i></div></div>${nx ? `<p class="sm" style="margin:10px 0 0"><span class="soft">Next:</span> <b>${esc(nx[1])}</b>, ${esc(nx[2])}</p>` : ""}</div>
      <div class="chips" style="margin-bottom:10px"><button class="chip ${tag == "all" ? "on" : ""}" data-a="sctag" data-v="all">All</button>${Object.keys(K.T).map((k) => `<button class="chip ${tag == k ? "on" : ""}" data-a="sctag" data-v="${k}">${esc(K.T[k])}</button>`).join("")}</div>
      ${L.map((c) => { const r = S().rc[c[0]] || { st: "unread" }; return `<div class="card item"><div class="sm soft">${esc(c[1])} · ${c[3]}</div><b>${esc(c[2])}</b><p class="sm" style="margin:6px 0">${esc(c[5])}</p><div class="chips">${c[4].map((t) => `<span class="tag">${esc(K.T[t])}</span>`).join("")}</div>
        <div class="chips" style="margin-top:8px">${["unread", "reading", "read"].map((s) => `<button class="chip ${r.st == s ? "on" : ""}" data-a="scrc" data-v="${c[0]}" data-s="${s}">${lab[s]}</button>`).join("")}<button class="chip" data-a="scexp" data-v="${c[0]}">Explain it</button><a class="chip" style="text-decoration:none" ${link("https://scholar.google.com/scholar?q=" + q(c[1].split(" and ")[0] + " " + c[2]))}>Find</a></div>
        ${r.st != "unread" ? `<textarea id="n-${c[0]}" placeholder="Your notes: the argument in one line, a quote, what you disagree with" style="min-height:64px;margin-top:8px" data-blur="${c[0]}">${esc(r.note || "")}</textarea>` : ""}</div>`; }).join("")}`;
  }

  function savedView() {
    const L = S().rd;
    return `<div class="card"><div class="row"><b>${L.length} saved</b>${L.length ? '<button class="chip" data-a="sccopy">Copy as reading list</button>' : ""}</div><p class="sm soft" style="margin:6px 0 0">Articles and papers you saved from Pulse and Papers. Teach Jarvis to put one in memory so it can refer to it later.</p></div>
      ${L.map((x) => `<div class="card item"><div class="sm soft">${esc(x.src)}${x.d ? " · " + new Date(x.d).toLocaleDateString() : ""}</div><a class="ititle" ${link(x.u)}>${esc(x.t)}</a><div class="chips" style="margin-top:8px"><button class="chip" data-a="sclearn" data-v="${esc(x.id)}">Teach Jarvis</button><button class="chip" data-a="scunsave" data-v="${esc(x.id)}">Remove</button></div></div>`).join("")}`;
  }

  function scholar() {
    const sub = T.ui.sch || "pulse";
    return `<h2 style="margin-bottom:4px">Scholar</h2><p class="soft sm" style="margin-top:0">News, research and theory for an anthropology of hatred, in India and beyond.</p>
      <div class="seg">${segs.map(([k, l]) => `<button class="${sub == k ? "on" : ""}" data-a="scsub" data-v="${k}">${l}</button>`).join("")}</div>
      ${({ pulse, papers, canon, saved: savedView })[sub]()}`;
  }
  T.view("scholar", scholar);

  // ------------------------------------------------------------ the brief
  async function brief() {
    if (D.briefing) return;
    if (!D.items.length) await loadFeeds(true);
    if (!D.items.length) return T.toast("No headlines to read. Check your connection.");
    D.briefing = true; T.render();
    const top = D.items.filter((x) => x.h.length).slice(0, 14).concat(D.items.slice(0, 22)).filter((x, i, a) => a.findIndex((y) => y.id == x.id) == i).slice(0, 30);
    const list = top.map((x) => `- [${x.src}] ${x.t}${x.h.length ? " (topic: " + x.h.slice(0, 2).join(", ") + ")" : ""}`).join("\n");
    const prompt = `Here are today's headlines pulled from feeds:\n${list}\n\nWrite a briefing for ${S().name}, a social scientist studying anti-minority politics, Hindu nationalism, religious populism and hatred in India and the world. Use ONLY the headlines above as facts, and say plainly where they are thin. Format: "India" (3 bullets), "World" (3 bullets), "Through a theory lens" (two sentences linking one story to a named theorist or concept), "Read next" (one thing from the list worth a proper read), "A question to carry today" (one research question). Be concise. Note which outlets framed it, since outlets differ.`;
    try {
      const text = await T.ai([{ role: "user", content: prompt }], T.mentorSys(), 900);
      rs().brief = { d: T.ymd(Date.now()), text }; T.save();
      T.fire("jarvis:note", "Daily brief: " + text.slice(0, 220));
    } catch (e) { T.toast(T.errMsg(e)); }
    D.briefing = false; T.render();
  }
  T.on("scholar:brief", () => { loadFeeds(false).then(brief); });

  // ------------------------------------------------------------ actions
  T.act({
    scsub(v) { T.ui.sch = v; T.render(); if (v == "pulse") loadFeeds(false); if (v == "papers") loadPapers(false); },
    scfcat(v) { T.ui.sf = v; T.render(); }, scfocus() { T.ui.sfocus = !T.ui.sfocus; T.render(); },
    scsearch() { T.ui.sq = T.val("rq"); T.render(); }, screfresh() { loadFeeds(true); }, scpref() { loadPapers(true); },
    scbrief: brief, scopen(v, el) { if (N) { event.preventDefault(); T.open_(v); } },
    scsrc(v) { const R = rs(); R.off[v] = !R.off[v]; T.save(); T.render(); },
    scsave(v) { const it = find(v); if (!it) return; if (saved(v)) S().rd = S().rd.filter((x) => x.id != v); else save(it); T.save(); T.render(); },
    scunsave(v) { S().rd = S().rd.filter((x) => x.id != v); T.save(); T.render(); },
    sclearn(v) { const it = find(v); if (it) T.fire("jarvis:learn", { url: it.u, title: it.t, hint: it.s }); },
    scask(v) { const it = find(v); if (!it) return; T.ui.mode = "mentor"; T.ui.tab = "coach"; T.render(); T.fire("chat", `Help me read this critically for my research on hatred and anti-minority politics: "${it.t}" (${it.src || it.v || ""}). ${it.s || ""} What is the argument, what theory does it connect to, and what should I check before I rely on it?`); },
    sctadd() { const t = T.val("rt"); if (!t) return; rs().topics.push(t); T.save(); T.render(); }, sctdel(v) { rs().topics.splice(+v, 1); T.save(); T.render(); },
    scoakey() { rs().oakey = T.val("roa"); T.save(); T.toast("Saved"); },
    sctag(v) { T.ui.stag = v; T.render(); },
    scrc(v, el) { const r = rc(v); r.st = el.dataset.s; r.d = Date.now(); T.save(); T.render(); if (r.st == "read") T.toast("Logged. Write the one-line argument while it is fresh."); },
    scexp(v) { const c = K.CANON.find((x) => x[0] == v); if (!c) return; T.ui.mode = "mentor"; T.ui.tab = "coach"; T.render(); T.fire("chat", `Explain ${c[1]}, "${c[2]}" (${c[3]}). Give the central argument, three key concepts, the main criticisms, and how it connects to my research project.`); },
    sccopy() { const t = S().rd.map((x) => `- ${x.t} (${x.src}) ${x.u}`).join("\n"); navigator.clipboard && navigator.clipboard.writeText(t).then(() => T.toast("Copied")); }
  });
  document.addEventListener("focusout", (e) => { const id = e.target && e.target.dataset && e.target.dataset.blur; if (id) { rc(id).note = e.target.value; T.save(); } });

  T.on("boot", () => { if (T.ui.tab == "scholar") loadFeeds(false); });
  T.on("chat", (txt) => { /* app.js listens for this to send a message in the current mode */ });
});
