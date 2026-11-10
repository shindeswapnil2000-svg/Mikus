/* Body: water, food, movement, sleep, weight, and a mood and reflection journal. General wellbeing support, not medical advice. */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc } = T;
  const S = () => T.S();
  const K = window.KB;
  const $ = (s) => document.querySelector(s);
  const DAY = 864e5;

  const bd = () => { const s = S(); s.bd = Object.assign({ prof: { h: "", w: "", age: "", sex: "m", act: "light", goal: "maintain", diet: "veg", note: "" }, days: {}, wt: [] }, s.bd || {}); return s.bd; };
  const dk = (t) => T.ymd(t || Date.now());
  const day = (k) => { const b = bd(); return b.days[k || dk()] || (b.days[k || dk()] = { water: 0, meals: [], work: [], sleep: 0, mood: null, refl: "" }); };

  // ------------------------------------------------------------ targets
  function targets() {
    const p = bd().prof, h = +p.h, w = +p.w, a = +p.age;
    if (!(h > 100 && w > 25 && a > 10)) return null;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex == "f" ? -161 : 5);
    const mult = { sed: 1.2, light: 1.375, mod: 1.55, high: 1.725 }[p.act] || 1.375;
    const tdee = bmr * mult;
    let kcal = tdee + ({ lose: -(Math.min(450, tdee * 0.18)), gain: 300, maintain: 0, strength: 150 }[p.goal] || 0);
    kcal = Math.max(kcal, bmr);                       // never plan below resting needs
    const pr = ({ lose: 1.6, gain: 1.8, strength: 1.8, maintain: 1.2 }[p.goal] || 1.2) * w;
    const water = Math.min(4000, Math.max(2000, Math.round(35 * w / 250) * 250));
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: Math.round(kcal / 10) * 10, protein: Math.round(pr), water, bmi: +(w / Math.pow(h / 100, 2)).toFixed(1) };
  }
  const goalWater = () => (targets() || { water: 2500 }).water;
  const tot = (d) => d.meals.reduce((a, m) => ({ k: a.k + (m.kcal || 0), p: a.p + (m.p || 0) }), { k: 0, p: 0 });

  function body() {
    const d = day(), g = goalWater(), h = new Date().getHours(), exp = g * Math.min(1, Math.max(0, (h - 7) / 15));
    const week = []; for (let i = 0; i < 7; i++) { const x = bd().days[dk(Date.now() - i * DAY)]; if (x && x.sleep) week.push(x.sleep); }
    return { water: d.water, goal: g, waterBehind: h >= 11 && d.water < exp - 500, mood: d.mood, kcal: tot(d).k, sleepLow: week.length >= 3 && week.reduce((a, b) => a + b, 0) / week.length < 6.3 };
  }
  T.body = body;
  T.bodyLine = () => {
    const b = bd(), d = day(), t = targets(), tg = tot(d), mo = [];
    for (let i = 0; i < 7; i++) { const x = b.days[dk(Date.now() - i * DAY)]; if (x && x.mood) mo.push(x.mood.m); }
    return `goal ${b.prof.goal}, diet ${b.prof.diet}${t ? `, target ${t.kcal} kcal and ${t.protein} g protein` : ""}; today water ${d.water}/${goalWater()} ml, ${tg.k} kcal, sleep ${d.sleep || "not logged"}h, mood ${d.mood ? d.mood.m + "/5" : "not logged"}; 7-day mood average ${mo.length ? (mo.reduce((a, c) => a + c, 0) / mo.length).toFixed(1) : "n/a"}`;
  };

  // ------------------------------------------------------------ small charts
  const ring = (v, max, col, label) => { const C = 2 * Math.PI * 30, p = Math.min(1, v / (max || 1)); return `<svg viewBox="0 0 72 72" width="84" height="84"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" stroke-width="7"/><circle cx="36" cy="36" r="30" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${p * C} ${C}" transform="rotate(-90 36 36)"/><text x="36" y="41" text-anchor="middle" font-size="15" font-family="Anton,Impact" fill="var(--ink)">${label}</text></svg>`; };
  const bars = (vals, max, col) => `<div class="row" style="gap:4px;align-items:flex-end;height:56px">${vals.map((v) => `<div style="flex:1;height:${Math.max(4, v ? v / max * 56 : 4)}px;border-radius:3px;background:${v ? col : "var(--line)"}"></div>`).join("")}</div>`;
  const spark = (pts) => { if (pts.length < 2) return ""; const lo = Math.min(...pts), hi = Math.max(...pts), r = hi - lo || 1; return `<svg viewBox="0 0 200 50" width="100%" height="50" preserveAspectRatio="none"><polyline fill="none" stroke="var(--amb)" stroke-width="2" points="${pts.map((v, i) => `${(i / (pts.length - 1) * 196 + 2).toFixed(1)},${(46 - (v - lo) / r * 42).toFixed(1)}`).join(" ")}"/></svg>`; };
  const last = (n, f) => { const o = []; for (let i = n - 1; i >= 0; i--) o.push(f(bd().days[dk(Date.now() - i * DAY)])); return o; };

  // ------------------------------------------------------------ screens
  const segs = [["today", "Today"], ["mind", "Mind"], ["move", "Move"], ["plan", "Plan"], ["money", "Money"]];
  const MOODS = ["Low", "Meh", "Okay", "Good", "Great"];
  const TAGS = ["calm", "motivated", "focused", "grateful", "hopeful", "tired", "anxious", "overwhelmed", "lonely", "sad", "angry", "numb"];
  const CRISIS = /suicid|kill myself|end it all|self[- ]?harm|hurt myself|don'?t want to (?:live|be here)|want to die|no reason to live/i;

  function todayV() {
    const d = day(), t = targets(), g = goalWater(), tg = tot(d), q = (T.ui.bq || "").toLowerCase();
    const foods = K.FOODS.map((f, i) => [f, i]).filter(([f]) => !q || f[0].toLowerCase().includes(q)).slice(0, 12);
    return `<div class="card hero"><div class="row" style="gap:14px"><div style="text-align:center">${ring(d.water, g, "#4DA3FF", Math.round(d.water / g * 100) + "%")}<div class="sm soft">water</div></div>
      <div style="flex:1"><div class="eyebrow">Water</div><b style="font-size:20px">${d.water} / ${g} ml</b><div class="chips" style="margin-top:8px">${[150, 250, 500].map((v) => `<button class="chip" data-a="bwater" data-v="${v}">+${v}</button>`).join("")}<button class="chip" data-a="bwater" data-v="-250">Undo</button></div></div></div></div>
      <div class="card"><div class="row"><div class="eyebrow">Food</div><span class="sm soft">${tg.k} kcal · ${Math.round(tg.p)} g protein${t ? ` of ${t.kcal} · ${t.protein}` : ""}</span></div>
        ${t ? `<div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, tg.k / t.kcal * 100)}%"></i></div>` : '<p class="sm soft">Set your profile in Plan for personal targets.</p>'}
        ${d.meals.map((m, i) => `<div class="row sm" style="margin:6px 0"><span>${esc(m.t)} <span class="soft">${m.kcal} kcal · ${m.p} g${m.est ? " · estimate" : ""}</span></span><button class="chip" data-a="bmdel" data-v="${i}" aria-label="Remove">&#10005;</button></div>`).join("")}
        <input id="bq" placeholder="Search Indian foods (roti, dal, idli...)" value="${esc(T.ui.bq || "")}" style="margin-top:8px" data-enter="bsearch">
        <div class="chips" style="margin-top:8px">${foods.map(([f, i]) => `<button class="chip" data-a="bfood" data-v="${i}">${esc(f[0])}</button>`).join("")}</div>
        <div class="chips" style="margin-top:8px">${[["0.5", "half"], ["1", "1x"], ["1.5", "1.5x"], ["2", "2x"]].map(([v, l]) => `<button class="chip ${(T.ui.bmul || "1") == v ? "on" : ""}" data-a="bmul" data-v="${v}">${l}</button>`).join("")}<span class="sm soft" style="align-self:center">serving size</span></div>
        <label class="l">Or describe a meal and I will estimate it</label><div class="row" style="gap:8px"><input id="bai" placeholder="2 rotis, dal, a bowl of rice, and chicken curry" data-enter="bestimate"><button class="btn s" data-a="bestimate">${T.ui.best ? "..." : "Estimate"}</button></div>
        <div class="row" style="gap:6px;margin-top:8px"><input id="bcn" placeholder="Custom item"><input id="bck" placeholder="kcal" inputmode="numeric" style="max-width:76px"><input id="bcp" placeholder="g protein" inputmode="numeric" style="max-width:86px"></div><div class="chips" style="margin-top:8px"><button class="chip" data-a="bcustom">Add</button></div>
        <p class="sm soft" style="margin:8px 0 0">Values are rough household-serving estimates, not lab numbers.</p></div>
      <div class="card"><div class="eyebrow">Sleep last night</div><div class="chips" style="margin-top:8px">${[5, 6, 6.5, 7, 7.5, 8, 9].map((h) => `<button class="chip ${d.sleep == h ? "on" : ""}" data-a="bsleep" data-v="${h}">${h} h</button>`).join("")}</div>
        <p class="sm soft" style="margin:8px 0 4px">Last 7 days</p>${bars(last(7, (x) => (x && x.sleep) || 0), 10, "var(--amb)")}</div>`;
  }

  function mindV() {
    const d = day(), m = d.mood, draft = T.ui.bmd || { m: m ? m.m : 0, e: m ? m.e : 0, s: m ? m.s : 0, tags: m ? m.tags.slice() : [], note: m ? m.note : "" };
    T.ui.bmd = draft;
    const sc = (k, lab) => `<label class="l">${lab}</label><div class="chips">${[1, 2, 3, 4, 5].map((v) => `<button class="chip ${draft[k] == v ? "on" : ""}" data-a="bscore" data-k="${k}" data-v="${v}">${k == "m" ? MOODS[v - 1] : v}</button>`).join("")}</div>`;
    const mo = last(14, (x) => (x && x.mood && x.mood.m) || 0);
    const cor = [];
    const sets = (f) => { const a = [], b = []; Object.values(bd().days).forEach((x) => { if (x.mood) (f(x) ? a : b).push(x.mood.m); }); return [a, b]; };
    const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    [["slept 7h or more", (x) => x.sleep >= 7], ["drank their water goal", (x) => x.water >= goalWater()], ["moved for 20 min or more", (x) => x.work.reduce((s, w) => s + w.min, 0) >= 20]].forEach(([l, f]) => { const [a, b] = sets(f); if (a.length >= 3 && b.length >= 3) cor.push(`On days you ${l}, mood averaged ${avg(a).toFixed(1)} against ${avg(b).toFixed(1)}.`); });
    return `<div class="card"><div class="eyebrow">How are you, really?</div>${sc("m", "Mood")}${sc("e", "Energy")}${sc("s", "Stress")}
      <label class="l">What is in the mix</label><div class="chips">${TAGS.map((t) => `<button class="chip ${draft.tags.includes(t) ? "on" : ""}" data-a="btag" data-v="${t}">${t}</button>`).join("")}</div>
      <label class="l">A few lines, if you want</label><textarea id="bnote" placeholder="What happened? What are you carrying?">${esc(draft.note)}</textarea>
      <div class="chips" style="margin-top:10px"><button class="chip on" data-a="bmsave">Save check-in</button><button class="chip" data-a="breflect">${T.ui.brf ? "Thinking..." : "Reflect with " + esc(T.jvName ? T.jvName() : "Jarvis")}</button></div>
      ${T.ui.bcrisis ? `<div class="card red" style="margin-top:12px"><b>I am glad you wrote that down. You do not have to carry it alone.</b><p class="sm">If you might hurt yourself, or are in danger right now, call your local emergency number. In India you can reach Tele-MANAS on 14416, free and round the clock. If you can, tell someone near you now.</p><div class="chips"><a class="chip" href="tel:14416" style="text-decoration:none">Call 14416</a><a class="chip" href="tel:112" style="text-decoration:none">Call 112</a><button class="chip" data-a="sosstart">Alert my contacts</button></div></div>` : ""}
      ${d.refl ? `<div class="card" style="margin-top:12px;white-space:pre-wrap">${esc(d.refl)}</div>` : ""}</div>
      <div class="card"><h3>Last 14 days</h3>${bars(mo, 5, "var(--grn)")}${cor.length ? `<p class="sm" style="margin:10px 0 0">${cor.map(esc).join("<br>")}</p>` : '<p class="sm soft" style="margin:10px 0 0">Log a few more days and I will show you what moves your mood.</p>'}</div>
      <div class="card"><h3>Studying hate takes a toll</h3><p class="sm" style="margin:0">Reading and writing about violence is not neutral work. Cap the hours you spend in hostile material, never read it last thing at night, write down what you felt before you write down what it meant, and keep one person you can debrief with. Needing a break is data, not weakness.</p></div>`;
  }

  function moveV() {
    const d = day(), wk = last(7, (x) => (x ? x.work.reduce((s, w) => s + w.min, 0) : 0)), tm = wk.reduce((a, b) => a + b, 0);
    const wts = bd().wt.slice(-20).map((x) => x.w);
    return `<div class="card hero"><div class="row"><div><div class="eyebrow">This week</div><b style="font-size:22px">${tm} min</b><div class="sm soft">of 150 recommended</div></div><div class="bar" style="width:42%"><i style="width:${Math.min(100, tm / 150 * 100)}%"></i></div></div>${bars(wk, Math.max(...wk, 30), "var(--red)")}</div>
      <div class="card"><div class="eyebrow">Log a workout</div><div class="chips" style="margin-top:8px">${["Walk", "Run", "Gym", "Yoga", "Cycle", "Sport", "Other"].map((x) => `<button class="chip ${(T.ui.bwk || "Walk") == x ? "on" : ""}" data-a="bwk" data-v="${x}">${x}</button>`).join("")}</div>
        <div class="row" style="gap:8px;margin-top:10px"><input id="bmin" placeholder="Minutes" inputmode="numeric"><button class="btn s" data-a="bwlog">Log</button></div>
        <div class="chips" style="margin-top:8px">${["easy", "moderate", "hard"].map((x) => `<button class="chip ${(T.ui.bint || "moderate") == x ? "on" : ""}" data-a="bint" data-v="${x}">${x}</button>`).join("")}</div>
        ${d.work.map((w, i) => `<div class="row sm" style="margin:6px 0"><span>${esc(w.t)} · ${w.min} min · ${esc(w.i)}</span><button class="chip" data-a="bwdel" data-v="${i}" aria-label="Remove">&#10005;</button></div>`).join("")}</div>
      <div class="card"><div class="eyebrow">Weight</div><div class="row" style="gap:8px;margin-top:8px"><input id="bwt" placeholder="kg" inputmode="decimal"><button class="btn s" data-a="bwt">Log</button></div>${spark(wts)}${wts.length ? `<div class="sm soft">${wts[wts.length - 1]} kg latest</div>` : ""}</div>
      <div class="card"><div class="eyebrow">Training plan</div><p class="sm soft" style="margin:6px 0">Built from your profile. Tell me your equipment and days.</p><input id="bpl" placeholder="e.g. 4 days a week, home, dumbbells, 40 minutes" value="${esc(T.ui.bplq || "")}"><div class="chips" style="margin-top:8px"><button class="chip" data-a="bplan">${T.ui.bpl ? "Writing..." : "Build my plan"}</button></div>${bd().plan ? `<p class="sm" style="white-space:pre-wrap;margin:10px 0 0">${esc(bd().plan)}</p>` : ""}</div>`;
  }

  function planV() {
    const p = bd().prof, t = targets();
    const ch = (k, opts) => `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${p[k] == v ? "on" : ""}" data-a="bprof" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
    return `<div class="card"><div class="eyebrow">Your profile</div><div class="row" style="gap:8px;margin-top:8px"><input id="ph" placeholder="Height cm" inputmode="numeric" value="${esc(p.h)}"><input id="pw" placeholder="Weight kg" inputmode="decimal" value="${esc(p.w)}"><input id="pa" placeholder="Age" inputmode="numeric" value="${esc(p.age)}"></div>
      <label class="l">Sex (for the energy formula)</label>${ch("sex", [["m", "Male"], ["f", "Female"]])}
      <label class="l">Activity</label>${ch("act", [["sed", "Desk-bound"], ["light", "Light"], ["mod", "Active"], ["high", "Very active"]])}
      <label class="l">Goal</label>${ch("goal", [["lose", "Lose fat"], ["maintain", "Maintain"], ["gain", "Gain"], ["strength", "Build strength"]])}
      <label class="l">Diet</label>${ch("diet", [["veg", "Vegetarian"], ["egg", "Eggetarian"], ["nonveg", "Non-veg"], ["vegan", "Vegan"], ["jain", "Jain"]])}
      <label class="l">Allergies, conditions, anything I should respect</label><input id="pn" value="${esc(p.note)}" placeholder="Optional">
      <div class="chips" style="margin-top:10px"><button class="chip on" data-a="bpsave">Save</button></div></div>
      ${t ? `<div class="card"><h3>Daily targets</h3><div class="row" style="text-align:center"><div class="stat"><b>${t.kcal}</b><span class="soft sm">kcal</span></div><div class="stat"><b>${t.protein}</b><span class="soft sm">g protein</span></div><div class="stat"><b>${t.water}</b><span class="soft sm">ml water</span></div></div><p class="sm soft">Resting needs about ${t.bmr} kcal, with activity about ${t.tdee}. BMI ${t.bmi}. Targets never go below resting needs, and a fat-loss goal uses a gentle deficit. These are population formulas, so treat them as a start and adjust with how you feel.</p></div>
        <div class="card"><h3>A week of Indian meals</h3><button class="btn s" data-a="bmeals">${T.ui.bml ? "Writing..." : "Suggest a meal plan"}</button>${bd().meals ? `<p class="sm" style="white-space:pre-wrap;margin:10px 0 0">${esc(bd().meals)}</p>` : ""}</div>` : '<div class="card"><p class="sm soft" style="margin:0">Add height, weight and age to see targets.</p></div>'}
      <div class="card"><p class="sm soft" style="margin:0">This is general wellbeing support, not medical advice. If you have a health condition, are pregnant, or find yourself restricting food, counting obsessively or exercising to punish yourself, talk to a doctor. If food or body image is hurting, say so to me or to someone you trust.</p></div>`;
  }

  function bodyView() {
    const sub = T.ui.bt || "today";
    return `<h2 style="margin-bottom:4px">Life</h2><p class="soft sm" style="margin-top:0">Body, mind and money. ${esc(T.jvName ? T.jvName() : "Jarvis")} reads this so its advice fits you.</p>
      <div class="seg">${segs.map(([k, l]) => `<button class="${sub == k ? "on" : ""}" data-a="bsub" data-v="${k}">${l}</button>`).join("")}</div>${({ today: todayV, mind: mindV, move: moveV, plan: planV, money: () => (T.moneyView ? T.moneyView() : "") })[sub]()}`;
  }
  T.view("body", bodyView);

  // ------------------------------------------------------------ actions
  const parseJ = (s) => { const m = String(s).match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } };
  const keepP = () => { const p = bd().prof; if ($("#ph")) { p.h = T.val("ph"); p.w = T.val("pw"); p.age = T.val("pa"); p.note = T.val("pn"); } };
  T.act({
    bsub(v) { T.ui.bt = v; T.render(); },
    bwater(v) { const d = day(); d.water = Math.max(0, d.water + +v); T.save(); T.render(); if (+v > 0 && d.water >= goalWater() && d.water - +v < goalWater()) T.toast("Water goal reached."); },
    bsearch() { T.ui.bq = T.val("bq"); T.render(); }, bmul(v) { T.ui.bmul = v; T.render(); },
    bfood(v) { const f = K.FOODS[+v], m = +(T.ui.bmul || 1); day().meals.push({ t: f[0] + (m != 1 ? " x" + m : ""), kcal: Math.round(f[2] * m), p: Math.round(f[3] * m * 10) / 10, at: Date.now() }); T.save(); T.render(); },
    bmdel(v) { day().meals.splice(+v, 1); T.save(); T.render(); },
    bcustom() { const n = T.val("bcn"), k = +T.val("bck"); if (!n || !(k >= 0)) return T.toast("Add a name and kcal."); day().meals.push({ t: n, kcal: Math.round(k), p: +T.val("bcp") || 0, at: Date.now() }); T.save(); T.render(); },
    async bestimate() {
      const x = T.val("bai"); if (!x) return; T.ui.best = 1; T.render();
      try {
        const r = await T.ai([{ role: "user", content: `Estimate total calories and protein (grams) for this meal as eaten in India with typical household portions: "${x}". Return ONLY JSON: {"kcal":number,"protein":number}` }], "You estimate nutrition roughly and say nothing else. Output JSON only.", 120);
        const j = parseJ(r);
        if (j && j.kcal > 0 && j.kcal < 3500) { day().meals.push({ t: x.slice(0, 60), kcal: Math.round(j.kcal), p: Math.round(j.protein || 0), est: 1, at: Date.now() }); T.save(); } else T.toast("I could not estimate that. Add it by hand.");
      } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.best = 0; T.render();
    },
    bsleep(v) { day().sleep = +v; T.save(); T.render(); },
    bscore(v, el) { T.ui.bmd = T.ui.bmd || {}; T.ui.bmd[el.dataset.k] = +v; if ($("#bnote")) T.ui.bmd.note = $("#bnote").value; T.render(); },
    btag(v) { const d = T.ui.bmd; if ($("#bnote")) d.note = $("#bnote").value; const i = d.tags.indexOf(v); if (i >= 0) d.tags.splice(i, 1); else d.tags.push(v); T.render(); },
    bmsave() {
      const d = T.ui.bmd; d.note = $("#bnote") ? $("#bnote").value.trim() : d.note;
      if (!d.m) return T.toast("Pick a mood first.");
      day().mood = { m: d.m, e: d.e || 3, s: d.s || 3, tags: d.tags.slice(), note: d.note, at: Date.now() };
      T.ui.bcrisis = CRISIS.test(d.note); T.save();
      T.logA("mind", "Mood " + d.m + "/5" + (d.tags.length ? " (" + d.tags.slice(0, 3).join(", ") + ")" : ""));
      if (d.note.length > 25 && T.remember && !T.ui.bcrisis) T.fire("jarvis:note", "Reflection: " + d.note.slice(0, 160));
      T.render(); T.toast(T.ui.bcrisis ? "Saved. Please read the note below." : "Saved. Thank you for being honest.");
    },
    async breflect() {
      const d = T.ui.bmd; d.note = $("#bnote") ? $("#bnote").value.trim() : d.note;
      if (CRISIS.test(d.note)) { T.ui.bcrisis = true; return T.render(); }
      if (!d.m) return T.toast("Pick a mood first.");
      T.ui.brf = 1; T.render();
      try {
        day().refl = await T.ai([{ role: "user", content: `My check-in: mood ${MOODS[d.m - 1]}, energy ${d.e || "?"}/5, stress ${d.s || "?"}/5, feeling ${d.tags.join(", ") || "unspecified"}. ${d.note ? "I wrote: " + d.note : ""}\nReflect with me in at most 90 words: name what you notice with care, offer one gentle reframe or small action, and ask one good question. No diagnosis, no lecture.` }], T.sysFor ? T.sysFor("j", d.note) : undefined, 300);
        T.save();
      } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.brf = 0; T.render();
    },
    bwk(v) { T.ui.bwk = v; T.render(); }, bint(v) { T.ui.bint = v; T.render(); },
    bwlog() { const m = +T.val("bmin"); if (!(m > 0)) return T.toast("Enter minutes."); day().work.push({ t: T.ui.bwk || "Walk", min: Math.round(m), i: T.ui.bint || "moderate", at: Date.now() }); T.save(); T.logA("move", (T.ui.bwk || "Walk") + " " + Math.round(m) + " min"); T.render(); },
    bwdel(v) { day().work.splice(+v, 1); T.save(); T.render(); },
    bwt() { const w = +T.val("bwt"); if (!(w > 20 && w < 300)) return T.toast("Enter weight in kg."); const b = bd(); b.wt.push({ d: dk(), w }); b.prof.w = String(w); T.save(); T.render(); },
    async bplan() {
      T.ui.bplq = T.val("bpl"); T.ui.bpl = 1; T.render();
      try { bd().plan = await T.ai([{ role: "user", content: `Build a realistic 4-week progressive training plan for me. Profile: ${T.bodyLine()}. Constraints: ${T.ui.bplq || "none given"}. Keep it concise: weekly structure, session contents, progression rule, rest days, and a note on soreness versus pain. Start gently.` }], T.sysFor ? T.sysFor("j", "training plan") : undefined, 900); T.save(); } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.bpl = 0; T.render();
    },
    async bmeals() {
      T.ui.bml = 1; T.render(); const t = targets(), p = bd().prof;
      try { bd().meals = await T.ai([{ role: "user", content: `Suggest a 7-day Indian meal plan, ${p.diet} diet, around ${t.kcal} kcal and ${t.protein} g protein a day, budget-friendly and easy to cook for a student or researcher. ${p.note ? "Respect: " + p.note + "." : ""} One line per meal, with rough protein for each day. Add 5 swaps for hitting protein without supplements.` }], T.sysFor ? T.sysFor("j", "meal plan") : undefined, 1100); T.save(); } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.bml = 0; T.render();
    },
    bprof(v, el) { keepP(); bd().prof[el.dataset.k] = v; T.save(); T.render(); },
    bpsave() { keepP(); T.save(); T.toast("Saved"); T.render(); }
  });
  T.on("boot", () => { day(); });
});
