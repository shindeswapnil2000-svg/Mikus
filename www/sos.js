/* Safety: emergency SOS, check-in timer, fake call, helplines. Works as a module of Taskmaster (see app.js, TMX). */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc, N } = T;
  const S = () => T.S();
  const $ = (s) => document.querySelector(s);

  const NUMS = {
    IN: { n: "India", e: "112", l: [["Police", "100"], ["Fire", "101"], ["Ambulance", "102"], ["Emergency ambulance", "108"], ["Women helpline", "1091"], ["Women helpline (national)", "181"], ["Child helpline", "1098"], ["Cyber crime", "1930"], ["Tele-MANAS mental health", "14416"]] },
    US: { n: "United States", e: "911", l: [["Suicide and Crisis Lifeline", "988"]] },
    UK: { n: "United Kingdom", e: "999", l: [["NHS non-emergency", "111"], ["Police non-emergency", "101"], ["Samaritans", "116123"]] },
    CA: { n: "Canada", e: "911", l: [["Suicide Crisis Helpline", "988"]] },
    DE: { n: "Germany", e: "112", l: [["Police", "110"]] },
    NL: { n: "Netherlands", e: "112", l: [] },
    SE: { n: "Nordics / EU", e: "112", l: [] },
    AU: { n: "Australia", e: "000", l: [["Lifeline", "131114"]] },
    CH: { n: "Switzerland", e: "112", l: [["Police", "117"], ["Ambulance", "144"]] }
  };
  const guess = () => {
    const z = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    if (/Calcutta|Kolkata/.test(z)) return "IN";
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax)/.test(z)) return "CA";
    if (/^America\//.test(z)) return "US";
    if (/London/.test(z)) return "UK";
    if (/Berlin/.test(z)) return "DE";
    if (/Amsterdam/.test(z)) return "NL";
    if (/Stockholm|Oslo|Copenhagen|Helsinki/.test(z)) return "SE";
    if (/Zurich/.test(z)) return "CH";
    if (/^Australia\//.test(z)) return "AU";
    return "IN";
  };
  const DEF = () => ({ contacts: [], auth: [], country: guess(), callMode: "dial", delay: 5, medOn: true, med: { blood: "", allergies: "", conds: "", meds: "" }, shake: false, hist: [], timer: null, st: null });
  const cfg = () => {
    const s = S();
    s.sos = Object.assign(DEF(), s.sos || {});
    return s.sos;
  };
  const num = () => (NUMS[cfg().country] || NUMS.IN);
  const dg = (x) => String(x || "").replace(/[^\d+]/g, "");
  const tels = () => cfg().contacts.concat(cfg().auth.filter((a) => a.sms !== false)).map((c) => T.intl ? T.intl(c.tel) : dg(c.tel)).filter(Boolean).map((n) => "+" + n);
  const me = () => S().name || "Your contact";
  const beep = (f, ms) => {
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      T.ac = T.ac || new A();
      const o = T.ac.createOscillator(), g = T.ac.createGain();
      o.frequency.value = f; g.gain.value = 0.08;
      o.connect(g); g.connect(T.ac.destination); o.start(); o.stop(T.ac.currentTime + ms / 1000);
    } catch (e) { /* sound is optional */ }
  };
  const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* optional */ } };

  function medText() {
    const c = cfg();
    if (!c.medOn) return "";
    const m = c.med, p = [];
    if (m.blood) p.push("Blood group " + m.blood);
    if (m.allergies) p.push("Allergies: " + m.allergies);
    if (m.conds) p.push("Conditions: " + m.conds);
    if (m.meds) p.push("Medication: " + m.meds);
    return p.join(". ") + (p.length ? "." : "");
  }
  const intro = () => "EMERGENCY: " + me() + " needs help.";

  // ------------------------------------------------------------ location in the browser (the app uses the native one)
  function webLoc() {
    return new Promise((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
        () => res(null), { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 });
    });
  }
  const mapLink = (l) => "https://maps.google.com/?q=" + l.lat.toFixed(6) + "," + l.lng.toFixed(6);

  // ------------------------------------------------------------ the SOS itself
  let cd = null;
  function paint() {
    const el = $("#sosov"), c = cfg(), st = c.st;
    if (!st) { el.innerHTML = ""; return; }
    const e = num().e;
    let h = "";
    if (st.phase == "count") {
      h = `<div class="sosfx"><div class="eyebrow" style="color:#fff">Emergency SOS</div><div class="sosnum">${st.left}</div><p style="max-width:30ch">Alerting ${c.contacts.length + c.auth.filter((a) => a.sms !== false).length} contact${c.contacts.length == 1 ? "" : "s"} with your location${c.callMode != "none" ? ", then opening the dialer for " + e : ""}.</p>
        <button class="btn sosb" data-a="sosgo">Send now</button><button class="btn gh" style="margin-top:12px;max-width:340px" data-a="soscancel">Cancel, I am fine</button>${c.contacts.length ? "" : `<p class="sm" style="margin-top:14px">You have no emergency contacts yet. I will still open the ${e} dialer. Add people in Me, Safety.</p>`}</div>`;
    } else if (st.phase == "run") {
      h = `<div class="sosfx"><div class="eyebrow" style="color:#fff">Emergency SOS</div><h2 style="margin:12px 0">Sending</h2><p>Getting your location and texting your contacts...</p></div>`;
    } else if (st.phase == "done") {
      const r = st.res || {};
      const row = (ok, t) => `<div class="row" style="justify-content:flex-start;gap:10px;margin:6px 0"><b style="color:${ok ? "#7CFFB2" : "#FFD27A"}">${ok ? "Done" : "Check"}</b><span style="text-align:left">${t}</span></div>`;
      h = `<div class="sosfx" style="justify-content:flex-start;overflow:auto;padding-top:40px"><div class="eyebrow" style="color:#fff">SOS sent</div>
        <div style="width:100%;max-width:360px;text-align:left;margin:12px auto">
        ${row(r.hasLoc, r.hasLoc ? `Location found (within ${r.acc > 0 ? Math.round(r.acc) + " m" : "an unknown range"})` : "No location fix. Texts went out without one.")}
        ${row(r.sent > 0, r.sent > 0 ? `Texted ${r.sent} contact${r.sent == 1 ? "" : "s"}` : r.manual ? "Your messages app is open. Tap send." : "Could not text anyone automatically")}
        ${row(r.called, r.called ? `Dialer opened for ${e}. Tap the green call button now.` : `Tap Call ${e} below`)}</div>
        <a class="btn sosb" href="tel:${e}" style="display:block;text-decoration:none;text-align:center;max-width:360px;width:100%">Call ${e}</a>
        <div class="chips" style="margin-top:14px;justify-content:center">${num().l.slice(0, 4).map(([n, t]) => `<a class="chip" href="tel:${t}" style="text-decoration:none">${esc(n)} ${t}</a>`).join("")}</div>
        <div class="chips" style="margin-top:10px;justify-content:center"><button class="chip" data-a="sosmap" data-v="police station">Nearest police</button><button class="chip" data-a="sosmap" data-v="hospital">Nearest hospital</button>${c.contacts[0] ? `<button class="chip" data-a="soswa">WhatsApp ${esc(c.contacts[0].name)}</button>` : ""}</div>
        <button class="btn" style="margin-top:18px;background:#1B8F4B;max-width:360px" data-a="sossafe">I am safe, tell everyone</button>
        <button class="btn gh" style="margin-top:10px;max-width:360px" data-a="sosclose">Close</button>
        <p class="sm" style="max-width:34ch;margin-top:12px;opacity:.85">If you can, move to a public place and keep your phone with you.</p></div>`;
    } else if (st.phase == "fake") {
      h = fakeHtml(st);
    }
    el.innerHTML = h;
  }
  const fakeHtml = (st) => st.ans
    ? `<div class="fakefx"><div class="soft sm">${esc(st.name)}</div><h2 style="margin:6px 0">Call in progress</h2><div class="clock" style="font-size:64px" id="fclock">00:00</div><button class="btn" data-a="fakeend" style="max-width:300px">End call</button></div>`
    : `<div class="fakefx"><div class="soft sm">Incoming call</div><h2 style="margin:6px 0;font-size:40px">${esc(st.name)}</h2><div class="soft">mobile</div><div class="row" style="gap:70px;margin-top:60px;justify-content:center"><button class="fbtn red" data-a="fakeend" aria-label="Decline">&#10005;</button><button class="fbtn grn" data-a="fakeans" aria-label="Answer">&#9742;</button></div></div>`;

  function start() {
    const c = cfg();
    if (c.st) return;
    c.st = { phase: "count", left: c.delay };
    T.save(); paint(); vib([200, 100, 200]); beep(880, 200);
    clearInterval(cd);
    cd = setInterval(() => {
      const st = cfg().st;
      if (!st || st.phase != "count") return clearInterval(cd);
      st.left--; vib(120); beep(660, 120);
      if (st.left <= 0) { clearInterval(cd); dispatch(); } else paint();
    }, 1000);
  }

  async function dispatch() {
    const c = cfg();
    c.st = { phase: "run" }; paint();
    const extra = medText(), e = num().e, to = tels();
    let res = { sent: 0, called: false, hasLoc: false };
    try {
      if (N) {
        res = await N.sosDispatch({ tels: to.join(","), intro: intro(), extra, callTel: c.callMode == "none" ? "" : e, callMode: c.callMode });
        if (!res.canSms && to.length) {
          // no SMS permission: fall back to the messages app so the alert still goes out
          const body = res.msg || intro();
          await N.openUrl({ url: "sms:" + to.join(",") + "?body=" + encodeURIComponent(body) }).catch(() => { });
          res.manual = true;
        }
      } else {
        const l = await webLoc();
        const body = intro() + (l ? " My location: " + mapLink(l) : " My location is not available.") + (extra ? " " + extra : "") + " Sent by Taskmaster SOS.";
        if (to.length) { location.href = "sms:" + to.join(",") + "?body=" + encodeURIComponent(body); res.manual = true; }
        res.hasLoc = !!l; res.acc = l ? l.acc : -1; res.lat = l && l.lat; res.lng = l && l.lng; res.msg = body;
        if (c.callMode != "none") setTimeout(() => { location.href = "tel:" + e; }, 1500);
        res.called = c.callMode != "none";
      }
    } catch (err) {
      T.toast("SOS: " + (err && err.message || err));
    }
    c.hist.unshift({ t: Date.now(), sent: res.sent || 0, loc: !!res.hasLoc, lat: res.lat, lng: res.lng });
    c.hist = c.hist.slice(0, 15);
    T.logA("sos", "SOS sent: " + (res.sent || 0) + " text(s)" + (res.hasLoc ? " with location" : "") + (res.called ? ", dialer opened for " + e : ""));
    c.st = { phase: "done", res, at: Date.now() }; T.save(); paint(); vib([400, 150, 400]);
  }

  // ------------------------------------------------------------ fake call
  let fakeTm = null, fakeClk = null, ring = null;
  function fakeCall(delaySec, name) {
    clearTimeout(fakeTm);
    const n = name || (cfg().contacts[0] && cfg().contacts[0].name) || "Mom";
    T.toast("Fake call from " + n + " in " + (delaySec >= 60 ? Math.round(delaySec / 60) + " min" : delaySec + " s") + ". You can lock the screen but keep the app open.");
    fakeTm = setTimeout(() => {
      const c = cfg();
      c.st = { phase: "fake", name: n, ans: false }; paint();
      const ringOnce = () => { vib([600, 400, 600, 400]); beep(440, 600); setTimeout(() => beep(480, 600), 40); };
      ringOnce(); clearInterval(ring); ring = setInterval(ringOnce, 3200);
    }, Math.max(1, delaySec) * 1000);
  }
  const fakeStop = () => { clearInterval(ring); clearInterval(fakeClk); try { speechSynthesis.cancel(); } catch (e) { /* optional */ } cfg().st = null; paint(); };

  // ------------------------------------------------------------ check-in timer
  async function timerStart(min) {
    const c = cfg(), now = Date.now(), end = now + min * 6e4;
    let loc = null;
    try { loc = N ? await N.getLocation() : await webLoc(); } catch (e) { /* the alert will say location is unknown */ }
    const body = intro() + " I did not check in on time. " + (loc ? "Last known location: " + mapLink(loc) + "." : "My last location is unknown.") + (medText() ? " " + medText() : "") + " Sent automatically by Taskmaster SOS.";
    c.timer = { end, ids: ["ci-" + now + "-a", "ci-" + now + "-b"], loc: !!loc, mins: min };
    if (N) {
      await T.push(c.timer.ids[0], "Check in now. Open Taskmaster and tap I am safe, or an SOS goes to your contacts in 2 minutes.", { at: end, title: "Safety check-in", p: 5 });
      await T.push(c.timer.ids[1], body, { at: end + 12e4, title: "SOS", kind: "sos", tels: tels().join(","), callTel: c.callMode == "none" ? "" : num().e });
    }
    T.save(); T.render(); T.toast(N ? "Timer set. Tap I am safe to cancel." : "Timer set, but automatic texts need the Android app. You will get a reminder while this app is open.");
  }
  function timerStop() {
    const c = cfg();
    if (c.timer) (c.timer.ids || []).forEach((id) => T.unpush(id));
    c.timer = null; T.save(); T.render();
  }

  // ------------------------------------------------------------ shake trigger (only while the app is open)
  let sh = [];
  window.addEventListener("devicemotion", (e) => {
    if (!cfg().shake || cfg().st) return;
    const a = e.accelerationIncludingGravity; if (!a) return;
    const g = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    if (g > 28) { const t = Date.now(); sh = sh.filter((x) => t - x < 1500); sh.push(t); if (sh.length >= 4) { sh = []; start(); } }
  });

  // ------------------------------------------------------------ the Safety screen
  const perm = (v) => v ? '<b style="color:var(--grn)">on</b>' : '<b class="late">off</b>';
  function safety() {
    const c = cfg(), ns = T.ui.ns || {}, n = num();
    const person = (p, k) => `<div class="row" style="margin:6px 0"><span><b>${esc(p.name)}</b> <span class="soft sm">${esc(p.tel)}${p.rel ? " · " + esc(p.rel) : ""}</span></span><button class="chip" data-a="sosrm" data-k="${k}" data-v="${p.id}" aria-label="Remove">&#10005;</button></div>`;
    const tm = c.timer, left = tm ? Math.max(0, Math.ceil((tm.end - Date.now()) / 6e4)) : 0;
    return T.meBar() + `<h2 style="margin-bottom:4px">Safety</h2><p class="soft sm" style="margin-top:0">One tap alerts the people you trust and opens the emergency dialer. It never replaces calling ${n.e}.</p>
    <div class="card red"><button class="btn sosb" data-a="sosstart" style="font-size:18px;padding:18px">Send SOS now</button>
      <div class="chips" style="margin-top:10px"><button class="chip" data-a="sosdry">Preview what would be sent</button><button class="chip" data-a="sostest">Text a test to my first contact</button></div></div>
    <div class="card"><h3>Emergency contacts</h3>${c.contacts.length ? c.contacts.map((p) => person(p, "c")).join("") : '<p class="sm soft" style="margin:0 0 8px">Add 2 or 3 people who would actually pick up. Family first.</p>'}
      <input id="scn" placeholder="Name" style="margin-top:6px"><input id="sct" placeholder="Phone number" inputmode="tel" style="margin-top:6px"><input id="scr" placeholder="Relation (mother, friend, roommate)" style="margin-top:6px">
      <div class="chips" style="margin-top:8px"><button class="chip" data-a="sosadd" data-v="c">Add contact</button>${N ? '<button class="chip" data-a="sospick" data-v="c">Pick from phone contacts</button>' : ""}</div></div>
    <div class="card"><h3>Authorities and local help</h3>
      <p class="sm soft" style="margin-top:0">Country: <b>${esc(n.n)}</b>. Emergency number <b>${n.e}</b>. Your phone sends your location to emergency services when you dial from Android where the local service supports it. Nothing here can alert police on its own except a call to ${n.e}.</p>
      <div class="chips">${Object.keys(NUMS).map((k) => `<button class="chip ${c.country == k ? "on" : ""}" data-a="soscty" data-v="${k}">${k}</button>`).join("")}</div>
      <label class="l">After the texts go out</label><div class="chips">${[["dial", "Open dialer for " + n.e], ["call", "Dial " + n.e + " straight away"], ["none", "Do not call"]].map(([k, l]) => `<button class="chip ${c.callMode == k ? "on" : ""}" data-a="soscm" data-v="${k}">${l}</button>`).join("")}</div>
      <p class="sm soft">Android only lets apps place a normal call without a tap, and it asks for one more tap on emergency numbers. So the dialer opens ready and you press the green button.</p>
      <label class="l">Countdown before sending</label><div class="chips">${[3, 5, 8].map((x) => `<button class="chip ${c.delay == x ? "on" : ""}" data-a="sosdelay" data-v="${x}">${x} s</button>`).join("")}</div>
      <label class="l">Your local police station, campus security, hostel warden (they get the text too)</label>${c.auth.map((p) => person(p, "a")).join("")}
      <input id="san" placeholder="Name (for example: Local police station)" style="margin-top:6px"><input id="sat" placeholder="Phone number" inputmode="tel" style="margin-top:6px">
      <div class="chips" style="margin-top:8px"><button class="chip" data-a="sosadd" data-v="a">Add</button></div>
      <p class="sm soft" style="margin-top:10px">Also install the official <b>112 India</b> app: its SOS button sends your location and places the call through the state control room.</p>
      <div class="chips"><a class="chip" style="text-decoration:none" href="https://play.google.com/store/search?q=112%20India&c=apps">Find the 112 India app</a></div></div>
    <div class="card"><h3>Medical card</h3><div class="row"><span class="sm">Add this to the SOS text</span><button class="chip ${c.medOn ? "on" : ""}" data-a="sosmedon">${c.medOn ? "On" : "Off"}</button></div>
      <input id="smb" placeholder="Blood group" value="${esc(c.med.blood)}" style="margin-top:8px"><input id="sma" placeholder="Allergies" value="${esc(c.med.allergies)}" style="margin-top:6px"><input id="smc" placeholder="Conditions" value="${esc(c.med.conds)}" style="margin-top:6px"><input id="smm" placeholder="Regular medication" value="${esc(c.med.meds)}" style="margin-top:6px">
      <div class="chips" style="margin-top:8px"><button class="chip" data-a="sosmed">Save</button></div></div>
    <div class="card"><h3>Check-in timer</h3>${tm ? `<p style="margin-top:0">Timer running. <b>${left} min</b> left. If you do not check in, your contacts get an alert with your last location${N ? "" : " (automatic texts need the Android app)"}.</p><button class="btn" style="background:#1B8F4B" data-a="sostimerstop">I am safe</button>`
      : `<p class="sm soft" style="margin-top:0">Walking home late, getting into a cab, meeting someone new, going into the field? Set a timer. If you do not tap "I am safe", your contacts are texted 2 minutes after it ends.</p><div class="chips">${[15, 30, 60, 120].map((m) => `<button class="chip" data-a="sostimer" data-v="${m}">${m} min</button>`).join("")}</div>`}</div>
    <div class="card"><h3>Fake call</h3><p class="sm soft" style="margin-top:0">An easy exit from a situation. Your phone rings with a call from a name you choose.</p><input id="sfn" placeholder="Caller name" value="${esc((c.contacts[0] && c.contacts[0].name) || "Mom")}"><div class="chips" style="margin-top:8px">${[[10, "10 s"], [30, "30 s"], [60, "1 min"], [300, "5 min"]].map(([s, l]) => `<button class="chip" data-a="sosfake" data-v="${s}">${l}</button>`).join("")}</div></div>
    <div class="card"><h3>Triggers</h3><div class="row"><span class="sm">Shake the phone 4 times (only works while this app is open)</span><button class="chip ${c.shake ? "on" : ""}" data-a="sosshake">${c.shake ? "On" : "Off"}</button></div>
      <p class="sm soft">Always-on triggers belong to Android itself. On a Samsung, turn on <b>Settings, Safety and emergency, Send SOS messages</b> so pressing the side key several times alerts your contacts even when this app is closed. The red SOS button on every screen here, and typing or saying "SOS", cover the rest.</p></div>
    <div class="card"><h3>Permissions</h3><div class="sm" style="line-height:1.9">Location ${perm(ns.location)} · Texts ${perm(ns.sms)} · Calls ${perm(ns.call)} · Auto-call when closed ${perm(ns.overlay)}</div>${N ? '<div class="chips" style="margin-top:10px"><button class="chip" data-a="nperm">Grant permissions</button><button class="chip" data-a="nover">Allow auto-call</button></div>' : '<p class="sm soft">In a browser, SOS opens your messages app and dialer for you to tap send.</p>'}</div>
    <div class="card"><h3>Helplines (${esc(n.n)})</h3>${[["Emergency", n.e]].concat(n.l).map(([a, b]) => `<div class="row" style="margin:6px 0"><span>${esc(a)}</span><a class="chip" href="tel:${b}" style="text-decoration:none">${b}</a></div>`).join("")}<p class="sm soft">Numbers change. Check them against an official source when you set up.</p></div>
    ${c.hist.length ? `<div class="card"><h3>SOS history</h3>${c.hist.slice(0, 5).map((h) => `<p class="sm" style="margin:6px 0"><span class="soft">${new Date(h.t).toLocaleString()}</span> texted ${h.sent}${h.loc ? ", with location" : ""}</p>`).join("")}</div>` : ""}`;
  }
  T.view("safety", safety);

  // ------------------------------------------------------------ actions
  const keepMed = () => { const m = cfg().med; if ($("#smb")) { m.blood = T.val("smb"); m.allergies = T.val("sma"); m.conds = T.val("smc"); m.meds = T.val("smm"); } };
  T.act({
    sosstart: start, sosgo() { clearInterval(cd); dispatch(); },
    soscancel() { clearInterval(cd); cfg().st = null; paint(); T.toast("Cancelled. No alert was sent."); },
    sosclose() { cfg().st = null; T.save(); paint(); },
    sosmap(v) { const l = (cfg().hist[0] || {}); const q = l.lat ? "geo:" + l.lat + "," + l.lng + "?q=" + encodeURIComponent(v) : "geo:0,0?q=" + encodeURIComponent(v + " near me"); T.open_(q); },
    soswa() { const p = cfg().contacts[0]; const h = cfg().hist[0] || {}; const t = intro() + (h.lat ? " My location: https://maps.google.com/?q=" + h.lat.toFixed(6) + "," + h.lng.toFixed(6) : ""); T.open_("https://wa.me/" + (T.intl ? T.intl(p.tel) : dg(p.tel)) + "?text=" + encodeURIComponent(t)); },
    async sossafe() {
      const to = tels(), msg = me() + " here: I am safe now. Thank you. Sorry for the scare.";
      let n = 0;
      if (N) { for (const t of to) { try { await N.sendSms({ tel: t, body: msg }); n++; } catch (e) { /* next */ } } T.toast("Told " + n + " contact" + (n == 1 ? "" : "s") + " you are safe."); }
      else if (to.length) location.href = "sms:" + to.join(",") + "?body=" + encodeURIComponent(msg);
      T.logA("sos", "Marked safe, told " + n + " contact(s)"); cfg().st = null; T.save(); paint();
    },
    sosdry() { const loc = N ? "(your real location is added when sent)" : "(your location is added when sent)"; alert(intro() + " My location: https://maps.google.com/?q=LAT,LNG " + loc + (medText() ? " " + medText() : "") + " Sent by Taskmaster SOS.\n\nTo: " + (tels().join(", ") || "nobody yet. Add contacts first") + "\nThen: " + (cfg().callMode == "none" ? "no call" : "dialer for " + num().e)); },
    async sostest() {
      const p = cfg().contacts[0]; if (!p) return T.toast("Add a contact first.");
      const msg = "TEST from " + me() + "'s Taskmaster app: this is only a test of the emergency alert. No action needed.";
      if (N) { try { await N.sendSms({ tel: T.intl(p.tel), body: msg }); T.toast("Test text sent to " + p.name); T.logA("sos", "Test text sent to " + p.name); } catch (e) { T.toast("Could not send: " + (e.message || e)); } }
      else location.href = "sms:" + p.tel + "?body=" + encodeURIComponent(msg);
    },
    sosadd(v) {
      const c = cfg();
      const name = T.val(v == "c" ? "scn" : "san"), tel = dg(T.val(v == "c" ? "sct" : "sat"));
      if (!name || tel.length < 3) return T.toast("Add a name and a valid number.");
      (v == "c" ? c.contacts : c.auth).push({ id: T.uid(), name, tel, rel: v == "c" ? T.val("scr") : "authority" }); T.save(); T.render();
    },
    sosrm(v, el) { const c = cfg(), k = el.dataset.k; if (k == "c") c.contacts = c.contacts.filter((p) => p.id != v); else c.auth = c.auth.filter((p) => p.id != v); T.save(); T.render(); },
    async sospick(v) { try { const r = await N.pickContact(); if (r && r.tel) { cfg().contacts.push({ id: T.uid(), name: r.name || "Contact", tel: dg(r.tel), rel: "" }); T.save(); T.render(); } } catch (e) { /* cancelled */ } },
    soscty(v) { cfg().country = v; T.save(); T.render(); },
    soscm(v) { cfg().callMode = v; T.save(); T.render(); },
    sosdelay(v) { cfg().delay = +v; T.save(); T.render(); },
    sosmedon() { keepMed(); cfg().medOn = !cfg().medOn; T.save(); T.render(); },
    sosmed() { keepMed(); T.save(); T.toast("Saved"); },
    sostimer(v) { timerStart(+v); }, sostimerstop() { timerStop(); T.toast("Glad you are safe."); },
    sosfake(v) { fakeCall(+v, T.val("sfn")); },
    sosshake() { const c = cfg(); c.shake = !c.shake; T.save(); T.render(); if (c.shake && typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => { }); },
    fakeans() {
      clearInterval(ring); const st = cfg().st; st.ans = true; paint(); const t0 = Date.now();
      clearInterval(fakeClk); fakeClk = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000), e = $("#fclock"); if (e) e.textContent = T.pad(Math.floor(s / 60)) + ":" + T.pad(s % 60); }, 1000);
      try { const u = new SpeechSynthesisUtterance("Hey, where are you? Everyone is waiting for you. Please come right now, it is important."); u.rate = 0.95; setTimeout(() => speechSynthesis.speak(u), 900); } catch (e) { /* optional */ }
    },
    fakeend() { fakeStop(); }
  });

  // events from the command bar ("SOS", "fake call", "I'm walking home, check in 20 minutes")
  T.on("sos:start", start);
  T.on("sos:fake", (c) => fakeCall(c.at ? Math.max(1, Math.round((c.at - Date.now()) / 1000)) : 10, c.name ? c.name.replace(/\b\w/g, (x) => x.toUpperCase()) : ""));
  T.on("sos:timer", (m) => { T.go("safety"); timerStart(m); });

  // ------------------------------------------------------------ the floating SOS button
  function fab() {
    const f = $("#sosfab");
    f.innerHTML = S().ok && !cfg().st ? `<button class="sosfab" data-a="sosstart" aria-label="Emergency SOS">SOS</button>` : "";
  }
  T.on("render", () => { fab(); const c = cfg(); if (c.st && c.st.phase == "count" && !cd) { c.st = null; } paint(); });
  T.on("boot", () => { const c = cfg(); c.st = null; paint(); fab(); T.on("resume", () => { if (cfg().timer && cfg().timer.end < Date.now() - 3e5) { cfg().timer = null; T.save(); } }); });
  setInterval(() => { const tm = cfg().timer; if (tm && T.ui.tab == "safety") T.render(); }, 60000);
});
