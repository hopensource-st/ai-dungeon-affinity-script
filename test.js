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
vm.runInContext("Math.random = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })()", ctx);   // same draws every run
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
assert(W.act === 1 || W.actAtS >= 4, "act 2 waits for act_scenes: " + W.actAtS);
// pick all: the act draws its whole bank (and waits for it, up to twice act_scenes)
const arcCard = storyCards.find((c) => c.type === "arc");
const arc0 = arcCard.description;
arcCard.description = arc0.replace(/\| pick [^|]+\|/, "| pick all |");
run("input", "/arc reroll");
const bankN = (arc0.match(new RegExp("^beat: " + W.act + " \\| bank ", "gm")) || []).length;
assert(bankN > 0 && W.q[W.act].p.length === bankN, "pick all: " + W.q[W.act].p.length + " of " + bankN);
arcCard.description = arc0;
run("input", "/arc reroll");
// by scenes: a beat starts with a scene and is done when that scene closes
assert(!W.bt || W.bt.su === W.scu, "the current beat started with this scene: " + JSON.stringify(W.bt) + " " + W.scu);
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
assert(!/keeps coming up/.test(replies[0] + replies[1]) && /\[LW: Vex keeps coming up[^\]]*type \/npc Vex, then who they are[^\]]*Example: \/npc Vex, a guard/.test(replies[2]), "hint on the 3rd turn: " + replies[2]);
assert(!/keeps coming up/.test(replies[3]), "hint only once");
assert(!replies.some((r) => /(Mira|Monday|Captain) keeps/.test(r)), "known names, weekdays and titles ignored");
assert(storyCards.length === nCards, "no card created");

// obsession: 0 and silent for ordinary characters, steady growth for a yandere card, once per scene
storyCards[1].description = "[cfg obsession:0.3]";
run("input", "/scene");
const ob0 = G.state.lw.rel["2"].s.obsession;
for (let i = 0; i < 2; i++) turn("I wave.", "Tobin and Mira look up, turn " + i + ".");
const ob1 = G.state.lw.rel["2"].s.obsession;
assert(ob1 - ob0 > 0.25 && ob1 - ob0 < 0.6, "one scene, one rise: " + ob0 + " -> " + ob1);
for (let i = 0; i < 4; i++) turn("I wave.", "The next morning, Tobin and Mira look up.");
assert(G.state.lw.rel["1"].s.obsession === 0, "Mira (ordinary) stays at 0");
assert(G.state.lw.rel["2"].s.obsession > 1, "Tobin (yandere) grows scene after scene: " + G.state.lw.rel["2"].s.obsession);

// chronicle: when a twist ends the AI is asked for {log: ...}; its line goes in, the marker leaves the story
const Wc = G.state.lw.w;
const runTwist = (reply) => {
  Wc.tw = null; Wc.twEnd = -99;
  run("input", "/twist secret");
  for (let i = 0; i < 12 && Wc.tw; i++) turn("I chat with Mira.", "Mira hums, beat " + i + ".");
  assert(!Wc.tw && Wc.pendLog.length, "twist ended");
  const out = turn("I chat with Mira.", reply);
  assert(/\{log: one past-tense sentence/.test(G.state.memory.frontMemory), "AI asked for a summary");
  return out;
};
let shownLog = runTwist("Mira finally speaks.\n{log: Mira admitted she had been reading the protagonist's letters.}");
assert(!/\{log/.test(shownLog), "marker removed from the story");
assert(/\] Mira admitted she had been reading/.test(Wc.log.join("\n")), "AI summary in the chronicle");
G.state.lw.w.twUsed = [];
runTwist("Mira says nothing more.");
assert(!Wc.log.some((l) => /secret comes out/.test(l)), "the planned text is never logged as if it happened: " + Wc.log[Wc.log.length - 1]);
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

// thoughts: two characters can think in one reply; they live as t: lines in the Notes block, after the stats, capped
cfg.description += "\nthoughts_keep: 3";
storyCards[0].description += "\n~ (Day 1) An old diary line moves into the block.";
turn("I sit between them.", "Mira thinks (+): «Tobin should apologize first, honestly.»\nTobin thinks (-): «The protagonist never listens to anyone here.»\nThey both stay quiet.");
const mBlk = (storyCards[0].description.match(/<<LW\n[\s\S]*?\nLW>>/) || [""])[0];
assert(/^t: Tobin should apologize first, honestly\.$/m.test(mBlk) && /^t: An old diary line/m.test(mBlk), "Mira thought in block:\n" + storyCards[0].description);
assert(!/^~ /m.test(storyCards[0].description) && mBlk.indexOf("t: ") > mBlk.indexOf("affinity: "), "diary migrated, stats first");
assert(/^t: The protagonist never listens/m.test(storyCards[1].description), "Tobin thought stored too");
const fresh = ["The bread burned again this morning.", "Rain makes the cellar smell of wine.", "Old Garrick still owes me three coins.", "Maybe I should paint the sign blue."];
for (const t of fresh) turn("I wait.", "Mira thinks (=): «" + t + "»\nMira waits.");
const tLines = storyCards[0].description.split("\n").filter((l) => /^t: /.test(l));
assert(tLines.length === 3 && /paint the sign blue/.test(tLines[2]), "thoughts capped, newest kept: " + tLines.join(" | "));
turn("I ask Mira about her day.", "Mira shrugs.");
assert(/Mira's private thoughts \(never narrate them\): "[^"]*wine\." "[^"]*coins\." "[^"]*blue\."/.test(G.state.memory.frontMemory), "AI gets the last few: " + G.state.memory.frontMemory);
assert(G.state.lw.rel["1"].th.length === 3, "state keeps only the last few");
const inl = turn("I wait.", "The fire crackles. Mira thinks (-): \"Nobody here ever pays on time.\" She wipes the bar.");
assert(!/thinks/.test(inl) && /^t: Nobody here ever pays on time\.$/m.test(storyCards[0].description), "mid-paragraph thought in plain quotes: " + inl);

// chronicle storage: state keeps the latest few, the card keeps everything, a retry does not duplicate
const chrC = storyCards.find((c) => c.type === "chronicle");
const cardLog = () => chrC.description.split("\n").filter((l) => /^- /.test(l));
const before = cardLog().length;
for (let i = 0; i < 10; i++) run("input", "/log Entry number " + i + " for the archive");
assert(G.state.lw.w.log.length <= 6, "state keeps the latest: " + G.state.lw.w.log.length);
assert(cardLog().length === before + 10, "card keeps them all");
G.info.actionCount++;
run("input", "I wait.");
G.state.lw.w.pendLog = ["Retry check line."]; G.state.lw.w.asked = true;
run("output", "Nothing happens.");
const afterFirst = cardLog().length;
assert(afterFirst === before + 11, "first reply added its entry");
run("output", "Nothing happens, again.");                    // retry: same actionCount
assert(cardLog().length === afterFirst, "retry does not duplicate card entries");

// clock: moves only when the narration (or your action) says so; dialogue and memories do not move it
const Wk = G.state.lw.w, at = () => "day " + Wk.day + " tod " + Wk.tod;   // tod: 0 dawn, 1 morning, 2 afternoon, 3 evening, 4 night
Wk.day = 5; Wk.tod = 4;
turn("I sleep until morning.", "You rest well.");
assert(at() === "day 6 tod 1", "own action: sleep until morning -> " + at());
turn("I listen.", "\"I remember that night,\" Mira says. She recalls the storm of years ago, the next day it rained.");
assert(at() === "day 6 tod 1", "dialogue and memories ignored -> " + at());
turn("I wait.", "The sun sets over the harbor.");
assert(at() === "day 6 tod 3", "the sun sets -> evening -> " + at());
for (let i = 0; i < 15; i++) turn("I keep talking.", "Mira answers, point " + i + ".");
assert(at() === "day 6 tod 4", "clock_turns: one step after 12 turns with no jump -> " + at());
turn("I go home.", "The next morning, the square is quiet.");
assert(at() === "day 7 tod 1", "the next morning -> " + at());
// sleep and waking, and "that afternoon" said in the evening (today, not tomorrow)
Wk.tod = 3;
turn("I wait.", "That afternoon had been long. Mira yawns.");
assert(at() === "day 7 tod 3", "that afternoon, in the evening, stays -> " + at());
turn("I lie in the bed.", "You drift toward sleep in the warm furs.");
assert(at() === "day 7 tod 4", "falling asleep -> night -> " + at());
turn("I stretch.", "You wake to the smell of bread.");
assert(at() === "day 8 tod 1", "waking after the night -> next morning -> " + at());
turn("I stretch.", "Mira wakes you from a short nap.");
assert(at() === "day 8 tod 1", "a nap in the day changes nothing -> " + at());

// scene summaries: a time jump closes the scene; next turn the AI is asked for {log: ...}; no generic line if it forgets
const Ws = G.state.lw.w;
Ws.tw = null; Ws.twEnd = G.info.actionCount; Ws.pendLog = []; Ws.arcDone = true; Ws.bt = null;   // no twist or beat lines here
turn("I leave the inn.", "That night, the streets are empty.");
assert(Ws.pendLog.length === 1 && Ws.pendLog[0] === "", "scene close queued a summary");
const nLog = cardLog().length;
turn("I walk home.", "You reach the door.\n{log: Brea left the inn after Mira's warning and walked home alone.}");
assert(cardLog().length === nLog + 1 && /walked home alone/.test(cardLog().slice(-1)[0]), "scene summary stored");
turn("I sleep until morning.", "You wake to birdsong.");
turn("I get up.", "The kettle sings.");
assert(cardLog().length === nLog + 1, "no generic line when the AI skips the summary: " + cardLog().slice(nLog).join(" | "));

// commands typed in Do and Say mode: AI Dungeon wraps them as "> You /arc." and '> You say "/arc."'
for (const t of ["\n> You /arc.\n", "\n> You say \"/arc.\"\n", "/arc"]) {
  const r = run("input", t).text;
  assert(/^\[LW: Story: act \d/.test(r.trim()) || /^\[LW: Story(?: \(finished\))?/.test(r.trim()), "arc status, note alone, for " + JSON.stringify(t) + ": " + r);
}
assert(/^\[LW: Mira:/.test(run("input", "\n> You /rel Mira.\n").text.trim()), "/rel in Do mode");
const doNpc = run("input", "\n> You /npc Vex, a guard who owes you a favor.\n").text;
assert(/Writing the character card for Vex/.test(doNpc), "/npc in Do mode: " + doNpc);

// card creation: the name is not repeated, a title alone is never a trigger, the card gets a title
G.state.lw.w.create = null;
turn("/npc Corvina, a widow", "Lady Corvina Ashe, a widowed countess, 40. Proud and cunning. Appearance: black lace.");
const cv = storyCards[storyCards.length - 1];
assert(cv.title === "Lady Corvina Ashe" && /^Lady Corvina Ashe, a widowed/.test(cv.entry), "title set, name not repeated: " + JSON.stringify(cv));
assert(!cv.keys.split(", ").includes("Lady") && cv.keys.split(", ")[0] === "Corvina", "no bare title trigger: " + cv.keys);
assert(/Corvina:/.test(run("input", "/rels").text), "tracked as Corvina, not Lady");

// secret yanderes: a new character may get a hidden obsession that grows however they are treated
cfg.description += "\nyandere_chance: 100\nyandere_max: 5";
storyCards.push({ id: 201, keys: "Selene", entry: "Selene, a quiet librarian.", type: "character", title: "Selene", description: "" });
storyCards.push({ id: 202, keys: "Oswin", entry: "Oswin, the protagonist's father.", type: "character", title: "Oswin", description: "[cfg romance:no]" });
for (let i = 0; i < 6; i++) turn("I mock Selene and Oswin.", "The next morning, Selene and Oswin glare at you.");
const rSel = G.state.lw.rel["201"], rOsw = G.state.lw.rel["202"];
assert(rSel.yr >= 0.2 && rSel.yr <= 0.4 && rSel.s.obsession > 1, "secret yandere grows even when mocked: " + JSON.stringify(rSel));
assert(!rOsw.yr && rOsw.s.obsession === 0, "romance:no characters are never yanderes");

// touches count with the contact module off: the player's own touch, and a reply that names no one
const touches = () => G.state.lw.rel["1"].touched.length;
const t0 = touches(), trust = () => G.state.lw.rel["1"].s.trust;
let tr = trust();
turn("I take Mira's hand.", "She looks away.");
assert(touches() === t0 + 1 && /^touched: \d+$/m.test(storyCards[0].description), "the player's touch counts");
assert(Math.abs(trust() - tr - 0.3) < 0.05, "a friendly touch raises trust: " + tr + " -> " + trust());
turn("I wait for Mira.", "Mira steps closer. She takes your hand.");
assert(touches() === t0 + 2, "\"She takes your hand\" counts for the only one in the reply");
tr = trust();
turn("I grab Mira's wrist and mock her.", "Mira pulls away.");
assert(touches() === t0 + 3 && trust() <= tr, "a rough touch counts but raises nothing: " + tr + " -> " + trust());

// two unquoted thoughts and the narration on one line: each thought ends where the next character starts, the narration stays
const one = turn("I look at Mira and Tobin.", "Mira thinks (-): The cellar won't fill itself. That look says the protagonist will stay late again. Tobin thinks (-): She's already planning to keep you here. I don't like this. Mira considers you for a moment, her fingers drumming on the bar.");
const tLast = (id) => storyCards.find((c) => c.id === id).description.split("\n").filter((l) => /^t: /.test(l)).pop();
assert.strictEqual(tLast(1), "t: The cellar won't fill itself. That look says the protagonist will stay late again.");
assert.strictEqual(tLast(2), "t: She's already planning to keep you here. I don't like this.");
assert(/^Mira considers you for a moment, her fingers drumming on the bar\.$/.test(one.trim()), "narration kept: " + one);

// a {log: with no closing brace is still logged, and leaves the story
const unclosed = turn("I wait.", "Mira nods.\n{log: Mira agreed to keep the secret.");
assert(!/\{log/.test(unclosed) && G.state.lw.w.log.some((l) => /Mira agreed to keep the secret/.test(l)), "unclosed log: " + unclosed);

// the log on the first line, as the AI is asked: it leaves no blank line behind
const first = turn("I wait.", "{log: Mira locked the cellar for the night.}\nMira yawns.");
assert.strictEqual(first, "Mira yawns.");

// Continue (a reply with no action before it) never asked for the log, so it stays pending for the next action
G.state.lw.w.pendLog = ["Story beat: A Continue Check."]; G.state.lw.w.asked = false;
G.info.actionCount++; run("output", "Mira keeps talking.");
assert(G.state.lw.w.pendLog.length === 1 && !G.state.lw.w.log.some((l) => /A Continue Check/.test(l)), "kept after a Continue");
turn("I listen.", "{log: Mira told the whole story of the cellar.}\nMira finishes.");
assert(!G.state.lw.w.pendLog.some((l) => /A Continue Check/.test(l)) && G.state.lw.w.log.some((l) => /whole story of the cellar/.test(l)), "asked on the next action, and answered: " + JSON.stringify(G.state.lw.w.pendLog));

// a Continue does not reuse the last action: no second time jump, no second touch
const cont = () => { G.info.actionCount++; const o = run("output", "Mira keeps talking."); G.history.push({ text: o }); };
const dayA = G.state.lw.w.day, tA = G.state.lw.rel["1"].touched.length;
turn("I take Mira's hand and sleep until dawn.", "Mira smiles.");
assert(G.state.lw.w.day === dayA + 1 && G.state.lw.rel["1"].touched.length === tA + 1, "the action jumps and touches once");
cont();
assert(G.state.lw.w.day === dayA + 1 && G.state.lw.rel["1"].touched.length === tA + 1, "the Continue does not repeat them");

// an unquoted thought in the middle of a paragraph: stored, and the narration around it stays
const mid = turn("I wait.", "The bar is quiet. Then Mira thinks (-): Tobin forgot the kegs again. She wipes the counter.");
assert(/^t: Tobin forgot the kegs again\.$/m.test(storyCards[0].description) && mid === "The bar is quiet. She wipes the counter.", "mid-paragraph unquoted: " + mid);

// rivals: two characters who both like the protagonist grow tension once per scene, not on every turn
run("input", "/scene");
G.state.lw.rel["1"].s.affinity = 8; G.state.lw.rel["2"].s.affinity = 8;
const ten = () => G.state.lw.tension["1|2"] || 0, ten0 = ten();
for (let i = 0; i < 3; i++) turn("I sit down.", "Mira and Tobin sit at the table, turn " + i + ".");
assert(Math.abs(ten() - ten0 - 0.5) < 0.01, "one rise in one scene: " + ten0 + " -> " + ten());

// narration under a thought tag (it names its own thinker, nothing in the first person): kept as story, not stored
const tagged = turn("I wait.", "Mira thinks: Tobin's grip tightens on the mug, and Mira's eyes narrow at the door.");
assert(tagged === "Tobin's grip tightens on the mug, and Mira's eyes narrow at the door." && !/^t: Tobin's grip/m.test(storyCards[0].description), "narration kept: " + tagged);

// "Name (-): «...»" with no "thinks": still a thought, stored and removed
const noVerb = turn("I wait.", "Tobin (-): «Hero thinks a bow can hide the hunger I feel for them.»\nMira (+): «Hero is so kind; I would do anything to keep them smiling.»\nThe fire crackles.");
assert(noVerb === "The fire crackles." && /^t: Hero is so kind; I would do anything to keep them smiling\.$/m.test(storyCards[0].description) && /^t: Hero thinks a bow can hide/m.test(storyCards[1].description), "no verb: " + noVerb);

// "Name: (+) ..." puts the sign after the colon: still a thought
const colonFirst = turn("I wait.", "Mira: (=) Hero walks like they own the stone, and I hate how proud that makes me.\n\nTobin: (+) Hero walks ahead of me like a shield; good.\n\nThe steward leads you on.");
assert(colonFirst === "The steward leads you on." && /^t: Hero walks like they own the stone/m.test(storyCards[0].description), "colon first: " + colonFirst);
// "(x)" copied from the instruction: stored as a thought with no sign
const xs = turn("I wait.", "Mira thinks (x): The girl walks as if the palace might stop her, not the other way around.");
assert(!/thinks/.test(xs) && /^t: The girl walks as if the palace might stop her, not the other way around\.$/m.test(storyCards[0].description), "(x): " + xs);

// an unclosed « glued to the narration: the thought ends at its last first-person sentence, the narration stays
const glued = turn("I wait.", "Tobin clears his throat. Mira thinks (x): «Tobin sings for my ears alone. Hero clings to him, but I am patient. And I am its queen.Tobin begins to sing. It is a low melody.");
assert(glued === "Tobin clears his throat. Tobin begins to sing. It is a low melody." && /^t: Tobin sings for my ears alone\. Hero clings/m.test(storyCards[0].description), "glued: " + glued);
// "log: ..." with no braces, in the second person: logged in the third, out of the story
G.state.lw.w.pendLog = [""];
const bareLog = turn("I wait.", "Mira yawns.\n\nlog: You have settled into the inn while Mira kept watch by your door.\n\nThe fire dies.");
assert(bareLog === "Mira yawns.\n\nThe fire dies." && G.state.lw.w.log.some((l) => /The protagonist has settled into the inn while Mira kept watch by the protagonist's door\./.test(l)), "bare log: " + bareLog + " " + G.state.lw.w.log.slice(-1));
// with protagonist: set, every entry calls them by name
const cfgCard = storyCards.find((c) => c.type === "config");
cfgCard.description += "\nprotagonist: Fiona";
G.state.lw.w.pendLog = [""];
turn("I wait.", "{log: You laughed while Mira poured the protagonist a drink.}\nMira laughs.");
assert(/\] Fiona laughed while Mira poured Fiona a drink\.$/.test(G.state.lw.w.log.slice(-1)[0]), "named: " + G.state.lw.w.log.slice(-1));
cfgCard.description = cfgCard.description.replace("\nprotagonist: Fiona", "");
// "{log: just happened}" is not a summary: the generic line goes in instead
G.state.lw.w.pendLog = ["Story beat: The Gift."];
turn("I wait.", "{log: just happened}\nMira laughs.");
assert(!G.state.lw.w.log.some((l) => /just happened/.test(l)) && /Story beat: The Gift\./.test(G.state.lw.w.log.slice(-1)[0]), "junk log: " + G.state.lw.w.log.slice(-1));
// a thought in our format from someone the engine does not track: not stored, but out of the story
const stranger = turn("I wait.", "The fire dies. Octavia thinks (x): «She does not understand what she is inviting.\nSilence.");
assert(stranger === "The fire dies.\nSilence.", "stranger: " + stranger);

// three characters think in one reply: all three are stored
turn("I wait.", "Mira thinks (=): «The ale is running low.»\nTobin thinks (=): «The horses need water.»\nSelene thinks (=): «That book was overdue.»\nSilence.");
assert(/^t: That book was overdue\.$/m.test(storyCards.find((c) => c.id === 201).description), "third thought stored");

// /think holds until the thought arrives: a reply that skips it does not cancel it
run("input", "/think Mira");
turn("I wait for Mira.", "Mira polishes a glass.");
assert(G.state.lw.w.force.includes("1") && /Mira thinks \(=\)/.test(G.state.memory.frontMemory), "still asked after a reply with no thought: " + JSON.stringify(G.state.lw.w.force) + " " + G.state.memory.frontMemory);
turn("I wait.", "Mira thinks (=): «The glasses never stay clean.»\nMira sighs.");
assert(!G.state.lw.w.force.includes("1"), "done once the thought arrives");

// bare braces with no "log:" key: logged when a log was asked for, and removed from the story
G.state.lw.w.pendLog = [""];
const bare = turn("I wait.", "{The protagonist comments on the irony of the curse}\nMira laughs.");
assert(bare === "Mira laughs." && G.state.lw.w.log.some((l) => /comments on the irony of the curse/.test(l)), "bare braces: " + bare);

// a key of the AI's own, "{just happened: ...}", closed or not: its text is the log, the key is dropped
G.state.lw.w.pendLog = [""]; G.state.lw.w.asked = true;
const own = turn("I wait.", "{just happened: You declined the King's lavish offer in favor of modesty.}\nMira nods.");
assert(own === "Mira nods." && G.state.lw.w.log.some((l) => /\] The protagonist declined the King's lavish offer in favor of modesty\.$/.test(l)), "own key: " + own);
G.state.lw.w.pendLog = [""]; G.state.lw.w.asked = true;
const own2 = turn("I wait.", "{just happened: Mira poured a second cup.\nMira smiles.");
assert(own2 === "Mira smiles." && G.state.lw.w.log.some((l) => /\] Mira poured a second cup\.$/.test(l)), "own key, unclosed: " + own2);

// a sign written as a number, (+1) or (-2), still counts as + or -
const aff1 = G.state.lw.rel["1"].s.affinity;
turn("I wait.", "Mira thinks (+1): The way Tobin walks, so effortless, like he belongs here.\nMira smiles.");
assert(/^t: The way Tobin walks, so effortless, like he belongs here\.$/m.test(storyCards[0].description) && G.state.lw.rel["1"].s.affinity > aff1, "(+1) thought stored and counted");

// a mangled thought tag with no thought in it leaves the story
assert.strictEqual(turn("I bow.", "(Mira: =) She curtsies deeply."), "She curtsies deeply.");

// memories: a chronicle entry that names a character stays in their Notes, and comes back once the chronicle has moved on
turn("I wait.", "Mira sighs. {log: Mira forgave the protagonist for the broken mug.}");
assert(/^m: \(Day \d+\) Mira forgave the protagonist for the broken mug\.$/m.test(storyCards[0].description), "memory in Mira's Notes:\n" + storyCards[0].description);
for (const l of ["The rain stopped.", "A bard came to town.", "The well froze."]) turn("/log " + l, "Nothing.");
turn("I look at Mira.", "Mira hums.");
assert(/Mira remembers: [^\]]*\(Day \d+\) Mira forgave the protagonist/.test(G.state.memory.frontMemory), "the AI gets the memory: " + G.state.memory.frontMemory);

// another script overwrites frontMemory and the context is full: the line goes into the context text, cutting the oldest story
G.info.actionCount++;
run("input", "I look at Selene.");
const line = G.state.lw.pending;
G.state.memory.frontMemory = "[Another script's note]";
const story = G.history.slice(-100).map((h) => h.text).join("\n");
const ctxIn = "AI INSTRUCTIONS\n" + story + "\nI look at Selene.";
G.info.maxChars = ctxIn.length + 20;
const ctxOut = run("context", ctxIn).text;
G.info.maxChars = 8000;
assert(line && ctxOut.includes(line) && ctxOut.length < ctxIn.length + 20, "line injected within the limit:\n" + ctxOut);
assert(/^AI INSTRUCTIONS\n/.test(ctxOut) && /\nI look at Selene\.$/.test(ctxOut), "instructions and latest action kept:\n" + ctxOut);
assert(/another script/i.test(run("input", "/check").text), "/check reports the takeover");

console.log("ok");
