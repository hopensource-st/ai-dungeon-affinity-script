// Prueba rápida de la edición en castellano: ejecuta los tres hooks contra una partida falsa.  node es/test.js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const lib = fs.readFileSync(__dirname + "/library.js", "utf8");
const hook = (name) => fs.readFileSync(__dirname + "/" + name + ".js", "utf8");

// el escenario de otra persona: tarjetas de personaje sencillas, con tildes, sin [cfg] ni tarjetas del motor
const storyCards = [
  { id: 1, keys: "Inés, la posadera", entry: "Inés es una posadera alegre de pelo rojo.", type: "character", title: "Inés", description: "" },
  { id: 2, keys: "José", entry: "José Prado, mozo de cuadra.", type: "character", title: "", description: "[cfg obsesion:0.5]" },
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
vm.runInContext("Math.random = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })()", ctx);
const run = (name, text) => { ctx.text = text; return vm.runInContext("(() => {\n" + lib + "\n" + hook(name).replace(/modifier\(text\)\s*$/, "return modifier(text)") + "\n})()", ctx); };
const turn = (action, reply) => {
  G.info.actionCount++;
  const a = run("input", action).text;
  run("context", "La historia hasta ahora.\n" + a);
  const o = run("output", reply).text;
  G.history.push({ text: a }, { text: o });
  return o;
};
const notes = (id) => storyCards.find((c) => c.id === id).description;
const fm = () => G.state.memory.frontMemory || "";
const cmd = (action) => { turn(action, "Nada."); return G.history[G.history.length - 2].text; };   // la nota de un comando va en la entrada

// primera acción: el motor crea sus tarjetas y la IA diseña stats en castellano
turn("Entras en la posada.", "stat: lealtad | auto | 0-10 | start 1 | rate 0.2\nstages: lealtad | 0=desconfía del protagonista | 5=es leal al protagonista");
const cfg = storyCards.find((c) => c.type === "config");
assert(storyCards.some((c) => c.title === "LW Crónica") && cfg.title === "LW Config", "tarjetas del motor");
assert(/^stat: lealtad \| auto/m.test(cfg.description) && /^stat: atracción /m.test(cfg.description), "stat diseñado junto a los de serie:\n" + cfg.description);

// nombres con tilde y humor en castellano
turn("Saludo a Inés.", "Inés sonríe y te da las gracias por venir.");
assert(/^afinidad: 1\.\d/m.test(notes(1)) && /^escenas: 1$/m.test(notes(1)), "Inés tiene bloque en Notes:\n" + notes(1));
assert(G.state.lw.rel["1"].s.afinidad > 1, "la sonrisa sube la afinidad");

// comandos en castellano, con y sin tildes, también en modo Do
assert(/Inés pensará algo/.test(cmd("/pensar Ines")), "/pensar sin tilde");
turn("Le pregunto a Inés por José.", "Inés se encoge de hombros.");
assert(/Empieza la respuesta con Inés piensa \(x\)/.test(fm()), "la IA recibe la orden de pensar: " + fm());
const th = turn("Espero.", "Inés piensa (+): «José debería disculparse primero.»\nInés calla.");
assert(!/piensa/.test(th) && /^t: José debería disculparse primero\.$/m.test(notes(1)), "pensamiento guardado y quitado del texto:\n" + th + "\n" + notes(1));
const inl = turn("Espero.", "Crepita el fuego. Inés piensa (=): \"Aquí nadie paga a tiempo.\" Limpia la barra.");
assert(!/piensa/.test(inl) && /^t: Aquí nadie paga a tiempo\.$/m.test(notes(1)), "pensamiento con comillas normales en mitad del párrafo: " + inl);
assert(/afinidad 1\.\d/.test(cmd("/relacion Inés")), "/relacion");
assert(/atracción es ahora 2\.0/.test(cmd("/atraccion Inés 2")), "/atraccion sin tilde");
assert(/castellano/.test(cmd("> You /comprobar.")), "/comprobar en modo Do");

// el reloj entiende los saltos en castellano, pero no los recuerdos ni los diálogos
const day0 = G.state.lw.w.day;
turn("Duermo.", "Recuerdo aquella noche de tormenta. \"Hasta el amanecer\", dice Inés.\n—Nos vemos al anochecer —dice José.");
assert(G.state.lw.w.day === day0, "recuerdos y diálogos no mueven el reloj");
assert(G.state.lw.rel["2"].s["obsesión"] >= 0.5, "[cfg obsesion:0.5] sin tilde hace yandere a José: " + JSON.stringify(G.state.lw.rel["2"].s));
turn("Duermo.", "A la mañana siguiente, Inés abre los postigos.");
assert(G.state.lw.w.day === day0 + 1 && /Día \d+, mañana/.test(fm() + cmd("/hora")), "salto a la mañana siguiente");

// protagonista: la
cfg.description += "\nprotagonista: la";
turn("Saludo a Inés.", "Inés asiente.");
turn("Hablo con Inés.", "Inés te escucha.");
assert(/la protagonista/.test(fm()) && !/el protagonista/.test(fm()), "la protagonista: " + fm());

// /pnj crea una tarjeta en castellano
turn("/pnj Kel, una camarera cotilla", "Kel Varn, camarera de la posada que conoce todos los rumores del pueblo. Aspecto: pelirroja y pecosa. Entras y te sonríe.");
const kel = storyCards.find((c) => c.title === "Kel Varn");
assert(kel && /Aspecto: pelirroja y pecosa\.$/.test(kel.entry), "tarjeta de /pnj: " + JSON.stringify(kel));

// los contactos se cuentan con el módulo apagado: el roce de quien juega, y una respuesta que no nombra a nadie
const roces = () => G.state.lw.rel["1"].touched.length;
const r0 = roces(), conf = () => G.state.lw.rel["1"].s.confianza;
let c0 = conf();
turn("Le cojo la mano a Inés.", "Aparta la mirada.");
assert(roces() === r0 + 1 && /^contactos: \d+$/m.test(notes(1)), "cuenta el roce de quien juega:\n" + notes(1));
assert(Math.abs(conf() - c0 - 0.3) < 0.05, "un roce amistoso sube la confianza: " + c0 + " -> " + conf());
turn("Espero a Inés.", "Inés se acerca. Te coge la mano.");
assert(roces() === r0 + 2, "\"Te coge la mano\" cuenta para la única que sale en la respuesta");
c0 = conf();
turn("Le agarro la muñeca a Inés y me burlo de ella.", "Inés se aparta.");
assert(roces() === r0 + 3 && conf() <= c0, "un roce brusco cuenta pero no sube nada: " + c0 + " -> " + conf());

// dos pensamientos sin comillas y la narración en una línea: cada uno acaba donde empieza el siguiente personaje
const una = turn("Miro a Inés y a José.", "Inés piensa (-): La bodega no se llena sola. Esa mirada dice que la protagonista se quedará hasta tarde. José piensa (-): Ya planea retenerte aquí. No me gusta. Inés te observa un momento, tamborileando en la barra.");
const tUlt = (id) => notes(id).split("\n").filter((l) => /^t: /.test(l)).pop();
assert.strictEqual(tUlt(1), "t: La bodega no se llena sola. Esa mirada dice que la protagonista se quedará hasta tarde.");
assert.strictEqual(tUlt(2), "t: Ya planea retenerte aquí. No me gusta.");
assert(/^Inés te observa un momento, tamborileando en la barra\.$/.test(una.trim()), "narración conservada: " + una);

// recuerdos: una entrada de la crónica que nombra a Inés se queda en sus Notes y vuelve cuando la crónica ya ha avanzado
turn("Espero.", "Inés suspira. {log: Inés perdonó a la protagonista por la jarra rota.}");
assert(/^m: \(Día \d+\) Inés perdonó a la protagonista por la jarra rota\.$/m.test(notes(1)), "recuerdo en las Notes de Inés:\n" + notes(1));
for (const l of ["Paró de llover.", "Llegó un juglar.", "El pozo se heló."]) turn("/log " + l, "Nada.");
turn("Miro a Inés.", "Inés tararea.");
assert(/Inés recuerda: [^\]]*\(Día \d+\) Inés perdonó a la protagonista/.test(fm()), "la IA recibe el recuerdo: " + fm());

// otro script pisa la frontMemory y el contexto va lleno: la línea va dentro del texto, recortando lo más antiguo de la historia
G.info.actionCount++;
run("input", "Miro a Inés.");
const linea = G.state.lw.pending;
G.state.memory.frontMemory = "[Nota de otro script]";
const historia = G.history.slice(-80).map((h) => h.text).join("\n");
const ctxIn = "INSTRUCCIONES\n" + historia + "\nMiro a Inés.";
G.info.maxChars = ctxIn.length + 20;
const ctxOut = run("context", ctxIn).text;
G.info.maxChars = 8000;
assert(linea && ctxOut.includes(linea) && ctxOut.length < ctxIn.length + 20, "línea inyectada dentro del límite:\n" + ctxOut);
assert(/^INSTRUCCIONES\n/.test(ctxOut) && /\nMiro a Inés\.$/.test(ctxOut), "se conservan las instrucciones y la última acción:\n" + ctxOut);
assert(/Otro script/.test(cmd("/comprobar")), "/comprobar avisa de que otro script pisó la frontMemory");

console.log("ok");
