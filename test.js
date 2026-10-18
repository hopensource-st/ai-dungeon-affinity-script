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
assert(/^stat: suspicion \| manual/m.test(cfgText) && !/stat: trust/.test(cfgText), "designed stats replace defaults:\n" + cfgText);
assert(/^autostats: off$/m.test(cfgText) && /^tension_stat: affinity$/m.test(cfgText), "autostats turned off, tension follows");
assert(/stats for this story are ready/.test(design) && !/suspicion/.test(design), "design stays a surprise: " + design);
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

console.log("ok");
