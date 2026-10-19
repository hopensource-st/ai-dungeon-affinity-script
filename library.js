// ============================================================================
// LW AFFINITY ENGINE  (paste into the Library tab; see README.md)
// Works in any adventure: tracks every Character card, creates its own Config, Relations and
// Chronicle cards on the first turn, and keeps per-character numbers in each card's Notes field.
// Stats, relations, thoughts, chronicle, events, arc, clock, scenes, cleaner, card creation, commands.
// ============================================================================
const LW = (() => {
  const VERSION = "1.1.4";                                    // shown by /check; bump it on every published update
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const andList = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a.join(""));

  const BLOCK = /<<LW\n[\s\S]*?\nLW>>/;
  const RELBLOCK = /<<LWR\n[\s\S]*?\nLWR>>/;
  const CFGRE = /\[cfg([^\]]*)\]/i;
  const MARK = /[ \t]*\[LW:[^\]]*\]/g;
  const WBLOCK = /<<LWW\n[\s\S]*?\nLWW>>/;
  const BASERE = /^[ \t]*base:[^\n]*\n?/gim;
  const THSTRIP = /^[ \t]*[A-Z][\w'’\- ]{0,30} thinks(?: \([+\-=]\))?: «[^»\n]*»[ \t]*\n?/gm;
  const THRE = /^([ \t]*)[*_]*([A-Z][\w'’\-]*(?: [\w'’\-]+){0,3}?)[*_]*\s+thinks\s*(?:\(([+\-=])\)\s*)?(?::\s*|(?=\s*[«"“]))[*_]*\s*(.+?)\s*[»"”]?[*_]*[ \t]*$/gm;

  // ---- defaults (used when there is no Config card) ------------------------
  const DEF = {
    stats: [
      { name: "affinity", mode: "auto", min: 0, max: 10, start: 1, rate: 0.2, damp: false, romance: false, needs: null, keep: true },
      { name: "trust", mode: "auto", min: 0, max: 10, start: 3, rate: 0.1, damp: false, romance: false, needs: null, keep: true },
      { name: "attraction", mode: "auto", min: 0, max: 10, start: 0, rate: 0.1, damp: false, romance: true,
        needs: { stat: "trust", op: ">=", val: 4 }, keep: true },
      // obsession stays at 0 unless a card asks for it ([cfg obsession:0.3]); then it rises whenever they meet (yandere)
      { name: "obsession", mode: "auto", min: 0, max: 10, start: 0, rate: 0, damp: false, romance: false, needs: null, steady: true, keep: true },
    ],
    stages: {
      affinity: [[0, "indifferent to the protagonist"], [2, "friendly toward the protagonist"], [4, "fond of the protagonist"],
        [6, "close to the protagonist and seeks their company"], [8, "deeply devoted to the protagonist"]],
      trust: [[0, "wary of the protagonist"], [3, "tentatively trusts the protagonist"], [6, "trusts the protagonist"],
        [8, "trusts the protagonist completely"]],
      obsession: [[0, ""], [2, "preoccupied, thinks of the protagonist too often"], [4, "fixated, finds excuses to be near the protagonist"],
        [6, "possessive and jealous of anyone near the protagonist"], [8, "consumed, dangerously obsessed with the protagonist"]],
      attraction: [[0, ""], [2, "quietly drawn to the protagonist"], [5, "attracted to the protagonist"],
        [8, "in love with the protagonist"]],
      tension: [[0, ""], [2, "on edge with each other"], [4, "openly hostile to each other"],
        [8, "in open conflict"]],
    },
    s: {
      max_present: 4, max_stats: 3, contact: false, warn_touch: false, inject: "frontMemory",
      accel_scenes: 40, early_actions: 0, damp_words: "", damp_factor: 0.5,
      tension_stat: "affinity", tension_min: 6, tension_rate: 0.5, tension_max: 10, max_pairs: 3,
      skip: "", autostats: false,
      // twists: after twist_gap quiet turns, each turn has twist_chance % of drawing one from the Events card deck
      twists: true, twist_gap: 8, twist_chance: 25, twist_hold: 3,
      // bonds: the first time two characters with no written tie share a scene, bond_chance % of drawing one from the Relations deck
      bonds: true, bond_chance: 70,
      // secret yanderes: each new character has yandere_chance % of an obsession that grows on its own (at most yandere_max)
      yandere_chance: 20, yandere_max: 1,
      // suggest_cards: a name with no card that comes up in suggest_after different turns gets a one-time hint to /npc it
      suggest_cards: true, suggest_after: 3,
      // mood: auto stats rise after a positive interaction and fall after a negative one (stats flagged steady always rise)
      mood: true, mood_neutral: 0, mood_down: 1, mood_thought: 2.5,
      mood_pos: "thank|smil|laugh|grin|help|hug|embrac|kiss|gift|prais|compliment|comfort|protect|forgiv|apologi|agree|welcom|reassur|kind|gentl|chuckl|blush",
      mood_neg: "insult|mock|sneer|lied|lying|liar|threat|slap|punch|shov|betray|yell|shout|scold|ignor|refus|glar|scowl|cruel|rude|angr|furious|disgust|humiliat|curs",
      auto_allow: true,
      // a friendly touch (no mood_neg word in its sentence) raises these stats by touch_bonus
      touch_stats: "affinity|attraction|trust|obsession", touch_bonus: 0.3,
      // memories: a chronicle entry that names a character is kept as an m: line in their Notes; the AI gets the last few while they are in the scene
      memories_keep: 8, memories_recent: 2, memories_context: 2,
      thoughts: true, thoughts_show: false, thoughts_interval: 4, thoughts_max: 2, thoughts_keep: 20, thoughts_words: 20, thoughts_context: 2, thoughts_recent: 3,
      chronicle_lines: 3, chronicle_every: 8, chronicle_max: 200, chronicle_stats: "affinity|attraction|obsession", chronicle_min: 4,
      clock: true, clock_times: "dawn|morning|afternoon|evening|night", clock_day: 1, clock_time: "morning", clock_turns: 0, clock_on_beat: false,
      scene: true, scene_len: 6,
      scene_setup: "Scene: setup. Establish the place and what each character wants; let tension build.",
      scene_mid: "Scene: complication. Something goes wrong, is said, or is revealed.",
      scene_end: "Scene: climax. Bring it to a peak, then settle on a hook.",
      scene_over: "Scene: running long. Close it with a change of time or place.",
      beat_hold: 4, beat_gap: 3, act_turns: 30, event_hold: 3, events_max: 2, arc_mode: "hybrid",
      inject_max: 1300, clean: true, clean_repeat: true, max_entry: 1000,
      npc_template: "Full Name, role or occupation, age. Three personality traits. [two or three sentences: how they see the protagonist, what they want, one flaw]. Appearance: [one sentence on build, hair, eyes and clothes].",
      faction_template: "Faction Name, what kind of group it is. [two or three sentences: what they want, who leads them, how they treat the protagonist]. Appearance: [one sentence on how members look or dress].",
      place_template: "Place Name, what kind of place it is. [two or three sentences: what it looks like, its mood, who is usually there, one hook for a scene].",
    },
    ban: [
      { phrase: "barely above a whisper", to: "softly" },
      { phrase: "let out a breath she didn't know she was holding", to: "exhaled" },
      { phrase: "let out a breath he didn't know he was holding", to: "exhaled" },
      { phrase: "ministrations", to: "touch" },
      { phrase: "orbs", to: "eyes" },
      { phrase: "a testament to", to: "proof of" },
    ],
  };

  // the twist deck and the arc written to the Events and Arc cards on first run; generic so the AI fits them to any story
  const DECK = [
    "# Twist deck. The engine draws one now and then, picks who it is about, and the AI fits it to the story.",
    "# twist: id | who: low (dislikes the protagonist), high (likes them), any (in the scene), absent (met, not here) | when: conditions | weight N | hold N | stages: hint >> it happens | log: text",
    "# Delete a line to remove a twist; weight 0 disables it; add your own lines. You can also add event: lines (see the README).",
    "twist: secret | who: low | weight 2 | stages: {who} is hiding something that concerns the protagonist; show it only in small slips >> {who}'s secret comes out, and it changes things",
    "twist: betrayal | who: low | when: met>=2 | stages: {who} is quietly working against the protagonist; leave subtle clues >> {who}'s betrayal is revealed or carried out",
    "twist: confession | who: high | weight 2 | stages: {who} is gathering the courage to tell the protagonist something important >> {who} finally says it, plainly and sincerely",
    "twist: gift | who: high | stages: {who} surprises the protagonist with a meaningful gift or favor",
    "twist: jealousy | who: high | when: met>=2 | stages: {who} grows jealous of someone else close to the protagonist >> {who}'s jealousy causes a scene",
    "twist: favor | who: any | weight 2 | stages: {who} asks the protagonist for help with a personal problem",
    "twist: guard_down | who: any | stages: a calm, unplanned moment alone with {who}, who lets their guard down and shows another side",
    "twist: quarrel | who: any | when: met>=2 | stages: tension between {who} and another character boils over into an argument in front of the protagonist",
    "twist: news | who: absent | weight 2 | stages: {who} sends word or turns up unexpectedly, with urgent news",
    "twist: stranger | weight 2 | stages: a stranger has been watching the protagonist >> the stranger approaches with an offer, a warning or a demand",
    "twist: mishap | stages: something goes wrong without warning (an accident, an injury, a fire, a sudden storm), fitting the setting",
    "twist: missing | stages: something that matters to the protagonist goes missing >> a clue points to who took it",
    "twist: rumor | when: met>=2 | stages: a rumor about the protagonist is spreading >> the rumor reaches someone who matters, and they act on it",
    "twist: the_past | when: action>=30 | stages: someone from the protagonist's past is looking for them >> they find the protagonist, and they want something",
    "twist: danger | when: action>=20 | stages: a real threat is closing in; show only its signs >> the danger strikes and the protagonist must react",
    "twist: opportunity | stages: an unexpected opportunity appears, tempting but with a catch",
  ];
  const BONDS = [
    "# Ties between characters, one per line: Name | Name | description. The AI is told a tie when both are in the scene.",
    "# The first time two characters with no tie here share a scene, the engine may draw one from this deck and write it above.",
    "# bond: id | weight N | text ({a} and {b} become the two names, in random order). Delete, add or weight 0 to shape the deck.",
    "# Friendship and history",
    "bond: friends | weight 3 | {a} and {b} are old friends",
    "bond: best_friends | weight 2 | {a} and {b} are best friends who tell each other everything",
    "bond: strangers | weight 3 | {a} and {b} barely know each other",
    "bond: mentor | {a} once taught {b} much of what they know",
    "bond: saved | {a} once saved {b}'s life, and {b} has never forgotten it",
    "bond: colleagues | weight 2 | {a} and {b} work together, and know each other's habits too well",
    "bond: boss | {a} works for {b}, or answers to them",
    "bond: pact | {a} and {b} share a secret they have sworn to keep",
    "# Family (the AI picks who is older from their ages)",
    "bond: siblings | weight 2 | {a} and {b} are siblings",
    "bond: protective_sibling | {a} and {b} are siblings, and {a} is fiercely protective of {b}",
    "bond: sibling_rivalry | {a} and {b} are siblings who have competed with each other all their lives",
    "bond: parent_child | {a} and {b} are parent and child",
    "bond: cousins | {a} and {b} are cousins who grew up together",
    "bond: kin | {a} and {b} are distant relatives",
    "bond: family_feud | {a} and {b} belong to families that have been feuding for years",
    "# Friction",
    "bond: rivals | weight 2 | {a} and {b} are long-standing rivals",
    "bond: debt | {a} owes {b} a debt that has never been repaid",
    "bond: grudge | {a} holds a quiet grudge against {b} over something in the past",
    "bond: distrust | {a} does not trust {b} and watches them closely",
    "bond: admire | {a} openly admires {b}, which {b} finds awkward",
    "# Around the protagonist (romance only ever points at the protagonist)",
    "bond: confidant | {a} confides in {b} about their feelings for the protagonist",
    "bond: disapproves | {a} disapproves of how close {b} is getting to the protagonist",
    "bond: matchmaker | {a} keeps nudging {b} to spend more time with the protagonist",
  ];
  const ARC = [
    "# Story arc: fixed beats happen in order; bank beats are drawn at random each playthrough (pick 2 per act). See the README.",
    "arc: Story | mode hybrid | pick 2 | hold 4",
    "act: 1 | Setup | Establish the protagonist's world and the people in it, and plant a question the story will answer.",
    "act: 2 | Confrontation | Complications pile up, relationships are tested, and the stakes keep rising.",
    "act: 3 | Resolution | Bring the central conflict to a head and let the protagonist's choices have consequences.",
    "beat: 1 | fixed | Inciting Incident | when: action>=6 | guide: Something disrupts the status quo and gives the protagonist a problem or a goal.",
    "beat: 1 | bank | A New Face | when: prob 20 | guide: Introduce a new character with an agenda of their own.",
    "beat: 1 | bank | Something Does Not Add Up | when: prob 20 | guide: A small mystery appears; leave it unexplained for now.",
    "beat: 1 | bank | First Bond | when: met>=1, prob 20 | guide: A warm moment brings the protagonist closer to someone.",
    "beat: 1 | fixed | Point of No Return | when: action>=30 | guide: The protagonist commits to a path and cannot easily turn back.",
    "beat: 2 | bank | Ticking Clock | when: prob 15 | guide: A deadline appears: something must be done before it is too late.",
    "beat: 2 | bank | Divided Loyalties | when: met>=2, prob 15 | guide: Two people the protagonist cares about want opposite things.",
    "beat: 2 | bank | Unexpected Ally | when: prob 15 | guide: Help comes from someone the protagonist did not expect.",
    "beat: 2 | bank | A Price to Pay | when: prob 15 | guide: Something the protagonist wants now comes with a real cost.",
    "beat: 2 | fixed | Midpoint Reversal | when: action>=60 | guide: A belief turns out false or a victory turns sour, and the story changes direction.",
    "beat: 2 | fixed | All Is Lost | when: action>=85 | guide: The protagonist's lowest point: a loss, a defeat or a betrayal.",
    "beat: 3 | bank | Old Debts | when: prob 20 | guide: A choice from earlier in the story comes back with consequences.",
    "beat: 3 | bank | Last Confession | when: prob 20 | guide: Someone finally says what they have been holding back.",
    "beat: 3 | fixed | The Hard Choice | when: action>=100 | guide: The protagonist must choose between two things they want.",
    "beat: 3 | fixed | Climax | when: fired:the_hard_choice | guide: Confront the central conflict directly and resolve it.",
    "beat: 3 | fixed | Aftermath | when: fired:climax | guide: Show how the world and the relationships have changed.",
  ];

  // text of the Config card the engine writes on first run: every default, ready to edit
  const defaultCfgText = () => {
    const onoff = (v) => (v === true ? "on" : v === false ? "off" : String(v));
    const l = ["# Engine settings. Edit any value; lines starting with # are ignored. Delete this card to get the defaults back.",
      "# stat: name | auto or manual | min-max | start N | rate N | flags (damp, romance, steady, keep, needs stat>=N)",
      "# auto stats move with the mood of each scene (mood_* settings); steady ones always rise while the character is present"];
    for (const d of DEF.stats)
      l.push("stat: " + [d.name, d.mode, d.min + "-" + d.max, "start " + d.start, "rate " + d.rate]
        .concat(d.damp ? ["damp"] : [], d.romance ? ["romance"] : [], d.steady ? ["steady"] : [], d.keep ? ["keep"] : [], d.needs ? ["needs " + d.needs.stat + d.needs.op + d.needs.val] : []).join(" | "));
    l.push("# stages: stat | threshold=text the AI receives | ...   (empty text = nothing is sent)");
    for (const k of Object.keys(DEF.stages)) l.push("stages: " + k + " | " + DEF.stages[k].map((e) => e[0] + "=" + e[1]).join(" | "));
    l.push("# settings (see the README for what each one does)");
    l.push("# autostats: on lets the AI design this story's stats on the first action, then turns itself off (/autostats redoes it)");
    for (const k of Object.keys(DEF.s)) l.push(k + ": " + (k === "autostats" ? "on" : onoff(DEF.s[k])));
    l.push("# cleaner: ban: phrase | replacement");
    for (const b of DEF.ban) l.push("ban: " + b.phrase + " | " + b.to);
    return l.join("\n");
  };

  const parseVal = (v) => {
    const l = String(v).trim().toLowerCase();
    if (["on", "yes", "true"].includes(l)) return true;
    if (["off", "no", "false"].includes(l)) return false;
    if (l !== "" && !isNaN(Number(l))) return Number(l);
    return String(v).trim();
  };

  // ---- config card ----------------------------------------------------------
  const parseConfig = () => {
    const cfg = clone(DEF);
    // every card of type Config is read and merged, from its Notes (no length limit) and from its Entry
    const cfgCards = (storyCards || []).filter((c) => c && String(c.type || "").toLowerCase() === "config");
    if (!cfgCards.length) return cfg;
    const stats = [], stages = {}, bans = [];
    const cfgText = cfgCards.map((c) => String(c.entry || "") + "\n" + String(c.description || "")).join("\n");
    for (const raw of cfgText.split("\n")) {
      const line = raw.trim();
      if (!line || line[0] === "#") continue;
      const ci = line.indexOf(":");
      if (ci < 0) continue;
      const k = line.slice(0, ci).trim().toLowerCase();
      const v = line.slice(ci + 1).trim();
      if (k === "stat") {
        const p = v.split("|").map((s) => s.trim());
        const d = { name: p[0].toLowerCase(), mode: (p[1] || "manual").toLowerCase(), min: 0, max: 10, start: 0, rate: 0,
          damp: false, romance: false, needs: null };
        for (const f of p.slice(2)) {
          let m;
          if ((m = f.match(/^(-?[\d.]+)\s*-\s*(-?[\d.]+)$/))) { d.min = num(m[1], 0); d.max = num(m[2], 10); }
          else if ((m = f.match(/^start\s+(-?[\d.]+)/i))) d.start = num(m[1], 0);
          else if ((m = f.match(/^rate\s+(-?[\d.]+)/i))) d.rate = num(m[1], 0);
          else if ((m = f.match(/^needs\s+(\w+)\s*(>=|<=|>|<)\s*(-?[\d.]+)/i))) d.needs = { stat: m[1].toLowerCase(), op: m[2], val: num(m[3], 0) };
          else if (/^damp$/i.test(f)) d.damp = true;
          else if (/^romance$/i.test(f)) d.romance = true;
          else if (/^steady$/i.test(f)) d.steady = true;
          else if (/^keep$/i.test(f)) d.keep = true;
        }
        if (d.name) stats.push(d);
      } else if (k === "stages") {
        const p = v.split("|");
        const name = p[0].trim().toLowerCase();
        stages[name] = p.slice(1).map((x) => {
          const e = x.indexOf("=");
          return e < 0 ? null : [num(x.slice(0, e), 0), x.slice(e + 1).trim()];
        }).filter(Boolean).sort((a, b) => a[0] - b[0]);
      } else if (k === "ban") {
        const bp = v.split("|"), ph = bp[0].trim();
        if (ph) bans.push({ phrase: ph, to: (bp[1] || "").trim() });
      } else {
        cfg.s[k] = parseVal(v);
      }
    }
    if (bans.length) cfg.ban = bans;
    if (stats.length) cfg.stats = stats;
    cfg.stages = Object.assign({}, cfg.stages, stages);
    return cfg;
  };

  // ---- cards -> roster ------------------------------------------------------
  const strip = (e) => String(e).replace(BLOCK, "").replace(CFGRE, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const parseCardCfg = (entry) => {
    const out = { flags: {}, vals: {}, raw: "" };
    const m = String(entry).match(CFGRE);
    if (!m) return out;
    out.raw = m[0];
    for (const t of m[1].trim().split(/\s+/)) {
      if (!t) continue;
      const i = t.indexOf(":");
      if (i < 0) out.flags[t.toLowerCase()] = true;
      else out.vals[t.slice(0, i).toLowerCase()] = t.slice(i + 1);
    }
    return out;
  };

  // any story works: a character is a card of type Character (or titled "@Name"); its name is the card
  // title, else its first trigger, else the start of its entry; every trigger also counts as a name
  const buildRoster = (G) => {
    const out = [];
    const skip = String(G.s.skip || "").toLowerCase().split(/[|,]/).map((x) => x.trim()).filter(Boolean);
    (storyCards || []).forEach((c, idx) => {
      if (!c) return;
      const title = String(c.title || "").trim();
      if (String(c.type || "").toLowerCase() !== "character" && title[0] !== "@") return;
      const entry = String(c.entry || "");
      const cfg = parseCardCfg(CFGRE.test(c.description || "") ? c.description : entry);
      if (cfg.flags.skip) return;
      const keys = String(c.keys || "").split(",").map((k) => k.trim()).filter((k) => k.length >= 3 && /^[\p{L}'’ .\-]+$/u.test(k));
      const name = (title.replace(/^@/, "").replace(/\s*[([].*$/, "").trim() || keys[0] || strip(entry).split(/[,.:\n]/)[0]).trim();
      if (!name || name.length > 40) return;
      const first = stripTitles(name).split(/\s+/)[0];           // "Lady Corvina Ashe" -> Corvina
      if (skip.includes(name.toLowerCase()) || skip.includes(first.toLowerCase())) return;
      const aliases = (cfg.vals.alias || "").split("/").map((a) => a.replace(/_/g, " ").trim()).filter((a) => a.length >= 3);
      const names = Array.from(new Set([name, first].concat(keys, aliases)));
      const re = new RegExp("\\b(?:" + names.map(esc).join("|") + ")\\b", "gi");
      out.push({ id: String(c.id != null ? c.id : idx), idx, card: c, entry, cfg, name, first, names, re });
    });
    return out;
  };

  // first run in any adventure: create the engine's own cards (never sent to the AI: their trigger never appears)
  const AUTOCARDS = [
    { type: "config", title: "LW Config", key: "lw_config", notes: defaultCfgText },
    { type: "relations", title: "LW Relations", key: "lw_relations",
      notes: () => BONDS.join("\n") },
    { type: "chronicle", title: "LW Chronicle", key: "lw_chronicle",
      notes: () => "# Chronicle. Lines that begin with a dash are story log entries; you can add your own." },
    { type: "events", title: "LW Events", key: "lw_events", notes: () => DECK.join("\n") },
    { type: "arc", title: "LW Arc", key: "lw_arc", notes: () => ARC.join("\n") },
  ];
  const ensureCards = () => {
    if (typeof addStoryCard !== "function") return;
    for (const a of AUTOCARDS) {
      if ((storyCards || []).some((c) => c && String(c.type || "").toLowerCase() === a.type)) continue;
      if (addStoryCard(a.key, "", a.type) === false) continue;
      const c = storyCards.find((x) => x && x.keys === a.key);
      if (!c) continue;
      c.title = a.title;
      c.description = a.notes();
    }
  };

  const ctxNow = () => {
    const cfg = parseConfig();
    const roster = buildRoster(cfg);
    const byId = {};
    for (const c of roster) byId[c.id] = c;
    const X = { cfg, roster, byId };
    X.relCards = [];
    (storyCards || []).forEach((c, idx) => {
      if (c && String(c.type || "").toLowerCase() === "relations") X.relCards.push({ c, idx });
    });
    const pt = parseTies(X);
    X.ties = pt.ties;
    X.tieWarn = pt.warn;
    X.ev = parseEvents(cfg);
    X.arc = parseArc(cfg);
    X.tw = parseTwists(cfg);
    return X;
  };

  const S = () => {
    if (!state.lw) state.lw = { rel: {}, mirror: {}, allow: [], applied: null, err: null, pending: "" };
    if (!state.lw.tension) state.lw.tension = {};
    if (state.lw.tmirror == null) state.lw.tmirror = "";
    if (!state.lw.w) state.lw.w = newW();
    return state.lw;
  };

  // ---- stats ----------------------------------------------------------------
  const romanceOff = (ch) => String(ch.cfg.vals.romance || "").toLowerCase() === "no";
  const activeStats = (X, ch) => X.cfg.stats.filter((d) => !(d.romance && romanceOff(ch)));
  const startOf = (d, ch) => {
    const v = ch.cfg.vals;
    if (v["start." + d.name] != null) return clamp(num(v["start." + d.name], d.start), d.min, d.max);
    if (v[d.name] != null && (d.mode === "manual" || num(v[d.name], 0) >= 1)) return clamp(num(v[d.name], d.start), d.min, d.max);   // old style: a plain number of 1 or more is a starting value
    return d.start;
  };
  const rateOf = (d, ch) => {
    if (d.mode !== "auto" || ch.cfg.vals[d.name] == null) return d.rate;
    const v = num(ch.cfg.vals[d.name], d.rate);
    return v >= 1 ? d.rate : v;                                  // 1 or more is an old-style starting value, not a rate
  };
  const fresh = (X, ch) => {
    const r = { s: {}, scenes: 0, last: -1, touched: [], th: [], mem: [], lastT: -999, tsig: "", bi: 0 };
    for (const d of activeStats(X, ch)) r.s[d.name] = startOf(d, ch);
    return r;
  };
  const cmp = (a, op, b) => (op === ">=" ? a >= b : op === "<=" ? a <= b : op === ">" ? a > b : a < b);

  // ---- card block (mirror of the numbers, visible and editable) -------------
  const blockText = (X, ch, r) => {
    const lines = ["<<LW"];
    for (const d of activeStats(X, ch)) lines.push(d.name + ": " + (r.s[d.name] != null ? r.s[d.name] : startOf(d, ch)).toFixed(1));
    lines.push("scenes: " + r.scenes, "touched: " + r.touched.length);
    for (const m of r.mem || []) lines.push("m: " + String(m).replace(/\s+/g, " "));
    for (const t of r.th || []) lines.push("t: " + String(t).replace(/\s+/g, " "));
    lines.push("LW>>");
    return lines.join("\n");
  };

  // thoughts that say (almost) the same thing count as repeats
  const thWords = (t) => new Set(String(t).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter((w) => w.length > 2));
  const thSame = (a, b) => {
    const A = thWords(a), B = thWords(b);
    if (!A.size || !B.size) return false;
    let n = 0;
    for (const w of A) if (B.has(w)) n++;
    return n / Math.min(A.size, B.size) >= 0.7;
  };
  const thDedupe = (list) => {
    const out = [];
    for (const t of list) { const i = out.findIndex((o) => thSame(o, t)); if (i >= 0) out.splice(i, 1); out.push(t); }
    return out;
  };

  const adopt = (X, ch, r, blk) => {
    const act = activeStats(X, ch), th = [], mem = [];
    for (const line of blk.split("\n")) {
      const mm = line.match(/^\s*m\s*:\s*(.+)$/);
      if (mm) { mem.push(mm[1].trim()); continue; }
      const tm = line.match(/^\s*t\s*:\s*(.+)$/);
      if (tm) { th.push(tm[1].trim()); continue; }
      const m = line.match(/^\s*([\w.]+)\s*:\s*(-?[\d.]+)/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (key === "scenes") { r.scenes = Math.max(0, Math.round(num(m[2], r.scenes))); continue; }
      const d = act.find((x) => x.name === key);
      if (d) r.s[d.name] = clamp(num(m[2], r.s[d.name]), d.min, d.max);
    }
    r.th = thDedupe(th).slice(-X.cfg.s.thoughts_keep);
    r.mem = mem.slice(-X.cfg.s.memories_keep);
  };

  // numbers live in the card's Notes (never sent to the AI); old-style entry blocks are still read
  const getBlock = (ch) => {
    const src = BLOCK.test(ch.card.description || "") ? ch.card.description : ch.entry;
    const m = src.match(BLOCK);
    return m ? m[0] : "";
  };

  // a secret yandere: the first time the engine meets a character, yandere_chance % of a hidden obsession rate
  // (only for a steady stat with no rate of its own, like the default obsession; never for romance:no characters)
  const rollYandere = (X, L, ch, r) => {
    const s = X.cfg.s, d = X.cfg.stats.find((x) => x.steady && x.mode === "auto" && !x.rate);
    if (!d || !(s.yandere_chance > 0) || romanceOff(ch) || ch.cfg.vals[d.name] != null) return;
    if (Object.keys(L.rel).filter((k) => L.rel[k].yr).length >= s.yandere_max) return;
    const R = rng(hashStr("y:" + ch.id + ":" + L.w.seed));
    if (R() * 100 < s.yandere_chance) r.yr = Math.round((0.2 + R() * 0.2) * 100) / 100;
  };
  const sync = (X, L) => {
    for (const ch of X.roster) {
      let r = L.rel[ch.id];
      const blk = getBlock(ch);
      if (!r) {
        r = L.rel[ch.id] = fresh(X, ch);
        if (blk) adopt(X, ch, r, blk);
        rollYandere(X, L, ch, r);
      } else {
        for (const d of activeStats(X, ch)) if (r.s[d.name] == null) r.s[d.name] = startOf(d, ch);
        if (!r.th) { r.th = []; r.lastT = -999; r.tsig = ""; r.bi = 0; }
        if (!r.mem) r.mem = [];
        if (blk && L.mirror[ch.id] && blk !== L.mirror[ch.id]) adopt(X, ch, r, blk);
      }
    }
  };

  const persist = (X, L, ch) => {
    const r = L.rel[ch.id];
    if (!r) return;
    // an old diary ("~ (Day 3) text") joins the thoughts block and leaves the Notes
    const DIARY = /^~ \(Day \d+\) /;
    const lines = String(ch.card.description || "").split("\n"), old = lines.filter((l) => DIARY.test(l));
    if (old.length) r.th = thDedupe(old.map((l) => l.replace(DIARY, "")).concat(r.th)).slice(-X.cfg.s.thoughts_keep);
    const text = blockText(X, ch, r);
    if (!old.length && getBlock(ch) === text && !BLOCK.test(ch.entry)) { L.mirror[ch.id] = text; return; }
    // the entry stays purely what the AI reads; numbers go in the Notes field
    const own = lines.filter((l) => !DIARY.test(l)).join("\n");
    const cfgInNotes = (own.match(CFGRE) || [""])[0];
    ch.card.description = [strip(own), cfgInNotes, text].filter(Boolean).join("\n");
    if (BLOCK.test(ch.entry)) {                                // migrate an old entry block away
      ch.card.entry = ch.entry.replace(BLOCK, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      ch.entry = ch.card.entry;
    }
    L.mirror[ch.id] = text;
  };

  // ---- presence -------------------------------------------------------------
  const lastPos = (ch, text) => {
    ch.re.lastIndex = 0;
    let m, best = -1;
    while ((m = ch.re.exec(text)) !== null) {
      best = Math.max(best, m.index);
      if (m[0].length === 0) ch.re.lastIndex++;
    }
    return best;
  };
  const presentIds = (X, text, max) => X.roster
    .map((c) => ({ id: c.id, pos: lastPos(c, text) }))
    .filter((x) => x.pos >= 0)
    .sort((a, b) => b.pos - a.pos)
    .slice(0, max)
    .map((x) => x.id);

  // ---- relations between characters (Relations card) -----------------------
  const pk = (a, b) => (String(a) < String(b) ? a + "|" + b : b + "|" + a);

  const findChar = (X, name) => {
    const n = String(name).trim().toLowerCase();
    if (!n) return null;
    return X.roster.find((c) => c.names.some((a) => a.toLowerCase() === n)) || null;
  };

  // lines like:  Mira | Tobin | childhood friends
  const parseTies = (X) => {
    const ties = {}, warn = [];
    for (const rc of X.relCards) {
      const txt = String(rc.c.entry || "") + "\n" + String(rc.c.description || "");
      for (const raw of txt.replace(RELBLOCK, "").split("\n")) {
        const line = raw.trim();
        if (!line || line[0] === "#" || /^bond\s*:/i.test(line)) continue;
        const p = line.split("|");
        if (p.length < 3) continue;
        const a = findChar(X, p[0]), b = findChar(X, p[1]);
        if (!a || !b || a.id === b.id) { warn.push(line.slice(0, 50)); continue; }
        ties[pk(a.id, b.id)] = { a: a.id, b: b.id, text: p.slice(2).join("|").trim() };
      }
    }
    return { ties, warn };
  };

  // tension between pairs is mirrored (and editable) in the Relations card's Notes
  const getRelBlock = (X) => {
    const x = X.relCards[0];
    if (!x) return "";
    const c = x.c;
    const src = String(c.description || "");
    const m = src.match(RELBLOCK);
    return m ? m[0] : "";
  };

  const tBlockText = (X, L) => {
    const lines = ["<<LWR"];
    Object.keys(L.tension).sort().forEach((k) => {
      const ab = k.split("|"), A = X.byId[ab[0]], B = X.byId[ab[1]];
      if (A && B && L.tension[k] > 0) lines.push(A.first.toLowerCase() + " | " + B.first.toLowerCase() + ": " + L.tension[k].toFixed(1));
    });
    lines.push("LWR>>");
    return lines.join("\n");
  };

  const adoptTension = (X, L, blk) => {
    const out = {};
    for (const line of blk.split("\n")) {
      const m = line.match(/^\s*([^|:]+)\|([^:]+):\s*(-?[\d.]+)/);
      if (!m) continue;
      const a = findChar(X, m[1]), b = findChar(X, m[2]);
      if (a && b && a.id !== b.id) out[pk(a.id, b.id)] = clamp(num(m[3], 0), 0, X.cfg.s.tension_max);
    }
    L.tension = out;
  };

  const syncTension = (X, L) => {
    const cur = getRelBlock(X);
    if (cur && cur !== L.tmirror) { adoptTension(X, L, cur); L.tmirror = cur; }
  };

  const persistTension = (X, L) => {
    const x = X.relCards[0];
    if (!x) return;
    const text = tBlockText(X, L);
    const cur = getRelBlock(X);
    const empty = !Object.keys(L.tension).some((k) => L.tension[k] > 0);
    if (text === cur || (empty && !cur)) { L.tmirror = cur || text; return; }
    const c = x.c;
    const clean = (v) => String(v || "").replace(RELBLOCK, "").replace(/\n{3,}/g, "\n\n").trim();
    c.description = clean(c.description) + "\n" + text;
    L.tmirror = text;
  };

  const writeTie = (X, a, b, desc) => {
    const x = X.relCards[0], c = x.c;
    const lines = String(c.description || "").split("\n");
    const line = a.first + " | " + b.first + " | " + desc;
    let done = false;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      const p = lines[i].split("|");
      if (!t || t[0] === "#" || p.length < 3) continue;
      const ca = findChar(X, p[0]), cb = findChar(X, p[1]);
      if (ca && cb && pk(ca.id, cb.id) === pk(a.id, b.id)) { lines[i] = line; done = true; }
    }
    if (!done) {
      const bi = lines.findIndex((l) => /^<<LWR/.test(l));
      if (bi >= 0) lines.splice(bi, 0, line); else lines.push(line);
    }
    const out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    c.description = out;
  };

  // ---- text for the AI ------------------------------------------------------
  const stageText = (X, name, v) => {
    let t = "";
    for (const e of X.cfg.stages[name] || []) if (v >= e[0]) t = e[1];
    return t;
  };

  // the short bracketed line the AI receives each turn; low-priority parts drop first when it is too long
  const buildInject = (X, L, ids, tp) => {
    const W = L.w, s = X.cfg.s, parts = [];
    const add = (p, t) => { if (t) parts.push({ p, t }); };
    if (s.clock) add(2, "Time: " + dayLabel(X, W) + ".");
    const A = X.arc;
    if (A.beats.length && !W.arcDone) {
      const act = A.acts[W.act];
      if (act && act.text) add(4, "Act " + W.act + (act.name ? " (" + act.name + ")" : "") + ": " + act.text.replace(/[.\s]+$/, "") + ".");
      const b = W.bt ? beatById(A, W.bt.id) : null;
      if (b && b.guide) add(2, "Story beat: " + b.guide.replace(/[.\s]+$/, "") + ".");
    }
    for (const e of X.ev) {
      const a = W.ev[e.id];
      if (a && e.stages[a.st - 1]) add(3, EVPREFIX[e.kind] + e.stages[a.st - 1].replace(/[.\s]+$/, "") + ".");
    }
    const tw = W.tw && X.tw.find((t) => t.id === W.tw.id);
    if (tw && tw.stages[W.tw.st - 1])
      add(2, (W.tw.st < tw.stages.length ? "Twist (only hint at it): " : "Twist (make it happen now): ") +
        twistFill(tw.stages[W.tw.st - 1], W.tw.who) + ".");
    if (s.scene) add(4, s[{ setup: "scene_setup", mid: "scene_mid", end: "scene_end", over: "scene_over" }[scenePhase(X, W)]]);
    const feel = {};                                          // same feelings, one line: "Mira and Tobin: ..."
    for (const id of ids) {
      const ch = X.byId[id], r = L.rel[id];
      if (!ch || !r) continue;
      // only feelings that moved away from where this character started; the biggest change first
      const bits = activeStats(X, ch)
        .map((d) => ({ t: stageText(X, d.name, r.s[d.name]), moved: Math.abs(stageIdx(X, d.name, r.s[d.name]) - stageIdx(X, d.name, startOf(d, ch))) }))
        .filter((x) => x.t && x.moved)
        .sort((a2, b2) => b2.moved - a2.moved)
        .slice(0, s.max_stats)
        .map((x) => x.t);
      if (bits.length) (feel[bits.join("; ")] = feel[bits.join("; ")] || []).push(ch.first);
    }
    for (const t of Object.keys(feel)) add(1, andList(feel[t]) + ": " + t + ".");
    let np = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (np >= s.max_pairs) break;
        const key = pk(ids[i], ids[j]);
        const tie = X.ties[key];
        const ts = stageText(X, "tension", L.tension[key] || 0);
        const bits = [];
        if (tie) bits.push(tie.text);
        if (ts) bits.push(ts);
        const fa = X.byId[ids[i]].first, fb = X.byId[ids[j]].first;
        const named = tie && tie.text.includes(fa) && tie.text.includes(fb);      // drawn bonds already name both
        if (bits.length) { add(3, (named ? bits.join("; ").replace(/^./, (c) => c.toUpperCase()) : fa + " and " + fb + ": " + bits.join("; ")) + "."); np++; }
      }
    }
    if (s.thoughts && !W.off && s.thoughts_context > 0) {
      let n = 0;
      for (const id of ids) {
        const r = L.rel[id];
        if (n >= s.thoughts_context || !r || !r.th.length) continue;
        add(5, X.byId[id].first + " was just thinking: " + r.th.slice(-Math.max(1, s.thoughts_recent)).map((t) => "\"" + t.slice(0, 120) + "\"").join(" ") + ".");
        n++;
      }
    }
    if (s.memories_recent > 0 && s.memories_context > 0) {
      const shown = W.log.slice(-s.chronicle_lines).join(" ");      // already sent as "Recently"
      let n = 0;
      for (const id of ids) {
        const r = L.rel[id], mem = ((r && r.mem) || []).filter((m) => !shown.includes(m.replace(/^\([^)]*\) /, "")));
        if (n >= s.memories_context || !mem.length) continue;
        add(4, X.byId[id].first + " remembers: " + mem.slice(-s.memories_recent).map((m) => m.slice(0, 160)).join(" "));
        n++;
      }
    }
    if (W.log.length && s.chronicle_lines > 0)
      add(3, "Recently: " + W.log.slice(-s.chronicle_lines).map((l) => l.replace(/^\[(Day \d+)[^\]]*\]\s*/, "($1) ").replace(/[[\]]/g, "").slice(0, 160)).join(" "));
    if (info.actionCount < s.early_actions) {
      const quiet = X.roster
        .filter((c) => !ids.includes(c.id) && !c.cfg.flags.noearly)
        .sort((a2, b2) => ((L.rel[a2.id] || {}).scenes || 0) - ((L.rel[b2.id] || {}).scenes || 0))
        .slice(0, 2).map((c) => c.first);
      if (quiet.length) add(5, "Soon give " + andList(quiet) + " a moment with the protagonist.");
    }
    add(1, tp ? thoughtInstr(X, tp, L) : "");
    if (W.pendLog.length) add(1, "End the reply with {log: one past-tense sentence summing up what just happened}.");
    if (s.contact) {
      const names = L.allow.map((id) => X.byId[id] && X.byId[id].first).filter(Boolean);
      if (names.length) add(0, "The protagonist permits " + names.join(" and ") + " to touch them in this action only.");
      add(0, "Touch: never, unless the protagonist allows it in this very action.");
    }
    const len = () => parts.reduce((n, x) => n + x.t.length + 1, 2);
    while (len() > s.inject_max) {
      let k = -1;
      for (let i = 0; i < parts.length; i++) if (parts[i].p >= 2 && (k < 0 || parts[i].p >= parts[k].p)) k = i;
      if (k < 0) break;
      parts.splice(k, 1);
    }
    return parts.length ? "[" + parts.map((x) => x.t).join(" ") + "]" : "";
  };

  // ---- commands -------------------------------------------------------------
  // "aff" -> affinity (unique prefix of at least 3 letters, or the full name)
  const resolveStat = (X, word) => {
    const w = String(word).toLowerCase();
    const exact = X.cfg.stats.find((d) => d.name === w);
    if (exact) return exact.name;
    if (w.length < 3) return null;
    const hits = X.cfg.stats.filter((d) => d.name.startsWith(w));
    return hits.length === 1 ? hits[0].name : null;
  };

  const BASECMDS = ["help", "rels", "rel", "allow", "deny", "set", "tie", "ties", "tension", "tensions", "check", "peek"];
  const PAIRCMDS = ["tie", "ties", "tension", "tensions"];

  // longest character name found at the very start of a string
  const matchAt = (X, s) => {
    let best = null;
    for (const c of X.roster) for (const n of c.names) {
      const mm = s.match(new RegExp("^" + esc(n) + "\\b", "i"));
      if (mm && (!best || mm[0].length > best.len)) best = { c, len: mm[0].length };
    }
    return best;
  };

  // /tie A B description   /tension A B +2   /ties [A]   /tensions
  const parsePair = (X, text, cmd, start, after) => {
    const s = text.slice(after);
    let pos = 0;
    const chs = [];
    for (let k = 0; k < 2; k++) {
      const rest = s.slice(pos);
      const skip = rest.match(/^[\s,&+]*(?:(?:and|with)\s+)?/i)[0].length;
      const mm = matchAt(X, rest.slice(skip));
      if (!mm) break;
      if (chs.length && chs[0].id === mm.c.id) { pos += skip + mm.len; break; }
      chs.push(mm.c);
      pos += skip + mm.len;
    }
    let desc = null, numText = null, consumed = pos;
    if (cmd === "tie") {
      const line = s.slice(pos).split("\n")[0];
      desc = line.trim();
      consumed = pos + line.length;
    } else if (cmd === "tension") {
      const nm = s.slice(pos).match(/^\s*([+-]?\d+(?:\.\d+)?)/);
      if (nm) { numText = nm[1]; consumed += nm[0].length; }
    }
    return { cmd, ch: chs[0] || null, chs, desc, numText, stat: null, start, end: after + consumed };
  };

  const parseCmd = (X, text) => {
    const m = text.match(/(^|[\s"“])\/(\w+)/);
    if (!m) return null;
    const cmd0 = m[2].toLowerCase();
    const cmdStat = resolveStat(X, cmd0);
    if (!BASECMDS.includes(cmd0) && !cmdStat) return null;
    const cmd = BASECMDS.includes(cmd0) ? cmd0 : cmdStat;
    const statNames = X.cfg.stats.map((d) => d.name);
    const start = m.index + m[1].length;
    const after = start + 1 + m[2].length;
    if (PAIRCMDS.includes(cmd)) return parsePair(X, text, cmd, start, after);
    const win = text.slice(after, after + 40);

    let best = null;
    for (const c of X.roster) for (const n of c.names) {
      const mm = win.match(new RegExp("\\b" + esc(n) + "\\b", "i"));
      if (mm && (!best || mm.index < best.idx || (mm.index === best.idx && mm[0].length > best.len)))
        best = { c, idx: mm.index, len: mm[0].length };
    }
    const ch = best ? best.c : null;
    let consumed = best ? best.idx + best.len : 0;

    let stat = statNames.includes(cmd) ? cmd : null;
    if (cmd === "set") {
      const re = /[A-Za-z]+/g;
      let w;
      while ((w = re.exec(win)) !== null) {
        const found = resolveStat(X, w[0]);
        if (found) { stat = found; consumed = Math.max(consumed, w.index + w[0].length); break; }
      }
    }
    let numText = null;
    const nm = win.slice(consumed).match(/^\s*([+-]?\d+(?:\.\d+)?)/);
    if (nm) { numText = nm[1]; consumed += nm[0].length; }
    return { cmd, ch, stat, numText, start, end: after + consumed };
  };

  const fmtStats = (X, L, ch) => {
    const r = L.rel[ch.id];
    return activeStats(X, ch).map((d) => d.name + " " + r.s[d.name].toFixed(1)).join(", ");
  };

  const runPairCmd = (X, L, pc) => {
    const [a, b] = pc.chs;
    if (pc.cmd === "ties") {
      if (a) {
        const mine = Object.keys(X.ties).map((k) => X.ties[k]).filter((t) => t.a === a.id || t.b === a.id);
        if (!mine.length) return a.first + " has no ties on the Relations card.";
        return a.first + ": " + mine.map((t) => X.byId[t.a === a.id ? t.b : t.a].first + " (" + t.text + ")").join("; ") + ".";
      }
      if (!X.relCards.length) return "No Relations card found. Create one (Type: Relations).";
      return Object.keys(X.ties).length + " ties loaded." + (X.tieWarn.length ? " Unresolved lines: " + X.tieWarn.join(" / ") + "." : "");
    }
    if (pc.cmd === "tensions") {
      const list = Object.keys(L.tension).filter((k) => L.tension[k] > 0 && X.byId[k.split("|")[0]] && X.byId[k.split("|")[1]])
        .sort((x, y) => L.tension[y] - L.tension[x])
        .map((k) => X.byId[k.split("|")[0]].first + "-" + X.byId[k.split("|")[1]].first + " " + L.tension[k].toFixed(1));
      return list.length ? "Tension: " + list.join(", ") + "." : "No tension between characters yet.";
    }
    if (!a || !b) return "Name two characters, for example /" + pc.cmd + " Mira Tobin" + (pc.cmd === "tie" ? " best friends." : " +2.");
    if (pc.cmd === "tie") {
      if (!pc.desc) return "Add a description, for example /tie Mira Tobin best friends.";
      if (!X.relCards.length) return "Create a Relations card first (Type: Relations).";
      writeTie(X, a, b, pc.desc);
      return a.first + " and " + b.first + ": " + pc.desc;
    }
    // tension
    if (pc.numText == null) return "Add a number, for example /tension " + a.first + " " + b.first + " +2.";
    const key = pk(a.id, b.id), v = num(pc.numText, 0);
    L.tension[key] = clamp(/^[+-]/.test(pc.numText) ? (L.tension[key] || 0) + v : v, 0, X.cfg.s.tension_max);
    persistTension(X, L);
    return "Tension between " + a.first + " and " + b.first + " is now " + L.tension[key].toFixed(1) + ".";
  };

  const runCmd = (X, L, pc) => {
    const ch = pc.ch;
    if (pc.cmd === "peek") return "";   // filled in by onInput once the line for this action is built
    if (pc.cmd === "check") {
      const cfgCards = (storyCards || []).filter((c) => c && String(c.type || "").toLowerCase() === "config").length;
      const d = L.dbg;
      return "LW Affinity Engine " + VERSION + ". Characters " + X.roster.length + ". Config cards " + cfgCards + ". Relations cards " + X.relCards.length + ", ties " + Object.keys(X.ties).length +
        (X.tieWarn.length ? " (" + X.tieWarn.length + " unresolved)" : "") + ". Inject: " + X.cfg.s.inject + ". Events " + X.ev.length + ", arc beats " + X.arc.beats.length + (X.arc.beats.length ? " (act " + L.w.act + " of " + X.arc.maxAct + ")" : "") +
        ", Chronicle card " + (chrCard() ? "yes" : "no") + ", unreadable conditions " + countBadConds(X, L) + ". " +
        (d ? "Last context (action " + d.turn + "): " + d.chars + " chars, " + d.stripped + " hidden marker(s) removed, injected line found: " + (d.injected ? "yes" : "no") + "." +
        (String(X.cfg.s.inject).toLowerCase() === "text" ? "" :
          " frontMemory set by the script: " + ((state.memory && state.memory.frontMemory) ? state.memory.frontMemory.length + " chars" : "empty") +
          (d.taken ? " Another script overwrote frontMemory, so the line went into the context text instead." : "") +
          (d.injected ? "" : " (a 'no' here is normal: AI Dungeon adds frontMemory after this hook, so check the context viewer for the bracketed line; if it is missing there, add 'inject: text' to the Config card)") + ".")
        : "No context seen yet; play one turn and run /check again.");
    }
    if (PAIRCMDS.includes(pc.cmd)) return runPairCmd(X, L, pc);
    if (pc.cmd === "help")
      return "Commands: /rel Name, /rels, /set Name stat value, /<stat> Name +2, /allow Name, /deny [Name], /ties [Name], /tie A B text, /tension A B +2, /tensions, /thoughts [Name|on|off|Name N], /think Name, /log text, /canon flag text, /chronicle, /flag x, /unflag x, /flags, /event id, /events, /arc [next|reroll|mode x|act N], /scene, /time, /day, /npc /faction /place Name, description, /autostats, /twist [id], /twists, /check, /peek. Stats: " +
        X.cfg.stats.map((d) => d.name).join(", ") + ".";
    if (pc.cmd === "rels") {
      const first = X.cfg.stats[0].name;
      return X.roster.slice()
        .sort((a, b) => (L.rel[b.id].s[first] || 0) - (L.rel[a.id].s[first] || 0))
        .map((c) => c.first + ": " + fmtStats(X, L, c)).join(" | ");
    }
    if (pc.cmd === "deny" && !ch) { L.allow = []; return "All touch permissions cleared."; }
    if (!ch) return "Unknown character. Use a first name, for example Mira.";
    const r = L.rel[ch.id];
    if (pc.cmd === "rel") return ch.name + ": " + fmtStats(X, L, ch) + ", scenes " + r.scenes + ", touched " + r.touched.length + " time(s).";
    if (pc.cmd === "allow" || pc.cmd === "deny") {
      if (!X.cfg.s.contact) return "The contact rule module is off in the Config card.";
      if (pc.cmd === "allow") {
        if (!L.allow.includes(ch.id)) L.allow.push(ch.id);
        return ch.first + " may touch the protagonist in your next action only.";
      }
      L.allow = L.allow.filter((x) => x !== ch.id);
      return ch.first + " is not permitted to touch the protagonist.";
    }
    // set / <stat>
    const d = activeStats(X, ch).find((x) => x.name === pc.stat);
    if (!pc.stat) return "Name a stat, for example /set Mira trust 5.";
    if (!d) return ch.first + " has no " + pc.stat + " stat.";
    if (pc.numText == null) return "Add a number, for example /" + d.name + " " + ch.first + " +2.";
    const v = num(pc.numText, 0);
    r.s[d.name] = clamp(/^[+-]/.test(pc.numText) ? r.s[d.name] + v : v, d.min, d.max);
    persist(X, L, ch);
    return ch.first + ": " + d.name + " is now " + r.s[d.name].toFixed(1) + ".";
  };

  // ==========================================================================
  // PHASES 3-5: world state, clock, scenes, chronicle, events, arc, thoughts,
  // cleaner and card creation. All state lives in state.lw.w and is mirrored in
  // the Chronicle card (flags, clock, act, log) so you can read and edit it.
  // ==========================================================================
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  const cardsOf = (type) => (storyCards || []).filter((c) => c && String(c.type || "").toLowerCase() === type);
  const cardText = (c) => String(c.entry || "") + "\n" + String(c.description || "");
  const FIELD = /^(when|stages|hold|sets|log|guide|who)\s*:\s*/i;
  const parseFields = (v) => {
    const pos = [], f = {};
    for (const part of String(v).split("|").map((s) => s.trim())) {
      const m = part.match(FIELD), h = part.match(/^(hold|weight)\s+([\d.]+)$/i);
      if (h) f[h[1].toLowerCase()] = h[2];
      else if (m) f[m[1].toLowerCase()] = part.slice(m[0].length).trim(); else pos.push(part);
    }
    return { pos, f };
  };
  const setList = (v) => String(v || "").split(",").map(slug).filter(Boolean);

  const newW = () => ({
    flags: {}, fired: {}, log: [], day: 1, tod: 0, inited: false, ct: 0, sc: { n: 1, t: 0 }, ev: {}, act: 1, bt: null,
    btEnd: -999, q: {}, mode: "", reroll: 0, seed: Math.floor(Math.random() * 90000) + 1, arcDone: false, off: false,
    force: [], auto: [], create: null, tw: null, twEnd: 0, twUsed: [], pendLog: [], add: [],
  });
  const ensureW = (W) => { const d = newW(); for (const k of Object.keys(d)) if (W[k] === undefined) W[k] = d[k]; };

  // ---- events and arc cards --------------------------------------------------
  // event: id | public/secret/random | when: conds | stages: hint >> escalation >> reveal | hold N | sets: a,b | log: text
  const parseEvents = (cfg) => {
    const out = [];
    for (const c of cardsOf("events")) for (const raw of cardText(c).split("\n")) {
      const line = raw.trim();
      if (!/^event\s*:/i.test(line)) continue;
      const { pos, f } = parseFields(line.replace(/^event\s*:\s*/i, ""));
      const id = slug(pos[0]);
      if (!id) continue;
      const kind = String(pos[1] || "").toLowerCase();
      out.push({ id, kind: ["public", "secret", "random"].includes(kind) ? kind : "public", when: f.when || "",
        stages: (f.stages || "").split(">>").map((t) => t.trim()).filter(Boolean), hold: num(f.hold, cfg.s.event_hold),
        sets: setList(f.sets), log: f.log || "" });
    }
    return out;
  };

  // twist: id | who: low/high/any/absent | when: conds | weight N | hold N | stages: hint >> it happens | sets: a,b | log: text
  // {who} in the text becomes the character the engine picked
  const parseTwists = (cfg) => {
    const out = {};
    for (const c of cardsOf("events")) for (const raw of cardText(c).split("\n")) {
      const line = raw.trim();
      if (!/^twist\s*:/i.test(line)) continue;
      const { pos, f } = parseFields(line.replace(/^twist\s*:\s*/i, ""));
      const id = slug(pos[0]), stages = (f.stages || "").split(">>").map((t) => t.trim()).filter(Boolean);
      if (!id || !stages.length) continue;
      out[id] = { id, who: String(f.who || "").toLowerCase(), when: f.when || "", weight: Math.max(0, num(f.weight, 1)),
        hold: num(f.hold, cfg.s.twist_hold), stages, sets: setList(f.sets), log: f.log || "" };
    }
    return Object.keys(out).map((k) => out[k]);
  };

  // arc: Name | mode hybrid | pick 2 | hold 4 | seed 7
  // act: 1 | Name | text the AI reads during the act
  // beat: 1 | fixed or bank | Title | when: conds | guide: text | sets: a,b | log: text | hold N
  const parseArc = (cfg) => {
    const A = { name: "", mode: "", pick: 2, hold: cfg.s.beat_hold, seed: 0, acts: {}, beats: [], maxAct: 0 };
    for (const c of cardsOf("arc")) for (const raw of cardText(c).split("\n")) {
      const m = raw.trim().match(/^(arc|act|beat)\s*:\s*(.*)$/i);
      if (!m) continue;
      const kind = m[1].toLowerCase();
      const { pos, f } = parseFields(m[2]);
      if (kind === "arc") {
        A.name = pos[0] || A.name;
        for (const t of pos.slice(1)) {
          let k;
          if ((k = t.match(/^mode\s+(authored|hybrid|random)$/i))) A.mode = k[1].toLowerCase();
          else if ((k = t.match(/^pick\s+(\d+)$/i))) A.pick = +k[1];
          else if ((k = t.match(/^hold\s+(\d+)$/i))) A.hold = +k[1];
          else if ((k = t.match(/^seed\s+(\d+)$/i))) A.seed = +k[1];
        }
        if (f.hold) A.hold = num(f.hold, A.hold);
      } else if (kind === "act") {
        const n = parseInt(pos[0], 10);
        if (n > 0) A.acts[n] = { name: pos[1] || "", text: pos.slice(2).join(" | ") };
      } else {
        const n = parseInt(pos[0], 10), title = pos[2];
        if (!(n > 0) || !title) continue;
        A.beats.push({ act: n, kind: /^bank$/i.test(pos[1]) ? "bank" : "fixed", title, id: slug(title), when: f.when || "",
          guide: f.guide || "", sets: setList(f.sets), log: f.log || "", hold: f.hold ? num(f.hold, A.hold) : 0 });
      }
    }
    A.maxAct = Math.max(0, ...Object.keys(A.acts).map(Number), ...A.beats.map((b) => b.act));
    return A;
  };

  // ---- clock -----------------------------------------------------------------
  const times = (X) => String(X.cfg.s.clock_times).split("|").map((s) => s.trim()).filter(Boolean);
  const todName = (X, W) => { const t = times(X); return t[clamp(W.tod, 0, Math.max(0, t.length - 1))] || ""; };
  const dayLabel = (X, W) => "Day " + W.day + (X.cfg.s.clock && todName(X, W) ? ", " + todName(X, W) : "");
  const advTod = (X, W, n) => {
    const len = times(X).length || 1;
    let i = W.tod + n;
    while (i >= len) { i -= len; W.day++; }
    while (i < 0) { i += len; W.day = Math.max(1, W.day - 1); }
    W.tod = i; W.ct = 0;
  };
  const NUMW = { two: 2, three: 3, four: 4, five: 5, several: 3, "a few": 3 };
  // words for a moment of the day -> the default clock_times name ("tod" jumps go to its next occurrence)
  const TODW = { dawn: "dawn", sunrise: "dawn", daybreak: "dawn", "first light": "dawn", morning: "morning", noon: "afternoon",
    midday: "afternoon", afternoon: "afternoon", evening: "evening", dusk: "evening", sunset: "evening", night: "night", nightfall: "night", midnight: "night" };
  const tod = (w) => ({ tod: TODW[String(w).toLowerCase().replace(/\s+/g, " ")] });
  const JUMPS = [
    [/\b(?:a\s+week|one\s+week|weeks?)\s+later\b/i, () => ({ day: 7, tod: "morning" })],
    [/\b(\d+|two|three|four|five|several|a\s+few)\s+days?\s+later\b/i, (m) => ({ day: parseInt(m[1], 10) || NUMW[m[1].toLowerCase().replace(/\s+/g, " ")] || 2, tod: "morning" })],
    [/\b(?:the\s+)?(?:next|following)\s+(?:morning|day)\b|\bthe\s+morning\s+after\b/i, () => ({ day: 1, tod: "morning" })],
    [/\b(?:until|till)\s+(?:the\s+)?(dawn|sunrise|daybreak|first\s+light|morning|noon|midday|afternoon|evening|dusk|sunset|night|nightfall|midnight)\b|\b(?:by|at|around)\s+(dawn|sunrise|daybreak|first\s+light|morning|noon|midday|evening|dusk|sunset|nightfall|midnight)\b/i, (m) => tod(m[1] || m[2])],
    [/\b(dawn|morning|evening|night|dusk)\s+(?:broke|breaks|came|comes|fell|falls|arrived|arrives)\b/i, (m) => tod(m[1])],
    [/\bthe\s+sun\s+(?:rises|rose|comes\s+up|came\s+up)\b/i, () => tod("dawn")],
    [/\bthe\s+sun\s+(?:sets|set|sank|sinks|goes\s+down|went\s+down)\b/i, () => tod("evening")],
    [/\b(?:late\s+|later\s+)?that\s+(night|evening|afternoon)\b/i, (m) => tod(m[1])],
    [/\b(?:an?\s+hour|hours|some\s+time|a\s+while)\s+later\b|\blater\s+that\s+day\b/i, () => ({ step: 1 })],
  ];
  // only narration moves the clock: dialogue, thoughts and memories ("I remember that night") do not
  const narration = (text) => String(text).replace(/"[^"\n]*"|“[^”\n]*”|«[^»\n]*»/g, " ")
    .split(/(?<=[.!?])\s+/).filter((s) => !/\b(?:remember\w*|recall\w*|memor\w+|ago|used\s+to|once\s+upon)\b/i.test(s)).join(" ");
  const detectJump = (text) => {
    const t = narration(text);
    for (const r of JUMPS) { const m = t.match(r[0]); if (m) { const j = r[1](m); if (!("tod" in j) || j.tod || j.day) return j; } }
    return null;
  };
  const applyJump = (X, W, j) => {
    const t = times(X).map((s) => s.toLowerCase());
    if (j.day) { W.day += j.day; const i = t.indexOf(j.tod); W.tod = i < 0 ? 0 : i; W.ct = 0; return; }
    if (j.tod) {
      const i = t.indexOf(j.tod);
      if (i < 0) { advTod(X, W, 1); return; }
      if (i < W.tod) W.day++;
      W.tod = i; W.ct = 0; return;
    }
    advTod(X, W, j.step || 1);
  };
  const scenePhase = (X, W) => {
    const len = Math.max(3, num(X.cfg.s.scene_len, 6)), t = W.sc.t;
    return t < len / 3 ? "setup" : t < (2 * len) / 3 ? "mid" : t < len ? "end" : "over";
  };

  // ---- chronicle card (log + readable mirror of the world state) -------------
  const chrCard = () => {
    const i = (storyCards || []).findIndex((c) => c && String(c.type || "").toLowerCase() === "chronicle");
    return i < 0 ? null : { c: storyCards[i], idx: i };
  };
  const chrSource = (x) => String(x.c.description || "");
  const chrParse = (txt) => {
    const log = [];
    for (const raw of String(txt).replace(WBLOCK, "").split("\n")) {
      const m = raw.match(/^\s*-\s+(.+)$/);
      if (m) log.push(m[1].trim());
    }
    return { log, blk: (String(txt).match(WBLOCK) || [""])[0] };
  };
  const wBlockText = (X, W) => {
    const l = ["<<LWW", "day: " + W.day, "time: " + todName(X, W), "act: " + W.act, "seed: " + W.seed];
    Object.keys(W.flags).sort().forEach((f) => l.push("flag: " + f));
    Object.keys(W.fired).sort().forEach((f) => l.push("fired: " + f));
    l.push("LWW>>");
    return l.join("\n");
  };
  const wAdopt = (X, W, blk) => {
    const flags = {}, fired = {}, t = times(X).map((s) => s.toLowerCase());
    for (const line of blk.split("\n")) {
      const m = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2];
      if (k === "day") W.day = Math.max(1, Math.round(num(v, W.day)));
      else if (k === "time") { const i = t.indexOf(v.toLowerCase()); if (i >= 0) W.tod = i; }
      else if (k === "act") W.act = Math.max(1, Math.round(num(v, W.act)));
      else if (k === "seed") W.seed = Math.max(1, Math.round(num(v, W.seed)));
      else if (k === "flag") flags[slug(v)] = 1;
      else if (k === "fired") fired[slug(v)] = W.fired[slug(v)] != null ? W.fired[slug(v)] : 0;
    }
    W.flags = flags; W.fired = fired;
  };
  const wSync = (X, L) => {
    const W = L.w;
    ensureW(W);
    if (!W.inited) {
      const t = times(X).map((s) => s.toLowerCase()), i = t.indexOf(String(X.cfg.s.clock_time).toLowerCase());
      W.day = Math.max(1, Math.round(num(X.cfg.s.clock_day, 1)));
      W.tod = i < 0 ? 0 : i;
      W.inited = true;
    }
    const x = chrCard();
    if (!x) return;
    const src = chrSource(x).trim();
    if (src === (L.wm || "")) return;
    const cur = chrParse(src);
    if (cur.blk) wAdopt(X, W, cur.blk);
    if (cur.log.length || cur.blk) W.log = cur.log.slice(-LOG_KEEP);
    L.wm = src;
  };
  // state keeps only the latest chronicle entries (what the AI and /chronicle use); the card keeps them all
  const LOG_KEEP = 6;
  const wPersist = (X, L) => {
    const x = chrCard();
    if (!x) { L.w.add = []; return; }
    const W = L.w, srcNow = chrSource(x);
    const own = srcNow.replace(WBLOCK, "").split("\n").filter((l) => !/^\s*-\s+/.test(l)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // the card is the full chronicle: new entries are appended to it, the oldest go past chronicle_max
    const all = chrParse(srcNow).log.concat(W.add).slice(-X.cfg.s.chronicle_max);
    W.add = [];
    const text = [own, all.map((l) => "- " + l).join("\n"), wBlockText(X, W)].filter(Boolean).join("\n");
    if (text === srcNow.trim()) { L.wm = text; return; }
    x.c.description = text;
    L.wm = text;
  };
  // noMem: the engine's own notes (a stat crossing a stage) are not memories
  const addLog = (X, W, text, noMem) => {
    const t = String(text).replace(/\s+/g, " ").replace(/\]/g, ")").trim().slice(0, 220);
    if (!t) return;
    const line = (X.cfg.s.clock ? "[" + dayLabel(X, W) + "] " : "") + t;
    W.log.push(line);
    W.add.push(line);
    while (W.log.length > LOG_KEEP) W.log.shift();
    if (!noMem) remember(X, (X.cfg.s.clock ? "(" + dayLabel(X, W).replace(/,.*$/, "") + ") " : "") + t);
  };
  // every character the entry names keeps it as a memory of their own
  const remember = (X, m) => {
    const L = S();
    for (const ch of X.roster) {
      const r = L.rel[ch.id];
      if (!r || lastPos(ch, m) < 0) continue;
      r.mem = (r.mem || []).filter((o) => o !== m).concat(m).slice(-X.cfg.s.memories_keep);
      persist(X, L, ch);
    }
  };

  // ---- conditions: used by events and arc beats ------------------------------
  const COND_OP = "(>=|<=|>|<|=)";
  const statVal = (L, ch, name) => (L.rel[ch.id] && L.rel[ch.id].s[name] != null ? L.rel[ch.id].s[name] : null);
  const metCount = (X, L) => X.roster.filter((c) => L.rel[c.id] && L.rel[c.id].scenes > 0).length;
  const namesOf = (X, v) => String(v).split(/\s+or\s+|\//i).map((n) => findChar(X, n)).filter(Boolean);
  // returns true, false, or null when the condition cannot be read
  const evalOne = (X, L, cx, raw) => {
    const W = L.w, c = String(raw).trim().toLowerCase();
    if (!c) return true;
    let m;
    if ((m = c.match(/^prob\s*[:=]?\s*(\d+(?:\.\d+)?)$/))) return rng(hashStr(cx.key + ":" + cx.turn + ":" + W.seed))() * 100 < num(m[1], 0);
    if ((m = c.match(/^(!?)(flag|fired)\s*[:=]\s*([\w-]+)$/))) {
      const has = m[2] === "flag" ? !!W.flags[slug(m[3])] : W.fired[slug(m[3])] != null;
      return m[1] ? !has : has;
    }
    if ((m = c.match(/^(present|met)\s*:\s*(.+)$/))) {
      const chs = namesOf(X, m[2]);
      if (!chs.length) return false;
      return m[1] === "present" ? chs.some((ch) => cx.present.includes(ch.id)) : chs.some((ch) => L.rel[ch.id] && L.rel[ch.id].scenes > 0);
    }
    if ((m = c.match(/^time\s*[:=]\s*(.+)$/))) return m[1].split(/\s+or\s+|\//).map((s) => s.trim()).includes(todName(X, W).toLowerCase());
    if ((m = c.match(new RegExp("^(action|day|act|scene|met)\\s*" + COND_OP + "\\s*(-?[\\d.]+)$")))) {
      const v = m[1] === "action" ? cx.turn : m[1] === "day" ? W.day : m[1] === "act" ? W.act : m[1] === "scene" ? W.sc.n : metCount(X, L);
      return cmp(v, m[2], num(m[3], 0));
    }
    if ((m = c.match(/^any[\s.]+(.+)$/))) {
      const toks = [], re = new RegExp("(\\w+)\\s*" + COND_OP + "\\s*(-?[\\d.]+)", "g");
      let t;
      while ((t = re.exec(m[1])) !== null) toks.push({ stat: t[1], op: t[2], val: num(t[3], 0) });
      if (!toks.length || toks.some((k) => !X.cfg.stats.some((d) => d.name === k.stat))) return null;
      return X.roster.some((ch) => toks.every((k) => { const v = statVal(L, ch, k.stat); return v != null && cmp(v, k.op, k.val); }));
    }
    if ((m = c.match(new RegExp("^([a-z][\\w' -]*?)\\.(\\w+)\\s*" + COND_OP + "\\s*(-?[\\d.]+)$")))) {
      const ch = findChar(X, m[1]);
      if (!ch || !X.cfg.stats.some((d) => d.name === m[2])) return null;
      const v = statVal(L, ch, m[2]);
      return v != null && cmp(v, m[3], num(m[4], 0));
    }
    return null;
  };
  const condsOk = (X, L, cx, str, key) => {
    cx.key = key || "";
    for (const part of String(str || "").split(/[,&]/)) {
      const r = evalOne(X, L, cx, part);
      if (r === null) { cx.bad = (cx.bad || 0) + 1; return false; }
      if (!r) return false;
    }
    return true;
  };
  const countBadConds = (X, L) => {
    const cx = { turn: info.actionCount, present: [], bad: 0 };
    const all = X.ev.map((e) => e.when).concat(X.arc.beats.map((b) => b.when));
    for (const s of all) for (const part of String(s).split(/[,&]/)) if (evalOne(X, L, cx, part) === null) cx.bad++;
    return cx.bad;
  };

  // ---- events ------------------------------------------------------------------
  const fireEvent = (X, L, e, cx) => {
    const W = L.w;
    delete W.ev[e.id];
    W.fired[e.id] = cx.turn;
    for (const f of e.sets) W.flags[f] = 1;
    if (e.log) addLog(X, W, e.log);
  };
  const startEvent = (X, L, e, cx) => {
    if (L.w.fired[e.id] != null || L.w.ev[e.id]) return;
    if (!e.stages.length) fireEvent(X, L, e, cx); else L.w.ev[e.id] = { st: 1, at: cx.turn };
  };
  const eventStep = (X, L, cx) => {
    const W = L.w;
    for (const e of X.ev) {
      if (W.fired[e.id] != null) continue;
      const a = W.ev[e.id];
      if (!a) {
        if (Object.keys(W.ev).length >= X.cfg.s.events_max) continue;
        if (condsOk(X, L, cx, e.when, e.id)) startEvent(X, L, e, cx);
      } else if (cx.turn - a.at >= e.hold) {
        a.st++; a.at = cx.turn;
        if (a.st > e.stages.length) fireEvent(X, L, e, cx);
      }
    }
  };
  const EVPREFIX = { public: "Common knowledge: ", secret: "Secret (only hint, never state): ", random: "Something happens: " };

  // ---- arc ---------------------------------------------------------------------
  const beatById = (A, id) => A.beats.find((b) => b.id === id);
  const arcMode = (X, W, A) => W.mode || A.mode || String(X.cfg.s.arc_mode || "hybrid").toLowerCase();
  const buildQueue = (X, L, A, act) => {
    const W = L.w, mode = arcMode(X, W, A);
    const all = A.beats.filter((b) => b.act === act && W.fired[b.id] == null);
    const R = rng(hashStr("q" + act + ":" + (A.seed || W.seed) + ":" + W.reroll));
    const shuf = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t; } return x; };
    const fixed = all.filter((b) => b.kind !== "bank"), bank = all.filter((b) => b.kind === "bank");
    const pick = Math.max(0, A.pick);
    let f, p;
    if (mode === "authored") { f = fixed; p = bank; }
    else if (mode === "random") { f = []; p = shuf(all).slice(0, Math.min(all.length, fixed.length + pick)); }
    else { f = fixed; p = shuf(bank).slice(0, pick); }
    W.q[act] = { f: f.map((b) => b.id), p: p.map((b) => b.id), mode };
  };
  const fireBeat = (X, L, b, cx) => {
    const W = L.w;
    W.fired[b.id] = cx.turn; W.bt = null; W.btEnd = cx.turn;
    for (const f of b.sets) W.flags[f] = 1;
    if (b.log) addLog(X, W, b.log); else W.pendLog.push("Story beat: " + b.title + ".");   // the AI is asked to write what happened
    if (X.cfg.s.clock && X.cfg.s.clock_on_beat) advTod(X, W, 1);
  };
  const actDone = (W, q) => q.f.every((id) => W.fired[id] != null) && ((q.mode === "random" || !q.f.length) ? q.p.every((id) => W.fired[id] != null) : true);
  const arcStep = (X, L, cx) => {
    const A = X.arc, W = L.w;
    if (!A.beats.length || W.arcDone) return;
    if (!W.q[W.act]) buildQueue(X, L, A, W.act);
    if (W.bt) {
      const b = beatById(A, W.bt.id);
      if (!b) W.bt = null;
      else if (cx.turn - W.bt.at >= (b.hold || A.hold)) fireBeat(X, L, b, cx);
    }
    const q = W.q[W.act];
    // act_turns: an act lasts at least that many turns, even when its beats are done early (bank beats and twists fill the wait)
    if (!W.bt && actDone(W, q) && cx.turn - (W.actAt || 0) >= X.cfg.s.act_turns) {
      if (W.act >= A.maxAct) { W.arcDone = true; addLog(X, W, "The story arc comes to its end."); return; }
      W.act++; W.btEnd = cx.turn; W.actAt = cx.turn;
      buildQueue(X, L, A, W.act);
      const an = (A.acts[W.act] || {}).name;
      addLog(X, W, "Act " + W.act + " begins" + (an ? ": " + an : "") + ".");
      return;
    }
    if (!W.bt && cx.turn - W.btEnd >= X.cfg.s.beat_gap) {
      const ok = (id) => { const b = beatById(A, id); return !!b && W.fired[id] == null && condsOk(X, L, cx, b.when, id); };
      const fid = q.f.find((id) => W.fired[id] == null);
      const pick = fid && ok(fid) ? fid : q.p.find(ok) || null;
      if (pick) W.bt = { id: pick, at: cx.turn };
    }
  };

  // ---- twists: a surprise drawn from the deck, fitted to who is in the scene -------
  // how the character feels about the protagonist overall: 0 (worst) to 1 (best), from the auto stats
  const feel = (X, L, ch) => {
    const r = L.rel[ch.id];
    if (!r) return 0.5;
    const ds = activeStats(X, ch).filter((d) => d.mode === "auto" && !d.steady);
    if (!ds.length) return 0.5;
    return ds.reduce((n, d) => n + (r.s[d.name] - d.min) / ((d.max - d.min) || 1), 0) / ds.length;
  };
  // the character a twist is about: "" when it needs nobody, null when nobody fits
  const twistWho = (X, L, cx, kind, R) => {
    if (!kind) return "";
    const pool = kind === "absent"
      ? X.roster.filter((c) => !cx.present.includes(c.id) && L.rel[c.id] && L.rel[c.id].scenes > 0)
      : cx.present.map((id) => X.byId[id]).filter((c) => c && (kind === "low" ? feel(X, L, c) <= 0.35 : kind === "high" ? feel(X, L, c) >= 0.6 : true));
    return pool.length ? pool[Math.floor(R() * pool.length)].first : null;
  };
  const twistFill = (t, who) => String(t).replace(/\{who\}/gi, who || "someone").replace(/[.\s]+$/, "");
  const drawTwist = (X, L, cx, R, onlyId) => {
    const W = L.w;
    const draw = () => {
      const opts = [];
      for (const t of X.tw) {
        if (onlyId ? t.id !== onlyId : W.twUsed.includes(t.id) || !t.weight || !condsOk(X, L, cx, t.when, "tw:" + t.id)) continue;
        const who = twistWho(X, L, cx, t.who, R);
        if (who !== null) opts.push({ t, who });
      }
      let x = R() * opts.reduce((n, o) => n + o.t.weight, 0);
      return opts.find((o) => (x -= o.t.weight) < 0) || opts[0] || null;
    };
    let o = draw();
    if (!o && !onlyId && W.twUsed.length) { W.twUsed = []; o = draw(); }            // deck used up: shuffle it back
    if (!o) return null;
    W.tw = { id: o.t.id, who: o.who, st: 1, at: cx.turn };
    if (!W.twUsed.includes(o.t.id)) W.twUsed.push(o.t.id);
    return o.t;
  };
  const twistStep = (X, L, cx) => {
    const W = L.w, s = X.cfg.s;
    if (!s.twists || !X.tw.length) return;
    if (W.tw) {
      const t = X.tw.find((x) => x.id === W.tw.id);
      if (!t) { W.tw = null; return; }
      if (cx.turn - W.tw.at < t.hold) return;
      W.tw.st++; W.tw.at = cx.turn;
      if (W.tw.st <= t.stages.length) return;
      for (const f of t.sets) W.flags[f] = 1;
      const done = twistFill(t.log || t.stages[t.stages.length - 1], W.tw.who);
      const line = done.charAt(0).toUpperCase() + done.slice(1) + ".";
      if (t.log) addLog(X, W, line); else W.pendLog.push(line);
      W.tw = null; W.twEnd = cx.turn;
      return;
    }
    if (cx.turn - W.twEnd < s.twist_gap) return;
    const R = rng(hashStr("tw:" + cx.turn + ":" + W.seed));
    if (R() * 100 < s.twist_chance) drawTwist(X, L, cx, R);
  };

  // ---- thoughts ------------------------------------------------------------------
  const stageIdx = (X, name, v) => { let n = 0; for (const e of X.cfg.stages[name] || []) if (v >= e[0]) n++; return n; };
  const thSig = (X, ch, r) => activeStats(X, ch).map((d) => stageIdx(X, d.name, r.s[d.name])).join(",");
  const getBases = (ch) => {
    const src = String(ch.card.description || "");
    return src.split("\n").map((l) => { const m = l.match(/^\s*base:\s*(.+)$/i); return m ? m[1].trim() : ""; }).filter(Boolean);
  };
  const planThoughts = (X, L, ids, turn) => {
    const W = L.w, s = X.cfg.s, out = { instr: [], auto: [] };
    if (!s.thoughts || W.off) return out;
    const first = X.cfg.stats[0].name, cand = [];
    for (const id of ids) {
      const ch = X.byId[id], r = L.rel[id];
      if (!ch || !r) continue;
      const iv = num(ch.cfg.vals.thoughts, s.thoughts_interval);
      const forced = W.force.includes(id);
      if (iv <= 0 && !forced) continue;
      const never = r.lastT < 0, overdue = turn - r.lastT >= iv;
      const changed = !never && r.tsig && r.tsig !== thSig(X, ch, r) && turn - r.lastT >= 2;
      if (!(forced || never || overdue || changed)) continue;
      cand.push({ ch, r, score: forced ? 4 : changed ? 3 : never ? 2 : 1 });
    }
    cand.sort((a, b) => b.score - a.score || (b.r.s[first] || 0) - (a.r.s[first] || 0));
    const used = [];
    for (const c of cand.slice(0, Math.max(1, s.thoughts_max))) {
      used.push(c.ch.id);
      const bases = getBases(c.ch);
      if (c.r.bi < bases.length) out.auto.push({ id: c.ch.id, text: bases[c.r.bi] }); else out.instr.push(c.ch);
    }
    W.force = W.force.filter((id) => !used.includes(id));
    return out;
  };
  const thoughtInstr = (X, tp, L) => {
    if (!tp.instr.length) return "";
    // kept short: it is sent whole every time someone thinks (repeats are filtered when the thought is stored)
    const names = tp.instr.map((ch) => ch.first);
    const tones = tp.instr.filter((ch) => ch.cfg.vals.tone).map((ch) => ch.first + " " + String(ch.cfg.vals.tone).replace(/_/g, " "));
    const mood = X.cfg.s.mood;
    return "Begin the reply with " + names.map((n) => n + (mood ? " thinks (x): «...»" : " thinks: «...»")).join(" ") +
      ": one new first-person sentence each, under " + X.cfg.s.thoughts_words + " words, naming people, not pronouns" +
      (mood ? "; x is + if warmer toward the protagonist, - if cooler, = if unchanged" : "") +
      (tones.length ? "; tone: " + tones.join(", ") : "") + ". Then continue the story.";
  };

  // ---- mood: was this scene good or bad for the character? ----------------------
  // a thought's own sign (+ - =) wins; otherwise mood words in the sentences that name the character
  // ponytail: word stems and a 2-word negation window; irony and unnamed pronouns ("you insult her") are missed
  const NEGATION = /(?:\bnot|\bnever|\bno|n['’]t|\bwithout)\s+(?:\w+\s+)?$/i;
  // ch can be a list: then only sentences naming all of them count (a quarrel or a kind moment between two characters)
  const moodScore = (X, ch, text) => {
    const chs = [].concat(ch);
    let sc = 0;
    const hits = (words, sent, v) => {
      if (!words) return;
      const re = new RegExp("\\b(?:" + words + ")\\w*", "gi");
      let m;
      while ((m = re.exec(sent)) !== null) sc += NEGATION.test(sent.slice(Math.max(0, m.index - 24), m.index)) ? -v : v;
    };
    for (const sent of String(text).split(/(?<=[.!?])\s+|\n+/)) {
      if (chs.some((c) => lastPos(c, sent) < 0)) continue;
      hits(X.cfg.s.mood_pos, sent, 1);
      hits(X.cfg.s.mood_neg, sent, -1);
    }
    return sc;
  };
  // factor applied to each auto stat's rate: 1 up, -mood_down down, mood_neutral when nothing happened
  const moodOf = (X, ch, text, th) => {
    const s = X.cfg.s;
    if (th && th.sg) return th.sg === "+" ? s.mood_thought : th.sg === "-" ? -s.mood_thought * s.mood_down : s.mood_neutral;
    const sc = moodScore(X, ch, text);
    return sc > 0 ? 1 : sc < 0 ? -s.mood_down : s.mood_neutral;
  };

  // ---- bonds: a tie drawn from the Relations card deck the first time two characters share a scene ----
  // bond: id | weight N | text with {a} and {b}
  const parseBonds = (X) => {
    const out = [];
    for (const rc of X.relCards) for (const raw of cardText(rc.c).split("\n")) {
      const m = raw.trim().match(/^bond\s*:\s*(.*)$/i);
      if (!m) continue;
      const { pos, f } = parseFields(m[1]);
      const text = pos.slice(1).join(" | ").trim();
      if (slug(pos[0]) && text) out.push({ id: slug(pos[0]), weight: Math.max(0, num(f.weight, 1)), text });
    }
    return out;
  };
  const drawBond = (X, L, a, b) => {
    const s = X.cfg.s, key = pk(a.id, b.id);
    L.bonded = L.bonded || {};
    if (!s.bonds || L.bonded[key] || X.ties[key] || !X.relCards.length) return;
    L.bonded[key] = 1;                                         // one draw per pair, ever: a deleted tie stays deleted
    const R = rng(hashStr("bond:" + key + ":" + L.w.seed)), deck = parseBonds(X);
    if (R() * 100 >= s.bond_chance || !deck.length) return;
    let x = R() * deck.reduce((n, d) => n + d.weight, 0);
    const d = deck.find((o) => (x -= o.weight) < 0);
    if (!d) return;
    const [p, q] = R() < 0.5 ? [a, b] : [b, a];                 // who is {a} is random too (who owes whom)
    writeTie(X, p, q, d.text.replace(/\{a\}/gi, p.first).replace(/\{b\}/gi, q.first));
  };
  // the cfg line of a card: change one key (used by /thoughts Name N)
  const setCfgVal = (ch, key, val) => {
    const vals = Object.assign({}, ch.cfg.vals);
    vals[key] = val;
    const flags = Object.keys(ch.cfg.flags);
    const raw = "[cfg " + flags.concat(Object.keys(vals).map((k) => k + ":" + vals[k])).join(" ") + "]";
    const d = String(ch.card.description || "");
    ch.card.description = CFGRE.test(d) ? d.replace(CFGRE, raw) : raw + "\n" + d;
    ch.cfg.vals = vals; ch.cfg.raw = raw;
  };

  // ---- cleaner: banned phrases and repeated sentences --------------------------
  const matchCase = (m, to) => (/^[A-Z]/.test(m) && to ? to.charAt(0).toUpperCase() + to.slice(1) : to);
  const cleanText = (X, body) => {
    const s = X.cfg.s;
    if (!s.clean) return body;
    let out = body;
    for (const b of X.cfg.ban || []) {
      let re;
      try { re = new RegExp("(?<![\\w])" + esc(b.phrase) + "(?![\\w])", "gi"); } catch (_) { continue; }
      out = out.replace(re, (m) => matchCase(m, b.to));
    }
    if (out !== body) out = out.replace(/[ \t]{2,}/g, " ").replace(/ +([,.;!?])/g, "$1");
    if (s.clean_repeat) {
      const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, "").replace(/\s+/g, " ").trim();
      const seen = new Set();
      for (const h of (history || []).slice(-4)) {
        for (const t of String(h.text || "").replace(THSTRIP, "").split(/(?<=[.!?»"”])\s+/)) { const n = norm(t); if (n.length >= 30) seen.add(n); }
      }
      const kept = out.split("\n").map((line) => {
        if (/ thinks(?: \([+\-=]\))?: «/.test(line)) return line;
        const sents = line.split(/(?<=[.!?»"”])\s+/).filter((t) => {
          const n = norm(t);
          if (n.length < 30) return true;
          if (seen.has(n)) return false;
          seen.add(n);
          return true;
        });
        return sents.join(" ");
      });
      const joined = kept.join("\n").replace(/\n{3,}/g, "\n\n");
      if (joined.replace(/\s/g, "").length > 0) out = joined;
    }
    return out;
  };

  // ---- card creation (/npc /faction /place) -------------------------------------
  const KINDS = {
    npc: { type: "character", word: "character", tpl: "npc_template" },
    faction: { type: "faction", word: "faction", tpl: "faction_template" },
    place: { type: "location", word: "location", tpl: "place_template" },
  };
  const capName = (n) => n.split(" ").map((w, i) => (i > 0 && /^(of|the|de|la|von|van|and)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  // triggers: "Captain Vex Dorn" -> Vex, Vex Dorn, Captain Vex Dorn (a title alone never becomes a trigger)
  const keyList = (kind, name) => {
    const k = [];
    if (kind === "npc") { const core = stripTitles(name); k.push(core.split(" ")[0]); k.push(core); }
    k.push(name);
    const bare = name.replace(/^the\s+/i, "");
    if (bare !== name) k.push(bare);
    return Array.from(new Set(k)).join(", ");
  };
  const keyExists = (kind, name) => {
    const want = keyList(kind, name).toLowerCase().split(",").map((s) => s.trim());
    return (storyCards || []).some((c) => c && String(c.keys || "").toLowerCase().split(",").map((s) => s.trim()).some((k) => want.includes(k)));
  };
  const cleanEntry = (raw, name, max) => {
    let t = String(raw).replace(/\[LW[^\]]*\]/g, "").replace(/```\w*/g, "").trim();
    t = t.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
    t = t.replace(/^(?:entry|story card|card)\s*:\s*/i, "").replace(/^["“«]+|["”»]+$/g, "").replace(/\s{2,}/g, " ").trim();
    // the AI often goes on with the story after the card: stop at the first sentence that reads like story
    const sents = t.split(/(?<=[.!?])\s+/), keep = [];
    for (const sn of sents) {
      if (keep.length && (/^(?:You|Your)\b/.test(sn) || /["“”]/.test(sn))) break;
      keep.push(sn);
    }
    t = keep.join(" ");
    // a card ends with its Appearance sentence
    const ap = t.search(/\bAppearance:/i);
    if (ap >= 0) { const m = t.slice(ap).match(/^[^.!?]*[.!?]/); if (m) t = t.slice(0, ap + m[0].length); }
    if (t.length < 30) return "";
    // the name goes first, unless the card already opens with it ("Captain Vex Dorn, ..." for /npc Vex)
    if (!t.split(",")[0].toLowerCase().includes(stripTitles(name).toLowerCase())) t = name + ", " + t.charAt(0).toLowerCase() + t.slice(1);
    if (t.length > max) {
      const cut = t.slice(0, max), i = cut.lastIndexOf(".");
      t = i > max * 0.5 ? cut.slice(0, i + 1) : cut.trim();
    }
    return t;
  };
  // ---- autostats: the AI designs the stats for this story ------------------------
  const statsReq = (X) => ({ kind: "stats", name: "stats", done: false, doneTurn: -1,
    instr: "[Out of character: before the story goes on, design how the characters' feelings toward the protagonist are measured in THIS story. " +
      "Reply with nothing but 1 or 2 lines like\nstat: name | auto | 0-10 | start N | rate N\nthen, for each stat, one line like\n" +
      "stages: name | 0=text | 3=text | 6=text | 9=text\nRules: one lowercase word per name that fits this story's genre and themes " +
      "(for example loyalty, fear, desire, respect, suspicion, debt); start 0 to 5; rate 0.1 to 0.3; after rate you may add: steady " +
      "(always grows while they are together, for compulsions or curses), romance (romantic feelings), needs otherstat>=N. Each stage text is a " +
      "short phrase about the character's attitude toward the protagonist; 0= may be empty. Be inventive: surprise the player." +
      (X.cfg.stats.some((d) => d.keep) ? " These already exist, so add new ones beside them and do not repeat them: " + X.cfg.stats.filter((d) => d.keep).map((d) => d.name).join(", ") + "." : "") + "]" });

  // rewrite the stat and stages lines of the Config card, and set some keys
  const writeCfg = (statLines, sets, keep) => {
    const c = cardsOf("config")[0];
    if (!c) return;
    const out = [], done = {};
    let at = -1, last = -1;
    for (const l of String(c.description || "").split("\n")) {
      const m = l.match(/^\s*(stat|stages)\s*:\s*([^|]*)/i);
      const nm = m ? m[2].trim().toLowerCase() : "";
      if (m && !(m[1].toLowerCase() === "stages" && nm === "tension") && !(keep || []).includes(nm)) { if (at < 0) at = out.length; continue; }
      if (m && at < 0) last = out.length + 1;                // new stats go right after the kept ones
      const k = ((l.match(/^\s*(\w+)\s*:/) || [])[1] || "").toLowerCase();
      if (sets[k] != null) { out.push(k + ": " + sets[k]); done[k] = 1; } else out.push(l);
    }
    out.splice(at >= 0 ? at : last >= 0 ? last : out.length, 0, ...statLines);
    for (const k of Object.keys(sets)) if (!done[k]) out.push(k + ": " + sets[k]);
    const text = out.join("\n");
    c.description = text;
  };

  const handleStats = (X, L, body) => {
    L.statsDone = true;
    const kept = X.cfg.stats.filter((d) => d.keep).map((d) => d.name);     // stats flagged keep survive a redesign
    const stats = [], stages = [];
    for (const raw of String(body).split("\n")) {
      const m = raw.replace(/^[\s*`>\-]+/, "").match(/^(stat|stages)\s*:\s*(.+)$/i);
      if (!m) continue;
      const p = m[2].split("|"), name = p[0].trim().toLowerCase().replace(/\s+/g, "_");
      if (!/^[a-z][a-z_]{1,19}$/.test(name) || name === "tension" || kept.includes(name)) continue;
      const line = m[1].toLowerCase() + ": " + [name].concat(p.slice(1).map((x) => x.trim())).join(" | ");
      if (m[1].toLowerCase() === "stages") stages.push({ name, line });
      else if (stats.length < 3 && !stats.some((s) => s.name === name)) stats.push({ name, line, auto: /^auto$/i.test((p[1] || "").trim()) });
    }
    if (!stats.length) {
      writeCfg([], { autostats: "off" }, kept);
      return "[LW: Could not read stats from the reply, so the default stats stay. Use /autostats to try again.]";
    }
    const names = stats.map((s) => s.name), auto = stats.filter((s) => s.auto).map((s) => s.name);
    writeCfg(stats.map((s) => s.line).concat(stages.filter((s) => names.includes(s.name)).map((s) => s.line)),
      { tension_stat: kept.includes(X.cfg.s.tension_stat) ? X.cfg.s.tension_stat : auto[0] || names[0],
        chronicle_stats: kept.filter((k) => String(X.cfg.s.chronicle_stats).split("|").includes(k)).concat(auto).join("|"), autostats: "off" }, kept);
    return "[LW: The " + stats.length + " new stats for this story are ready. They stay a surprise; look at the LW Config card if you want to know. Press Continue.]";
  };

  const handleCreate = (X, L, body, turn) => {
    const W = L.w, cr = W.create;
    cr.done = true; cr.doneTurn = turn;
    if (cr.kind === "stats") return handleStats(X, L, body);
    const kind = KINDS[cr.kind], max = Math.min(1000, num(X.cfg.s.max_entry, 1000));
    const entry = cleanEntry(body, cr.name, max);
    if (!entry) return "[LW: Could not read a card from the reply for " + cr.name + ". Try the command again, with a short description.]";
    // the full name is whatever the card text starts with (Kel -> Kel Doran)
    const seg = entry.split(",")[0].trim();
    const full = seg.toLowerCase().includes(stripTitles(cr.name).toLowerCase()) && seg.length <= 40 && /^[\p{L}'’ \-]+$/u.test(seg) ? seg : cr.name;
    const keys = Array.from(new Set(keyList(cr.kind, full).split(", ").concat([cr.name]))).join(", ");
    if (keyExists(cr.kind, cr.name) || keyExists(cr.kind, full)) {
      if (L.made && L.made[cr.name.toLowerCase()] === turn) {            // a retry of the same command: rewrite our own card
        const i = (storyCards || []).findIndex((c) => c && String(c.keys || "") === keys);
        if (i >= 0) { updateStoryCard(i, storyCards[i].keys, entry, storyCards[i].type); return "[LW: Rewrote the " + kind.word + " card for " + cr.name + ".]"; }
      }
      return "[LW: A card for " + cr.name + " already exists, nothing was created.]";
    }
    const res = addStoryCard(keys, entry, kind.type);
    if (res === false) return "[LW: Could not create the card for " + cr.name + " (duplicate triggers).]";
    for (let i = storyCards.length - 1; i >= 0; i--) {
      if (!storyCards[i] || storyCards[i].keys !== keys) continue;
      storyCards[i].title = full;                              // without it the card shows its whole trigger list as a title
      if (kind.type === "character") storyCards[i].description = "[cfg]";
      break;
    }
    L.made = L.made || {};
    L.made[cr.name.toLowerCase()] = turn;
    let tiesNote = "";
    if (cr.ties && kind.type === "character") {
      const X2 = ctxNow(), me = findChar(X2, full), done = [];
      if (me && X2.relCards.length) {
        for (const part of cr.ties.split(/[;,]/)) {
          const e = part.indexOf("=");
          if (e < 0) continue;
          const other = findChar(X2, part.slice(0, e)), txt = part.slice(e + 1).trim();
          if (other && other.id !== me.id && txt) { writeTie(X2, me, other, txt); done.push(other.first); }
        }
      }
      tiesNote = done.length ? " Ties added with " + done.join(", ") + "." : " No ties were added (check the names and that a Relations card exists).";
    }
    return "[LW: Created the " + kind.word + " card for " + cr.name + "." + tiesNote + "]";
  };
  const startCreate = (X, L, cmd, arg) => {
    const kind = KINDS[cmd], W = L.w, turn = info.actionCount;
    let ties = "", a = arg.trim();
    const tm = a.match(/\s*;\s*ties?\s*:?\s*(.+)$/i);
    if (tm) { ties = tm[1]; a = a.slice(0, tm.index).trim(); }
    let name, desc = "";
    const sep = a.match(/^(.+?)\s*(?:,|:|\s-\s|\s\/\s)\s*(.*)$/);
    if (sep) { name = sep[1]; desc = sep[2]; }
    else { const w = a.split(/\s+/); if (w.length <= 4) name = a; else { name = w[0]; desc = w.slice(1).join(" "); } }
    name = capName(name.replace(/[^\p{L}\p{N}'’ \-]/gu, "").replace(/\s+/g, " ").trim());
    if (!name || name.length > 40) return { note: "Give a name, for example /" + cmd + " " + (cmd === "npc" ? "Kel, a barmaid who gossips" : cmd === "place" ? "The Rusty Anchor, a dockside tavern" : "The Silver Hand, a guild of spies") + "." };
    const recent = L.made && L.made[name.toLowerCase()] != null && Math.abs(L.made[name.toLowerCase()] - turn) <= 1;
    if (keyExists(cmd, name) && !recent) return { note: "A card for " + name + " already exists." };
    const max = Math.min(1000, num(X.cfg.s.max_entry, 1000)) - 200;
    const tpl = String(X.cfg.s[kind.tpl] || "");
    W.create = { kind: cmd, name, ties, done: false, doneTurn: -1,
      instr: "[Write only the story card entry for a new " + kind.word + " named " + name + (desc ? " (" + desc + ")" : "") +
        ". Match this style exactly, with the name first: \"" + tpl + "\" Keep it under " + max + " characters, in third person, with no title before the name and nothing else in the reply.]" };
    return { note: "Writing the " + kind.word + " card for " + name + ". The next reply becomes the card.", create: true };
  };

  // ---- world commands -------------------------------------------------------------
  const WCMDS = ["flag", "unflag", "flags", "log", "canon", "chronicle", "event", "events", "arc", "scene", "time", "day", "thoughts", "think", "npc", "faction", "place", "autostats", "twist", "twists"];
  const parseW = (text) => {
    const m = text.match(/(^|[\s"“])\/(\w+)([^\n]*)/);
    if (!m) return null;
    const cmd = m[2].toLowerCase();
    if (!WCMDS.includes(cmd)) return null;
    // Do mode sends "> You /arc." and Say mode '> You say "/arc."': the closing period and quotes are not part of the command
    return { cmd, arg: m[3].replace(/["“”]/g, "").replace(/[\s.!?]+$/, "").trim(), start: m.index + m[1].length, end: m.index + m[0].length };
  };
  const arcStatus = (X, L) => {
    const A = X.arc, W = L.w;
    if (!A.beats.length) return "No Arc card found. Create one (Type: Arc).";
    if (!W.q[W.act]) buildQueue(X, L, A, W.act);
    const q = W.q[W.act], an = (A.acts[W.act] || {}).name;
    const left = q.f.concat(q.p).filter((id) => W.fired[id] == null).map((id) => (beatById(A, id) || {}).title).filter(Boolean);
    return (A.name || "Arc") + (W.arcDone ? " (finished)" : ": act " + W.act + " of " + A.maxAct + (an ? " (" + an + ")" : "")) + ", mode " + arcMode(X, W, A) +
      (W.bt ? ". Active beat: " + (beatById(A, W.bt.id) || {}).title : "") + (left.length ? ". Waiting: " + left.join(", ") : "") + ".";
  };
  const runW = (X, L, w) => {
    const W = L.w, arg = w.arg, turn = info.actionCount, cmd = w.cmd;
    const first = arg.split(/\s+/)[0] || "";
    if (cmd === "npc" || cmd === "faction" || cmd === "place") return startCreate(X, L, cmd, arg);
    if (cmd === "twist" || cmd === "twists") {
      if (!X.tw.length) return { note: "No twists found. Add twist: lines to an Events card." };
      if (cmd === "twists") return { note: X.tw.map((t) => t.id + (W.tw && W.tw.id === t.id ? " (now)" : W.twUsed.includes(t.id) ? " (used)" : "")).join(", ") + "." };
      if (W.tw) return { note: "A twist is already under way; it ends by itself in a few turns." };
      const present = presentIds(X, (history || []).slice(-4).map((h) => h.text).join(" ").replace(MARK, ""), X.cfg.s.max_present);
      const t = drawTwist(X, L, { turn, present }, rng(hashStr("tw!" + turn + ":" + W.seed)), first ? slug(first) : "");
      return { note: t ? "A twist is coming." : first ? "No twist " + slug(first) + " that fits now. Use /twists to list them." : "No twist fits this scene right now." };
    }
    if (cmd === "autostats") { W.create = statsReq(X); return { note: "Designing new stats for this story. The next reply becomes the stats.", create: true }; }
    if (cmd === "flag" || cmd === "unflag") {
      const f = slug(first);
      if (!f) return { note: "Name a flag, for example /" + cmd + " door_unlocked." };
      if (cmd === "flag") W.flags[f] = 1; else delete W.flags[f];
      return { note: "Flag " + f + (cmd === "flag" ? " is set." : " is cleared.") };
    }
    if (cmd === "flags") { const k = Object.keys(W.flags); return { note: k.length ? "Flags: " + k.join(", ") + "." : "No flags are set." }; }
    if (cmd === "log") { if (!arg) return { note: "Write the entry, for example /log Mira forgave the protagonist." }; addLog(X, W, arg); return { note: "Added to the chronicle." }; }
    if (cmd === "canon") {
      const f = slug(first);
      if (!f) return { note: "Use /canon flag_name what happened." };
      W.flags[f] = 1;
      addLog(X, W, arg.slice(first.length).trim() || f.replace(/_/g, " "));
      return { note: "Canon recorded and flag " + f + " set." };
    }
    if (cmd === "chronicle") return { note: W.log.length ? "Chronicle: " + W.log.slice(-6).join(" / ") : "The chronicle is empty." };
    if (cmd === "events") {
      if (!X.ev.length) return { note: "No Events card found. Create one (Type: Events)." };
      return { note: X.ev.map((e) => e.id + " (" + (W.fired[e.id] != null ? "done" : W.ev[e.id] ? "stage " + W.ev[e.id].st + "/" + e.stages.length : "waiting") + ")").join(", ") + "." };
    }
    if (cmd === "event") {
      const e = X.ev.find((x) => x.id === slug(first));
      if (!e) return { note: "Unknown event. Use /events to list them." };
      if (W.fired[e.id] != null) return { note: e.id + " has already happened." };
      startEvent(X, L, e, { turn });
      return { note: "Event " + e.id + " started." };
    }
    if (cmd === "scene") { W.sc = { n: W.sc.n + 1, t: 0 }; if (X.cfg.s.chronicle_every > 0) W.pendLog.push(""); return { note: "Scene " + W.sc.n + " begins." }; }
    if (cmd === "time" || cmd === "day") {
      const a = arg.toLowerCase(), t = times(X);
      if (!a) return { note: dayLabel(X, W) + "." };
      let m;
      if (cmd === "day") {
        if ((m = a.match(/^([+-]\d+)$/))) W.day = Math.max(1, W.day + parseInt(m[1], 10));
        else if ((m = a.match(/^(\d+)$/))) W.day = Math.max(1, parseInt(m[1], 10));
        else return { note: "Use /day 5 or /day +2." };
      } else {
        const dm = a.match(/\bday\s*(\d+)/);
        if (dm) W.day = Math.max(1, parseInt(dm[1], 10));
        if ((m = a.match(/^([+-]\d+)$/))) advTod(X, W, parseInt(m[1], 10));
        else {
          const nm = t.find((x) => new RegExp("\\b" + esc(x.toLowerCase()) + "\\b").test(a));
          if (nm) W.tod = t.indexOf(nm); else if (!dm) return { note: "Use /time morning, /time +1, or /time day 3 evening. Times: " + t.join(", ") + "." };
        }
      }
      W.ct = 0;
      return { note: "It is now " + dayLabel(X, W) + "." };
    }
    if (cmd === "think") {
      const ch = findChar(X, first);
      if (!ch) return { note: "Name a character, for example /think Mira." };
      if (!W.force.includes(ch.id)) W.force.push(ch.id);
      return { note: ch.first + " will think something on the next turn they are in the scene." };
    }
    if (cmd === "thoughts") {
      const a = arg.toLowerCase();
      if (!a) return { note: "Thoughts are " + (W.off || !X.cfg.s.thoughts ? "off" : "on") + ". Default interval " + X.cfg.s.thoughts_interval + " turns. Use /thoughts Name, /thoughts Name 6, /thoughts on or off." };
      if (a === "on" || a === "off") { W.off = a === "off"; return { note: "Thoughts are " + a + "." }; }
      const ch = findChar(X, first);
      if (!ch) return { note: "Unknown character. Use a first name, for example /thoughts Mira." };
      const nm = arg.slice(first.length).trim().match(/^\d+$/);
      if (nm) { setCfgVal(ch, "thoughts", nm[0]); return { note: ch.first + " now thinks every " + nm[0] + " turns" + (nm[0] === "0" ? " (never)." : ".") }; }
      const r = L.rel[ch.id];
      return { note: r && r.th.length ? ch.first + ": " + r.th.map((t) => "«" + t + "»").join(" ") : ch.first + " has no stored thoughts yet." };
    }
    if (cmd === "arc") {
      const A = X.arc, parts = arg.split(/\s+/), sub = (parts[0] || "").toLowerCase(), val = parts.slice(1).join(" ");
      if (!A.beats.length) return { note: "No Arc card found. Create one (Type: Arc)." };
      if (!W.q[W.act]) buildQueue(X, L, A, W.act);
      if (!sub) return { note: arcStatus(X, L) };
      if (sub === "reroll") { W.reroll++; buildQueue(X, L, A, W.act); return { note: "Drew the beats again for act " + W.act + ". " + arcStatus(X, L) }; }
      if (sub === "mode") {
        if (!/^(authored|hybrid|random)$/i.test(val)) return { note: "Modes: authored, hybrid, random." };
        W.mode = val.toLowerCase(); buildQueue(X, L, A, W.act);
        return { note: "Arc mode is now " + W.mode + ". " + arcStatus(X, L) };
      }
      if (sub === "act") {
        const n = parseInt(val, 10);
        if (!(n >= 1 && n <= A.maxAct)) return { note: "Use /arc act 1 to " + A.maxAct + "." };
        W.act = n; W.bt = null; W.arcDone = false; W.btEnd = turn; W.actAt = turn; buildQueue(X, L, A, n);
        return { note: "Moved to act " + n + ". " + arcStatus(X, L) };
      }
      if (sub === "next") {
        const q = W.q[W.act];
        let b = W.bt ? beatById(A, W.bt.id) : null;
        if (!b) { const id = q.f.find((x) => W.fired[x] == null) || q.p.find((x) => W.fired[x] == null); b = id ? beatById(A, id) : null; }
        if (!b) return { note: "Nothing is left in this act; the story moves on at the next turn." };
        fireBeat(X, L, b, { turn });
        return { note: "Beat done: " + b.title + "." };
      }
      return { note: "Use /arc, /arc next, /arc reroll, /arc mode hybrid, /arc act 2." };
    }
    return { note: "" };
  };

  // ---- names with no card: hint the player to make one (cards are never created on their own) ----
  // ponytail: a proper noun is a capitalized word mid-sentence; names only ever seen at a sentence start are missed
  const TITLES = new Set(("i i'm i'll i've i'd mr mrs ms dr sir lady lord captain king queen prince princess master mistress " +
    "god gods oh ah ok okay monday tuesday wednesday thursday friday saturday sunday january february march april may june july " +
    "august september october november december").split(" "));
  // "Captain Vex Dorn" -> "Vex Dorn": honorifics before a name are not the name
  const HONORIFICS = new Set(("mr mrs ms miss dr sir dame lady lord captain commander general sergeant king queen prince princess " +
    "duke duchess count countess baron baroness master mistress father mother sister brother saint").split(" "));
  const stripTitles = (n) => { const w = String(n).trim().split(/\s+/); while (w.length > 1 && HONORIFICS.has(w[0].toLowerCase())) w.shift(); return w.join(" "); };
  const suggestCard = (X, L, body, turn) => {
    const s = X.cfg.s;
    if (!s.suggest_cards) return "";
    L.nm = L.nm || {}; L.sug = L.sug || {};
    const known = new Set();
    const addWords = (t) => { for (const w of String(t).toLowerCase().replace(/^@/, "").split(/[\s,|]+/)) if (w) known.add(w); };
    for (const c of storyCards || []) if (c) { addWords(c.keys || ""); addWords(c.title || ""); }
    addWords(s.skip || "");
    Object.keys(L.sug).forEach(addWords);
    const here = new Set(), re = /\b[A-Z][a-z'’]+(?: [A-Z][a-z'’]+)?\b/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      const pre = body.slice(0, m.index);
      if (/(?:^|[.!?"“”«»:—…]|\n)\s*$/.test(pre)) continue;                 // sentence or line start
      const words = m[0].replace(/['’]s$/, "").split(" ");
      while (words.length && TITLES.has(words[0].toLowerCase())) words.shift();  // "Captain Vex" -> "Vex"
      if (words.length && !words.some((w) => known.has(w.toLowerCase()))) here.add(words.join(" "));
    }
    for (const n of here) { const e = L.nm[n] || (L.nm[n] = [0, -1]); if (e[1] !== turn) { e[0]++; e[1] = turn; } }
    const names = Object.keys(L.nm);
    if (names.length > 150) names.sort((a, b) => L.nm[a][0] - L.nm[b][0]).slice(0, names.length - 100).forEach((n) => delete L.nm[n]);
    const hit = Object.keys(L.nm).find((n) => L.nm[n][0] >= s.suggest_after && !n.split(" ").some((w) => known.has(w.toLowerCase())));
    if (!hit) return "";
    L.sug[hit] = turn;
    return "[LW: " + hit + " keeps coming up but has no card, so the engine does not track them. To add one, type /npc " + hit +
      ", then who they are in a few words. Example: /npc " + hit + ", a guard who owes you a favor. The next reply becomes the card." +
      " Not a person? Use /place " + hit + ", ... or /faction " + hit + ", ... the same way. To stop this note, add " + hit + " to skip: in the Config card.]";
  };

  // ---- hooks ----------------------------------------------------------------
  const onInput = (text) => {
    ensureCards();
    const X = ctxNow(), L = S();
    sync(X, L);
    syncTension(X, L);
    wSync(X, L);
    const W = L.w;
    const w = parseW(text);
    let note = null, rest = text, pc = null, createNow = false;
    W.create = null;                                                // a new action replaces any earlier card request
    if (w) {
      const res = runW(X, L, w);
      note = res.note; createNow = !!res.create;
      rest = (text.slice(0, w.start) + " " + text.slice(w.end)).replace(/\s{2,}/g, " ").replace(/\s+([.!?,;:])/g, "$1").trim();
    } else {
      pc = parseCmd(X, text);
      if (pc) {
        note = runCmd(X, L, pc);
        rest = (text.slice(0, pc.start) + " " + text.slice(pc.end)).replace(/\s{2,}/g, " ").replace(/\s+([.!?,;:])/g, "$1").trim();
      }
    }
    // what the AI will be told about the characters in play
    const histText = (history || []).slice(-6).map((h) => h.text).join(" ").slice(-1500);
    // a touch the player writes herself counts as a touch, and (contact module) as permission for this action, no /allow needed
    L.touchNow = [];
    if (!createNow && !(pc && pc.cmd === "deny")) {
      for (const sent of rest.replace(MARK, "").split(/(?<=[.!?])\s+/)) {
        if (!CONSENT.test(sent)) continue;
        let who = presentIds(X, sent, 2);
        if (!who.length) who = presentIds(X, histText.replace(MARK, ""), 1);      // "I take his hand": the last one mentioned
        for (const id of who) L.touchNow.push([id, !rough(X, sent)]);
      }
      if (X.cfg.s.contact && X.cfg.s.auto_allow) for (const [id] of L.touchNow) if (!L.allow.includes(id)) L.allow.push(id);
    }
    const recent = histText + " " + rest;
    const ids = presentIds(X, recent.replace(MARK, ""), X.cfg.s.max_present);
    let block = "";
    // autostats: on the first action the AI designs this story's stats; the player's action stays in the story
    const designing = !w && !pc && !!X.cfg.s.autostats && !L.statsDone;
    if (designing) W.create = statsReq(X);
    if (!createNow && !designing) {
      const tp = planThoughts(X, L, ids, info.actionCount);
      W.auto = tp.auto;
      block = buildInject(X, L, ids, tp);
    }
    L.lastBlock = block;
    L.lastAction = createNow ? "" : rest.replace(MARK, "");
    L.pending = block;                                              // kept for the context hook in either mode
    if (String(X.cfg.s.inject).toLowerCase() !== "text") { state.memory = state.memory || {}; state.memory.frontMemory = block; }
    if (pc && pc.cmd === "peek") note = block ? "The AI is told: " + block : "Nothing is being sent to the AI right now.";
    wPersist(X, L);
    let out = text;
    if (pc || w) {
      const mark = "[LW: " + String(note).replace(/\]/g, ")") + "]";
      // what is left of "> You /arc." or '> You say "/arc."' is only the Do/Say wrapper: show the note alone
      const left = rest.replace(/^\s*>?\s*you(?:\s+say)?\b/i, "").replace(/[\s.!?,;:"“”]/g, "");
      out = createNow || !left ? mark : rest + " " + mark;
    }
    return { text: out };
  };

  // a full context: cut the oldest story text still in it (found through history) so the line fits;
  // the instructions and cards at the top and the latest text stay
  // ponytail: history entries are matched by their first 60 characters; if none is found, nothing is cut
  const makeRoom = (out, need, room) => {
    const over = out.length + need - room + 1;
    if (!room || over <= 0) return out;
    let i = -1;                                                  // the earliest place any history text appears (texts can repeat)
    for (const h of history || []) {
      const t = String(h.text || "").trim().slice(0, 60), k = t.length < 20 ? -1 : out.indexOf(t);
      if (k >= 0 && (i < 0 || k < i)) i = k;
    }
    if (i >= 0) {
      let j = i + over;
      const nl = out.indexOf("\n", j);
      if (nl >= 0 && nl - j < 300) j = nl;                       // end the cut at a line break when one is near
      return j < out.lastIndexOf("\n") ? out.slice(0, i) + out.slice(j) : out;
    }
    return out;
  };

  const onContext = (text) => {
    const X = ctxNow(), L = S();
    const markers = (text.match(/<<LW[RW]?\n|\[cfg|\[LW:/g) || []).length;
    const probe = (L.lastBlock || "").slice(0, 50);
    L.dbg = { turn: info.actionCount, chars: text.length, stripped: markers, injected: !!probe && text.includes(probe) };
    let out = text.replace(MARK, "").replace(RELBLOCK, "").replace(WBLOCK, "").replace(BLOCK, "").replace(CFGRE, "")
      .replace(BASERE, "").replace(THSTRIP, "").replace(/\n{3,}/g, "\n\n");
    // text mode, or frontMemory overwritten by another script since onInput: the line goes into the context itself
    const fm = state.memory && state.memory.frontMemory;
    L.dbg.taken = String(X.cfg.s.inject).toLowerCase() !== "text" && !!L.pending && fm !== L.pending;
    if (L.pending && (String(X.cfg.s.inject).toLowerCase() === "text" || L.dbg.taken)) {
      const room = info.maxChars || 0;
      out = makeRoom(out, L.pending.length + 1, room);
      if (!room || out.length + L.pending.length < room) {
        const i = out.lastIndexOf("\n");
        out = i === -1 ? L.pending + "\n" + out : out.slice(0, i) + "\n" + L.pending + out.slice(i);
        L.dbg.injected = true;
      }
    }
    const cr = L.w && L.w.create;
    if (cr && (!cr.done || cr.doneTurn === info.actionCount)) out = out.replace(/\s+$/, "") + "\n\n" + cr.instr;
    return { text: out };
  };

  // contact the player writes into her own action (permission for that action only)
  const CONSENT = /\b(?:hug\w*|embrac\w+|kiss\w*|cuddl\w+|nuzzl\w+|snuggl\w+|caress\w*)\b|\b(?:touch\w*|stroke[sd]?|stroking|hold(?:s|ing)?|held|grab\w*|grasp\w*|squeez\w+|clasp\w*|cradl\w+|pull(?:s|ed)?|press\w*|brush\w*|pat(?:s|ted)?|lean\w*|rest\w*|tak(?:e|es|en)|took|offer\w*|extend\w*|giv(?:e|es|en)|gave|reach\w*|lay|lays|laid|put|puts|place\w*|link\w*|shak(?:e|es|ing)|shook)\b[^.!?]*\b(?:hand|hands|arm|arms|face|cheek|shoulder|shoulders|waist|hair|wrist|fingers|palm|lap|chest|neck|forehead)\b|\b(?:run|runs|ran|running|fall|falls|fell|step|steps|stepped|stepping)\b[^.!?]*\binto\s+(?:his|her|their|my|\w+(?:\s\w+)?['’]s)\s+arms\b/i;
  const rough = (X, sent) => !!X.cfg.s.mood_neg && new RegExp("\\b(?:" + X.cfg.s.mood_neg + ")", "i").test(sent);
  // a friendly touch raises the touch_stats this character has (a stat's "needs" still applies)
  const touchBump = (X, ch, r) => {
    const names = String(X.cfg.s.touch_stats || "").split("|").map((x) => x.trim().toLowerCase());
    for (const d of activeStats(X, ch)) {
      if (!names.includes(d.name) || r.s[d.name] == null) continue;
      if (d.needs && !cmp(r.s[d.needs.stat] != null ? r.s[d.needs.stat] : 0, d.needs.op, d.needs.val)) continue;
      r.s[d.name] = clamp(r.s[d.name] + num(X.cfg.s.touch_bonus, 0), d.min, d.max);
    }
  };
  const TOUCH = /\b(grab|grabs|grabbed|hug|hugs|hugged|seize|seizes|seized|caress|caresses|caressed|stroke|strokes|stroked|kiss|kisses|kissed|embrace|embraces|embraced|reach(?:es|ed)? for|takes?|took|holds?|held|touch(?:es|ed)?|grasp(?:s|ed)?)\b[^.!?]*\b(hand|hands|face|cheek|arm|waist|shoulder|hair|wrist|fingers)\b|\b(grab|grabs|grabbed|seize|seizes|seized|caress|caresses|caressed|kiss|kisses|kissed|embrace|embraces|embraced)\b/i;

  const onOutput = (text) => {
    ensureCards();
    const X = ctxNow(), L = S();
    sync(X, L);
    syncTension(X, L);
    wSync(X, L);
    const turn = info.actionCount;
    if (L.applied && L.applied.turn === turn) {            // retry: do not double count
      L.rel = clone(L.applied.rel);
      L.allow = L.applied.allow.slice();
      L.tension = clone(L.applied.tension || {});
      if (L.applied.w) L.w = clone(L.applied.w);
      const x = chrCard();                                  // entries appended by the retried reply come out of the card
      if (x && L.applied.chr != null) { x.c.description = L.applied.chr; L.wm = L.applied.chr.trim(); }
      sync(X, L);
      ensureW(L.w);
    } else {
      const x = chrCard();
      L.applied = { turn, rel: clone(L.rel), allow: L.allow.slice(), tension: clone(L.tension), w: clone(L.w), chr: x ? chrSource(x) : null };
    }
    const W = L.w;
    if (W.create && W.create.done && W.create.doneTurn !== turn) W.create = null;

    // a pending /npc /faction /place: the reply is the card text, not story
    if (W.create) {
      let res;
      try { res = handleCreate(X, L, text, turn); }
      catch (e) { W.create.done = true; W.create.doneTurn = turn; res = "[LW: Could not create the card for " + W.create.name + ": " + String((e && e.message) || e).replace(/\]/g, ")") + "]"; }
      try { wPersist(X, L); } catch (_) { /* ignore */ }
      return { text: res };
    }

    let body = text, logged = false;
    // markers the AI may write: {flag:x} {event:x} {beat} {log:text}
    const onMark = (m, k, v) => {
      const kind = k.toLowerCase(), val = String(v || "").trim();
      if (kind === "flag" && val) W.flags[slug(val)] = 1;
      else if (kind === "log" && val) { addLog(X, W, val); logged = true; }
      else if (kind === "event") { const e = X.ev.find((x) => x.id === slug(val)); if (e) startEvent(X, L, e, { turn }); }
      else if (kind === "beat" && W.bt) W.bt.at = -1000;
      return "";
    };
    // the AI sometimes forgets the closing brace: then the marker runs to the end of its line
    body = body.replace(/\{\s*(flag|event|beat|log)\s*(?::\s*([^}]*))?\}/gi, onMark)
      .replace(/\{\s*(flag|event|beat|log)\s*(?::\s*([^}\n]*))?$/gim, onMark)
      .replace(/[ \t]{2,}/g, " ").replace(/\s+$/, "");
    // a twist or beat that ended last turn: the AI was asked for a {log:...}; without one, the generic text goes in
    if (W.pendLog.length) { if (!logged) W.pendLog.forEach((l) => addLog(X, W, l)); W.pendLog = []; }

    // thoughts: the AI writes "Name thinks: «...»"; the engine stores it in the card's Notes and, unless
    // thoughts_show is on, removes it from the story text (like Inner Self does)
    const found = [], showTh = !!X.cfg.s.thoughts_show;
    let removed = false;
    const grab = (ch, raw, sg) => {
      const segs = [];
      String(raw).replace(/«([^»]*)»/g, (m, q) => { segs.push(q); return m; });
      let tx = (segs.length ? segs[0] : String(raw).replace(/^[«"“\s]+|[»"”\s]+$/g, "")).trim();
      if (!tx) return null;
      const words = tx.split(/\s+/), cap = X.cfg.s.thoughts_words * 2;
      if (words.length > cap) tx = words.slice(0, cap).join(" ") + "…";
      if (found.length < Math.max(2, X.cfg.s.thoughts_max) && !found.some((f) => f.ch.id === ch.id)) found.push({ ch, text: tx, sg });
      return ch.first + " thinks: «" + tx + "»";
    };
    // the thought ends at its closing quote; with no quotes, at a sentence that starts with a character's name
    // or past thoughts_words words. Whatever follows on the line stays in the story (and may hold the next thought)
    // ponytail: a short unquoted narration sentence right after the thought is taken as part of it
    const splitThought = (raw) => {
      const s = String(raw).trim();
      if (/^[*_]*«/.test(s)) { const i = s.indexOf("»"); return i < 0 ? [s, ""] : [s.slice(0, i + 1), s.slice(i + 1).replace(/^[*_]*\s*/, "")]; }
      const q = s.match(/^[*_]*(?:"([^"]*)"|“([^”]*)”)[*_]*\s*([\s\S]*)$/);
      if (q) return [q[1] != null ? q[1] : q[2], q[3]];
      const sents = s.replace(/^[*_]*["“]/, "").split(/(?<=[.!?…])\s+/);
      let n = 0, k = 0;
      for (; k < sents.length; k++) {
        const w = sents[k].split(/\s+/).length, first = sents[k].replace(/^[*_]+/, "").split(/[\s,]/)[0];
        if (k && (n + w > X.cfg.s.thoughts_words || findChar(X, first))) break;
        n += w;
      }
      return [sents.slice(0, k).join(" "), sents.slice(k).join(" ")];
    };
    const onThink = (m, ind, nm, sg, t) => {
      const ch = findChar(X, nm);
      if (!ch || !L.rel[ch.id]) return m;
      const [tx, rest] = splitThought(t);
      const shown = grab(ch, tx, sg);
      if (shown == null) return m;
      if (!showTh) removed = true;
      return ind + [showTh ? shown : "", rest].filter(Boolean).join(" ");
    };
    for (let i = 0, prev = null; i < 6 && prev !== body; i++) { prev = body; body = body.replace(THRE, onThink); }
    // mid-paragraph too, in «», "" or “” quotes
    body = body.replace(/([A-Z][\w'’\-]*(?: [\w'’\-]+){0,2}) thinks(?: \(([+\-=])\))?: (?:«([^»\n]*)»|"([^"\n]*)"|“([^”\n]*)”)[ \t]*/g, (m, nm, sg, q1, q2, q3) => {
      const q = q1 != null ? q1 : q2 != null ? q2 : q3;
      const words = nm.split(" ");
      for (let k = 0; k < words.length; k++) {
        const ch = findChar(X, words.slice(k).join(" "));
        if (ch && L.rel[ch.id]) {
          const shown = grab(ch, "«" + q + "»", sg);
          if (shown == null) return m;
          if (showTh) return words.slice(0, k).concat([shown]).join(" ") + " ";
          removed = true;
          return words.slice(0, k).join(" ") + (k ? " " : "");
        }
      }
      return m;
    });
    if (W.auto && W.auto.length) {
      const lines = [];
      for (const a of W.auto) {
        const ch = X.byId[a.id];
        if (!ch || !L.rel[a.id] || found.some((f) => f.ch.id === a.id)) continue;
        lines.push(ch.first + " thinks: «" + a.text + "»");
        found.push({ ch, text: a.text });
        L.rel[a.id].bi++;
      }
      if (lines.length && showTh) body = lines.join("\n") + "\n\n" + body.replace(/^\s+/, "");
    }
    W.auto = [];
    if (removed) body = body.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");

    const ids = presentIds(X, body, 12);
    for (const f of found) if (!ids.includes(f.ch.id)) ids.push(f.ch.id);     // whoever thought was in the scene
    const moodText = (L.lastAction || "") + "\n" + body;
    const damped = !!X.cfg.s.damp_words && new RegExp("\\b(?:" + X.cfg.s.damp_words + ")\\b", "i").test(body);
    const logStats = String(X.cfg.s.chronicle_stats || "").split("|").map((x) => x.trim()).filter(Boolean);
    for (const id of ids) {
      const ch = X.byId[id], r = L.rel[id];
      r.scenes++;
      r.last = turn;
      const accel = Math.min(1.5, 1 + r.scenes / (X.cfg.s.accel_scenes || 40));
      const snapshot = clone(r.s);
      const mood = moodOf(X, ch, moodText, found.find((f) => f.ch.id === id));
      for (const d of activeStats(X, ch)) {
        const rate = rateOf(d, ch) || (d.steady && r.yr) || 0;     // r.yr: a secret yandere's obsession rate
        if (d.mode !== "auto" || rate <= 0) continue;
        const f = X.cfg.s.mood && !d.steady ? mood : 1;
        if (!f) continue;
        if (f > 0 && d.needs && !cmp(snapshot[d.needs.stat] != null ? snapshot[d.needs.stat] : 0, d.needs.op, d.needs.val)) continue;
        const delta = rate * accel * f * (d.damp && damped ? X.cfg.s.damp_factor : 1);
        r.s[d.name] = clamp(r.s[d.name] + delta, d.min, d.max);
      }
      // the chronicle notes when a feeling crosses a big threshold
      for (const name of logStats) {
        if (snapshot[name] == null || r.s[name] == null) continue;
        let hit = null;
        for (const e of X.cfg.stages[name] || []) if (e[0] >= X.cfg.s.chronicle_min && snapshot[name] < e[0] && r.s[name] >= e[0] && e[1]) hit = e[1];
        if (hit) addLog(X, W, ch.first + " is now " + hit + ".", true);
      }
    }
    for (const f of found) {
      const r = L.rel[f.ch.id];
      if (!r) continue;
      if (!r.th.some((o) => thSame(o, f.text))) r.th.push(f.text);   // a repeated thought is not stored again
      while (r.th.length > X.cfg.s.thoughts_keep) r.th.shift();
      r.lastT = turn;
      r.tsig = thSig(X, f.ch, r);
    }

    // pairs sharing a scene: rivals for the protagonist, a quarrel or a kind moment between them, a tie drawn when they first meet
    const ts = X.cfg.s;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = X.byId[ids[i]], B = X.byId[ids[j]], key = pk(A.id, B.id);
        const va = L.rel[A.id].s[ts.tension_stat], vb = L.rel[B.id].s[ts.tension_stat];
        let dt = va != null && vb != null && va >= ts.tension_min && vb >= ts.tension_min ? ts.tension_rate : 0;
        if (ts.mood) { const sc = moodScore(X, [A, B], body); dt += sc < 0 ? ts.tension_rate : sc > 0 ? -ts.tension_rate : 0; }
        if (dt) L.tension[key] = clamp((L.tension[key] || 0) + dt, 0, ts.tension_max);
        drawBond(X, L, A, B);
      }
    }

    // scenes and clock
    const jump = detectJump((L.lastAction || "") + "\n" + body);           // your action counts too ("I sleep until morning")
    if (jump) { W.sc = { n: W.sc.n + 1, t: 0 }; if (ts.clock) applyJump(X, W, jump); }
    else {
      W.sc.t++;
      if (ts.clock) { W.ct++; if (ts.clock_turns > 0 && W.ct >= ts.clock_turns) advTod(X, W, 1); }
    }
    // scene summaries: when a scene closes, or every chronicle_every turns of a long one, the AI logs what happened
    // (an empty fallback: nothing generic is written if it forgets)
    if (ts.chronicle_every > 0 && (jump || W.sc.t % ts.chronicle_every === 0)) W.pendLog.push("");

    // events and the arc
    const cx = { turn, present: ids, bad: 0 };
    eventStep(X, L, cx);
    arcStep(X, L, cx);
    twistStep(X, L, cx);

    body = cleanText(X, body);

    // touches are counted with the contact module on or off; the module only adds permission and warnings
    // a touch is friendly unless one of its sentences is rough
    const warned = [], touched = [], kind = {};
    const hit = (id, k) => { if (!touched.includes(id)) touched.push(id); kind[id] = kind[id] !== false && k; };
    for (const [id, k] of L.touchNow || []) if (L.rel[id]) hit(id, k);
    const mine = touched.slice();
    for (const sent of body.split(/(?<=[.!?])\s+/)) {
      if (!TOUCH.test(sent)) continue;
      let who = presentIds(X, sent, 2);
      // ponytail: "He takes your hand" names no one: the one the player touched, or the only character in the reply
      if (!who.length) who = mine.length ? mine : ids.length === 1 ? ids : [];
      for (const id of who) {
        if (!X.cfg.s.contact || L.allow.includes(id)) hit(id, !rough(X, sent));
        else if (!warned.includes(X.byId[id].first)) warned.push(X.byId[id].first);
      }
    }
    for (const id of touched) {
      const r = L.rel[id];
      if (!r || r.touched.slice(-1)[0] === turn) continue;
      r.touched.push(turn);
      if (kind[id]) touchBump(X, X.byId[id], r);
    }
    for (const id of new Set([...ids, ...touched])) if (X.byId[id]) persist(X, L, X.byId[id]);
    persistTension(X, L);
    wPersist(X, L);
    L.allow = [];

    let out = body;
    if (warned.length && X.cfg.s.warn_touch)
      out += "\n\n[LW: possible touch by " + warned.join(", ") + " without permission.]";
    const sug = suggestCard(X, L, body, turn);
    if (sug) out += "\n\n" + sug;
    if (L.err) { out += "\n\n[LW error: " + String(L.err).replace(/\]/g, ")") + "]"; L.err = null; }
    if (!out.trim()) out = "​";
    return { text: out };
  };

  const safe = (name, text, fn) => {
    try { return fn(); }
    catch (e) {
      try { S().err = name + ": " + ((e && e.message) || e); } catch (_) { /* ignore */ }
      log("LW error in " + name + ": " + ((e && e.stack) || e));
      return { text };
    }
  };

  return { safe, onInput, onContext, onOutput };
})();