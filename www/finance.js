/* Money: income, spending, goals, the cost of applying and moving abroad, funding gaps, and a candid money coach.
   Every figure is something you typed. Nothing here is invented. Not financial advice. */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc, N } = T;
  const S = () => T.S();
  const DAY = 864e5;
  const fin = () => {
    const s = S();
    s.fin = Object.assign({ tx: [], goals: [], apps: [], cur: "₹", rate: null, budget: 0, cash: 0, mon: "" }, s.fin || {});
    return s.fin;
  };
  const CATS = ["Food", "Travel", "Rent and bills", "Study and books", "Applications", "Health", "Fun", "Other"];
  const mkey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  const money = (n) => fin().cur + Math.round(n).toLocaleString("en-IN");
  const inMonth = (k) => fin().tx.filter((x) => mkey(x.at) == k);
  const sum = (a, t) => a.filter((x) => x.type == t).reduce((s, x) => s + x.amt, 0);
  const keyNow = () => mkey(Date.now());

  function addTx(type, amt, cat, note) {
    amt = Math.abs(+amt); if (!(amt > 0)) return false;
    fin().tx.unshift({ id: T.uid(), type, amt, cat: cat || "Other", note: String(note || "").slice(0, 60), at: Date.now() });
    fin().tx = fin().tx.slice(0, 1500); T.save(); return true;
  }
  const guessCat = (t) => { t = t.toLowerCase(); return /food|lunch|dinner|breakfast|tea|coffee|snack|swiggy|zomato|grocer|chai/.test(t) ? "Food" : /bus|metro|train|cab|uber|ola|fuel|petrol|flight|ticket/.test(t) ? "Travel" : /rent|bill|electric|wifi|recharge|phone/.test(t) ? "Rent and bills" : /book|course|fee|journal|stationery/.test(t) ? "Study and books" : /ielts|toefl|gre|application|visa|postage/.test(t) ? "Applications" : /doctor|medic|pharma|gym/.test(t) ? "Health" : /movie|game|party|netflix/.test(t) ? "Fun" : "Other"; };

  // ---- numbers other modules read
  T.financeLine = () => {
    const f = fin(), k = keyNow(), m = inMonth(k), sp = sum(m, "out"), inc = sum(m, "in"), cash = f.cash;
    const burn = avgBurn();
    return `this month spent ${money(sp)}, earned ${money(inc)}${f.budget ? `, budget ${money(f.budget)}` : ""}${cash ? `, savings ${money(cash)}${burn ? ` (about ${(cash / burn).toFixed(1)} months of runway)` : ""}` : ""}; ${f.goals.length} savings goals`;
  };
  function avgBurn() {
    const f = fin(), ks = {}; f.tx.filter((x) => x.type == "out" && Date.now() - x.at < 95 * DAY).forEach((x) => { ks[mkey(x.at)] = (ks[mkey(x.at)] || 0) + x.amt; });
    const v = Object.values(ks); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  }

  // ---- views
  const SEG = [["now", "Now"], ["goals", "Goals"], ["apply", "Applying"], ["tools", "Tools"]];
  function money_() {
    const sub = T.ui.mt || "now";
    return `<div class="chips" style="margin:6px 0 12px">${SEG.map(([k, l]) => `<button class="chip ${sub == k ? "on" : ""}" data-a="mtab" data-v="${k}">${l}</button>`).join("")}</div>${({ now, goals, apply, tools })[sub]()}<p class="sm soft">Everything here is what you entered. General guidance, not financial advice. Large decisions deserve a qualified adviser.</p>`;
  }
  T.moneyView = money_;

  function now() {
    const f = fin(), k = keyNow(), m = inMonth(k), sp = sum(m, "out"), inc = sum(m, "in"), left = f.budget ? f.budget - sp : null;
    const by = {}; m.filter((x) => x.type == "out").forEach((x) => { by[x.cat] = (by[x.cat] || 0) + x.amt; });
    const cats = Object.entries(by).sort((a, b) => b[1] - a[1]), mx = cats.length ? cats[0][1] : 1;
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i, 1); const kk = mkey(d.getTime()); months.push([d.toLocaleString("en", { month: "short" }), sum(inMonth(kk), "out"), sum(inMonth(kk), "in")]); }
    const mm = Math.max(1, ...months.map((x) => Math.max(x[1], x[2])));
    const ty = T.ui.mty || "out";
    return `<div class="card hero moneyhero"><div class="eyebrow">This month</div><div class="row" style="align-items:flex-end"><div><div class="big">${money(sp)}</div><div class="sm">spent${inc ? " · " + money(inc) + " in" : ""}</div></div>${left != null ? `<div style="text-align:right"><div class="big" style="font-size:30px">${left < 0 ? "-" : ""}${money(Math.abs(left))}</div><div class="sm">${left < 0 ? "over budget" : "left of budget"}</div></div>` : ""}</div>${f.budget ? `<div class="bar" style="margin-top:10px"><i style="width:${Math.min(100, sp / f.budget * 100)}%;background:${sp > f.budget ? "#FF3B30" : "#fff"}"></i></div>` : ""}</div>
      <div class="card"><div class="chips" style="margin-bottom:8px"><button class="chip ${ty == "out" ? "on" : ""}" data-a="mty" data-v="out">Spent</button><button class="chip ${ty == "in" ? "on" : ""}" data-a="mty" data-v="in">Received</button></div>
        <div class="row" style="gap:8px"><input id="mamt" inputmode="decimal" placeholder="Amount" style="max-width:110px"><input id="mnote" placeholder="${ty == "out" ? "On what? (lunch, books...)" : "From? (stipend, tutoring...)"}" data-enter="madd"></div>
        ${ty == "out" ? `<div class="chips" style="margin-top:8px">${CATS.map((c) => `<button class="chip ${(T.ui.mcat || "auto") == c ? "on" : ""}" data-a="mcat" data-v="${c}">${c}</button>`).join("")}</div>` : ""}<button class="btn" style="margin-top:10px" data-a="madd">Add</button><p class="sm soft" style="margin:8px 0 0">You can also tell Jarvis: "spent 250 on lunch".</p></div>
      ${cats.length ? `<div class="card"><div class="eyebrow">Where it went</div>${cats.map(([c, v]) => `<div class="mrow"><span>${esc(c)}</span><div class="mbar"><i style="width:${v / mx * 100}%"></i></div><b>${money(v)}</b></div>`).join("")}</div>` : ""}
      <div class="card"><div class="eyebrow">Six months</div><div class="cols">${months.map(([l, o, i]) => `<div class="col"><div class="pair"><i class="o" style="height:${o / mm * 100}%" title="spent"></i><i class="n" style="height:${i / mm * 100}%" title="in"></i></div><span>${l}</span></div>`).join("")}</div><div class="sm soft">Red: spent. Green: received.</div></div>
      <div class="card"><div class="eyebrow">Your numbers</div><div class="row" style="gap:8px;margin-top:8px"><div style="flex:1"><label class="l" style="margin-top:0">Monthly budget</label><input id="mbud" inputmode="numeric" value="${f.budget || ""}" placeholder="0"></div><div style="flex:1"><label class="l" style="margin-top:0">Savings now</label><input id="mcash" inputmode="numeric" value="${f.cash || ""}" placeholder="0"></div></div><button class="chip on" style="margin-top:10px" data-a="mnum">Save</button></div>
      <div class="card"><div class="eyebrow">Recent</div>${f.tx.slice(0, 8).map((x) => `<div class="row sm" style="margin:6px 0"><span>${x.type == "in" ? "+" : ""}${money(x.amt)} <span class="soft">${esc(x.note || x.cat)} · ${new Date(x.at).toLocaleDateString("en", { day: "numeric", month: "short" })}</span></span><button class="chip" data-a="mdel" data-v="${x.id}" aria-label="Delete">&#10005;</button></div>`).join("") || '<p class="sm soft" style="margin:0">Nothing yet.</p>'}</div>`;
  }

  function goals() {
    const f = fin();
    const presets = ["Application fund", "English test and GRE", "Laptop", "Travel to a field site or conference", "Emergency fund", "Move abroad"];
    return `${f.goals.map((g) => { const p = Math.min(100, g.have / g.target * 100), mo = g.by ? Math.max(1, (g.by - Date.now()) / (30.4 * DAY)) : 0; return `<div class="card"><div class="row"><b>${esc(g.n)}</b><button class="chip" data-a="mgd" data-v="${g.id}" aria-label="Delete">&#10005;</button></div><div class="bar" style="margin:10px 0 6px"><i style="width:${p}%;background:var(--grn)"></i></div><div class="row sm"><span>${money(g.have)} of ${money(g.target)}</span><span class="soft">${Math.round(p)}%</span></div>${mo && g.have < g.target ? `<p class="sm soft" style="margin:6px 0">Save about ${money((g.target - g.have) / mo)} a month to reach it by ${new Date(g.by).toLocaleDateString("en", { month: "short", year: "numeric" })}.</p>` : g.have >= g.target ? '<p class="sm" style="margin:6px 0;color:var(--grn)">Reached.</p>' : ""}<div class="row" style="gap:8px"><input id="gp${g.id}" inputmode="decimal" placeholder="Add savings"><button class="btn s" data-a="mgadd" data-v="${g.id}">Add</button></div></div>`; }).join("")}
      <div class="card"><div class="eyebrow">New goal</div><div class="chips" style="margin:8px 0">${presets.map((p) => `<button class="chip" data-a="mgpre" data-v="${esc(p)}">${esc(p)}</button>`).join("")}</div><input id="gn" placeholder="Goal" value="${esc(T.ui.gn || "")}"><div class="row" style="gap:8px;margin-top:8px"><input id="gt" inputmode="numeric" placeholder="Target amount"><input id="gb" type="date"></div><button class="btn" style="margin-top:10px" data-a="mgnew">Add goal</button></div>`;
  }

  function apply() {
    const f = fin(), tot = f.apps.reduce((s, a) => s + (a.fee || 0) + (a.other || 0), 0);
    return `<div class="card"><div class="eyebrow">Cost of applying</div><p class="sm soft" style="margin:6px 0">Add each programme and the fees <b>you</b> have checked on its page. I do not guess fees, because they change and many programmes offer waivers.</p>
      ${f.apps.map((a) => `<div class="row sm" style="margin:8px 0"><span><b>${esc(a.n)}</b><br><span class="soft">fee ${money(a.fee || 0)}${a.other ? " · other " + money(a.other) : ""}</span></span><button class="chip" data-a="mad" data-v="${a.id}" aria-label="Delete">&#10005;</button></div>`).join("")}
      <input id="an" placeholder="Programme or fund" style="margin-top:8px"><div class="row" style="gap:8px;margin-top:8px"><input id="af" inputmode="numeric" placeholder="Application fee"><input id="ao" inputmode="numeric" placeholder="Other (transcripts, postage)"></div><button class="chip on" style="margin-top:8px" data-a="maadd">Add</button>
      <div class="row" style="margin-top:12px"><b>Total</b><b class="big" style="font-size:26px">${money(tot)}</b></div>${f.cash && tot ? `<p class="sm soft" style="margin:6px 0 0">${f.cash >= tot ? "Your savings cover it." : "You are short by " + money(tot - f.cash) + "."} Ask each programme about fee waivers before paying.</p>` : ""}</div>
      <div class="card"><div class="eyebrow">Test costs and the move</div><p class="sm soft" style="margin:6px 0">Add these as savings goals: tests, visa, flights, deposit, first month. Check each on the official site. Funded PhDs usually cover living costs but not arrival costs, so plan a buffer for the first two months.</p><button class="chip" data-a="mgpre" data-v="Move abroad">Create a "Move abroad" goal</button></div>`;
  }

  function tools() {
    const f = fin(), r = f.rate;
    return `<div class="card"><div class="eyebrow">Funding gap</div><p class="sm soft" style="margin:6px 0">Enter a stipend you are offered and a rough monthly cost of living for that city. Both are numbers you look up.</p><div class="row" style="gap:8px"><input id="fs" inputmode="numeric" placeholder="Monthly stipend (after tax)" value="${esc(T.ui.fs || "")}"><input id="fc" inputmode="numeric" placeholder="Monthly cost" value="${esc(T.ui.fc || "")}"></div><button class="chip on" style="margin-top:8px" data-a="mgap">Check</button>${T.ui.gap ? `<p class="sm" style="margin:10px 0 0">${T.ui.gap}</p>` : ""}</div>
      <div class="card"><div class="eyebrow">Runway</div>${f.cash && avgBurn() ? `<p style="margin:6px 0">Your savings of ${money(f.cash)} cover about <b>${(f.cash / avgBurn()).toFixed(1)} months</b> at your recent average spend of ${money(avgBurn())} a month.</p>` : '<p class="sm soft" style="margin:6px 0">Add your savings and a few weeks of spending to see it.</p>'}</div>
      <div class="card"><div class="eyebrow">Currency</div>${r ? `<p class="sm" style="margin:6px 0">1 ₹ = $${r.USD.toFixed(4)} · £${r.GBP.toFixed(4)} · €${r.EUR.toFixed(4)} <span class="soft">(${new Date(r.at).toLocaleDateString()})</span></p><div class="row" style="gap:8px"><input id="cv" inputmode="decimal" placeholder="Foreign amount"><select id="cvc" style="max-width:90px"><option>USD</option><option>GBP</option><option>EUR</option></select></div><button class="chip" style="margin-top:8px" data-a="mconv">Convert to ₹</button>${T.ui.conv ? `<p style="margin:8px 0 0"><b>${T.ui.conv}</b></p>` : ""}` : '<p class="sm soft" style="margin:6px 0">Live rates, fetched when you ask.</p>'}<div class="chips" style="margin-top:8px"><button class="chip on" data-a="mrate">${T.ui.mr ? "Fetching..." : "Get live rates"}</button></div></div>
      <div class="card"><div class="eyebrow">Money coach</div><p class="sm soft" style="margin:6px 0">Candid, practical, and aware of your career plan.</p><div class="chips"><button class="chip on" data-a="mcoach">${T.ui.mco ? "Thinking..." : "Review my money"}</button></div>${f.coach ? `<p class="sm" style="white-space:pre-wrap;margin:10px 0 0">${esc(f.coach)}</p>` : ""}</div>
      <div class="card"><div class="eyebrow">Backup</div><div class="chips"><button class="chip" data-a="mcsv">Copy transactions as CSV</button></div></div>`;
  }

  T.act({
    mtab(v) { T.ui.mt = v; T.render(); }, mty(v) { T.ui.mty = v; T.render(); }, mcat(v) { T.ui.mcat = v; T.render(); },
    madd() { const a = T.val("mamt"), n = T.val("mnote"), ty = T.ui.mty || "out"; if (!addTx(ty, a, ty == "out" ? (T.ui.mcat && T.ui.mcat != "auto" ? T.ui.mcat : guessCat(n)) : "Income", n)) return T.toast("Enter an amount."); T.render(); T.toast("Added."); },
    mdel(v) { const f = fin(); f.tx = f.tx.filter((x) => x.id != v); T.save(); T.render(); },
    mnum() { const f = fin(); f.budget = +T.val("mbud") || 0; f.cash = +T.val("mcash") || 0; T.save(); T.render(); T.toast("Saved."); },
    mgpre(v) { T.ui.gn = v; T.ui.mt = "goals"; T.render(); },
    mgnew() { const n = T.val("gn"), t = +T.val("gt"), b = T.val("gb"); if (!n || !(t > 0)) return T.toast("Name and target needed."); fin().goals.push({ id: T.uid(), n, target: t, have: 0, by: b ? Date.parse(b + "T09:00:00") : 0 }); T.ui.gn = ""; T.save(); T.render(); },
    mgadd(v) { const g = fin().goals.find((x) => x.id == v), a = +T.val("gp" + v); if (!(a > 0)) return; g.have += a; if (g.have >= g.target) T.toast("Goal reached: " + g.n); T.save(); T.render(); },
    mgd(v) { const f = fin(); f.goals = f.goals.filter((x) => x.id != v); T.save(); T.render(); },
    maadd() { const n = T.val("an"); if (!n) return; fin().apps.push({ id: T.uid(), n, fee: +T.val("af") || 0, other: +T.val("ao") || 0 }); T.save(); T.render(); },
    mad(v) { const f = fin(); f.apps = f.apps.filter((x) => x.id != v); T.save(); T.render(); },
    mgap() { const s = +T.val("fs"), c = +T.val("fc"); T.ui.fs = T.val("fs"); T.ui.fc = T.val("fc"); if (!(s > 0 && c > 0)) return T.toast("Enter both numbers."); const d = s - c; T.ui.gap = d >= 0 ? `The stipend covers the cost with ${money(d)} a month to spare. Keep part of it as a buffer.` : `Short by ${money(-d)} a month, ${money(-d * 12)} a year. Look for a top-up, cheaper housing, or a different offer before you accept.`; T.render(); },
    async mrate() { T.ui.mr = 1; T.render(); try { const url = "https://open.er-api.com/v6/latest/INR"; const t = N ? (await N.httpGet({ url, accept: "application/json" })).body : await (await fetch(url)).text(); const j = JSON.parse(t); if (!j.rates) throw 0; fin().rate = { USD: j.rates.USD, GBP: j.rates.GBP, EUR: j.rates.EUR, at: Date.now() }; T.save(); } catch (e) { T.toast("Could not fetch rates."); } T.ui.mr = 0; T.render(); },
    mconv() { const r = fin().rate, v = +T.val("cv"), c = (document.getElementById("cvc") || {}).value; if (!r || !(v > 0)) return; T.ui.conv = `${v} ${c} is about ${money(v / r[c])}`; T.render(); },
    async mcoach() {
      T.ui.mco = 1; T.render(); const f = fin();
      try { f.coach = await T.ai([{ role: "user", content: `Review my money like a candid adviser, in under 170 words. Facts: ${T.financeLine()}. Application costs entered: ${money(f.apps.reduce((s, a) => s + (a.fee || 0) + (a.other || 0), 0))}. Goals: ${f.goals.map((g) => g.n + " " + g.have + "/" + g.target).join("; ") || "none"}. My career plan: ${T.pathLine ? T.pathLine() : "unknown"}. Give: the one thing to fix, one thing to start, and what to save for before the applications. No investment tips.` }], T.mentorSys(), 500); T.save(); } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.mco = 0; T.render();
    },
    mcsv() { const t = "date,type,amount,category,note\n" + fin().tx.map((x) => [new Date(x.at).toISOString().slice(0, 10), x.type, x.amt, x.cat, '"' + x.note.replace(/"/g, "'") + '"'].join(",")).join("\n"); navigator.clipboard && navigator.clipboard.writeText(t).then(() => T.toast("Copied")); }
  });

  // "spent 250 on lunch", "received 5000 stipend"
  T.on("chat:before", (t) => {
    const m = String(t).match(/^\s*(?:i\s+)?(spent|paid|received|earned)\s+(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:rs\.?|rupees)?\s*(?:on|for|from|as)?\s*(.{0,40})$/i);
    if (!m) return;
    const inc = /^(received|earned)/i.test(m[1]), a = +m[2].replace(/,/g, "");
    if (a > 0 && addTx(inc ? "in" : "out", a, inc ? "Income" : guessCat(m[3]), m[3])) T.toast((inc ? "Logged income " : "Logged ") + money(a) + (m[3] ? " " + m[3].trim() : ""));
  });
});
