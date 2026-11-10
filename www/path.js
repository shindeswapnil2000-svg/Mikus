/* Path: an interview-led career plan for PhD, postdoc and professorship. It knows which stage you are in, advances when
   the stage is done, lays out the next one, and stays editable and versioned. Explore shows funding, programmes,
   supervisors, visas and citizenship for the stage you are in. */
(window.TMX = window.TMX || []).push(function (T) {
  "use strict";
  const { esc, N } = T;
  const S = () => T.S();
  const K = window.KB;
  const $ = (s) => document.querySelector(s);
  const DAY = 864e5, MO = 30.4 * DAY;

  const pp = () => {
    const s = S();
    const d = ({ a: {}, qa: [], stage: 0, ms: [], hist: [], done: false, ver: 1, look: {}, cv: [], net: [], q: 0, started: 0, vnote: "" }); s.pp = s.pp || {}; Object.keys(d).forEach((k) => { if (!(k in s.pp)) s.pp[k] = d[k]; });
    return s.pp;
  };
  const A = () => pp().a;

  // ------------------------------------------------------------ the interview
  const CO = { "United States": "US", "United Kingdom": "UK", "Canada": "CA", "Germany": "DE", "Netherlands": "NL", "Nordics": "SE", "Australia": "AU", "Switzerland": "CH" };
  const Q = [
    { k: "stage", t: "choice", q: "Where are you right now?", help: "This sets your starting stage.", o: ["Final-year undergraduate", "Finished undergraduate", "Doing a Master's or MPhil", "Finished a Master's or MPhil", "Working outside academia", "Working in academia (RA, teaching)", "Already in a PhD", "Finished a PhD, looking for a postdoc", "In a postdoc"] },
    { k: "deg", t: "text", q: "Your degrees and discipline so far", help: "For example: BA Sociology, MA Political Science. Include the university." },
    { k: "grade", t: "text", q: "Your grades, roughly", help: "CGPA, percentage or class. Rough is fine. It matters for funding." },
    { k: "interest", t: "text", q: "What do you want to understand? In your own words.", help: "Two or three sentences. It does not have to be polished. For example: how hatred between neighbours is made and unmade, and what that does to young people, friendship and kinship in India." },
    { k: "sites", t: "text", q: "Where would you do the research?", help: "Places, communities, online spaces. For example: Gujarat, Delhi, a diaspora in the UK, WhatsApp groups." },
    { k: "methods", t: "multi", q: "Which methods appeal to you?", o: ["Ethnography", "Interviews", "Archival and historical", "Surveys", "Digital and online", "Computational text analysis", "Visual and film", "Mixed methods"] },
    { k: "langs", t: "text", q: "Languages you speak, read or can learn", help: "For example: English, Hindi, Marathi, Urdu." },
    { k: "output", t: "multi", q: "What have you produced so far?", o: ["Nothing published yet", "Blog or magazine pieces", "Conference talk or poster", "Peer-reviewed article", "Book chapter or review", "A thesis or long essay"] },
    { k: "exp", t: "multi", q: "Experience you have", o: ["Research assistant", "Teaching assistant", "NGO or fieldwork", "Journalism", "Policy or think tank", "None yet"] },
    { k: "countries", t: "multi", q: "Which countries would you consider for the PhD?", help: "Pick all that appeal. You can change this later.", o: ["United States", "United Kingdom", "Canada", "Germany", "Netherlands", "Nordics", "Australia", "Switzerland", "Open to anything"] },
    { k: "intake", t: "choice", q: "When do you want to start?", o: ["Autumn 2027", "Autumn 2028", "Autumn 2029", "Not sure yet"] },
    { k: "funding", t: "choice", q: "How much funding do you need?", o: ["Fully funded or I cannot go", "Prefer funded, partial is acceptable", "I can self-fund part of it"] },
    { k: "tests", t: "multi", q: "Tests and documents", o: ["IELTS or TOEFL done", "GRE done", "None yet", "Passport ready", "Transcripts ready"] },
    { k: "settle", t: "choice", q: "What do you hope for long term?", help: "Be honest. It changes the visa and citizenship advice.", o: ["Settle abroad permanently", "Work abroad, maybe return later", "Return to India after the PhD", "Undecided"] },
    { k: "cit", t: "multi", q: "What matters about citizenship?", o: ["Keeping Indian citizenship matters", "OCI card is fine", "Want a second passport", "Do not mind giving it up", "Have not thought about it"] },
    { k: "risk", t: "choice", q: "How do you feel about researching hate politics in India under your own name?", help: "This is a real consideration. Scholars of this subject are sometimes harassed or refused entry.", o: ["Comfortable", "Cautious: I would anonymise and protect sources", "I prefer to study it from abroad", "Not sure"] },
    { k: "planb", t: "multi", q: "Other careers you would be happy in", o: ["Policy or think tank", "Rights or NGO work", "Journalism", "Teaching", "Research in industry (trust and safety)", "Only academia"] },
    { k: "refs", t: "text", q: "Who could write you strong references?", help: "Names and roles are enough. If nobody yet, say so. That is the most fixable gap." },
    { k: "limits", t: "text", q: "Anything that limits your choices?", help: "Family, health, money, a partner, location, safety. I will plan around it." },
    { k: "extra", t: "text", q: "Anything else I should know?", help: "Fears, hopes, a professor who inspires you, a deadline you already know about." }
  ];
  const ans = (k) => A()[k];
  const has = (k, v) => (Array.isArray(ans(k)) ? ans(k).includes(v) : ans(k) == v);

  // ------------------------------------------------------------ stages
  const STG = [
    ["Foundations", "Build the profile that gets you admitted."], ["Applications", "Apply to programmes and funding."], ["Decide and move", "Compare offers, sort the visa and money, arrive."],
    ["PhD: coursework and proposal", "Learn the craft, build your committee, defend a proposal."], ["PhD: fieldwork", "Collect your data, safely and ethically."], ["PhD: writing and job market", "Finish, publish, and plan what comes next."],
    ["Postdoc", "Turn the thesis into articles and a book, and win your own funding."], ["Faculty search", "Land a lectureship or tenure-track post."], ["Professor track", "Earn tenure, lead, mentor."]
  ];
  const startStage = () => ({ "Already in a PhD": 3, "Finished a PhD, looking for a postdoc": 6, "In a postdoc": 7 }[ans("stage")] || 0);
  const intakeYear = () => { const m = String(ans("intake") || "").match(/\d{4}/); return m ? +m[0] : new Date().getFullYear() + 2; };
  const D = () => new Date(intakeYear() - 1, 11, 1).getTime();
  const monthsToD = () => Math.max(1, (D() - Date.now()) / MO);
  const cs = () => (ans("countries") || []).map((c) => CO[c]).filter(Boolean);
  const canon = () => (T.readCount ? T.readCount() : 0);
  const pubsN = () => ((S().pub || {}).items || []).filter((x) => x.stage == "published").length;

  // m(title, why, when, required, auto): `when` in months, before D for stages 0 and 1, after now for later stages
  function gen(st) {
    const out = [], a = ans, scale = st <= 1 ? Math.min(1, monthsToD() / 12) : 1;
    const m = (t, why, w, req, auto) => out.push({ id: T.uid(), st, t, why, due: 0, w, req: req !== false, auto: auto || "", done: false });
    if (st == 0) {
      m("Write your research question in one page: what, where, why now", "Everything else hangs on this. Admissions committees read it first.", -11);
      m("Read 15 core works from the Scholar canon and write a one-line argument for each", "Your fluency in the field is what a supervisor tests in an interview.", -9, true, "canon15");
      m("Write a 3,000 to 5,000 word writing sample on your topic", "Most programmes want one. It is the heaviest part of an application.", -7);
      m("Put one short piece into the world: a blog post, review or conference abstract", "Evidence that you finish things. Use the Publish tab in Radar.", -6, true, "pub1");
      m("Shortlist 12 to 15 programmes and 8 to 10 supervisors", "Fit with a supervisor decides more than rankings. See Explore.", -6);
      if (has("tests", "None yet") || !has("tests", "IELTS or TOEFL done")) m("Sort the English test and check whether the GRE is needed", "Rules differ by programme. Check each one rather than assume.", -6, false);
      m("Share your work with two possible referees", "A reference from someone who has read your work is worth far more than a title.", -5);
      m("Get method experience: a pilot interview project or fieldwork", "Shows you can do the work, not just read about it.", -5, false);
      m("Plan your money: funded routes, application costs, savings", "Use Life, Money. Fully funded options change what you need to save.", -4);
    } else if (st == 1) {
      if (cs().some((c) => ["UK", "CA", "SE", "NL", "DE", "CH", "AU"].includes(c))) m("Email prospective supervisors (UK, Canada and most of Europe expect it)", "Short, specific and attached to a real idea. Name one of their papers.", -3.5);
      if (cs().includes("US")) m("Check each US programme: funding for all admits, GRE policy, deadline", "Most research programmes fund admitted PhDs, but verify per programme.", -4);
      if (cs().some((c) => ["NL", "SE", "DE"].includes(c))) m("Set alerts for advertised PhD posts (EURAXESS, AcademicPositions)", "In these countries the PhD is a job. You apply to a posted project.", -4, false);
      m("Draft the statement of purpose and research proposal (version 1)", "Aim for one idea, one method, one reason you.", -3);
      m("Polish the writing sample", "Cut it by a fifth, then reread it aloud.", -2);
      m("Ask referees with a brief, your CV and a draft statement", "Give them six weeks and a gentle reminder at two.", -2.5);
      m("Apply to funding schemes that run alongside the applications", "See Explore, Funding. Many deadlines are earlier than programme deadlines.", -2);
      m("Mentor feedback on the statement", "Two readers, one who knows your field and one who does not.", -1.2);
      m("Submit every application and log the receipts", "Do it two days early. Portals fail on deadline day.", -0.1);
      m("Prepare for interviews", "Be ready to explain your question in 90 seconds and your method in three minutes.", 0.5, false);
    } else if (st == 2) {
      m("Compare offers on funding, supervisor, cohort and location", "Write down what each offer really costs and pays over the full length.", 0.5);
      m("Ask about funding length, teaching load and start date", "It is normal to ask. Do it politely and in writing.", 0.7);
      m("Accept one offer by its deadline and decline the others kindly", "Many US offers have an April decision day.", 1);
      m("Start the visa: documents, proof of funds, accommodation", "Check the official site. Rules change.", 1.5);
      m("Plan your first-month budget and relocation costs", "Use Life, Money.", 2);
      m("Write to your future supervisor about the first-year reading", "Show up prepared.", 2.5, false);
      m("Arrive, register, and meet your cohort", "Make two friends outside your department as well.", 4);
    } else if (st == 3) {
      m("Choose your supervisor and committee deliberately", "They are the people who will decide your career. Pick for support as well as prestige.", 3);
      m("Finish coursework and keep a reading file", "Your notes become your literature review.", 12);
      m("Do methods and ethics training", "You will need approval before fieldwork.", 6);
      m("Write your proposal and pass qualifying exams", "This is the gate to fieldwork.", 18);
      m("Apply for fieldwork funding (for example Wenner-Gren)", "Apply a year before you go.", 15);
      m("Turn one course paper into an article draft", "A first publication before fieldwork helps the job market years later.", 12, false);
    } else if (st == 4) {
      m("Get ethics approval and write a data-management plan", "Protect people first. This is not a formality.", 1);
      m("Write a risk plan: digital safety, safe contacts, exit route, check-in routine", "Set up Safety here: contacts, timer, SOS. Research on hate politics carries real risk.", 1);
      m("Secure permissions, affiliation and visa for the field", "Foreign scholars of India sometimes face restrictions. Plan early.", 2);
      m("Keep daily fieldnotes and back them up weekly", "Encrypted, in two places.", 12);
      m("Present early findings at a conference or workshop", "Comments now save you a year later.", 8, false);
      m("Close the field well: thank people, plan to return findings", "Ethics of leaving.", 14);
    } else if (st == 5) {
      m("Set a chapter schedule: one a quarter", "Write badly first. Edit later.", 3);
      m("Submit one or two peer-reviewed articles", "Journal articles are the currency of the job market.", 12);
      m("Present at two conferences", "Meet the people who will read your applications.", 12, false);
      m("Build a teaching portfolio", "Syllabi, evaluations, a short statement.", 12);
      m("Plan postdoc applications 12 to 18 months before the defence", "See Explore, Funding for postdoc schemes.", 9);
      m("Defend the thesis", "Prepare with mock vivas.", 20);
    } else if (st == 6) {
      m("Turn the thesis into two or three articles and a book proposal", "Publishers want a proposal, not a thesis.", 6);
      m("Outline your second project", "Show you are more than your dissertation.", 6);
      m("Win a grant of your own", "See Explore, Funding. Early-career grants matter for faculty applications.", 12, false);
      m("Teach a course you designed", "Search committees ask about it.", 9, false);
      m("Plan your residence status for the next five years", "Postdoc visas end. Check long-term routes in Explore, Visa.", 6);
    } else if (st == 7) {
      m("Prepare job materials: CV, research and teaching statements, three letters", "Start in summer for autumn ads.", 3);
      m("Apply widely in the main season (usually September to January)", "Look at lectureships and assistant professor posts.", 5);
      m("Rehearse the job talk and the interview", "Twenty minutes aloud, with a hostile friend.", 6);
      m("Negotiate: salary, start-up, teaching load, visa sponsorship", "Ask about immigration support early.", 8);
    } else {
      m("Build the tenure file: articles, book, teaching, service", "Know the criteria in writing.", 6);
      m("Land a book contract and one major grant", "These carry the file.", 24, false);
      m("Mentor students and build a lab or reading group", "Your reputation is made there.", 12, false);
      m("Decide on permanent residence and citizenship", "Check current rules in Explore, Visa. India does not allow dual citizenship.", 12);
    }
    const now = Date.now();
    out.forEach((x, i) => {
      if (st <= 1) { let d = D() + x.w * scale * MO; if (d < now + 3 * DAY * (i + 1)) d = now + (3 + i * 5) * DAY; x.due = d; } else x.due = now + x.w * MO;
      x.due = new Date(x.due).setHours(9, 0, 0, 0);
    });
    return out.sort((a, b) => a.due - b.due);
  }

  function autoCheck(m) {
    if (m.auto == "canon15" && canon() >= 15) return true;
    if (m.auto == "pub1" && (pubsN() >= 1 || (S().op || []).some((o) => o.kind == "conf" && ["submitted", "done"].includes(o.status)))) return true;
    return false;
  }
  const mine = () => pp().ms.filter((x) => x.st == pp().stage);
  function sync() {
    const P = pp(); let ch = false;
    P.ms.forEach((m) => { if (!m.done && m.auto && autoCheck(m)) { m.done = true; ch = true; } });
    if (ch) T.save();
    return ch;
  }
  function stageDone() { const g = mine().filter((x) => x.req); return g.length && g.every((x) => x.done); }
  function advance(manual) {
    const P = pp(); if (P.stage >= 8) return;
    const from = P.stage; P.stage++;
    P.ms = P.ms.filter((x) => x.st >= P.stage || x.done).concat(gen(P.stage));
    P.log = (P.log || []).concat([{ t: Date.now(), x: STG[from][0] + " complete" + (manual ? " (marked by you)" : "")  }]);
    T.logA("path", "Stage complete: " + STG[from][0] + ". Now: " + STG[P.stage][0]);
    T.save(); T.ui.celebrate = from; T.render();
    T.fire("stage", P.stage);
  }
  function newPlan(note) {
    const P = pp();
    if (P.ms.length) P.hist.unshift({ v: P.ver, at: Date.now(), note: P.vnote || "Initial plan", ms: JSON.parse(JSON.stringify(P.ms)), stage: P.stage });
    P.hist = P.hist.slice(0, 8); P.ver++; P.vnote = note || "Rebuilt from your answers";
    const keep = P.ms.filter((x) => x.done), fresh = gen(P.stage).filter((n) => !keep.some((k) => k.st == n.st && k.t == n.t));
    P.ms = keep.concat(fresh); T.save();
  }

  // ------------------------------------------------------------ numbers other modules read
  T.profileLine = () => { const a = A(); return a.interest ? `${a.stage || "researcher"}; ${a.deg || ""}; research interest: ${a.interest}` : "a student and researcher in social science"; };
  T.pathLine = () => { const P = pp(); if (!P.done) return "interview not completed yet"; const n = mine().filter((x) => !x.done).sort((a, b) => a.due - b.due)[0]; return `stage ${STG[P.stage][0]} (v${P.ver}); countries ${(ans("countries") || []).join(", ")}; intake ${ans("intake")}; funding need: ${ans("funding")}; long term: ${ans("settle")}; readiness ${readiness()}%; next: ${n ? n.t : "stage complete"}`; };
  T.pathKeywords = () => String(ans("interest") || "").split(/\W+/).filter((w) => w.length > 4).slice(0, 12);
  T.pathMs = () => (pp().done ? mine().filter((x) => !x.done).slice(0, 4).map((x) => ({ t: x.t, due: x.due })) : []);
  T.pathNext = () => { if (!pp().done) return null; const n = mine().filter((x) => !x.done).sort((a, b) => a.due - b.due)[0]; if (!n) return null; const d = Math.ceil((n.due - Date.now()) / DAY); return d <= 14 ? { soon: `Plan step due ${d < 0 ? "now" : "in " + d + " days"}: ${n.t}` } : null; };
  function readiness() {
    const g = mine(), done = g.filter((x) => x.done).length, base = g.length ? done / g.length : 0;
    return Math.round(Math.min(100, base * 60 + Math.min(1, canon() / 30) * 20 + Math.min(1, pubsN() / 2) * 20));
  }

  // ------------------------------------------------------------ live lookup (web search through the Anthropic API) with honest fallbacks
  async function webAsk(key, prompt) {
    const s = S(), P = pp(); T.ui.pl = key; T.render();
    try {
      let text = "", srcs = [];
      if (s.key) {
        const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": s.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: s.model, max_tokens: 1800, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }], system: "You research academic careers for an Indian social scientist. Use web search. Prefer official university, funder and government pages. State deadlines with their year. If you cannot confirm something, say so plainly. Be concise: short bullets, then the official URLs. Do not invent.", messages: [{ role: "user", content: prompt }] }) });
        const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || "Error " + r.status);
        (j.content || []).forEach((b) => { if (b.type == "text") { text += b.text; (b.citations || []).forEach((c) => c.url && srcs.push({ t: c.title || c.url, u: c.url })); } });
      } else {
        text = "From memory, not live. Verify everything on the official page.\n\n" + await T.ai([{ role: "user", content: prompt + "\n\nYou cannot browse right now. Answer from what you know, mark anything that may be out of date, and say what to check." }], T.mentorSys(), 1000);
      }
      const seen = {}; srcs = srcs.filter((x) => !seen[x.u] && (seen[x.u] = 1)).slice(0, 8);
      P.look[key] = { t: Date.now(), x: text.trim(), s: srcs, live: !!s.key }; T.save();
    } catch (e) { T.toast(T.errMsg(e)); }
    T.ui.pl = null; T.render();
  }
  const look = (key) => { const l = pp().look[key]; if (!l) return ""; return `<div class="card jcard"><div class="row sm"><b style="color:${l.live ? "var(--grn)" : "var(--amb)"}">${l.live ? "Live from the web" : "From memory, verify"}</b><span class="soft">${new Date(l.t).toLocaleDateString()}</span></div><p style="white-space:pre-wrap;margin:8px 0">${esc(l.x)}</p>${l.s.length ? `<div class="sm soft">Sources</div>${l.s.map((x) => `<div class="sm"><a href="${esc(x.u)}" target="_blank" rel="noopener" data-a="scopen" data-v="${esc(x.u)}">${esc(x.t.slice(0, 70))}</a></div>`).join("")}` : ""}</div>`; };
  const lookBtn = (key, prompt, lab) => `<button class="chip" data-a="plook" data-k="${esc(key)}" data-v="${esc(prompt)}">${T.ui.pl == key ? "Searching..." : lab || "Latest details"}</button>`;
  const gsearch = (q) => "https://www.google.com/search?q=" + encodeURIComponent(q);
  const lnk = (u, l) => `<a class="chip" style="text-decoration:none" href="${esc(u)}" target="_blank" rel="noopener" data-a="scopen" data-v="${esc(u)}">${l}</a>`;
  const who = () => `I am an Indian citizen, ${ans("deg") || "a social science graduate"}, interested in ${ans("interest") || "anthropology"}.`;

  // ------------------------------------------------------------ screens
  const SEG = [["plan", "Plan"], ["explore", "Explore"], ["profile", "Profile"]];
  function path() {
    const P = pp();
    if (!P.done) return interview();
    sync();
    const sub = T.ui.pt || "plan";
    return `<h2 style="margin-bottom:4px">Path</h2><p class="soft sm" style="margin-top:0">PhD, postdoc, professor. One stage at a time.</p><div class="seg">${SEG.map(([k, l]) => `<button class="${sub == k ? "on" : ""}" data-a="ptab" data-v="${k}">${l}</button>`).join("")}</div>${({ plan, explore, profile })[sub]()}`;
  }
  T.view("path", path);

  function interview() {
    const P = pp(), i = Math.min(P.q, Q.length - 1), q = Q[i], v = ans(q.k);
    if (!P.started) return `<div class="card hero pathhero"><div class="eyebrow">Your career, planned properly</div><h2 style="margin:8px 0">Let me interview you.</h2><p>${Q.length} questions, about ten minutes. I will use your answers to build a plan for the PhD, the postdoc and the professorship, show you programmes, supervisors, funding, visas and citizenship routes, and move you on stage by stage. You can change any answer later and I will revise the plan.</p><button class="btn" data-a="pstart">Begin</button><p class="sm soft" style="margin:10px 0 0">Answers stay on this phone. They are sent to the AI engine only when you ask it for help.</p></div>`;
    const body = q.t == "text" ? `<textarea id="pa" placeholder="Type here" style="min-height:110px;margin-top:10px">${esc(v || "")}</textarea>` : `<div class="chips" style="margin-top:12px;gap:10px">${q.o.map((o) => `<button class="chip big ${(Array.isArray(v) ? v.includes(o) : v == o) ? "on" : ""}" data-a="pans" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    return `<div class="bar" style="margin-bottom:14px"><i style="width:${(i + 1) / Q.length * 100}%"></i></div><div class="sm soft">Question ${i + 1} of ${Q.length}</div>
      <div class="card hero pathhero"><h2 style="margin:4px 0 6px;line-height:1.2">${esc(q.q)}</h2>${q.help ? `<p class="sm" style="margin:0">${esc(q.help)}</p>` : ""}${body}</div>
      <div class="row" style="gap:10px"><button class="btn gh" data-a="pprev" ${i == 0 ? "disabled" : ""}>Back</button><button class="btn" data-a="pnext">${i == Q.length - 1 ? "Build my plan" : "Next"}</button></div><div class="chips" style="margin-top:10px"><button class="chip" data-a="pnext" data-v="skip">Skip this one</button></div>`;
  }

  function ladder() {
    const P = pp();
    return `<div class="ladder">${STG.map((s, i) => `<div class="rung ${i < P.stage ? "past" : i == P.stage ? "now" : ""}"><i>${i < P.stage ? "&#10003;" : i + 1}</i><span>${esc(s[0].replace("PhD: ", ""))}</span></div>`).join("")}</div>`;
  }

  function plan() {
    const P = pp(), ms = mine().sort((a, b) => a.due - b.due), done = ms.filter((x) => x.done).length, st = STG[P.stage], rd = readiness();
    if (!P.ms.length) { P.ms = gen(P.stage); P.vnote = "Initial plan"; T.save(); return plan(); }
    const tight = P.stage <= 1 && D() - Date.now() < 5 * MO;
    return `${T.ui.celebrate != null ? `<div class="card hero celeb"><div class="eyebrow">Stage complete</div><h2 style="margin:6px 0">${esc(STG[T.ui.celebrate][0])} done.</h2><p style="margin:0">Next: <b>${esc(st[0])}</b>. I have laid out its plan below. Edit anything.</p><button class="chip" data-a="pcel" style="margin-top:10px">Got it</button></div>` : ""}
      ${ladder()}
      <div class="card hero pathhero"><div class="row" style="align-items:flex-start"><div><div class="eyebrow">Stage ${P.stage + 1} of 9</div><h2 style="margin:4px 0">${esc(st[0])}</h2><div class="sm">${esc(st[1])}</div></div><div style="text-align:center"><svg viewBox="0 0 72 72" width="72" height="72"><circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="7"/><circle cx="36" cy="36" r="30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="${rd / 100 * 188.5} 189" transform="rotate(-90 36 36)"/><text x="36" y="42" text-anchor="middle" font-size="17" font-family="Anton,Impact" fill="#fff">${rd}</text></svg><div class="sm" style="font-size:10px">ready</div></div></div>
        <div class="bar" style="margin:10px 0 4px"><i style="width:${ms.length ? done / ms.length * 100 : 0}%;background:#fff"></i></div><div class="sm">${done} of ${ms.length} steps · plan v${P.ver}</div>${tight ? `<p class="sm" style="margin:8px 0 0">Heads up: the ${ans("intake") || "intake"} deadline is under five months away. A strong application takes longer than that to build. Consider ${intakeYear() + 1} for a better outcome, and use these months to build the profile. I have compressed the plan either way.</p>` : ""}</div>
      ${ms.map((m) => `<div class="step ${m.done ? "dn" : ""}"><button class="tick ${m.done ? "on" : ""}" data-a="pms" data-v="${m.id}" aria-label="Toggle">${m.done ? "&#10003;" : ""}</button><div style="flex:1;min-width:0"><div style="${m.done ? "text-decoration:line-through;opacity:.6" : ""}">${esc(m.t)}${m.req ? "" : ' <span class="tag">optional</span>'}${m.auto ? ' <span class="tag">auto</span>' : ""}</div><div class="sm soft">${esc(m.why)}</div><div class="row" style="justify-content:flex-start;gap:8px;margin-top:6px"><input type="date" class="dt ${!m.done && m.due < Date.now() ? "late" : ""}" value="${new Date(m.due).toISOString().slice(0, 10)}" data-a="pmdate" data-v="${m.id}"><button class="chip" data-a="pmtask" data-v="${m.id}">Make it a task</button><button class="chip" data-a="pmdel" data-v="${m.id}" aria-label="Delete">&#10005;</button></div></div></div>`).join("")}
      <div class="card"><div class="row" style="gap:8px"><input id="pmn" placeholder="Add your own step" data-enter="pmadd"><button class="btn s" data-a="pmadd">Add</button></div>${stageDone() ? `<button class="btn" style="margin-top:12px" data-a="padv">Stage complete. Move to ${esc(STG[Math.min(8, P.stage + 1)][0])}</button>` : `<div class="chips" style="margin-top:10px"><button class="chip" data-a="padv" data-v="manual">Mark this stage complete anyway</button></div>`}</div>
      <div class="card"><div class="eyebrow">Revise the plan</div><p class="sm soft" style="margin:6px 0">Things changed? Tell me, and I will keep a version you can go back to.</p><textarea id="pvn" placeholder="What changed? (a new country, a missed deadline, a new interest, health, money)" style="min-height:64px"></textarea><div class="chips" style="margin-top:8px"><button class="chip on" data-a="prev">Save as a new version</button><button class="chip" data-a="pcrit">${T.ui.pcr ? "Thinking..." : "Ask " + esc(T.jvName ? T.jvName() : "Jarvis") + " to critique this plan"}</button></div>
        ${P.crit ? `<p class="sm" style="white-space:pre-wrap;margin:10px 0 0">${esc(P.crit)}</p>` : ""}
        ${P.stage > 0 ? `<div class="chips" style="margin-top:10px"><button class="chip" data-a="pback">Go back a stage</button></div>` : ""}
        ${P.hist.length ? `<div class="sm soft" style="margin-top:10px">Earlier versions</div>${P.hist.map((h, i) => `<div class="row sm" style="margin:6px 0"><span>v${h.v} · ${new Date(h.at).toLocaleDateString()} · ${esc(h.note)}</span><button class="chip" data-a="prestore" data-v="${i}">Restore</button></div>`).join("")}` : ""}</div>`;
  }

  // ---- Explore
  const ESEG = [["fund", "Funding"], ["prog", "Programmes"], ["sup", "Supervisors"], ["visa", "Visa and life"]];
  function explore() {
    const sub = T.ui.pe || "fund";
    return `<div class="chips" style="margin-bottom:12px">${ESEG.map(([k, l]) => `<button class="chip ${sub == k ? "on" : ""}" data-a="pesub" data-v="${k}">${l}</button>`).join("")}</div>${({ fund, prog, sup, visa })[sub]()}`;
  }
  const cflt = () => { const c = T.ui.pc; return c ? [c] : cs().length ? cs() : Object.keys(K.CTRY); };
  const ctry = () => `<div class="chips" style="margin-bottom:10px"><button class="chip ${!T.ui.pc ? "on" : ""}" data-a="pcty" data-v="">My countries</button>${Object.keys(K.CTRY).map((c) => `<button class="chip ${T.ui.pc == c ? "on" : ""}" data-a="pcty" data-v="${c}">${c}</button>`).join("")}</div>`;
  function fund() {
    const st = pp().stage, lv = st <= 2 ? ["phd"] : st <= 5 ? ["phd", "postdoc"] : st <= 7 ? ["postdoc", "faculty"] : ["faculty"], cf = cflt();
    const L = K.FUND.filter((f) => lv.includes(f.lv) && (f.w.includes("any") || f.w.some((w) => cf.includes(w) || (w == "EU" && cf.some((c) => ["DE", "NL", "SE", "CH"].includes(c))))));
    return `<p class="sm soft">Showing ${lv.join(" and ")} funding for ${T.ui.pc || "your countries"}. Deadlines and eligibility change every year, so use the official page.</p>${ctry()}
      <div class="chips" style="margin-bottom:10px">${lookBtn("fund:" + st, `${who()} List the main fully funded or well funded routes for a ${lv[0]} in anthropology or sociology in ${(T.ui.pc ? [T.ui.pc] : cs()).join(", ") || "Europe, UK, US, Canada"} with their next deadlines, eligibility for Indian citizens, and what they cover.`, "Search the latest funding")}</div>${look("fund:" + st)}
      ${L.map((f) => `<div class="card"><b>${esc(f.n)}</b><div class="sm soft">${esc(f.w.join(", "))} · ${esc(f.lv)}</div><p class="sm" style="margin:6px 0"><b>Covers:</b> ${esc(f.cov)}<br><b>Who:</b> ${esc(f.who)}<br><b>When:</b> ${esc(f.win)}</p><div class="chips">${lnk(f.u, "Official page")}<button class="chip" data-a="pfradar" data-v="${f.id}">Add to Radar</button>${lookBtn("f:" + f.id, `Latest call, deadline and eligibility for ${f.n} for an Indian citizen. Official page only.`, "Latest call")}</div>${look("f:" + f.id)}</div>`).join("") || '<div class="card"><p class="sm soft" style="margin:0">Nothing listed for that filter. Try another country, or search the latest funding above.</p></div>'}`;
  }
  function prog() {
    const cf = cflt(), L = K.UNIS.filter((u) => cf.includes(u[1]));
    return `<p class="sm soft">Seeds, not a ranking. Fit with a supervisor and funding decide more than rank. Check each programme's own page.</p>${ctry()}<div class="chips" style="margin-bottom:10px">${lookBtn("prog", `${who()} Which anthropology or sociology PhD programmes (with strengths in South Asia, religion, nationalism, violence, youth or kinship) accept applications for ${ans("intake") || "the next intake"} in ${cs().join(", ") || "the US, UK, Canada, Germany, Netherlands"}? Give each programme's deadline, funding position, and who works on related topics.`, "Search programmes for my intake")}</div>${look("prog")}
      ${L.map((u) => `<div class="card"><b>${esc(u[0])}</b><div class="sm soft">${esc(K.CTRY[u[1]].n)}</div><p class="sm" style="margin:6px 0">${esc(u[2])}</p><div class="chips">${lnk(gsearch(u[0] + " PhD anthropology admissions funding"), "Admissions")}<button class="chip" data-a="pugo" data-v="${esc(u[0])}" data-k="${u[1]}">Add as a target</button>${lookBtn("u:" + u[0], `Latest PhD admissions facts for ${u[0]} in anthropology or sociology: deadline for ${ans("intake") || "next intake"}, funding for international students, requirements (GRE, writing sample, references), and faculty working on South Asia, nationalism, religion, violence or kinship.`)}</div>${look("u:" + u[0])}</div>`).join("")}`;
  }
  function sup() {
    const f = pp().fin;
    return `<p class="sm soft">Read before you write. Affiliations move, so confirm each person's current page before you email.</p>
      <div class="card"><div class="eyebrow">Who publishes on your topics right now</div><p class="sm soft" style="margin:6px 0">Searches recent papers and counts the authors, with their institutions.</p><div class="chips"><button class="chip on" data-a="pfind">${T.ui.pfind ? "Searching..." : "Find active researchers"}</button>${lookBtn("sup", `${who()} Who are the leading and early-career scholars of ${ans("interest") || "hate, anti-minority politics and Hindu nationalism in India"} who currently supervise PhD students? For each: current institution, topic, a recent book or article, and whether they are in ${cs().join(", ") || "the countries I listed"}.`, "Search the web")}</div>${look("sup")}
      ${f && f.length ? f.map((r) => `<div class="row sm" style="margin:8px 0;align-items:flex-start"><span><b>${esc(r.n)}</b> <span class="soft">${esc(r.i || "")}${r.c ? " · " + esc(r.c) : ""}</span><br><span class="soft">${r.k} paper${r.k > 1 ? "s" : ""} on your topics</span></span>${lnk(gsearch(r.n + " " + (r.i || "") + " anthropology"), "Profile")}</div>`).join("") : ""}</div>
      ${K.SCHOLARS.map((s) => `<div class="card"><b>${esc(s[0])}</b><div class="sm soft">${esc(s[1])}</div><p class="sm" style="margin:6px 0">${esc(s[2])}</p><div class="chips">${lnk("https://scholar.google.com/scholar?q=" + encodeURIComponent('author:"' + s[0] + '"'), "Their work")}<button class="chip" data-a="pemail" data-v="${esc(s[0])}" data-k="${esc(s[2])}">Draft an email</button><button class="chip" data-a="pnet" data-v="${esc(s[0])}" data-k="${esc(s[1])}">Add to my network</button></div></div>`).join("")}`;
  }
  const LAD = [["Study visa", "The permit for the PhD itself"], ["After the degree", "Time to look for work after you finish"], ["Researcher or skilled worker", "For postdocs and lecturers"], ["Long-term residence", "Permanent residence or settlement"], ["Citizenship", "Naturalisation"]];
  function visa() {
    const st = pp().stage, cur = st <= 3 ? 0 : st <= 5 ? 1 : st == 6 ? 2 : st == 7 ? 3 : 4, cf = cs().length ? cs() : ["US", "UK", "CA"], c = T.ui.pv && K.CTRY[T.ui.pv] ? T.ui.pv : cf[0] || "US", C = K.CTRY[c];
    return `<p class="sm soft">General routes, not legal advice. Rules change often, so confirm on the official site, and talk to the university's international office.</p><div class="chips" style="margin-bottom:10px">${Object.keys(K.CTRY).map((k) => `<button class="chip ${c == k ? "on" : ""}" data-a="pvis" data-v="${k}">${K.CTRY[k].n}</button>`).join("")}</div>
      <div class="ladder v">${LAD.map((l, i) => `<div class="rung ${i < cur ? "past" : i == cur ? "now" : ""}"><i>${i + 1}</i><span><b>${l[0]}</b><br><small>${l[1]}</small></span></div>`).join("")}</div>
      <div class="card"><h3>${esc(C.n)}</h3><p class="sm"><b>The PhD.</b> ${esc(C.ph)}</p><p class="sm"><b>Visa.</b> ${esc(C.visa)}</p><p class="sm"><b>After the degree.</b> ${esc(C.work)}</p><p class="sm"><b>Longer term.</b> ${esc(C.long)}</p><p class="sm"><b>Citizenship.</b> ${esc(C.cit)}</p><p class="sm"><b>The academic job market.</b> ${esc(C.job)}</p>
        <div class="chips">${lnk(C.u, "Official immigration site")}${lookBtn("v:" + c, `Current rules for an Indian citizen in ${C.n}: student visa for a PhD, work rights during the PhD, post-study work options for PhD graduates, researcher or skilled worker visas for postdocs and lecturers, permanent residence and citizenship timelines. Give the official source and the date the page was updated.`, "Check the current rules")}</div>${look("v:" + c)}</div>
      <div class="card"><h3>India and dual citizenship</h3><p class="sm" style="margin:0">India does not allow dual citizenship. If you take another country's citizenship you give up Indian citizenship, and can apply for an OCI card, which gives long-term visa-free entry and many rights but not voting or some jobs. Decide how much a second passport is worth to you before you plan around it.${has("cit", "Keeping Indian citizenship matters") ? " You said keeping Indian citizenship matters. That points toward long-term residence rather than naturalisation." : ""}</p></div>`;
  }

  // ---- Profile
  function profile() {
    const P = pp(), CVT = ["Education", "Experience", "Teaching", "Publication", "Talk", "Award", "Skill"];
    const deep = P.deepq;
    return `<div class="card"><div class="row"><div class="eyebrow">Your answers</div><button class="chip" data-a="predo">Redo interview</button></div>${Q.map((q, i) => { const v = ans(q.k); return v && v.length ? `<div class="kv"><b>${esc(q.q.replace(/\?$/, ""))}</b><span>${esc(Array.isArray(v) ? v.join(", ") : v)} <a href="#" data-a="pedit" data-v="${i}">edit</a></span></div>` : ""; }).join("")}</div>
      <div class="card"><div class="eyebrow">Let me ask more</div><p class="sm soft" style="margin:6px 0">Questions chosen from your answers so far. Each answer sharpens the plan.</p>${deep ? deep.map((d, i) => `<label class="l">${esc(d.q)}</label><textarea id="dq${i}" style="min-height:60px">${esc(d.a || "")}</textarea>`).join("") + '<div class="chips" style="margin-top:8px"><button class="chip on" data-a="pdsave">Save answers</button></div>' : ""}<div class="chips" style="margin-top:8px"><button class="chip" data-a="pdeep">${T.ui.pdq ? "Thinking..." : deep ? "Ask a new set" : "Ask me deeper questions"}</button></div></div>
      <div class="card"><div class="eyebrow">Academic portfolio (your CV, kept current)</div>${P.cv.map((c) => `<div class="row sm" style="margin:6px 0"><span><b>${esc(c.t)}</b> <span class="soft">${esc(c.type)} · ${esc(c.org)} ${esc(c.y)}</span></span><button class="chip" data-a="pcvd" data-v="${c.id}" aria-label="Delete">&#10005;</button></div>`).join("") || '<p class="sm soft">Add degrees, jobs, courses taught, talks, awards. This is what Jarvis drafts from.</p>'}
        <div class="chips" style="margin-top:8px">${CVT.map((t) => `<button class="chip ${(T.ui.pcv || "Education") == t ? "on" : ""}" data-a="pcvt" data-v="${t}">${t}</button>`).join("")}</div><input id="cvt" placeholder="Title (degree, role, talk title...)" style="margin-top:8px"><div class="row" style="gap:8px;margin-top:8px"><input id="cvo" placeholder="Institution"><input id="cvy" placeholder="Year" inputmode="numeric" style="max-width:90px"></div><div class="chips" style="margin-top:8px"><button class="chip on" data-a="pcva">Add</button>${P.cv.length ? '<button class="chip" data-a="pcvc">Copy as text</button>' : ""}</div></div>
      <div class="card"><div class="eyebrow">My network</div>${P.net.map((n) => `<div class="row sm" style="margin:6px 0"><span><b>${esc(n.n)}</b> <span class="soft">${esc(n.a)}</span><br><span class="soft">${n.last ? "contacted " + new Date(n.last).toLocaleDateString() : "not contacted yet"}</span></span><span><button class="chip" data-a="pnc" data-v="${n.id}">Contacted</button> <button class="chip" data-a="pnd" data-v="${n.id}" aria-label="Remove">&#10005;</button></span></div>`).join("") || '<p class="sm soft" style="margin:0">Scholars you add from Explore appear here, with when you last wrote to them.</p>'}</div>
      <div class="card red"><h3>Researching hate is risky work</h3><p class="sm" style="margin:0">Protect your sources before yourself, and yourself too. Use encrypted notes and messaging, keep a separate work phone or profile if you can, get ethics approval, never collect names you do not need, tell someone your fieldwork plan, and set up Safety here. Scholars of this subject are sometimes harassed online or refused entry to the country they study, so plan for that early.</p><div class="chips" style="margin-top:10px">${lnk("https://www.scholarsatrisk.org", "Scholars at Risk")}<button class="chip" data-a="tab" data-v="safety">Open Safety</button></div></div>`;
  }

  // ------------------------------------------------------------ actions
  const keepAns = () => { const q = Q[pp().q]; if (q && q.t == "text" && $("#pa")) A()[q.k] = $("#pa").value.trim(); };
  function finishInterview() {
    const P = pp(); P.done = true; P.stage = startStage(); P.started = P.started || Date.now(); P.ms = gen(P.stage); P.ver = 1; P.vnote = "Initial plan from your interview"; T.ui.pt = "plan";
    T.fire("jarvis:note", "Completed the career interview."); if (T.remember) { if (ans("interest")) T.remember("Research interest: " + ans("interest")); if (ans("countries")) T.remember("Considering PhD in: " + ans("countries").join(", ")); if (ans("settle")) T.remember("Long-term hope: " + ans("settle")); }
    T.logA("path", "Interview complete. Starting stage: " + STG[P.stage][0]); T.save(); T.render();
  }
  const ms = (id) => pp().ms.find((x) => x.id == id);
  T.act({
    pstart() { pp().started = Date.now(); T.save(); T.render(); },
    pans(v) { const q = Q[pp().q]; if (q.t == "multi") { const a = A()[q.k] || (A()[q.k] = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); } else A()[q.k] = v; T.save(); T.render(); },
    pnext(v) { keepAns(); const P = pp(); if (v != "skip" && Q[P.q].t == "text" && !A()[Q[P.q].k] && false) return; if (P.q >= Q.length - 1) return finishInterview(); P.q++; T.save(); T.render(); },
    pprev() { keepAns(); const P = pp(); P.q = Math.max(0, P.q - 1); T.render(); },
    ptab(v) { T.ui.pt = v; T.render(); }, pesub(v) { T.ui.pe = v; T.render(); }, pcty(v) { T.ui.pc = v; T.render(); }, pvis(v) { T.ui.pv = v; T.render(); },
    pcel() { T.ui.celebrate = null; T.render(); },
    pms(v) { const m = ms(v); m.done = !m.done; if (m.done) { T.logA("path", "Done: " + m.t); const el = document.querySelector(".tick.on"); } T.save(); if (m.done && stageDone() && pp().stage < 8) { T.toast("Stage complete. Moving on."); setTimeout(() => advance(false), 500); } T.render(); },
    pmdate(v, el) { const m = ms(v); if (el.value) { m.due = new Date(el.value + "T09:00:00").getTime(); T.save(); } },
    pmtask(v) { const m = ms(v); T.addTask(m.t, m.due, 2); T.toast("Added to Today."); },
    pmdel(v) { const P = pp(); P.ms = P.ms.filter((x) => x.id != v); T.save(); T.render(); },
    pmadd() { const t = T.val("pmn"); if (!t) return; pp().ms.push({ id: T.uid(), st: pp().stage, t, why: "Added by you", due: Date.now() + 7 * DAY, w: 0, req: true, auto: "", done: false }); T.save(); T.render(); },
    padv(v) { if (v == "manual" && !confirm("Mark this stage complete and move on?")) return; advance(v == "manual"); },
    pback() { const P = pp(); if (P.stage > 0) { P.stage--; if (!mine().length) P.ms = P.ms.concat(gen(P.stage)); T.save(); T.render(); } },
    prev() { const n = T.val("pvn"); newPlan(n || "Revised"); T.toast("Saved as plan v" + pp().ver); T.render(); },
    prestore(v) { const P = pp(), h = P.hist[+v]; if (!h) return; P.hist.unshift({ v: P.ver, at: Date.now(), note: P.vnote, ms: JSON.parse(JSON.stringify(P.ms)), stage: P.stage }); P.ms = h.ms; P.stage = h.stage; P.ver++; P.vnote = "Restored v" + h.v; T.save(); T.render(); },
    async pcrit() {
      T.ui.pcr = 1; T.render(); const P = pp();
      try { P.crit = await T.ai([{ role: "user", content: `Critique my current plan like a candid supervisor. Stage: ${STG[P.stage][0]}. Steps: ${mine().map((m) => (m.done ? "[done] " : "") + m.t + " (" + new Date(m.due).toLocaleDateString() + ")").join("; ")}. My profile: ${T.pathLine()}. In under 160 words: what is missing, what is unrealistic, what to do first this month, and one risk I am not seeing.` }], T.mentorSys(), 500); T.save(); } catch (e) { T.toast(T.errMsg(e)); }
      T.ui.pcr = 0; T.render();
    },
    predo() { if (confirm("Redo the interview? Your answers stay, and you can change them.")) { const P = pp(); P.done = false; P.q = 0; T.save(); T.render(); } },
    pedit(v) { const P = pp(); P.done = false; P.q = +v; T.save(); T.render(); },
    async pdeep() {
      T.ui.pdq = 1; T.render();
      try { const r = await T.ai([{ role: "user", content: `My answers so far: ${JSON.stringify(A())}. Earlier extra answers: ${JSON.stringify(pp().qa)}. Ask me 5 sharp questions you still need to plan my PhD, postdoc and professorship well (gaps, risks, finances, supervisors, writing sample, networks, timeline). Return ONLY a JSON array of 5 strings.` }], "You are a careful academic adviser. Output JSON only.", 400); const m = r.match(/\[[\s\S]*\]/); const a = JSON.parse(m[0]); pp().deepq = a.slice(0, 5).map((q) => ({ q: String(q), a: "" })); T.save(); } catch (e) { T.toast("I could not make questions now. Try again."); }
      T.ui.pdq = 0; T.render();
    },
    pdsave() { const P = pp(); (P.deepq || []).forEach((d, i) => { const el = $("#dq" + i); if (el) d.a = el.value.trim(); }); P.qa = P.deepq.filter((d) => d.a); T.save(); T.toast("Saved. I will use these."); if (T.remember) P.qa.forEach((d) => T.remember(d.q.replace(/\?$/, "") + ": " + d.a.slice(0, 120))); },
    plook(v, el) { webAsk(el.dataset.k, v); },
    async pfind() {
      T.ui.pfind = 1; T.render();
      try {
        const topics = (S().rs && S().rs.topics || ["Hindu nationalism"]).slice(0, 2), agg = {}, since = new Date(Date.now() - 3 * 365 * DAY).toISOString().slice(0, 10);
        for (const t of topics) {
          const u = "https://api.openalex.org/works?search=" + encodeURIComponent(t) + "&filter=from_publication_date:" + since + "&per-page=50&select=authorships" + (S().rs && S().rs.oakey ? "&api_key=" + encodeURIComponent(S().rs.oakey) : "");
          const j = JSON.parse(N ? (await N.httpGet({ url: u, accept: "application/json" })).body : await (await fetch(u)).text());
          (j.results || []).forEach((w) => (w.authorships || []).forEach((a) => { if (!a.author) return; const id = a.author.id, r = agg[id] || (agg[id] = { n: a.author.display_name, k: 0, i: "", c: "" }); r.k++; const ins = (a.institutions || [])[0]; if (ins) { r.i = ins.display_name; r.c = ins.country_code || ""; } }));
        }
        const cc = cs().map((c) => ({ UK: "GB", SE: "SE" }[c] || c)); pp().fin = Object.values(agg).filter((r) => r.k >= 2 && r.i).sort((a, b) => (cc.includes(b.c) - cc.includes(a.c)) || b.k - a.k).slice(0, 14); T.save();
      } catch (e) { T.toast("Could not reach the research index. " + String(e.message || e).slice(0, 40)); }
      T.ui.pfind = 0; T.render();
    },
    pemail(v, el) { T.ui.mode = "mentor"; T.ui.tab = "coach"; T.render(); T.fire("chat", `Draft a short, specific first email to Professor ${v} (${el.dataset.k}) asking whether they take PhD students and would discuss my idea. Use my profile and research interest. Under 150 words, one concrete reference to their work that I must verify, a clear ask, no flattery. Tell me what to check before sending.`); },
    pnet(v, el) { const P = pp(); if (!P.net.some((n) => n.n == v)) P.net.push({ id: T.uid(), n: v, a: el.dataset.k, last: 0 }); T.save(); T.toast("Added to your network."); },
    pnc(v) { const n = pp().net.find((x) => x.id == v); n.last = Date.now(); T.save(); T.render(); }, pnd(v) { const P = pp(); P.net = P.net.filter((x) => x.id != v); T.save(); T.render(); },
    pfradar(v) { const f = K.FUND.find((x) => x.id == v); T.radarPut({ kind: f.lv == "phd" || f.lv == "faculty" ? "fund" : "fund", title: f.n, org: f.w.join(", "), url: f.u, sum: f.cov + ". " + f.who, how: "See the official page for the current call.", where: f.w.join(", ") }); T.toast("Added to Radar. Set the real deadline there."); },
    pugo(v, el) { T.radarPut({ kind: "phd", title: "PhD: " + v, org: v, sum: "Target programme. Check deadline, funding and supervisors.", where: K.CTRY[el.dataset.k].n, url: gsearch(v + " PhD admissions") }); T.toast("Added to Radar. Set the real deadline there."); },
    pcvt(v) { T.ui.pcv = v; T.render(); },
    pcva() { const t = T.val("cvt"); if (!t) return; pp().cv.unshift({ id: T.uid(), type: T.ui.pcv || "Education", t, org: T.val("cvo"), y: T.val("cvy") }); T.save(); T.render(); },
    pcvd(v) { const P = pp(); P.cv = P.cv.filter((x) => x.id != v); T.save(); T.render(); },
    pcvc() { const t = pp().cv.map((c) => `${c.y || ""} ${c.type}: ${c.t}${c.org ? ", " + c.org : ""}`).join("\n"); navigator.clipboard && navigator.clipboard.writeText(t).then(() => T.toast("Copied")); }
  });
  T.on("render", () => { if (pp().done && T.ui.tab != "path" && sync() && stageDone() && pp().stage < 8) T.toast("A stage of your plan is complete. Open Path."); });
});
