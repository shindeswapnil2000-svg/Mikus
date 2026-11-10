/* Radar: drop in any link or post about a PhD, job, fellowship, call for papers, conference or event.
   It sorts it, finds the deadline, builds the stages and reminders, ranks it, and keeps a publishing pipeline and a calendar. */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc, N } = T;
  const S = () => T.S();
  const $ = (s) => document.querySelector(s);
  const DAY = 864e5;

  const KINDS = { phd: ["PhD", "#8B6CFF"], postdoc: ["Postdoc", "#C264FF"], job: ["Job", "#FF8A3D"], fund: ["Funding", "#22C58B"], cfp: ["Call for papers", "#FF4D6D"], conf: ["Conference", "#2AA7FF"], event: ["Event", "#FFC93D"], other: ["Other", "#8A93A6"] };
  const STAGES = {
    phd: [["Read the call and eligibility closely", -45], ["Check fit: supervisor, funding, department", -42], ["Email the prospective supervisor", -35], ["Ask 2 or 3 referees (give them six weeks)", -40], ["Draft statement and research proposal", -28], ["Prepare writing sample and CV", -21], ["Mentor feedback on drafts", -12], ["Finalise and proofread", -5], ["Submit, pay the fee, upload every document", -2], ["Confirm receipt and prepare for interview", 3]],
    postdoc: [["Read the call and eligibility closely", -45], ["Find a host and email them", -38], ["Draft the 2 to 3 page research proposal", -28], ["Ask referees", -35], ["Update CV and publication list", -21], ["Feedback from a mentor", -12], ["Submit", -2], ["Prepare for interview", 3]],
    job: [["Read the ad and match it to your CV", -14], ["Tailor CV and cover letter", -10], ["Line up referees", -10], ["Submit", -2], ["Follow up politely", 7]],
    fund: [["Check eligibility and what it covers", -30], ["Gather documents and referees", -21], ["Draft the application", -14], ["Feedback from someone who has won one", -7], ["Submit", -2]],
    cfp: [["Pick your angle in one sentence", -35], ["Draft the abstract", -28], ["Get a reader's feedback", -21], ["Write the full piece", -10], ["Format to the call's rules", -4], ["Submit", -1]],
    conf: [["Register or apply to present", -30], ["Write the abstract", -25], ["Apply for travel funding", -25], ["Book travel and stay", -14], ["Prepare talk and slides", -7], ["Plan who to meet", -3]],
    event: [["Register", -7], ["Add to calendar", -6], ["Prepare one good question", -1], ["Follow up with a speaker", 2]],
    other: [["Decide if this is worth your time", -7], ["Act on it", -2]]
  };
  const HOW = {
    phd: "Apply through the university portal. Most want a statement, CV, writing sample, transcripts and 2 to 3 referees. Contact a supervisor before applying where the system works that way.",
    postdoc: "Apply through the host institute or funder portal with a short proposal and a named host. Referees usually upload directly.",
    job: "Apply through the employer's portal or email. Tailor the CV to the ad.",
    fund: "Apply through the funder's portal. Read what it excludes before you write a word.",
    cfp: "Send the abstract by the route in the call. Follow the word limit exactly.",
    conf: "Register early for the cheaper rate, and apply for travel grants as soon as they open.",
    event: "Register, put it in your calendar, and show up with one question.",
    other: "Decide quickly whether it deserves your time."
  };
  const PLAT = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp", x: "X", telegram: "Telegram", web: "Web", manual: "Pasted" };
  const platOf = (u) => { u = (u || "").toLowerCase(); return /linkedin\./.test(u) ? "linkedin" : /instagram\./.test(u) ? "instagram" : /facebook\.|fb\.(?:com|me|watch)/.test(u) ? "facebook" : /wa\.me|whatsapp\./.test(u) ? "whatsapp" : /(^|\/\/)(?:www\.)?(x|twitter)\.com/.test(u) ? "x" : /t\.me/.test(u) ? "telegram" : u ? "web" : "manual"; };
  const ops = () => (S().op = S().op || []);
  const pubs = () => { const s = S(); s.pub = Object.assign({ items: [], goal: 1 }, s.pub || {}); return s.pub; };
  const dleft = (ts) => Math.ceil((ts - Date.now()) / DAY);
  const fmt = (ts) => (ts ? new Date(ts).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "no date yet");
  const at9 = (ts) => { const d = new Date(ts); d.setHours(9, 0, 0, 0); return d.getTime(); };

  // ------------------------------------------------------------ reading the page and the deadline
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function guessDeadline(text) {
    const t = String(text || "").toLowerCase(), now = Date.now(), out = [];
    const kw = "(?:deadline|due|apply by|applications? (?:close|due)|closes?|closing|submit(?:ted)? by|last date|before|until|by)";
    let m;
    const r1 = new RegExp(kw + "[^0-9a-z]{0,24}(?:on )?(\\d{1,2})(?:st|nd|rd|th)?\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?,?\\s*(\\d{4})?", "g");
    const r2 = new RegExp(kw + "[^0-9a-z]{0,24}(?:on )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})?", "g");
    const mk = (d, mo, y) => { let yr = y ? +y : new Date().getFullYear(); let ts = new Date(yr, mo, +d, 23, 59).getTime(); if (!y && ts < now) ts = new Date(yr + 1, mo, +d, 23, 59).getTime(); return ts; };
    while ((m = r1.exec(t))) out.push(mk(m[1], MON[m[2]], m[3]));
    while ((m = r2.exec(t))) out.push(mk(m[2], MON[m[1]], m[3]));
    const r3 = /(\d{4})-(\d{2})-(\d{2})/g;
    while ((m = r3.exec(t))) out.push(new Date(+m[1], +m[2] - 1, +m[3], 23, 59).getTime());
    const fut = out.filter((x) => x > now - DAY).sort((a, b) => a - b);
    return fut[0] || 0;
  }
  function guessKind(t) {
    t = String(t || "").toLowerCase();
    if (/postdoc|post-doc|postdoctoral/.test(t)) return "postdoc";
    if (/phd|doctoral|dphil|doctorate/.test(t)) return "phd";
    if (/call for papers|cfp|abstracts? (?:due|submission)|paper proposals?|call for (?:abstracts|submissions|chapters|contributions)|special issue/.test(t)) return "cfp";
    if (/fellowship|scholarship|grant\b|bursary|stipend award/.test(t)) return "fund";
    if (/conference|symposium|workshop|summer school|annual meeting/.test(t)) return "conf";
    if (/webinar|lecture|seminar|talk|panel|book launch|screening/.test(t)) return "event";
    if (/hiring|vacancy|position|job|assistant professor|lecturer|research associate|research assistant|internship/.test(t)) return "job";
    return "other";
  }
  const kws = () => { const s = S(); const w = new Set(); (((s.rs || {}).topics) || []).concat(T.pathKeywords ? T.pathKeywords() : []).forEach((x) => String(x).toLowerCase().split(/\W+/).filter((y) => y.length > 3).forEach((y) => w.add(y))); return Array.from(w); };
  const fitOf = (text) => { const t = String(text || "").toLowerCase(); return kws().filter((k) => t.includes(k)).length; };

  function stagesFor(kind, deadline, extra) {
    const base = (STAGES[kind] || STAGES.other), now = Date.now();
    let list = base.map(([t, off], i) => ({ id: T.uid(), t, due: deadline ? at9(deadline + off * DAY) : at9(now + (i + 1) * 3 * DAY), done: false }));
    if (Array.isArray(extra) && extra.length >= 3) list = extra.slice(0, 12).map((t, i) => ({ id: T.uid(), t: String(t).slice(0, 90), due: deadline ? at9(deadline - (extra.length - i) * Math.max(2, Math.floor(40 / extra.length)) * DAY) : at9(now + (i + 1) * 3 * DAY), done: false }));
    list.forEach((s) => { if (deadline && s.due < now && s.due < deadline - DAY) s.due = at9(now + DAY); });      // overdue-by-default stages become "tomorrow"
    return list;
  }

  // ------------------------------------------------------------ scoring
  function score(o) {
    const now = Date.now(), st = (S().pp || {}).stage || 0;
    let u = 8;
    if (o.deadline) { const d = dleft(o.deadline); u = d < 0 ? 0 : d <= 3 ? 40 : d <= 7 ? 34 : d <= 14 ? 28 : d <= 30 ? 20 : d <= 60 ? 12 : 6; }
    const f = Math.max(Math.min(35, fitOf(o.title + " " + (o.sum || "") + " " + (o.org || "")) * 7), Math.round((o.fit || 0) * 0.35));
    const early = st <= 2 ? ["phd", "fund", "cfp", "conf"] : st <= 5 ? ["cfp", "conf", "fund", "postdoc"] : ["postdoc", "job", "cfp", "fund"];
    const r = early.includes(o.kind) ? 15 : 6;
    const p = o.stages.length ? Math.round(o.stages.filter((s) => s.done).length / o.stages.length * 10) : 0;
    return Math.max(0, Math.min(100, u + f + r + p));
  }
  const label = (n) => (n >= 70 ? "Must do" : n >= 50 ? "Worth it" : n >= 30 ? "Maybe" : "Skip?");
  const active = (o) => !["done", "dropped"].includes(o.status);

  // ------------------------------------------------------------ reminders
  function remind(o) {
    (o.rem || []).forEach((id) => T.unpush(id)); o.rem = [];
    if (!active(o) || o.status == "submitted" && !o.deadline) return;
    const now = Date.now(), put = (id, at, title, body) => { if (at > now + 3e4 && at < now + 400 * DAY && o.rem.length < 14) { o.rem.push(id); T.push(id, body, { at, title, p: 4 }); } };
    if (o.deadline && o.status != "submitted") [14, 7, 3, 1].forEach((d) => put("op-" + o.id + "-d" + d, at9(o.deadline - d * DAY), "Radar: " + d + " day" + (d > 1 ? "s" : "") + " left", `${o.title}. ${o.stages.filter((s) => !s.done)[0] ? "Next: " + o.stages.filter((s) => !s.done)[0].t : "Everything ticked. Submit."}`));
    o.stages.filter((s) => !s.done).slice(0, 8).forEach((s) => put("op-" + o.id + "-s" + s.id, at9(s.due), "Radar: " + KINDS[o.kind][0], `${s.t}: ${o.title}`));
  }
  const unremind = (o) => { (o.rem || []).forEach((id) => T.unpush(id)); o.rem = []; };

  // ------------------------------------------------------------ adding
  async function add(o) {
    const text0 = (o.text || "").trim();
    let url = (o.url || "").trim(), page = text0, title = "", plat = o.platform || platOf(url);
    T.ui.rbusy = "Reading the link..."; T.render();
    let blocked = false;
    if (url && T.fetchPage) {
      try { const p = T.extractPage(await T.fetchPage(url)); title = p.title; page = (text0 + "\n" + p.text).trim(); if (p.text.length < 200 || /log ?in|sign ?in to (?:continue|view)/i.test(p.title)) blocked = true; }
      catch (e) { blocked = true; }
    }
    if (!page || page.length < 25) {
      T.ui.rbusy = ""; T.render();
      return T.toast(url ? (PLAT[plat] || "That site") + " hides posts behind a login. Paste the caption or poster text into the box and add again." : "Paste a link or the text of the post.");
    }
    T.ui.rbusy = "Working out what this is..."; T.render();
    const today = new Date().toISOString().slice(0, 10);
    let j = null;
    try {
      const r = await T.ai([{ role: "user", content: `Today is ${today}. Someone shared this opportunity${plat != "manual" ? " from " + PLAT[plat] : ""}. About them: ${T.profileLine ? T.profileLine() : "a social scientist"}.\n\nTITLE: ${title}\nTEXT:\n${page.slice(0, 6500)}\n\nReturn ONLY JSON: {"kind":"phd|postdoc|job|fund|cfp|conf|event|other","title":"short clear title","org":"institution or organiser","deadline":"YYYY-MM-DD or null (the application or submission deadline, not the event date)","eventDate":"YYYY-MM-DD or null","where":"city, country or online","funding":"what it pays or covers, or empty","eligibility":"one sentence","how":"how to apply in one sentence","requirements":["documents or inputs needed"],"stages":["5 to 9 concrete steps in order, tailored to this call"],"fee":"fee or empty","summary":"max 60 words","fit":0-100 (how well it matches the person) ,"fitNote":"one sentence"}. Use null when unsure. Never invent a deadline.` }], "You extract opportunity details faithfully from the text. Output JSON only.", 900);
      const m = r.match(/\{[\s\S]*\}/); j = m ? JSON.parse(m[0]) : null;
    } catch (e) { /* fall back to heuristics */ }
    const kind = KINDS[j && j.kind] ? j.kind : guessKind(title + " " + page);
    let deadline = j && j.deadline ? Date.parse(j.deadline + "T23:59:00") : 0;
    if (!(deadline > 0)) deadline = guessDeadline(page);
    if (j && !j.deadline && !deadline && j.eventDate && (kind == "event" || kind == "conf")) deadline = Date.parse(j.eventDate + "T09:00:00") || 0;
    const op = {
      id: T.uid(), url, plat, kind, title: ((j && j.title) || title || page.slice(0, 70)).slice(0, 120), org: (j && j.org) || "", deadline: deadline || 0, status: "new",
      sum: (j && j.summary) || page.slice(0, 220), where: (j && j.where) || "", funding: (j && j.funding) || "", elig: (j && j.eligibility) || "", how: (j && j.how) || HOW[kind], reqs: (j && Array.isArray(j.requirements) ? j.requirements.slice(0, 10) : []), fee: (j && j.fee) || "", fit: (j && +j.fit) || 0, fitNote: (j && j.fitNote) || "", notes: "", added: Date.now(), rem: [], ai: !!j
    };
    op.stages = stagesFor(kind, op.deadline, j && j.stages);
    op.pri = score(op);
    ops().unshift(op); remind(op); T.logA("radar", "Added " + KINDS[kind][0] + ": " + op.title + (op.deadline ? " (deadline " + fmt(op.deadline) + ")" : ""));
    T.save(); T.ui.rbusy = ""; T.ui.opId = op.id; T.ui.rtext = ""; T.ui.rurl = ""; T.render(); burst();
    T.toast(op.deadline ? "Added. Deadline " + fmt(op.deadline) + ", " + op.stages.length + " steps and reminders set." : "Added, but I could not find a deadline. Set one in the details.");
  }
  T.radarAdd = add;
  T.radarPut = (f) => {
    const kind = KINDS[f.kind] ? f.kind : "other";
    const op = { id: T.uid(), url: f.url || "", plat: platOf(f.url || ""), kind, title: String(f.title || "Opportunity").slice(0, 120), org: f.org || "", deadline: f.deadline || 0, status: "new", sum: f.sum || "", where: f.where || "", funding: "", elig: "", how: f.how || HOW[kind], reqs: [], fee: "", fit: 0, fitNote: "", notes: "", added: Date.now(), rem: [], ai: false };
    op.stages = stagesFor(kind, op.deadline); op.pri = score(op); ops().unshift(op); remind(op); T.logA("radar", "Added " + KINDS[kind][0] + ": " + op.title); T.save(); T.ui.opId = op.id; return op;
  };

  function burst() {
    const cols = ["#8B6CFF", "#FF4D6D", "#22C58B", "#FFC93D", "#2AA7FF"];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("i"); s.className = "cf";
      s.style.cssText = `left:${40 + Math.random() * 20}%;background:${cols[i % 5]};--dx:${(Math.random() - 0.5) * 320}px;--dy:${-80 - Math.random() * 260}px;animation-delay:${Math.random() * 0.12}s`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 1400);
    }
  }

  // ------------------------------------------------------------ screens
  const pill = (o) => { if (!o.deadline) return '<span class="pill">no date</span>'; const d = dleft(o.deadline); const c = d < 0 ? "pr" : d <= 3 ? "pr" : d <= 10 ? "po" : "pg"; return `<span class="pill ${c}">${d < 0 ? "closed " + -d + "d ago" : d == 0 ? "today" : d + " day" + (d > 1 ? "s" : "")}</span>`; };
  const prog = (o) => { const n = o.stages.filter((s) => s.done).length; return o.stages.length ? n / o.stages.length : 0; };
  const nextStage = (o) => o.stages.find((s) => !s.done);
  const priRing = (n) => `<svg viewBox="0 0 40 40" width="42" height="42"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="${n >= 70 ? "#FF4D6D" : n >= 50 ? "#FF8A3D" : "#8A93A6"}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${n / 100 * 100.5} 101" transform="rotate(-90 20 20)"/><text x="20" y="24" text-anchor="middle" font-size="12" font-family="Anton,Impact" fill="var(--ink)">${n}</text></svg>`;

  function card(o) {
    const [kn, kc] = KINDS[o.kind], nx = nextStage(o);
    return `<div class="card oc" style="--k:${kc}" data-a="ropen" data-v="${o.id}"><div class="row" style="align-items:flex-start;gap:10px"><div style="min-width:0;flex:1"><div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:6px"><span class="kind" style="background:${kc}">${kn}</span>${pill(o)}<span class="sm soft">${PLAT[o.plat] || ""}</span></div><b class="ellip2">${esc(o.title)}</b><div class="sm soft">${esc(o.org)}${o.where ? " · " + esc(o.where) : ""}</div></div><div style="text-align:center;flex:none">${priRing(o.pri)}<div class="sm soft" style="font-size:10px">${label(o.pri)}</div></div></div>
      <div class="bar" style="margin:10px 0 6px"><i style="width:${prog(o) * 100}%;background:${kc}"></i></div><div class="sm ${nx && nx.due < Date.now() ? "late" : "soft"}">${nx ? "Next: " + esc(nx.t) + " · " + fmt(nx.due) : o.status == "submitted" ? "Submitted. Now wait, and follow up." : "All steps ticked"}</div></div>`;
  }

  function detail(o) {
    const [kn, kc] = KINDS[o.kind], st = ["new", "preparing", "submitted", "done", "dropped"];
    const ln = { new: "Inbox", preparing: "Preparing", submitted: "Submitted", done: "Done", dropped: "Dropped" };
    return `<button class="chip" data-a="rback">&larr; Radar</button>
      <div class="card oh" style="--k:${kc};margin-top:10px"><div class="row" style="justify-content:flex-start;gap:8px"><span class="kind" style="background:${kc}">${kn}</span>${pill(o)}<span class="sm soft">via ${PLAT[o.plat] || "link"}</span></div>
        <h2 style="margin:8px 0 2px;line-height:1.15">${esc(o.title)}</h2><div class="sm soft">${esc(o.org)}</div><p class="sm" style="margin:10px 0">${esc(o.sum)}</p>
        <div class="row" style="gap:12px;align-items:center"><div style="text-align:center">${priRing(o.pri)}<div class="sm soft" style="font-size:10px">${label(o.pri)}</div></div><div class="sm" style="flex:1">${o.fitNote ? esc(o.fitNote) : "Priority blends deadline pressure, fit with your topics and where you are in your plan."}</div></div></div>
      <div class="card"><div class="eyebrow">At a glance</div>
        <div class="kv"><b>What</b><span>${esc(o.sum.slice(0, 160))}</span></div><div class="kv"><b>When</b><span>Deadline: <b>${fmt(o.deadline)}</b>${o.deadline ? " (" + (dleft(o.deadline) < 0 ? "closed" : dleft(o.deadline) + " days left") + ")" : ""}. ${nextStage(o) ? "Next step due " + fmt(nextStage(o).due) + "." : ""}</span></div>
        <div class="kv"><b>Where</b><span>${esc(o.where || "Not stated")}${o.url ? ` · <a href="${esc(o.url)}" target="_blank" rel="noopener" data-a="scopen" data-v="${esc(o.url)}">open the original</a>` : ""}</span></div><div class="kv"><b>How</b><span>${esc(o.how)}</span></div>
        ${o.elig ? `<div class="kv"><b>Eligibility</b><span>${esc(o.elig)}</span></div>` : ""}${o.funding ? `<div class="kv"><b>Funding</b><span>${esc(o.funding)}</span></div>` : ""}${o.fee ? `<div class="kv"><b>Fee</b><span>${esc(o.fee)}</span></div>` : ""}
        ${o.reqs.length ? `<div class="kv"><b>Needs</b><span>${o.reqs.map(esc).join(" · ")}</span></div>` : ""}</div>
      <div class="chips" style="margin:6px 0 10px">${st.map((s) => `<button class="chip ${o.status == s ? "on" : ""}" data-a="rstatus" data-v="${s}">${ln[s]}</button>`).join("")}</div>
      <div class="card"><div class="row"><div class="eyebrow">Steps</div><span class="sm soft">${o.stages.filter((s) => s.done).length}/${o.stages.length}</span></div>
        ${o.stages.map((s) => `<div class="step ${s.done ? "dn" : ""}"><button class="tick ${s.done ? "on" : ""}" data-a="rstep" data-v="${s.id}" aria-label="Toggle">${s.done ? "&#10003;" : ""}</button><div style="flex:1;min-width:0"><div class="${s.done ? "soft" : ""}" style="${s.done ? "text-decoration:line-through" : ""}">${esc(s.t)}</div><input type="date" class="dt ${!s.done && s.due < Date.now() ? "late" : ""}" value="${new Date(s.due).toISOString().slice(0, 10)}" data-a="rsdate" data-v="${s.id}"></div><button class="chip" data-a="rhelp" data-v="${s.id}">${T.ui.rh == s.id ? "..." : "Help me"}</button></div>`).join("")}
        <div class="row" style="gap:8px;margin-top:10px"><input id="rns" placeholder="Add your own step" data-enter="rnadd"><button class="btn s" data-a="rnadd">Add</button></div></div>
      ${o.help ? `<div class="card jcard"><div class="eyebrow">${esc(o.help.t)}</div><p style="white-space:pre-wrap;margin:6px 0 0">${esc(o.help.x)}</p><div class="chips" style="margin-top:8px"><button class="chip" data-a="rcopy">Copy</button></div></div>` : ""}
      <div class="card"><div class="eyebrow">Deadline and notes</div><label class="l" style="margin-top:6px">Deadline</label><input type="date" id="rdl" value="${o.deadline ? new Date(o.deadline).toISOString().slice(0, 10) : ""}"><label class="l">Notes</label><textarea id="rnote" placeholder="Contacts, ideas, login details NOT included">${esc(o.notes)}</textarea><div class="chips" style="margin-top:8px"><button class="chip on" data-a="rsave">Save</button><button class="chip" data-a="rremind">Reset reminders</button><button class="chip" data-a="rdel">Delete</button></div><p class="sm soft" style="margin:8px 0 0">${(o.rem || []).length} reminder${(o.rem || []).length == 1 ? "" : "s"} scheduled${N ? "" : " (they ring on the Android app)"}.</p></div>`;
  }

  const SEGS = [["inbox", "Opportunities"], ["publish", "Publish"], ["cal", "Calendar"]];
  function radar() {
    const o = ops().find((x) => x.id == T.ui.opId);
    if (o) return detail(o);
    const sub = T.ui.rs || "inbox";
    return `<h2 style="margin-bottom:4px">Radar</h2><p class="soft sm" style="margin-top:0">Everything you could apply for, submit to or attend, sorted by what matters.</p>
      <div class="seg">${SEGS.map(([k, l]) => `<button class="${sub == k ? "on" : ""}" data-a="rsub" data-v="${k}">${l}</button>`).join("")}</div>${({ inbox, publish, cal })[sub]()}`;
  }
  T.view("radar", radar);

  function inbox() {
    const f = T.ui.rk || "all", all = ops(), act = all.filter(active);
    const wk = act.filter((o) => o.deadline && dleft(o.deadline) >= 0 && dleft(o.deadline) <= 7).length;
    let list = all.filter((o) => (f == "all" || o.kind == f) && (T.ui.rshow == "closed" ? !active(o) : active(o)));
    list.sort((a, b) => b.pri - a.pri);
    const counts = {}; act.forEach((o) => { counts[o.kind] = (counts[o.kind] || 0) + 1; });
    return `<div class="card hero radbanner"><div class="row" style="text-align:center"><div class="stat"><b>${wk}</b><span class="sm">due in 7 days</span></div><div class="stat"><b>${act.filter((o) => o.status == "preparing").length}</b><span class="sm">in progress</span></div><div class="stat"><b>${all.filter((o) => o.status == "submitted" || o.status == "done").length}</b><span class="sm">submitted</span></div></div></div>
      <div class="card dropzone"><div class="eyebrow">Drop an opportunity</div>
        <input id="rurl" placeholder="Paste a link (LinkedIn, Instagram, Facebook, WhatsApp, any site)" value="${esc(T.ui.rurl || "")}"><textarea id="rtxt" placeholder="...and/or paste the post or poster text. For social posts that need a login, this works best." style="margin-top:8px;min-height:70px">${esc(T.ui.rtext || "")}</textarea>
        <div class="row" style="margin-top:10px;gap:8px"><span class="sm soft" style="flex:1">${T.ui.rbusy ? '<span class="shim">' + esc(T.ui.rbusy) + "</span>" : N ? "Tip: share any post to Taskmaster from LinkedIn, Instagram, Facebook or WhatsApp." : "On Android you can share posts straight here."}</span><button class="btn s" data-a="radd">Add to Radar</button></div></div>
      <div class="chips" style="margin-bottom:12px"><button class="chip ${f == "all" ? "on" : ""}" data-a="rkind" data-v="all">All ${act.length}</button>${Object.keys(KINDS).map((k) => `<button class="chip ${f == k ? "on" : ""}" style="${f == k ? "background:" + KINDS[k][1] + ";border-color:" + KINDS[k][1] : ""}" data-a="rkind" data-v="${k}">${KINDS[k][0]}${counts[k] ? " " + counts[k] : ""}</button>`).join("")}</div>
      ${list.map(card).join("") || `<div class="card"><b>${T.ui.rshow == "closed" ? "Nothing closed yet." : "Your radar is empty."}</b><p class="sm soft" style="margin:6px 0 0">Paste anything you come across. I will find the deadline, build the steps and set the reminders.</p></div>`}
      <div class="chips"><button class="chip" data-a="rshow" data-v="${T.ui.rshow == "closed" ? "open" : "closed"}">${T.ui.rshow == "closed" ? "Show active" : "Show done and dropped"}</button></div>`;
  }

  // ------------------------------------------------------------ publishing pipeline
  const PS = ["idea", "outline", "draft", "revise", "submitted", "review", "published"], PL = { idea: "Idea", outline: "Outline", draft: "Draft", revise: "Revise", submitted: "Submitted", review: "In review", published: "Published", rejected: "Rejected" };
  const PT = ["Essay", "Article", "Book review", "Op-ed", "Blog post", "Paper", "Chapter", "Talk"];
  const VENUES = [
    ["Start here", "Allegra Lab, Savage Minds, LSE South Asia blog, The India Forum, Himal Southasian, Scroll, The Wire, Jadaliyya, Aeon, The Conversation", "Short, fast and public. Builds a byline and a voice. Pitch with a 150-word summary."],
    ["Book reviews", "Contributions to Indian Sociology, Economic and Political Weekly, South Asia, Modern Asian Studies, Social Anthropology", "The usual first step into journals. Editors need reviewers. Email the reviews editor."],
    ["Conference papers", "AAA Annual Meeting, EASA, ASA (UK), European Conference on South Asian Studies, Annual Conference on South Asia, regional sociology and anthropology meetings", "Abstracts due months ahead. Present, get comments, then convert to an article."],
    ["Peer-reviewed journals", "Contemporary South Asia, Journal of Contemporary Asia, Ethnic and Racial Studies, Nationalism and Ethnic Politics, South Asia: Journal of South Asian Studies, Anthropological Theory, American Ethnologist, Cultural Anthropology", "Aim for one strong article. Read three recent issues first, match the style, and expect 6 to 12 months."]
  ];
  const nextAct = { idea: "Write the one-sentence argument and three reasons it is new.", outline: "Write the introduction and the first section. Do not polish.", draft: "Finish a complete rough draft this week. Then rest it for 3 days.", revise: "Cut 15 percent, tighten the argument, then send to one reader.", submitted: "Do nothing, begin the next piece. Diary the follow-up date.", review: "Write the next piece. Follow up politely if it has been 3 months.", published: "Share it, add it to your CV, and email it to one scholar you admire." };

  function publish() {
    const P = pubs(), cur = P.items, pub = cur.filter((x) => x.stage == "published").length, sub = cur.filter((x) => ["submitted", "review"].includes(x.stage)).length, dr = cur.filter((x) => ["idea", "outline", "draft", "revise"].includes(x.stage)).length;
    const lvl = pub >= 3 ? "Strong start" : pub >= 1 ? "On the board" : sub >= 1 ? "Out for review" : dr >= 1 ? "In the workshop" : "Not started";
    return `<div class="card hero radbanner"><div class="eyebrow">Academic portfolio</div><div class="row" style="text-align:center"><div class="stat"><b>${pub}</b><span class="sm">published</span></div><div class="stat"><b>${sub}</b><span class="sm">submitted</span></div><div class="stat"><b>${dr}</b><span class="sm">in progress</span></div></div><p class="sm" style="margin:8px 0 0;text-align:center"><b>${lvl}.</b> ${pub + sub + dr == 0 ? "A PhD committee reads output as evidence you can finish. Start with one short piece." : dr && !sub ? "Move one piece to submitted this month." : "Keep one piece in every stage."}</p></div>
      <div class="card"><div class="eyebrow">New piece</div><input id="pt" placeholder="Working title or the argument in one line"><div class="chips" style="margin-top:8px">${PT.map((t) => `<button class="chip ${(T.ui.ptype || "Essay") == t ? "on" : ""}" data-a="ptype" data-v="${t}">${t}</button>`).join("")}</div><input id="pv" placeholder="Target venue (optional)" style="margin-top:8px"><div class="row" style="gap:8px;margin-top:8px"><input type="date" id="pd"><button class="btn s" data-a="padd">Add</button></div><div class="chips" style="margin-top:8px"><button class="chip" data-a="pideas">${T.ui.pidea ? "Thinking..." : "Suggest ideas from my reading"}</button></div>
        ${P.ideas ? `<p class="sm" style="white-space:pre-wrap;margin:10px 0 0">${esc(P.ideas)}</p>` : ""}</div>
      ${cur.map((x) => `<div class="card oc" style="--k:${x.stage == "published" ? "#22C58B" : x.stage == "rejected" ? "#FF4D6D" : "#8B6CFF"}"><div class="row" style="align-items:flex-start"><div><span class="kind" style="background:#8B6CFF">${esc(x.type)}</span> ${x.due ? `<span class="pill ${dleft(x.due) <= 7 ? "po" : "pg"}">${fmt(x.due)}</span>` : ""}<b style="display:block;margin-top:6px">${esc(x.t)}</b><div class="sm soft">${esc(x.venue || "venue not chosen")}${x.words ? " · " + x.words + " words" : ""}</div></div><button class="chip" data-a="pdel" data-v="${x.id}" aria-label="Delete">&#10005;</button></div>
        <div class="row" style="gap:4px;margin:10px 0">${PS.map((s, i) => `<button class="dotb ${PS.indexOf(x.stage) >= i ? "on" : ""} ${x.stage == s ? "cur" : ""}" data-a="pstage" data-v="${x.id}" data-s="${s}" title="${PL[s]}"></button>`).join("")}</div>
        <div class="sm"><b>${PL[x.stage]}.</b> ${esc(nextAct[x.stage] || "Rework it, then send it to the next venue.")}</div>
        <div class="row" style="gap:8px;margin-top:8px"><input id="pw-${x.id}" placeholder="words so far" inputmode="numeric" value="${x.words || ""}" style="max-width:130px" data-blur-w="${x.id}"><button class="chip" data-a="phelp" data-v="${x.id}">${T.ui.ph == x.id ? "..." : "Help me with this stage"}</button></div>
        ${x.help ? `<p class="sm" style="white-space:pre-wrap;margin:10px 0 0">${esc(x.help)}</p>` : ""}</div>`).join("")}
      <h3 style="margin:16px 0 8px">Where to publish</h3>${VENUES.map(([a, b, c]) => `<div class="card"><b>${esc(a)}</b><p class="sm" style="margin:4px 0">${esc(b)}</p><p class="sm soft" style="margin:0">${esc(c)}</p></div>`).join("")}
      <div class="card"><div class="eyebrow">Find calls for papers</div><div class="chips" style="margin-top:8px"><a class="chip" style="text-decoration:none" href="https://networks.h-net.org/announcements" target="_blank" rel="noopener" data-a="scopen" data-v="https://networks.h-net.org/announcements">H-Net announcements</a><a class="chip" style="text-decoration:none" href="https://www.google.com/search?q=call+for+papers+anthropology+South+Asia+hate+religion+2027" target="_blank" rel="noopener" data-a="scopen" data-v="https://www.google.com/search?q=call+for+papers+anthropology+South+Asia+hate+religion+2027">Search the web</a></div><p class="sm soft">When you find one, paste it in Opportunities and I will build the steps.</p></div>`;
  }

  function cal() {
    const ev = [], now = Date.now() - DAY;
    ops().filter(active).forEach((o) => { if (o.deadline) ev.push({ t: o.deadline, x: "Deadline: " + o.title, c: KINDS[o.kind][1], id: o.id }); const n = nextStage(o); if (n) ev.push({ t: n.due, x: n.t + " (" + o.title.slice(0, 30) + ")", c: KINDS[o.kind][1], id: o.id }); });
    pubs().items.filter((x) => x.due && !["published", "rejected"].includes(x.stage)).forEach((x) => ev.push({ t: x.due, x: "Publish: " + x.t, c: "#8B6CFF" }));
    (T.pathMs ? T.pathMs() : []).forEach((m) => ev.push({ t: m.due, x: "Plan: " + m.t, c: "#22C58B" }));
    T.open().filter((t) => t.due).forEach((t) => ev.push({ t: t.due, x: "Task: " + t.t, c: "#FF4D6D" }));
    ev.sort((a, b) => a.t - b.t);
    const L = ev.filter((e) => e.t > now).slice(0, 40);
    let last = "";
    return `<div class="card hero radbanner"><b>${L.length} things ahead</b><div class="sm soft">Opportunities, publications, plan milestones and tasks, in one timeline.</div></div>` + (L.length ? L.map((e) => { const wk = new Date(e.t).toLocaleDateString([], { month: "long", day: "numeric" }); const hd = wk != last ? `<div class="eyebrow" style="margin:14px 0 6px">${wk}${dleft(e.t) >= 0 && dleft(e.t) < 8 ? ` · in ${dleft(e.t)}d` : ""}</div>` : ""; last = wk; return hd + `<div class="row" style="justify-content:flex-start;gap:10px;margin:6px 0" ${e.id ? `data-a="ropen" data-v="${e.id}"` : ""}><i class="dotc" style="background:${e.c}"></i><span class="sm">${esc(e.x)}</span></div>`; }).join("") : '<div class="card"><p class="sm soft" style="margin:0">Nothing scheduled. Add an opportunity, or open Path to build a plan.</p></div>');
  }

  // ------------------------------------------------------------ AI helpers
  async function help(o, st) {
    T.ui.rh = st.id; T.render();
    try {
      o.help = { t: "Help with: " + st.t, x: await T.ai([{ role: "user", content: `I am working on this opportunity: "${o.title}" (${KINDS[o.kind][0]}, ${o.org || "organisation unknown"}). Deadline ${fmt(o.deadline)}. Summary: ${o.sum}. Requirements: ${o.reqs.join("; ") || "unknown"}.\nCurrent step: "${st.t}".\nHelp me do this step now. Give a short checklist and, where it fits, a ready-to-edit draft (an email, an abstract skeleton, a statement outline). Use my profile and memory. Be specific, not generic. If something depends on a fact you do not know, say what to check on the official page.` }], T.mentorSys(), 900) };
      T.save();
    } catch (e) { T.toast(T.errMsg(e)); }
    T.ui.rh = null; T.render();
  }

  // ------------------------------------------------------------ actions
  const cur = () => ops().find((x) => x.id == T.ui.opId);
  const keepNotes = () => { const o = cur(); if (o && $("#rnote")) { o.notes = $("#rnote").value; const d = T.val("rdl"); o.deadline = d ? Date.parse(d + "T23:59:00") : 0; } };
  T.act({
    rsub(v) { T.ui.rs = v; T.ui.opId = null; T.render(); },
    radd() { const u = T.val("rurl"), x = T.val("rtxt"); T.ui.rurl = u; T.ui.rtext = x; if (!u && !x) return T.toast("Paste a link or the post text first."); add({ url: /^https?:\/\//.test(u) ? u : "", text: (u && !/^https?:\/\//.test(u) ? u + "\n" : "") + x }); },
    rkind(v) { T.ui.rk = v; T.render(); }, rshow(v) { T.ui.rshow = v; T.render(); },
    ropen(v) { T.ui.rs = "inbox"; T.ui.opId = v; T.go("radar"); }, rback() { T.ui.opId = null; T.render(); },
    rstatus(v) { const o = cur(); keepNotes(); o.status = v; if (v == "done") burst(); o.pri = score(o); remind(o); T.save(); T.render(); },
    rstep(v) { const o = cur(), s = o.stages.find((x) => x.id == v); s.done = !s.done; if (s.done) { burst(); if (o.status == "new") o.status = "preparing"; T.logA("radar", "Done: " + s.t + " (" + o.title.slice(0, 40) + ")"); } if (o.stages.every((x) => x.done) && o.status != "done" && o.status != "submitted") T.toast("Every step ticked. Mark it Submitted."); o.pri = score(o); remind(o); T.save(); T.render(); },
    rsdate(v, el) { const o = cur(), s = o.stages.find((x) => x.id == v); if (el.value) { s.due = at9(Date.parse(el.value + "T09:00:00")); remind(o); T.save(); } },
    rnadd() { const t = T.val("rns"); if (!t) return; keepNotes(); const o = cur(); o.stages.push({ id: T.uid(), t, due: at9(Date.now() + 2 * DAY), done: false }); remind(o); T.save(); T.render(); },
    rhelp(v) { const o = cur(); help(o, o.stages.find((x) => x.id == v)); },
    rcopy() { const o = cur(); navigator.clipboard && navigator.clipboard.writeText(o.help.x).then(() => T.toast("Copied")); },
    rsave() { keepNotes(); const o = cur(); o.pri = score(o); remind(o); T.save(); T.toast("Saved"); T.render(); },
    rremind() { keepNotes(); remind(cur()); T.save(); T.render(); T.toast("Reminders reset."); },
    rdel() { const o = cur(); if (!confirm("Delete this opportunity?")) return; unremind(o); S().op = ops().filter((x) => x.id != o.id); T.ui.opId = null; T.save(); T.render(); },
    ptype(v) { T.ui.ptype = v; T.render(); },
    padd() { const t = T.val("pt"); if (!t) return T.toast("Give it a title or one-line argument."); const d = T.val("pd"); pubs().items.unshift({ id: T.uid(), t, type: T.ui.ptype || "Essay", stage: "idea", venue: T.val("pv"), due: d ? Date.parse(d + "T09:00:00") : 0, words: 0, at: Date.now() }); const x = pubs().items[0]; if (x.due) T.push("pub-" + x.id, `Publishing: "${x.t}" is due. ${nextAct[x.stage]}`, { at: at9(x.due), title: "Publishing push" }); T.save(); T.render(); },
    pstage(v, el) { const x = pubs().items.find((i) => i.id == v), s = el.dataset.s, prev = x.stage; x.stage = s; if (PS.indexOf(s) > PS.indexOf(prev)) { burst(); T.logA("publish", PL[s] + ": " + x.t); } T.save(); T.render(); },
    pdel(v) { pubs().items = pubs().items.filter((i) => i.id != v); T.unpush("pub-" + v); T.save(); T.render(); },
    async phelp(v) {
      const x = pubs().items.find((i) => i.id == v); T.ui.ph = v; T.render();
      const task = { idea: "Give me 3 sharper titles, the argument in two sentences, what is new, 3 sources I must engage, and the best venue from the ladder (blog, book review, conference, journal) for where I am now.", outline: "Build a section-by-section outline with a word budget and the one claim each section proves.", draft: "Tell me how to finish a rough draft fast. Give a paragraph-level skeleton of the missing parts.", revise: "Act as a tough reviewer 2: list the 5 weakest points, in order, with how to fix each.", submitted: "Write a short polite cover note and a follow-up email I can send in 3 months.", review: "Draft a polite status inquiry to the editor and tell me what to do while I wait.", published: "Write a 3-line promotion plan and a one-line CV entry.", rejected: "Help me read the rejection, decide what to fix, and pick the next venue." }[x.stage];
      try { x.help = await T.ai([{ role: "user", content: `Piece: "${x.t}" (${x.type}), stage ${PL[x.stage]}, venue: ${x.venue || "not chosen"}. ${task}` }], T.mentorSys(), 800); T.save(); } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.ph = null; T.render();
    },
    async pideas() {
      T.ui.pidea = 1; T.render();
      try { pubs().ideas = await T.ai([{ role: "user", content: "Using my topics, my canon notes, and what I have taught you, suggest 5 publishable pieces I could write in the next 8 weeks. For each: a title, the argument in one line, the right format (blog, essay, book review, conference abstract, article) and one venue from the ladder. Start small, build up." }], T.mentorSys(), 900); T.save(); } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.pidea = 0; T.render();
    }
  });
  document.addEventListener("focusout", (e) => { const id = e.target && e.target.dataset && e.target.dataset.blurW; if (id) { const x = pubs().items.find((i) => i.id == id); if (x) { x.words = +e.target.value || 0; T.save(); } } });

  // ------------------------------------------------------------ shared links land here
  function sheet(html) { let s = $("#sheet"); if (!s) { s = document.createElement("div"); s.id = "sheet"; document.body.appendChild(s); } s.innerHTML = html; s.style.display = html ? "flex" : "none"; }
  T.act({
    shopp() { const d = T.ui.share; sheet(""); T.ui.share = null; T.ui.rs = "inbox"; T.go("radar"); add({ url: d.url, text: d.url ? "" : d.text, platform: d.url ? undefined : "manual" }); },
    shlearn() { const d = T.ui.share; sheet(""); T.ui.share = null; T.fire("jarvis:learn", d.url ? { url: d.url, title: d.subject } : { text: d.text, title: d.subject || d.text.slice(0, 60) }); },
    shsave() { const d = T.ui.share; sheet(""); T.ui.share = null; S().rd.unshift({ id: d.url || T.uid(), t: d.subject || d.text.slice(0, 80), u: d.url || "", src: platOf(d.url), d: Date.now(), note: "", at: Date.now() }); T.save(); T.toast("Saved to your reading list."); },
    shno() { sheet(""); T.ui.share = null; }
  });
  T.on("share", (d) => {
    const text = String(d.text || "").trim(), m = text.match(/https?:\/\/\S+/), url = m ? m[0] : "";
    T.ui.share = { text, url, subject: d.subject || "" };
    const guess = guessKind(text + " " + (d.subject || "")), looks = guess != "other" || /deadline|apply|call for|submit/i.test(text);
    sheet(`<div class="shbox"><div class="eyebrow">Shared to ${esc(T.jvName ? T.jvName() : "Jarvis")}</div><p class="sm" style="margin:6px 0">${esc((d.subject || text).slice(0, 140))}</p><p class="sm soft">From ${PLAT[platOf(url)]}. ${looks ? "This looks like " + (/^[aeiou]/i.test(KINDS[guess][0]) ? "an " : "a ") + KINDS[guess][0].toLowerCase() + " opportunity." : "This looks like something to read."}</p>
      <button class="btn" data-a="shopp" style="margin-top:8px">${looks ? "Add to Radar (recommended)" : "Add to Radar"}</button><button class="btn gh" data-a="shlearn" style="margin-top:8px">${looks ? "Teach Jarvis to remember it" : "Teach Jarvis (recommended)"}</button><button class="btn gh" data-a="shsave" style="margin-top:8px">Save to reading list</button><button class="chip" data-a="shno" style="margin-top:10px">Dismiss</button></div>`);
  });

  // ------------------------------------------------------------ for Jarvis, Today and Path
  T.radarNext = () => { const a = ops().filter((o) => active(o) && o.status != "submitted" && o.deadline && dleft(o.deadline) >= 0).sort((x, y) => x.deadline - y.deadline)[0]; return a ? { o: a, d: dleft(a.deadline) } : null; };
  T.radarLine = () => { const a = ops().filter(active), n = T.radarNext(), p = pubs().items; return `${a.length} open opportunities${n ? `, nearest: "${n.o.title}" in ${n.d} days` : ""}; ${p.filter((x) => x.stage == "published").length} pieces published, ${p.filter((x) => ["submitted", "review"].includes(x.stage)).length} out for review, ${p.filter((x) => ["idea", "outline", "draft", "revise"].includes(x.stage)).length} in progress`; };
  T.pubNudge = () => { const p = pubs().items; const live = p.filter((x) => ["outline", "draft", "revise"].includes(x.stage)); if (!p.length) return "You have no piece in motion. Output is the strongest evidence you can finish. Start one short essay."; if (!live.length && !p.some((x) => ["submitted", "review"].includes(x.stage))) return "Nothing is currently being written or reviewed. Pick one idea and move it to outline today."; return ""; };
  T.on("boot", () => { ops().forEach((o) => { o.pri = score(o); }); });
});
