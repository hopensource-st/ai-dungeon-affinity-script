// Smoke test: runs the three hooks against a fake AI Dungeon adventure.  node test.js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const lib = fs.readFileSync(__dirname + "/library.js", "utf8");
const hook = (name) => fs.readFileSync(__dirname + "/" + name + ".js", "utf8");

// someone else's scenario: plain character cards, no [cfg], no engine cards
const storyCards = [
  { id: 1, keys: "Mira, the innkeeper", entry: "Mira is a cheerful innkeeper with red hair.", type: "character", title: "Mira", description: "" },
  { id: 2, keys: "Tobin", entry: "Tobin Wren, a stable hand.", type: "character", title: "", description: "" },
  { id: 3, keys: "Hero", entry: "You are a wandering knight.", type: "character", title: "Hero", description: "" },
  { id: 4, keys: "Inn", entry: "The Rusty Anchor.", type: "location", title: "Rusty Anchor", description: "" },
];
const G = {
  state: {}, info: { actionCount: 0, maxChars: 8000 }, history: [], storyCards, log: () => {},
  addStoryCard: (keys, entry, type) => {
    if (storyCards.some((c) => c.keys === keys)) return false;
    storyCards.push({ id: storyCards.length + 1, keys, entry, type, title: "", description: "" });
    return storyCards.length;
  },
  updateStoryCard: (i, keys, entry, type) => Object.assign(storyCards[i], { keys, entry, type }),
};
G.state.memory = {};
const ctx = vm.createContext(G);
const run = (name, text) => { ctx.text = text; return vm.runInContext("(() => {\n" + lib + "\n" + hook(name).replace(/modifier\(text\)\s*$/, "return modifier(text)") + "\n})()", ctx); };

const turn = (action, reply) => {
  G.info.actionCount++;
  const a = run("input", action).text;
  run("context", "Story so far.\n" + a);
  const o = run("output", reply).text;
  G.history.push({ text: a }, { text: o });
  return o;
};

// first action: the engine creates its cards and the AI designs the stats
const design = turn("You walk into the inn.",
  "Sure! Here are the stats:\n- stat: Affinity | auto | 0-10 | start 1 | rate 0.2\nstat: suspicion | manual | 0-10 | start 2\n" +
  "stages: affinity | 0=cold to the protagonist | 5=warm to the protagonist\nstages: suspicion | 0= | 5=suspects the protagonist\nstat: bad name! | auto");
for (const t of ["config", "relations", "chronicle"]) assert(storyCards.some((c) => c.type === t), "auto card " + t);
const cfgText = storyCards.find((c) => c.type === "config").description;
assert(/^stat: suspicion \| manual/m.test(cfgText) && /^stat: trust /m.test(cfgText) && /^stat: attraction /m.test(cfgText), "designed stats join the defaults:\n" + cfgText);
assert((cfgText.match(/^stat: affinity /gm) || []).length === 1, "AI copy of a kept stat ignored");
assert(cfgText.indexOf("stat: suspicion") < cfgText.indexOf("max_present:"), "new stats sit with the others");
assert(/^stat: obsession | auto .*| steady | keep$/m.test(cfgText) && /^stages: obsession/m.test(cfgText), "obsession kept through autostats");
assert(/^autostats: off$/m.test(cfgText) && /^tension_stat: affinity$/m.test(cfgText), "autostats turned off, tension follows");
assert(/new stats for this story are ready/.test(design) && !/suspicion/.test(design), "design stays a surprise: " + design);
assert(G.history[0].text === "You walk into the inn.", "player action kept");
turn("I sit at the bar.", "Mira smiles at you from behind the bar. \"Welcome, traveler.\"");
assert(/<<LW\naffinity: /.test(storyCards[0].description), "Mira got a stat block in Notes");
assert(!/<<LW/.test(storyCards[0].entry), "entry untouched");
assert(G.state.lw.rel["1"].scenes === 1, "Mira counted in scene");

// /skip via config, then commands
const cfg = storyCards.find((c) => c.type === "config");
cfg.description += "\nskip: Hero";
const rel = turn("/rel Mira", "The fire crackles.");
assert(rel !== undefined);
assert(!G.state.lw.rel["3"] || G.state.lw.rel["3"].scenes === 0, "Hero skipped");
const out = run("input", "/rels").text;
assert(/Mira: affinity/.test(out) && /Tobin: affinity/.test(out), "/rels lists cards found by title and by trigger: " + out);
assert(!/Hero/.test(out), "skipped character not listed");
assert(!/LW error/.test(turn("I nod.", "Tobin waves.")), "no engine errors");

// mood: kind scene raises, rude scene lowers, neutral scene leaves alone, thought sign wins
const aff = () => G.state.lw.rel["1"].s.affinity;
let v = aff();
turn("I thank Mira for the meal.", "Mira smiles warmly.");
assert(aff() > v, "positive scene raises affinity");
v = aff();
turn("I mock Mira's cooking.", "Mira glares at you.");
assert(aff() < v, "negative scene lowers affinity");
v = aff();
turn("I look at Mira.", "Mira wipes the counter.");
assert(aff() === v, "neutral scene keeps affinity");
turn("I didn't thank Mira.", "Mira waits.");
assert(aff() < v, "negated praise counts as negative");
v = aff();
const shown = turn("I wave at Mira.", "Mira thinks (-): «Always so distant.»\nMira smiles politely.");
assert(aff() < v, "thought sign beats the words");
assert(!/thinks/.test(shown) && /Always so distant/.test(storyCards[0].description), "thought hidden from story, kept in Notes");

// twists and arc: over a long quiet stretch a twist is drawn and the AI is told about it; the arc moves on
assert(storyCards.some((c) => c.type === "events" && /twist: secret/.test(c.description)), "twist deck card");
let told = 0;
for (let i = 0; i < 40; i++) {
  turn("I chat with Mira.", "Mira nods and keeps working.");
  if (/Twist/.test(G.state.memory.frontMemory || "")) told++;
}
const W = G.state.lw.w;
assert(W.twUsed.length >= 1 && told >= 1, "a twist was drawn and injected");
assert(W.fired.inciting_incident != null, "arc reached its first beat");
assert(/Mira/.test(run("input", "/twists").text) === false && /secret/.test(run("input", "/twists").text), "/twists lists the deck");

// bonds: Mira and Tobin share a scene for the first time and get a tie from the deck; a quarrel raises their tension
cfg.description += "\nbond_chance: 100";
const relCard = storyCards.find((c) => c.type === "relations");
relCard.description = relCard.description.replace(/^(?:Mira|Tobin) \| .*\n?/gm, "");
G.state.lw.bonded = {};
turn("I watch Mira and Tobin.", "Mira hands Tobin a cup. Tobin takes it.");
assert(/^(Mira \| Tobin|Tobin \| Mira) \| /m.test(relCard.description), "bond drawn:\n" + relCard.description);
const tie = relCard.description.match(/^(?:Mira \| Tobin|Tobin \| Mira) \| (.*)$/m)[1];
assert(!/\{a\}|\{b\}/.test(tie), "bond names filled in");
turn("I wait.", "Mira yells at Tobin.");
assert(new RegExp(tie.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(G.state.memory.frontMemory), "AI told the bond");
const tKey = Object.keys(G.state.lw.tension).find((k) => G.state.lw.tension[k] > 0);
assert(tKey, "quarrel raised tension");

// names with no card: one hint after 3 different turns, never for known cards, titles or weekdays, never a card made
const nCards = storyCards.length;
const replies = [];
for (let i = 0; i < 4; i++) replies.push(turn("I look around.", "On day " + i + " you notice Captain Vex near Mira on Monday."));
assert(!/keeps coming up/.test(replies[0] + replies[1]) && /\[LW: Vex keeps coming up\. Give them a card with \/npc Vex/.test(replies[2]), "hint on the 3rd turn: " + replies[2]);
assert(!/keeps coming up/.test(replies[3]), "hint only once");
assert(!replies.some((r) => /(Mira|Monday|Captain) keeps/.test(r)), "known names, weekdays and titles ignored");
assert(storyCards.length === nCards, "no card created");

// obsession: 0 and silent for ordinary characters, steady growth for a yandere card
storyCards[1].description = "[cfg obsession:0.3]";
for (let i = 0; i < 5; i++) turn("I wave.", "Tobin and Mira look up, turn " + i + ".");
assert(G.state.lw.rel["1"].s.obsession === 0, "Mira (ordinary) stays at 0");
assert(G.state.lw.rel["2"].s.obsession > 1, "Tobin (yandere) grows: " + G.state.lw.rel["2"].s.obsession);

// chronicle: when a twist ends the AI is asked for {log: ...}; its line goes in, the marker leaves the story
const Wc = G.state.lw.w;
const runTwist = (reply) => {
  Wc.tw = null; Wc.twEnd = -99;
  run("input", "/twist secret");
  for (let i = 0; i < 12 && !Wc.pendLog.length; i++) turn("I chat with Mira.", "Mira hums, beat " + i + ".");
  assert(Wc.pendLog.length, "twist ended");
  const out = turn("I chat with Mira.", reply);
  assert(/\{log: one short past-tense sentence/.test(G.state.memory.frontMemory), "AI asked for a summary");
  return out;
};
let shownLog = runTwist("Mira finally speaks.\n{log: Mira admitted she had been reading the protagonist's letters.}");
assert(!/\{log/.test(shownLog), "marker removed from the story");
assert(/\] Mira admitted she had been reading/.test(Wc.log.join("\n")), "AI summary in the chronicle");
G.state.lw.w.twUsed = [];
runTwist("Mira says nothing more.");
assert(/\] Mira's secret comes out, and it changes things\.$/.test(Wc.log[Wc.log.length - 1]), "generic text when the AI forgets: " + Wc.log[Wc.log.length - 1]);
turn("I wait.", "Time passes for Mira.");
assert(/Recently: \(Day \d+\) /.test(G.state.memory.frontMemory) && !/\[Day/.test(G.state.memory.frontMemory.slice(1)), "chronicle sent with clean dates");
assert(!Wc.log.some((l) => / is now [^.]* of\.$/.test(l)), "threshold lines keep their full text");

// feelings line: only stages that moved from the character's start, so no "indifferent" next to "preoccupied"
const rT = G.state.lw.rel["2"], rM = G.state.lw.rel["1"];
rT.s.affinity = 1; rT.s.trust = 2; rT.s.obsession = 2.5;
rM.s.affinity = 1; rM.s.trust = 3.5; rM.s.attraction = 0; rM.s.obsession = 0;
turn("I talk with Tobin and Mira.", "Tobin and Mira glance over, again.");
const fm = G.state.memory.frontMemory;
assert(/Tobin: [^.]*preoccupied/.test(fm) && /Tobin: [^.]*wary of the protagonist/.test(fm), "moved stages only: " + fm);
assert(!/indifferent/.test(fm) && !/Mira: /.test(fm), "unchanged characters send nothing");

// thoughts: two characters can think in one reply; every new thought lands in a dated diary in Notes, capped
cfg.description += "\nthoughts_diary: 3";
turn("I sit between them.", "Mira thinks (+): «Tobin should apologize first, honestly.»\nTobin thinks (-): «The protagonist never listens to anyone here.»\nThey both stay quiet.");
assert(/^~ \(Day \d+\) Tobin should apologize first, honestly\.$/m.test(storyCards[0].description), "Mira diary line:\n" + storyCards[0].description);
assert(/^~ \(Day \d+\) The protagonist never listens/m.test(storyCards[1].description), "Tobin thought stored too");
const fresh = ["The bread burned again this morning.", "Rain makes the cellar smell of wine.", "Old Garrick still owes me three coins.", "Maybe I should paint the sign blue."];
for (const t of fresh) turn("I wait.", "Mira thinks (=): «" + t + "»\nMira waits.");
const diaryLines = storyCards[0].description.split("\n").filter((l) => /^~ /.test(l));
assert(diaryLines.length === 3 && /paint the sign blue/.test(diaryLines[2]), "diary capped, newest kept: " + diaryLines.join(" | "));
assert(G.state.lw.rel["1"].th.length <= 5, "state keeps only the last few");

// chronicle storage: state keeps the latest few, the card keeps everything, a retry does not duplicate
const chrC = storyCards.find((c) => c.type === "chronicle");
const cardLog = () => chrC.description.split("\n").filter((l) => /^- /.test(l));
const before = cardLog().length;
for (let i = 0; i < 10; i++) run("input", "/log Entry number " + i + " for the archive");
assert(G.state.lw.w.log.length <= 6, "state keeps the latest: " + G.state.lw.w.log.length);
assert(cardLog().length === before + 10, "card keeps them all");
G.info.actionCount++;
run("input", "I wait.");
G.state.lw.w.pendLog = ["Retry check line."];
run("output", "Nothing happens.");
const afterFirst = cardLog().length;
assert(afterFirst === before + 11, "first reply added its entry");
run("output", "Nothing happens, again.");                    // retry: same actionCount
assert(cardLog().length === afterFirst, "retry does not duplicate card entries");

console.log("ok");
