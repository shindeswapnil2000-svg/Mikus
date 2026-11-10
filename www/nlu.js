/* Taskmaster command understanding. Pure functions, no DOM, so it can be tested in Node.
   parse(text, people) -> { k: "call"|"wa"|"text"|"email"|"task"|"sos"|"fake"|"timer"|"focus"|"brief"|"plan"|"ask", ... } */
(function (root) {
  "use strict";

  // Words people use for the same relative. Matching a spoken "mummy" to a saved "Mom" works through these groups.
  const GROUPS = [
    ["mom", "mum", "mommy", "mummy", "mother", "maa", "ma", "amma", "mama", "mataji", "aai"],
    ["dad", "daddy", "papa", "pappa", "father", "baba", "abba", "appa", "pitaji", "bapu"],
    ["bro", "brother", "bhai", "bhaiya", "bhaiyya", "anna", "dada"],
    ["sis", "sister", "didi", "behen", "bahen", "akka"],
    ["wife", "wifey", "biwi", "patni"],
    ["husband", "hubby", "pati"],
    ["grandma", "granny", "nani", "dadi", "nana ji", "ajji"],
    ["grandpa", "grandfather", "nana", "dada ji", "ajja"],
    ["boss", "manager", "sir", "madam", "ma'am"]
  ];
  const groupOf = (w) => GROUPS.findIndex((g) => g.includes(w));

  const FILLER = /^(?:hey |hi |ok |okay |please |pls |kindly )*(?:taskmaster[, ]+)?(?:(?:can|could|will|would) you |i (?:want|need|have|got) to |i'?d like to |i would like to |let'?s |just |go ahead and |now )*(?:please |pls )?/i;

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  // Rough sound key so speech-to-text slips ("Rodge" for "Raj") still match.
  function sound(s) {
    return String(s).toLowerCase().replace(/[^a-z]/g, "")
      .replace(/^kn/, "n").replace(/^wr/, "r").replace(/ph/g, "f").replace(/ck/g, "k").replace(/q/g, "k")
      .replace(/dg|j/g, "j").replace(/sh|x/g, "s").replace(/ch/g, "c").replace(/th/g, "t").replace(/w/g, "v")
      .replace(/[aeiouyh]+/g, "a").replace(/(.)\1+/g, "$1").replace(/a$/, "");
  }

  const digits = (x) => String(x || "").replace(/[^\d+]/g, "");

  /** Find who the user means. Returns the saved person, a bare number, or {name, miss:1} when unknown. */
  function who(raw, people) {
    let n = String(raw || "").trim().toLowerCase().replace(/[.,!?]+$/g, "").replace(/^(?:my|to|the|for)\s+/, "").replace(/\s+(?:please|pls|now|ji)$/g, "").trim();
    if (/^[\d+\s().-]{7,}$/.test(n)) return { name: n, tel: digits(n) };
    const P = (people || []).filter((p) => p && p.name);
    const low = (p) => p.name.toLowerCase();
    let hit = P.find((p) => low(p) === n);
    if (hit) return hit;
    hit = P.find((p) => low(p).split(/\s+/)[0] === n);
    if (hit) return hit;
    hit = P.find((p) => low(p).includes(n) && n.length >= 2) || P.find((p) => n.includes(low(p)) && low(p).length >= 2);
    if (hit) return hit;
    const g = groupOf(n);
    if (g >= 0) {
      hit = P.find((p) => groupOf(low(p)) === g) || P.find((p) => GROUPS[g].some((w) => low(p).split(/\s+/).includes(w)));
      if (hit) return hit;
    }
    // fuzzy: spelling distance, then sound-alike
    let best = null, bd = 99;
    P.forEach((p) => {
      low(p).split(/\s+/).concat([low(p)]).forEach((part) => {
        const d = lev(part, n), lim = n.length <= 4 ? 1 : 2;
        if (d <= lim && d < bd) { bd = d; best = p; }
      });
    });
    if (best) return best;
    const sn = sound(n);
    if (sn.length >= 2) {
      hit = P.find((p) => low(p).split(/\s+/).some((part) => sound(part) === sn));
      if (hit) return hit;
    }
    return { name: n, miss: 1 };
  }

  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60, half: 0.5 };
  const num = (s) => (/^\d+(\.\d+)?$/.test(s) ? +s : NUMW[s]);

  /** Turn "in 20 minutes", "tomorrow 9am", "on friday at 5", "tonight" into a timestamp (ms). 0 when nothing found. */
  function when(s, now) {
    if (!s) return 0;
    s = String(s).toLowerCase();
    now = now || Date.now();
    let m;
    if ((m = s.match(/in (?:about |around )?(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|sixty|half)(?: and a half)?\s*(?:an? )?(min(?:ute)?s?|hours?|hrs?|days?)(?: and a half)?/))) {
      let v = num(m[1]);
      if (v == null) v = 1;
      if (/half\b/.test(s) && /and a half/.test(m[0])) v += 0.5;
      const u = /^h/.test(m[2]) ? 36e5 : /^d/.test(m[2]) ? 864e5 : 6e4;
      return now + v * u;
    }
    if (/in (?:an? )?half (?:an )?hour/.test(s)) return now + 18e5;
    if (/in (?:an? )?quarter(?: of an)? hour/.test(s)) return now + 9e5;
    const d = new Date(now);
    let setDay = false;
    if (/\bday after tomorrow\b/.test(s)) { d.setDate(d.getDate() + 2); setDay = true; }
    else if (/\btomorrow\b/.test(s)) { d.setDate(d.getDate() + 1); setDay = true; }
    else if (/\bnext week\b/.test(s)) { d.setDate(d.getDate() + 7); setDay = true; }
    else if ((m = s.match(/\b(?:on |next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
      let add = (DAYS.indexOf(m[1]) - d.getDay() + 7) % 7;
      if (add === 0 && /next/.test(s)) add = 7;
      d.setDate(d.getDate() + add); setDay = true;
    }
    let h = null, mi = 0;
    if ((m = s.match(/\b(?:at |by |around |@ )?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/))) {
      h = +m[1]; mi = +(m[2] || 0);
      const pm = /^p/.test(m[3]);
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    } else if ((m = s.match(/\b(?:at|by|around|@)\s*(\d{1,2})(?::(\d{2}))?\b/))) {
      h = +m[1]; mi = +(m[2] || 0);
      if (h <= 12 && !/morning/.test(s) && h < 8) h += 12; // "at 5" almost always means 5pm
    } else if (/\bnoon\b|\bmidday\b/.test(s)) h = 12;
    else if (/\bmidnight\b/.test(s)) { h = 0; d.setDate(d.getDate() + 1); setDay = true; }
    else if (/\btonight\b/.test(s)) h = 21;
    else if (/\b(this )?evening\b/.test(s)) h = 18;
    else if (/\bafternoon\b/.test(s)) h = 15;
    else if (/\bmorning\b/.test(s)) h = 9;
    if (h == null && !setDay) return 0;
    if (h == null) h = 9;
    if (h > 23 || mi > 59) return 0;
    d.setHours(h, mi, 0, 0);
    if (d.getTime() <= now) {
      if (!setDay) d.setDate(d.getDate() + 1);
      else if (/tomorrow/.test(s) === false && DAYS.some((x) => s.includes(x))) d.setDate(d.getDate() + 7);
    }
    return d.getTime();
  }

  // Words that end the "who" part of a command and start the message.
  const SAY = /\s*(?:,|:|-|\bsaying\b|\bthat\b|\bto say\b|\bto tell (?:him|her|them)\b|\babout\b|\bki\b|\bke bare mein\b)\s*/i;

  function splitMsg(rest, people) {
    const r = rest.trim();
    const names = (people || []).map((p) => p.name).sort((a, b) => b.length - a.length);
    const lead = names.find((n) => r.toLowerCase().startsWith(n.toLowerCase()) && /^(?:\s|[,:.-]|$)/.test(r.slice(n.length)));
    let w, msg;
    if (lead) { w = lead; msg = r.slice(lead.length); }
    else {
      const m = r.match(/^(\S+(?:\s+(?!saying\b|that\b|to\b)\S+)?)\s+(saying|that|to say|about)\s+([^]*)$/i);
      if (m) { w = m[1]; msg = m[3]; }
      else {
        const c = r.match(/^([^,:]+?)\s*[,:]\s*([^]*)$/);
        if (c) { w = c[1]; msg = c[2]; }
        else { w = r.split(/\s+/)[0]; msg = r.slice(w.length); }
      }
    }
    msg = msg.replace(/^\s*(?:saying|that|to say|about|:|,|-|ki)\s*/i, "").trim();
    return [who(w, people), msg];
  }

  // Exact short phrases only, so "help me write a poem" never triggers an alert.
  const SOS_RE = /^(?:sos|help|help me|help me please|emergency|an emergency|i need help|i need help now|i(?:'m| am) in (?:danger|trouble)|send (?:an? )?(?:sos|alert)|alert (?:my )?(?:family|contacts|loved ones)|bachao|madad)\s*(?:now|please|pls)?$|^call (?:the )?(?:police|112|100|ambulance)\b/i;

  function parse(input, people) {
    const raw = String(input || "").trim();
    if (!raw) return { k: "ask", q: "" };
    let x = raw.replace(FILLER, "").replace(/[.!]+$/g, "").trim();
    let l = x.toLowerCase();
    let m, m2;

    if (SOS_RE.test(l)) return { k: "sos" };
    if (/^(?:fake call|fake a call|pretend (?:to be )?call|give me a fake call|rescue me)/.test(l)) {
      const t = when(l.replace(/^fake call/, ""));
      return { k: "fake", at: t, name: ((l.match(/from ([a-z ]+?)(?: in .*)?$/) || [])[1] || "").trim() };
    }
    if ((m = l.match(/^(?:i(?:'m| am) (?:walking|going|travelling|traveling|driving|heading)[^,]*?|check ?in|safety timer|watch me|walk me home)[ ,]*(?:.*?)(?:in|for|within) (\d+)\s*(min\w*|hours?|hrs?)/))) {
      return { k: "timer", m: +m[1] * (/^h/.test(m[2]) ? 60 : 1) };
    }
    if (/^(?:what(?:'s| is| should)|what do i do|what now|next task|what next|my plan|plan my day|what(?:'s| is) on my plate)/.test(l) && /(now|next|plan|plate|do)/.test(l)) return { k: "plan" };
    if (/^(?:start|begin|do)\s+(?:a\s+)?(?:focus|pomodoro|deep work)/.test(l) || /^focus$/.test(l)) return { k: "focus" };
    if (/^(?:brief me|briefing|morning brief|(?:what'?s|whats) (?:the )?news|(?:what(?:'s| is)|whats) happening|research (?:brief|update)|news (?:brief|update)|latest research)/.test(l)) return { k: "brief" };

    // Hinglish: "mummy ko call karo", "raj ko message karo ki main late hoon", "priya ko whatsapp video call karo"
    if ((m = x.match(/^(.+?)\s+ko\s+(.+)$/i))) {
      const verb = m[2].toLowerCase();
      if (/video/.test(verb) && /call|kar|lag/.test(verb)) return { k: "wa", mode: "video", w: who(m[1], people) };
      if (/whatsapp|wa\b/.test(verb) && /call/.test(verb)) return { k: "wa", mode: "audio", w: who(m[1], people) };
      if (/^(?:call|phone|fone|ring|dial)\b/.test(verb) || /\b(?:call|phone|fon)\s+(?:karo|kar do|kardo|lagao|laga do|lagana)/.test(verb)) return { k: "call", w: who(m[1], people) };
      if ((m2 = verb.match(/^(?:message|msg|text|sms|whatsapp|bol|bolo|batao|bata do)\b[^]*?(?:\bki\b|:)\s*([^]+)$/i))) return { k: "text", w: who(m[1], people), msg: m2[1].trim() };
    }

    if ((m = l.match(/^(?:video(?: ?call)?|facetime)\s+(.+?)(?:\s+on whatsapp)?$/))) return { k: "wa", mode: "video", w: who(m[1], people) };
    if ((m = l.match(/^(?:whatsapp|wa)\s+video(?: ?call)?\s+(.+)$/))) return { k: "wa", mode: "video", w: who(m[1], people) };
    if ((m = l.match(/^(?:give|get) (.+?) (?:a )?(?:call|ring|buzz)(?: on whatsapp)?$/)) || (m = l.match(/^(?:get|put) (.+?) on the phone$/))) {
      return /whatsapp/.test(l) ? { k: "wa", mode: "audio", w: who(m[1], people) } : { k: "call", w: who(m[1], people) };
    }
    if ((m = l.match(/^(?:call|phone|ring|dial|buzz|contact|reach)\s+(.+?)(\s+on whatsapp)?$/))) {
      return m[2] ? { k: "wa", mode: "audio", w: who(m[1], people) } : { k: "call", w: who(m[1], people) };
    }
    if (!/ (?:saying|that) /.test(l) && (m = l.match(/^(?:whatsapp|wa)(?: call)?\s+(.+)$/))) return { k: "wa", mode: "audio", w: who(m[1], people) };

    if ((m = x.match(/^(?:send\s+(?:a\s+)?(?:text|sms|message|msg|whatsapp)\s+to|(?:text|sms|message|msg|whatsapp|tell|ping|let)\s+)([^]+)$/i))) {
      let rest = m[1];
      if (/^let /i.test(x)) rest = rest.replace(/^(\S+)\s+know\s*(?:that\s*)?/i, "$1 that ");
      const [w, msg] = splitMsg(rest, people);
      return { k: "text", w, msg };
    }
    if ((m = x.match(/^send\s+(.+?)\s+(?:a\s+)?(?:text|sms|message|msg)(?:\s+(?:saying|that|:)\s*([^]*))?$/i))) return { k: "text", w: who(m[1], people), msg: (m[2] || "").trim() };
    if ((m = x.match(/^(?:email|mail)\s+([^]+)$/i))) {
      const [w, msg] = splitMsg(m[1], people);
      return { k: "email", w, msg };
    }

    if ((m = x.match(/^(?:remind me|remember|don'?t let me forget|set (?:a )?reminder|add (?:a )?(?:task|todo|reminder)|task|todo|to-?do|note)\s*(?:to |that |about |for |:)?\s*([^]+)$/i))) {
      let body = m[1].trim();
      // peel a trailing time phrase off the task text
      const tm = body.match(/^(.*?)(?:\s+((?:at|by|in|on|before|tomorrow|tonight|this evening|this morning|this afternoon|next|noon|midnight|today)\b.*))?$/i);
      let at = 0, t = body;
      if (tm && tm[2]) {
        const guess = when(tm[2]);
        if (guess) { at = guess; t = tm[1].trim(); }
      }
      if (!at) {
        const lead = body.match(/^((?:tomorrow|tonight|today|in [^,]+?|at [^,]+?|on [^,]+?)),?\s+(?:to\s+)?(.+)$/i);
        if (lead && when(lead[1])) { at = when(lead[1]); t = lead[2]; }
      }
      t = t.replace(/\s+(?:today|please)$/i, "").trim();
      if (t) return { k: "task", t: t.charAt(0).toUpperCase() + t.slice(1), at };
    }
    return { k: "ask", q: raw };
  }

  root.NLU = { parse, who, when, lev, sound, groupOf };
  if (typeof module !== "undefined") module.exports = root.NLU;
})(typeof window !== "undefined" ? window : globalThis);
