// ============================================================================
// LW AFFINITY ENGINE, EDICIÓN EN CASTELLANO  (pégalo en la pestaña Library; ver LEEME.md)
// Funciona en cualquier partida: sigue cada tarjeta Character, crea sus tarjetas Config, Relations,
// Chronicle, Events y Arc en el primer turno, y guarda los números de cada personaje en sus Notes.
// Copia traducida de ../library.js: los textos para la IA y el jugador, las palabras que detecta
// (humor, contacto, saltos de tiempo) y los comandos están en castellano; los comandos ingleses siguen valiendo.
// ============================================================================
const LW = (() => {
  const VERSION = "1.1.4-es";                                 // lo muestra /comprobar; súbelo en cada actualización publicada
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const andList = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a.join(""));
  // sin tildes y en minúsculas: "Crónica" -> "cronica" (comandos, stats y ids)
  const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // límites de palabra que entienden tildes y eñes (\b de JavaScript solo conoce a-z)
  const WB0 = "(?<![\\p{L}\\p{N}_])", WB1 = "(?![\\p{L}\\p{N}_])";
  const wordRe = (alts, flags) => new RegExp(WB0 + "(?:" + alts + ")" + WB1, (flags || "") + "u");

  const BLOCK = /<<LW\n[\s\S]*?\nLW>>/;
  const RELBLOCK = /<<LWR\n[\s\S]*?\nLWR>>/;
  const CFGRE = /\[cfg([^\]]*)\]/i;
  const MARK = /[ \t]*\[LW:[^\]]*\]/g;
  const WBLOCK = /<<LWW\n[\s\S]*?\nLWW>>/;
  const BASERE = /^[ \t]*base:[^\n]*\n?/gim;
  // "Mira piensa (+): «...»" (también vale "thinks", por si la IA escribe en inglés)
  const THSTRIP = /^[ \t]*\p{Lu}[\p{L}\p{N}_'’\- ]{0,30} (?:piensa|thinks)(?: \([+\-=]\))?: «[^»\n]*»[ \t]*\n?/gmu;
  const THRE = /^([ \t]*)[*_]*(\p{Lu}[\p{L}\p{N}_'’\-]*(?: [\p{L}\p{N}_'’\-]+){0,3}?)[*_]*\s+(?:piensa|thinks)\s*(?:\(([+\-=])\)\s*)?(?::\s*|(?=\s*[«"“]))[*_]*\s*(.+?)\s*[»"”]?[*_]*[ \t]*$/gmu;

  // ---- defaults (used when there is no Config card) ------------------------
  const DEF = {
    stats: [
      { name: "afinidad", mode: "auto", min: 0, max: 10, start: 1, rate: 0.2, damp: false, romance: false, needs: null, keep: true },
      { name: "confianza", mode: "auto", min: 0, max: 10, start: 3, rate: 0.1, damp: false, romance: false, needs: null, keep: true },
      { name: "atracción", mode: "auto", min: 0, max: 10, start: 0, rate: 0.1, damp: false, romance: true,
        needs: { stat: "confianza", op: ">=", val: 4 }, keep: true },
      // la obsesión se queda en 0 salvo que una tarjeta la pida ([cfg obsesión:0.3]); entonces sube cada vez que coinciden (yandere)
      { name: "obsesión", mode: "auto", min: 0, max: 10, start: 0, rate: 0, damp: false, romance: false, needs: null, steady: true, keep: true },
    ],
    stages: {
      afinidad: [[0, "indiferente hacia el protagonista"], [2, "amistoso con el protagonista"], [4, "le tiene cariño al protagonista"],
        [6, "unido al protagonista y busca su compañía"], [8, "profundamente entregado al protagonista"]],
      confianza: [[0, "receloso del protagonista"], [3, "empieza a confiar en el protagonista"], [6, "confía en el protagonista"],
        [8, "confía plenamente en el protagonista"]],
      "obsesión": [[0, ""], [2, "absorto, piensa en el protagonista demasiado a menudo"], [4, "obsesionado, busca excusas para estar cerca del protagonista"],
        [6, "posesivo y celoso de cualquiera que se acerque al protagonista"], [8, "consumido, peligrosamente obsesionado con el protagonista"]],
      "atracción": [[0, ""], [2, "se siente atraído en silencio por el protagonista"], [5, "atraído por el protagonista"],
        [8, "enamorado del protagonista"]],
      "tensión": [[0, ""], [2, "con los nervios a flor de piel entre ellos"], [4, "abiertamente hostiles entre sí"],
        [8, "en conflicto abierto"]],
    },
    s: {
      // protagonista: el o la (cambia "el protagonista" por "la protagonista" en todo lo que recibe la IA)
      protagonista: "el",
      max_present: 4, max_stats: 3, contact: false, warn_touch: false, inject: "frontMemory",
      accel_scenes: 40, early_actions: 0, damp_words: "", damp_factor: 0.5,
      tension_stat: "afinidad", tension_min: 6, tension_rate: 0.5, tension_max: 10, max_pairs: 3,
      skip: "", autostats: false,
      // giros: tras twist_gap turnos tranquilos, cada turno tiene un twist_chance % de sacar uno del mazo de la tarjeta Events
      twists: true, twist_gap: 8, twist_chance: 25, twist_hold: 3,
      // lazos: la primera vez que dos personajes sin lazo escrito coinciden, un bond_chance % de sacar uno del mazo de Relations
      bonds: true, bond_chance: 70,
      // yanderes secretos: cada personaje nuevo tiene un yandere_chance % de una obsesión que crece sola (como mucho yandere_max)
      yandere_chance: 20, yandere_max: 1,
      // suggest_cards: un nombre sin tarjeta que sale en suggest_after turnos distintos recibe una vez la pista de usar /pnj
      suggest_cards: true, suggest_after: 3,
      // humor: los stats auto suben tras una escena buena y bajan tras una mala (los marcados steady siempre suben)
      mood: true, mood_neutral: 0, mood_down: 1, mood_thought: 2.5,
      mood_pos: "agradec|gracias|sonr[ieí]|carcaj|ayud|abraz|bes[aeoó]|regal|elogi|halag|consol|proteg|perdon|disculp|acept|bienvenid|tranquiliz|amabl|cariñ|ternura|reconfort|ruboriz|sonroj|anim[aoó]",
      mood_neg: "insult|burl|mof|despreci|mient|mint|ment[ií]|amenaz|abofete|bofet|golpe|puñetaz|empuj|traicion|grit|reprend|regañ|ignor|rechaz|fulmin|ceñu|cruel|groser|enfad|furios|asco|humill|maldij|maldec|odi[aoó]",
      auto_allow: true,
      // un roce amistoso (sin palabras de mood_neg en su frase) sube estos stats en touch_bonus
      touch_stats: "afinidad|atracción|confianza|obsesión", touch_bonus: 0.3,
      // recuerdos: una entrada de la crónica que nombra a un personaje se guarda como línea m: en sus Notes; la IA recibe las últimas mientras está en escena
      memories_keep: 8, memories_recent: 2, memories_context: 2,
      thoughts: true, thoughts_show: false, thoughts_interval: 4, thoughts_max: 2, thoughts_keep: 20, thoughts_words: 20, thoughts_context: 2, thoughts_recent: 3,
      chronicle_lines: 3, chronicle_every: 8, chronicle_max: 200, chronicle_stats: "afinidad|atracción|obsesión", chronicle_min: 4,
      clock: true, clock_times: "amanecer|mañana|tarde|anochecer|noche", clock_day: 1, clock_time: "mañana", clock_turns: 0, clock_on_beat: false,
      scene: true, scene_len: 6,
      scene_setup: "Escena: planteamiento. Sitúa el lugar y lo que quiere cada personaje; deja que crezca la tensión.",
      scene_mid: "Escena: complicación. Algo sale mal, se dice o se descubre.",
      scene_end: "Escena: clímax. Llévala a su punto álgido y ciérrala con un gancho.",
      scene_over: "Escena: se alarga. Ciérrala con un cambio de hora o de lugar.",
      beat_hold: 4, beat_gap: 3, event_hold: 3, events_max: 2, arc_mode: "hybrid",
      inject_max: 1300, clean: true, clean_repeat: true, max_entry: 1000,
      npc_template: "Nombre Completo, papel u oficio, edad. Tres rasgos de carácter. [dos o tres frases: cómo ve al protagonista, qué quiere, un defecto]. Aspecto: [una frase sobre complexión, pelo, ojos y ropa].",
      faction_template: "Nombre de la Facción, qué clase de grupo es. [dos o tres frases: qué quieren, quién los dirige, cómo tratan al protagonista]. Aspecto: [una frase sobre cómo visten o se reconocen sus miembros].",
      place_template: "Nombre del Lugar, qué clase de lugar es. [dos o tres frases: cómo es, qué ambiente tiene, quién suele estar allí, un gancho para una escena].",
    },
    ban: [
      { phrase: "apenas un susurro", to: "en voz baja" },
      { phrase: "soltó un aliento que no sabía que estaba conteniendo", to: "soltó el aire" },
      { phrase: "un escalofrío le recorrió la espalda", to: "se estremeció" },
      { phrase: "orbes", to: "ojos" },
      { phrase: "un testamento de", to: "una prueba de" },
      { phrase: "sus atenciones", to: "sus caricias" },
    ],
  };

  // el mazo de giros y el arco que se escriben en las tarjetas Events y Arc la primera vez; genéricos para que la IA los adapte
  const DECK = [
    "# Mazo de giros. El motor saca uno de vez en cuando, elige a quién afecta y la IA lo adapta a la historia.",
    "# twist: id | who: low (le cae mal el protagonista), high (le cae bien), any (en la escena), absent (conocido, no está) | when: condiciones | weight N | hold N | stages: pista >> sucede | log: texto",
    "# Borra una línea para quitar un giro; weight 0 lo desactiva; añade los tuyos. También puedes añadir líneas event: (ver el LEEME).",
    "twist: secreto | who: low | weight 2 | stages: {who} oculta algo que afecta al protagonista; muéstralo solo en pequeños deslices >> el secreto de {who} sale a la luz y lo cambia todo",
    "twist: traicion | who: low | when: met>=2 | stages: {who} trabaja en silencio contra el protagonista; deja pistas sutiles >> la traición de {who} se descubre o se consuma",
    "twist: confesion | who: high | weight 2 | stages: {who} está reuniendo valor para decirle algo importante al protagonista >> {who} por fin lo dice, claro y sincero",
    "twist: regalo | who: high | stages: {who} sorprende al protagonista con un regalo o un favor que significa mucho",
    "twist: celos | who: high | when: met>=2 | stages: {who} siente celos de otra persona cercana al protagonista >> los celos de {who} acaban en una escena",
    "twist: favor | who: any | weight 2 | stages: {who} pide ayuda al protagonista con un problema personal",
    "twist: guardia_baja | who: any | stages: un momento tranquilo e imprevisto a solas con {who}, que baja la guardia y enseña otra cara",
    "twist: discusion | who: any | when: met>=2 | stages: la tensión entre {who} y otro personaje estalla en una discusión delante del protagonista",
    "twist: noticias | who: absent | weight 2 | stages: {who} manda recado o aparece sin avisar, con noticias urgentes",
    "twist: desconocido | weight 2 | stages: alguien desconocido lleva un tiempo observando al protagonista >> se acerca con una oferta, una advertencia o una exigencia",
    "twist: percance | stages: algo sale mal sin previo aviso (un accidente, una herida, un incendio, una tormenta repentina), acorde con el lugar",
    "twist: desaparecido | stages: desaparece algo que le importa al protagonista >> una pista señala a quien se lo llevó",
    "twist: rumor | when: met>=2 | stages: corre un rumor sobre el protagonista >> el rumor llega a alguien importante, que actúa en consecuencia",
    "twist: el_pasado | when: action>=30 | stages: alguien del pasado del protagonista le está buscando >> le encuentra, y quiere algo",
    "twist: peligro | when: action>=20 | stages: una amenaza real se acerca; muestra solo sus señales >> el peligro golpea y el protagonista tiene que reaccionar",
    "twist: oportunidad | stages: surge una oportunidad inesperada, tentadora pero con trampa",
  ];
  const BONDS = [
    "# Lazos entre personajes, uno por línea: Nombre | Nombre | descripción. La IA recibe el lazo cuando los dos están en escena.",
    "# La primera vez que dos personajes sin lazo aquí coinciden, el motor puede sacar uno de este mazo y escribirlo arriba.",
    "# bond: id | weight N | texto ({a} y {b} pasan a ser los dos nombres, en orden aleatorio). Borra, añade o pon weight 0 para ajustar el mazo.",
    "# Amistad e historia",
    "bond: amigos | weight 3 | {a} y {b} son viejos amigos",
    "bond: mejores_amigos | weight 2 | {a} y {b} son íntimos y se lo cuentan todo",
    "bond: desconocidos | weight 3 | {a} y {b} apenas se conocen",
    "bond: mentor | {a} le enseñó a {b} buena parte de lo que sabe",
    "bond: salvado | {a} le salvó la vida a {b} una vez, y {b} nunca lo ha olvidado",
    "bond: colegas | weight 2 | {a} y {b} trabajan juntos y se conocen las manías demasiado bien",
    "bond: jefe | {a} trabaja para {b}, o le rinde cuentas",
    "bond: pacto | {a} y {b} comparten un secreto que han jurado guardar",
    "# Familia (la IA decide quién es mayor según sus edades)",
    "bond: hermanos | weight 2 | {a} y {b} son hermanos",
    "bond: hermano_protector | {a} y {b} son hermanos, y {a} protege a {b} con uñas y dientes",
    "bond: rivalidad_fraterna | {a} y {b} son hermanos que llevan toda la vida compitiendo",
    "bond: padre_hijo | {a} y {b} son padre o madre e hijo o hija",
    "bond: primos | {a} y {b} son primos y se criaron juntos",
    "bond: parientes | {a} y {b} son parientes lejanos",
    "bond: rencilla_familiar | {a} y {b} pertenecen a familias enfrentadas desde hace años",
    "# Roces",
    "bond: rivales | weight 2 | {a} y {b} son rivales de toda la vida",
    "bond: deuda | {a} le debe a {b} algo que nunca ha pagado",
    "bond: rencor | {a} le guarda a {b} un rencor callado por algo del pasado",
    "bond: desconfianza | {a} no se fía de {b} y no le quita ojo",
    "bond: admiracion | {a} admira abiertamente a {b}, y a {b} eso le incomoda",
    "# En torno al protagonista (el romance solo apunta al protagonista)",
    "bond: confidente | {a} le confía a {b} lo que siente por el protagonista",
    "bond: desaprueba | a {a} no le gusta lo mucho que {b} se está acercando al protagonista",
    "bond: celestina | {a} no para de empujar a {b} a pasar más tiempo con el protagonista",
  ];
  const ARC = [
    "# Arco de la historia: los beats fixed ocurren en orden; los bank se sortean en cada partida (pick 2 por acto). Ver el LEEME.",
    "arc: Historia | mode hybrid | pick 2 | hold 4",
    "act: 1 | Planteamiento | Presenta el mundo del protagonista y a la gente que lo rodea, y siembra una pregunta que la historia responderá.",
    "act: 2 | Confrontación | Las complicaciones se acumulan, las relaciones se ponen a prueba y lo que está en juego no deja de crecer.",
    "act: 3 | Desenlace | Lleva el conflicto central a su punto crítico y deja que las decisiones del protagonista tengan consecuencias.",
    "beat: 1 | fixed | Detonante | when: action>=6 | guide: Algo rompe la rutina y le da al protagonista un problema o un objetivo.",
    "beat: 1 | bank | Una Cara Nueva | when: prob 20 | guide: Presenta a un personaje nuevo con sus propios planes.",
    "beat: 1 | bank | Algo No Cuadra | when: prob 20 | guide: Aparece un pequeño misterio; déjalo sin explicar por ahora.",
    "beat: 1 | bank | Primer Vínculo | when: met>=1, prob 20 | guide: Un momento cálido acerca al protagonista a alguien.",
    "beat: 1 | fixed | Punto Sin Retorno | when: action>=30 | guide: El protagonista se compromete con un camino y ya no puede echarse atrás fácilmente.",
    "beat: 2 | bank | Cuenta Atrás | when: prob 15 | guide: Aparece un plazo: hay que hacer algo antes de que sea tarde.",
    "beat: 2 | bank | Lealtades Divididas | when: met>=2, prob 15 | guide: Dos personas que le importan al protagonista quieren cosas opuestas.",
    "beat: 2 | bank | Aliado Inesperado | when: prob 15 | guide: La ayuda llega de quien el protagonista menos esperaba.",
    "beat: 2 | bank | Un Precio Que Pagar | when: prob 15 | guide: Algo que el protagonista quiere tiene ahora un coste real.",
    "beat: 2 | fixed | Giro de Mitad | when: action>=60 | guide: Una creencia resulta falsa o una victoria se tuerce, y la historia cambia de rumbo.",
    "beat: 2 | fixed | Todo Está Perdido | when: action>=85 | guide: El peor momento del protagonista: una pérdida, una derrota o una traición.",
    "beat: 3 | bank | Viejas Deudas | when: prob 20 | guide: Una decisión de antes en la historia vuelve con consecuencias.",
    "beat: 3 | bank | Última Confesión | when: prob 20 | guide: Alguien dice por fin lo que llevaba tiempo callando.",
    "beat: 3 | fixed | La Elección Difícil | when: action>=100 | guide: El protagonista tiene que elegir entre dos cosas que desea.",
    "beat: 3 | fixed | Clímax | when: fired:la_eleccion_dificil | guide: Afronta directamente el conflicto central y resuélvelo.",
    "beat: 3 | fixed | Consecuencias | when: fired:climax | guide: Muestra cómo han cambiado el mundo y las relaciones.",
  ];

  // texto de la tarjeta Config que el motor escribe la primera vez: todos los valores por defecto, listos para editar
  const defaultCfgText = () => {
    const onoff = (v) => (v === true ? "on" : v === false ? "off" : String(v));
    const l = ["# Ajustes del motor. Cambia cualquier valor; las líneas que empiezan por # se ignoran. Borra esta tarjeta para volver a los valores por defecto.",
      "# Las palabras clave (stat, stages, auto, start, rate...) y los nombres de los ajustes van en inglés; los textos, en castellano.",
      "# stat: nombre | auto o manual | mín-máx | start N (valor inicial) | rate N (ritmo) | marcas (damp, romance, steady, keep, needs stat>=N)",
      "# los stats auto se mueven con el humor de cada escena (ajustes mood_*); los steady siempre suben mientras el personaje está presente"];
    for (const d of DEF.stats)
      l.push("stat: " + [d.name, d.mode, d.min + "-" + d.max, "start " + d.start, "rate " + d.rate]
        .concat(d.damp ? ["damp"] : [], d.romance ? ["romance"] : [], d.steady ? ["steady"] : [], d.keep ? ["keep"] : [], d.needs ? ["needs " + d.needs.stat + d.needs.op + d.needs.val] : []).join(" | "));
    l.push("# stages: stat | umbral=texto que recibe la IA | ...   (texto vacío = no se envía nada)");
    for (const k of Object.keys(DEF.stages)) l.push("stages: " + k + " | " + DEF.stages[k].map((e) => e[0] + "=" + e[1]).join(" | "));
    l.push("# ajustes (el LEEME explica cada uno; on = sí, off = no)");
    l.push("# protagonista: el o la, para que la IA hable del protagonista o de la protagonista");
    l.push("# autostats: on deja que la IA diseñe los stats de esta historia en la primera acción y luego se apaga (/autostats lo repite)");
    for (const k of Object.keys(DEF.s)) l.push(k + ": " + (k === "autostats" ? "on" : onoff(DEF.s[k])));
    l.push("# limpiador: ban: frase | sustituto");
    for (const b of DEF.ban) l.push("ban: " + b.phrase + " | " + b.to);
    return l.join("\n");
  };

  const parseVal = (v) => {
    const l = String(v).trim().toLowerCase();
    if (["on", "yes", "true", "sí", "si"].includes(l)) return true;
    if (["off", "no", "false"].includes(l)) return false;
    if (l !== "" && !isNaN(Number(l))) return Number(l);
    return String(v).trim();
  };

  // ---- config card ----------------------------------------------------------
  const parseConfig = () => {
    const cfg = clone(DEF);
    // se leen y combinan todas las tarjetas de tipo Config, de sus Notes (sin límite de largo) y de su Entry
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
          else if ((m = f.match(/^needs\s+([\p{L}\p{N}_]+)\s*(>=|<=|>|<)\s*(-?[\d.]+)/iu))) d.needs = { stat: m[1].toLowerCase(), op: m[2], val: num(m[3], 0) };
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
      // [cfg obsesion:0.3] vale igual que [cfg obsesión:0.3]: la clave pasa al nombre exacto del stat
      for (const k of Object.keys(cfg.vals)) {
        const base = k.replace(/^start\./, ""), d = G.stats.find((x) => fold(x.name) === fold(base));
        if (d && d.name !== base) { cfg.vals[k.replace(base, d.name)] = cfg.vals[k]; delete cfg.vals[k]; }
      }
      const keys = String(c.keys || "").split(",").map((k) => k.trim()).filter((k) => k.length >= 3 && /^[\p{L}'’ .\-]+$/u.test(k));
      const name = (title.replace(/^@/, "").replace(/\s*[([].*$/, "").trim() || keys[0] || strip(entry).split(/[,.:\n]/)[0]).trim();
      if (!name || name.length > 40) return;
      const first = stripTitles(name).split(/\s+/)[0];           // "Lady Corvina Ashe" -> Corvina
      if (skip.includes(name.toLowerCase()) || skip.includes(first.toLowerCase())) return;
      const aliases = (cfg.vals.alias || "").split("/").map((a) => a.replace(/_/g, " ").trim()).filter((a) => a.length >= 3);
      const names = Array.from(new Set([name, first].concat(keys, aliases)));
      const re = wordRe(names.map(esc).join("|"), "gi");
      out.push({ id: String(c.id != null ? c.id : idx), idx, card: c, entry, cfg, name, first, names, re });
    });
    return out;
  };

  // first run in any adventure: create the engine's own cards (never sent to the AI: their trigger never appears)
  const AUTOCARDS = [
    { type: "config", title: "LW Config", key: "lw_config", notes: defaultCfgText },
    { type: "relations", title: "LW Relaciones", key: "lw_relations",
      notes: () => BONDS.join("\n") },
    { type: "chronicle", title: "LW Crónica", key: "lw_chronicle",
      notes: () => "# Crónica. Las líneas que empiezan por guion son entradas del diario de la historia; puedes añadir las tuyas." },
    { type: "events", title: "LW Eventos", key: "lw_events", notes: () => DECK.join("\n") },
    { type: "arc", title: "LW Arco", key: "lw_arc", notes: () => ARC.join("\n") },
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

  // ---- bloque de la tarjeta (copia de los números, visible y editable) -------------
  const blockText = (X, ch, r) => {
    const lines = ["<<LW"];
    for (const d of activeStats(X, ch)) lines.push(d.name + ": " + (r.s[d.name] != null ? r.s[d.name] : startOf(d, ch)).toFixed(1));
    lines.push("escenas: " + r.scenes, "contactos: " + r.touched.length);
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
      const m = line.match(/^\s*([\p{L}\p{N}_.]+)\s*:\s*(-?[\d.]+)/u);
      if (!m) continue;
      const key = fold(m[1]);
      if (key === "escenas") { r.scenes = Math.max(0, Math.round(num(m[2], r.scenes))); continue; }
      const d = act.find((x) => fold(x.name) === key);
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
    const text = blockText(X, ch, r);
    if (getBlock(ch) === text && !BLOCK.test(ch.entry)) { L.mirror[ch.id] = text; return; }
    // la Entry queda solo para lo que lee la IA; los números van en las Notes
    const own = String(ch.card.description || "");
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
    const n = fold(String(name).trim());                          // "Ines" encuentra a Inés
    if (!n) return null;
    return X.roster.find((c) => c.names.some((a) => fold(a) === n)) || null;
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

  // "el protagonista" -> "la protagonista" (y del/al) cuando la Config dice protagonista: la
  const prota = (s, t) => String(s.protagonista || "el").trim().toLowerCase() !== "la" ? t : String(t)
    .replace(/\b([Dd])el protagonista\b/g, "$1e la protagonista")
    .replace(/\b([Aa])l protagonista\b/g, "$1 la protagonista")
    .replace(/\b([Ee])l protagonista\b/g, (m, e) => (e === "E" ? "La" : "la") + " protagonista");

  // la línea corta entre corchetes que recibe la IA cada turno; si es demasiado larga, caen primero las partes menos importantes
  const buildInject = (X, L, ids, tp) => {
    const W = L.w, s = X.cfg.s, parts = [];
    const add = (p, t) => { if (t) parts.push({ p, t }); };
    if (s.clock) add(2, "Momento: " + dayLabel(X, W) + ".");
    const A = X.arc;
    if (A.beats.length && !W.arcDone) {
      const act = A.acts[W.act];
      if (act && act.text) add(4, "Acto " + W.act + (act.name ? " (" + act.name + ")" : "") + ": " + act.text.replace(/[.\s]+$/, "") + ".");
      const b = W.bt ? beatById(A, W.bt.id) : null;
      if (b && b.guide) add(2, "Momento clave: " + b.guide.replace(/[.\s]+$/, "") + ".");
    }
    for (const e of X.ev) {
      const a = W.ev[e.id];
      if (a && e.stages[a.st - 1]) add(3, EVPREFIX[e.kind] + e.stages[a.st - 1].replace(/[.\s]+$/, "") + ".");
    }
    const tw = W.tw && X.tw.find((t) => t.id === W.tw.id);
    if (tw && tw.stages[W.tw.st - 1])
      add(2, (W.tw.st < tw.stages.length ? "Giro (solo insinúalo): " : "Giro (haz que ocurra ya): ") +
        twistFill(tw.stages[W.tw.st - 1], W.tw.who) + ".");
    if (s.scene) add(4, s[{ setup: "scene_setup", mid: "scene_mid", end: "scene_end", over: "scene_over" }[scenePhase(X, W)]]);
    const feel = {};                                          // mismos sentimientos, una línea: "Mira y Tobin: ..."
    for (const id of ids) {
      const ch = X.byId[id], r = L.rel[id];
      if (!ch || !r) continue;
      // solo los sentimientos que se han movido desde donde empezó el personaje; el cambio mayor primero
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
        const ts = stageText(X, "tensión", L.tension[key] || 0);
        const bits = [];
        if (tie) bits.push(tie.text);
        if (ts) bits.push(ts);
        const fa = X.byId[ids[i]].first, fb = X.byId[ids[j]].first;
        const named = tie && tie.text.includes(fa) && tie.text.includes(fb);      // los lazos sacados del mazo ya nombran a los dos
        if (bits.length) { add(3, (named ? bits.join("; ").replace(/^./, (c) => c.toUpperCase()) : fa + " y " + fb + ": " + bits.join("; ")) + "."); np++; }
      }
    }
    if (s.thoughts && !W.off && s.thoughts_context > 0) {
      let n = 0;
      for (const id of ids) {
        const r = L.rel[id];
        if (n >= s.thoughts_context || !r || !r.th.length) continue;
        add(5, X.byId[id].first + " estaba pensando: " + r.th.slice(-Math.max(1, s.thoughts_recent)).map((t) => "\"" + t.slice(0, 120) + "\"").join(" ") + ".");
        n++;
      }
    }
    if (s.memories_recent > 0 && s.memories_context > 0) {
      const shown = W.log.slice(-s.chronicle_lines).join(" ");      // ya va como "Hace poco"
      let n = 0;
      for (const id of ids) {
        const r = L.rel[id], mem = ((r && r.mem) || []).filter((m) => !shown.includes(m.replace(/^\([^)]*\) /, "")));
        if (n >= s.memories_context || !mem.length) continue;
        add(4, X.byId[id].first + " recuerda: " + mem.slice(-s.memories_recent).map((m) => m.slice(0, 160)).join(" "));
        n++;
      }
    }
    if (W.log.length && s.chronicle_lines > 0)
      add(3, "Hace poco: " + W.log.slice(-s.chronicle_lines).map((l) => l.replace(/^\[(Día \d+)[^\]]*\]\s*/, "($1) ").replace(/[[\]]/g, "").slice(0, 160)).join(" "));
    if (info.actionCount < s.early_actions) {
      const quiet = X.roster
        .filter((c) => !ids.includes(c.id) && !c.cfg.flags.noearly)
        .sort((a2, b2) => ((L.rel[a2.id] || {}).scenes || 0) - ((L.rel[b2.id] || {}).scenes || 0))
        .slice(0, 2).map((c) => c.first);
      if (quiet.length) add(5, "Pronto, dale a " + andList(quiet) + " un momento con el protagonista.");
    }
    add(1, tp ? thoughtInstr(X, tp, L) : "");
    if (W.pendLog.length) add(1, "Termina la respuesta con {log: una frase en pasado que resuma lo que acaba de pasar}.");
    if (s.contact) {
      const names = L.allow.map((id) => X.byId[id] && X.byId[id].first).filter(Boolean);
      if (names.length) add(0, "El protagonista permite que " + names.join(" y ") + " le toque solo en esta acción.");
      add(0, "Contacto físico: nunca, salvo que el protagonista lo permita en esta misma acción.");
    }
    const len = () => parts.reduce((n, x) => n + x.t.length + 1, 2);
    while (len() > s.inject_max) {
      let k = -1;
      for (let i = 0; i < parts.length; i++) if (parts[i].p >= 2 && (k < 0 || parts[i].p >= parts[k].p)) k = i;
      if (k < 0) break;
      parts.splice(k, 1);
    }
    return parts.length ? prota(s, "[" + parts.map((x) => x.t).join(" ") + "]") : "";
  };

  // ---- commands -------------------------------------------------------------
  // "afi" -> afinidad, "atraccion" -> atracción (prefijo único de 3 letras o más, o el nombre entero; con o sin tildes)
  const resolveStat = (X, word) => {
    const w = fold(word);
    const exact = X.cfg.stats.find((d) => fold(d.name) === w);
    if (exact) return exact.name;
    if (w.length < 3) return null;
    const hits = X.cfg.stats.filter((d) => fold(d.name).startsWith(w));
    return hits.length === 1 ? hits[0].name : null;
  };

  const BASECMDS = ["help", "rels", "rel", "allow", "deny", "set", "tie", "ties", "tension", "tensions", "check", "peek"];
  const PAIRCMDS = ["tie", "ties", "tension", "tensions"];
  // comandos en castellano (sin tildes: /cronica y /crónica valen igual); los ingleses siguen funcionando
  const ALIAS = { ayuda: "help", relaciones: "rels", relacion: "rel", permitir: "allow", prohibir: "deny", denegar: "deny",
    fijar: "set", lazo: "tie", lazos: "ties", tensiones: "tensions", comprobar: "check", ver: "peek",
    marcar: "flag", desmarcar: "unflag", marcas: "flags", anotar: "log", cronica: "chronicle", evento: "event", eventos: "events",
    arco: "arc", escena: "scene", hora: "time", dia: "day", pensamientos: "thoughts", pensar: "think", pnj: "npc",
    faccion: "faction", lugar: "place", giro: "twist", giros: "twists" };
  const cmdName = (w) => { const f = fold(w); return ALIAS[f] || f; };

  // longest character name found at the very start of a string
  const matchAt = (X, s) => {
    let best = null;
    for (const c of X.roster) for (const n of c.names) {
      const mm = s.match(new RegExp("^" + esc(n) + WB1, "iu"));
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
      const skip = rest.match(/^[\s,&+]*(?:(?:and|with|y|e|con)\s+)?/i)[0].length;
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
    const m = text.match(/(^|[\s"“])\/([\p{L}\p{N}_]+)/u);
    if (!m) return null;
    const cmd0 = cmdName(m[2]);
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
      const mm = win.match(wordRe(esc(n), "i"));
      if (mm && (!best || mm.index < best.idx || (mm.index === best.idx && mm[0].length > best.len)))
        best = { c, idx: mm.index, len: mm[0].length };
    }
    const ch = best ? best.c : null;
    let consumed = best ? best.idx + best.len : 0;

    let stat = statNames.includes(cmd) ? cmd : null;
    if (cmd === "set") {
      const re = /[\p{L}_]+/gu;
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
        if (!mine.length) return a.first + " no tiene lazos en la tarjeta Relations.";
        return a.first + ": " + mine.map((t) => X.byId[t.a === a.id ? t.b : t.a].first + " (" + t.text + ")").join("; ") + ".";
      }
      if (!X.relCards.length) return "No hay tarjeta Relations. Crea una (Type: Relations).";
      return Object.keys(X.ties).length + " lazos cargados." + (X.tieWarn.length ? " Líneas sin resolver: " + X.tieWarn.join(" / ") + "." : "");
    }
    if (pc.cmd === "tensions") {
      const list = Object.keys(L.tension).filter((k) => L.tension[k] > 0 && X.byId[k.split("|")[0]] && X.byId[k.split("|")[1]])
        .sort((x, y) => L.tension[y] - L.tension[x])
        .map((k) => X.byId[k.split("|")[0]].first + "-" + X.byId[k.split("|")[1]].first + " " + L.tension[k].toFixed(1));
      return list.length ? "Tensión: " + list.join(", ") + "." : "Todavía no hay tensión entre personajes.";
    }
    if (!a || !b) return "Nombra a dos personajes, por ejemplo /" + (pc.cmd === "tie" ? "lazo Mira Tobin íntimos amigos." : "tension Mira Tobin +2.");
    if (pc.cmd === "tie") {
      if (!pc.desc) return "Añade una descripción, por ejemplo /lazo Mira Tobin íntimos amigos.";
      if (!X.relCards.length) return "Crea antes una tarjeta Relations (Type: Relations).";
      writeTie(X, a, b, pc.desc);
      return a.first + " y " + b.first + ": " + pc.desc;
    }
    // tensión
    if (pc.numText == null) return "Añade un número, por ejemplo /tension " + a.first + " " + b.first + " +2.";
    const key = pk(a.id, b.id), v = num(pc.numText, 0);
    L.tension[key] = clamp(/^[+-]/.test(pc.numText) ? (L.tension[key] || 0) + v : v, 0, X.cfg.s.tension_max);
    persistTension(X, L);
    return "La tensión entre " + a.first + " y " + b.first + " es ahora " + L.tension[key].toFixed(1) + ".";
  };

  const runCmd = (X, L, pc) => {
    const ch = pc.ch;
    if (pc.cmd === "peek") return "";   // lo rellena onInput cuando ya está construida la línea de esta acción
    if (pc.cmd === "check") {
      const cfgCards = (storyCards || []).filter((c) => c && String(c.type || "").toLowerCase() === "config").length;
      const d = L.dbg;
      return "LW Affinity Engine (castellano) " + VERSION + ". Personajes " + X.roster.length + ". Tarjetas Config " + cfgCards + ". Tarjetas Relations " + X.relCards.length + ", lazos " + Object.keys(X.ties).length +
        (X.tieWarn.length ? " (" + X.tieWarn.length + " sin resolver)" : "") + ". Inject: " + X.cfg.s.inject + ". Eventos " + X.ev.length + ", beats del arco " + X.arc.beats.length + (X.arc.beats.length ? " (acto " + L.w.act + " de " + X.arc.maxAct + ")" : "") +
        ", tarjeta Chronicle " + (chrCard() ? "sí" : "no") + ", condiciones ilegibles " + countBadConds(X, L) + ". " +
        (d ? "Último contexto (acción " + d.turn + "): " + d.chars + " caracteres, " + d.stripped + " marca(s) ocultas quitadas, línea inyectada encontrada: " + (d.injected ? "sí" : "no") + "." +
        (String(X.cfg.s.inject).toLowerCase() === "text" ? "" :
          " frontMemory puesta por el script: " + ((state.memory && state.memory.frontMemory) ? state.memory.frontMemory.length + " caracteres" : "vacía") +
          (d.taken ? " Otro script ha pisado la frontMemory, así que la línea ha ido dentro del texto del contexto." : "") +
          (d.injected ? "" : " (aquí un 'no' es normal: AI Dungeon añade la frontMemory después de este paso, así que busca la línea entre corchetes en el visor de contexto; si no está, añade 'inject: text' a la tarjeta Config)") + ".")
        : "Todavía no se ha visto ningún contexto; juega un turno y vuelve a usar /comprobar.");
    }
    if (PAIRCMDS.includes(pc.cmd)) return runPairCmd(X, L, pc);
    if (pc.cmd === "help")
      return "Comandos: /relacion Nombre, /relaciones, /fijar Nombre stat valor, /<stat> Nombre +2, /permitir Nombre, /prohibir [Nombre], /lazos [Nombre], /lazo A B texto, /tension A B +2, /tensiones, /pensamientos [Nombre|on|off|Nombre N], /pensar Nombre, /anotar texto, /canon marca texto, /cronica, /marcar x, /desmarcar x, /marcas, /evento id, /eventos, /arco [siguiente|rebarajar|modo x|acto N], /escena, /hora, /dia, /pnj /faccion /lugar Nombre, descripción, /autostats, /giro [id], /giros, /comprobar, /ver. Los comandos en inglés también valen. Stats: " +
        X.cfg.stats.map((d) => d.name).join(", ") + ".";
    if (pc.cmd === "rels") {
      const first = X.cfg.stats[0].name;
      return X.roster.slice()
        .sort((a, b) => (L.rel[b.id].s[first] || 0) - (L.rel[a.id].s[first] || 0))
        .map((c) => c.first + ": " + fmtStats(X, L, c)).join(" | ");
    }
    if (pc.cmd === "deny" && !ch) { L.allow = []; return "Se han retirado todos los permisos de contacto."; }
    if (!ch) return "Personaje desconocido. Usa su nombre de pila, por ejemplo Mira.";
    const r = L.rel[ch.id];
    if (pc.cmd === "rel") return ch.name + ": " + fmtStats(X, L, ch) + ", escenas " + r.scenes + ", contacto " + r.touched.length + " vez/veces.";
    if (pc.cmd === "allow" || pc.cmd === "deny") {
      if (!X.cfg.s.contact) return "La regla de contacto está apagada en la tarjeta Config (contact: off).";
      if (pc.cmd === "allow") {
        if (!L.allow.includes(ch.id)) L.allow.push(ch.id);
        return ch.first + " puede tocar al protagonista solo en tu próxima acción.";
      }
      L.allow = L.allow.filter((x) => x !== ch.id);
      return ch.first + " no tiene permiso para tocar al protagonista.";
    }
    // fijar / <stat>
    const d = activeStats(X, ch).find((x) => x.name === pc.stat);
    if (!pc.stat) return "Nombra un stat, por ejemplo /fijar Mira confianza 5.";
    if (!d) return ch.first + " no tiene el stat " + pc.stat + ".";
    if (pc.numText == null) return "Añade un número, por ejemplo /" + d.name + " " + ch.first + " +2.";
    const v = num(pc.numText, 0);
    r.s[d.name] = clamp(/^[+-]/.test(pc.numText) ? r.s[d.name] + v : v, d.min, d.max);
    persist(X, L, ch);
    return ch.first + ": " + d.name + " es ahora " + r.s[d.name].toFixed(1) + ".";
  };

  // ==========================================================================
  // PHASES 3-5: world state, clock, scenes, chronicle, events, arc, thoughts,
  // cleaner and card creation. All state lives in state.lw.w and is mirrored in
  // the Chronicle card (flags, clock, act, log) so you can read and edit it.
  // ==========================================================================
  const slug = (s) => fold(s || "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");   // "La Elección Difícil" -> la_eleccion_dificil
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
  const dayLabel = (X, W) => "Día " + W.day + (X.cfg.s.clock && todName(X, W) ? ", " + todName(X, W) : "");
  const advTod = (X, W, n) => {
    const len = times(X).length || 1;
    let i = W.tod + n;
    while (i >= len) { i -= len; W.day++; }
    while (i < 0) { i += len; W.day = Math.max(1, W.day - 1); }
    W.tod = i; W.ct = 0;
  };
  const NUMW = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, varios: 3, unos: 3, "unos cuantos": 3, "unos pocos": 3 };
  // palabras para un momento del día -> el nombre de clock_times por defecto (los saltos "tod" van a su siguiente aparición)
  const TODW = { amanecer: "amanecer", alba: "amanecer", madrugada: "amanecer", "primera luz": "amanecer", "primeras luces": "amanecer",
    "mañana": "mañana", "mediodía": "tarde", mediodia: "tarde", tarde: "tarde", atardecer: "anochecer", anochecer: "anochecer",
    ocaso: "anochecer", "crepúsculo": "anochecer", "puesta de sol": "anochecer", noche: "noche", medianoche: "noche" };
  const tod = (w) => ({ tod: TODW[String(w).toLowerCase().replace(/\s+/g, " ")] });
  // ponytail: frases hechas habituales; un salto contado de otra forma ("pasaron tres días") no mueve el reloj (usa /hora o /dia)
  const JUMPS = [
    [/(?<!\p{L})(?:(?:una|1)\s+semana\s+(?:después|más\s+tarde)|a\s+la\s+semana\s+siguiente|semanas\s+(?:después|más\s+tarde))(?!\p{L})/iu, () => ({ day: 7, tod: "mañana" })],
    [/(?<!\p{L})(\d+|dos|tres|cuatro|cinco|seis|varios|unos\s+cuantos|unos\s+pocos|unos)\s+días\s+(?:después|más\s+tarde)(?!\p{L})/iu, (m) => ({ day: parseInt(m[1], 10) || NUMW[m[1].toLowerCase().replace(/\s+/g, " ")] || 2, tod: "mañana" })],
    [/(?<!\p{L})(?:a\s+la\s+mañana\s+siguiente|la\s+mañana\s+siguiente|al\s+día\s+siguiente|el\s+día\s+siguiente|al\s+otro\s+día)(?!\p{L})/iu, () => ({ day: 1, tod: "mañana" })],
    [/(?<!\p{L})(?:hasta|al|a\s+la|por\s+la|hacia\s+la|hacia\s+el|a\s+eso\s+de\s+la)\s+(amanecer|alba|madrugada|mañana|mediodía|mediodia|tarde|atardecer|anochecer|ocaso|noche|medianoche)(?!\p{L})/iu, (m) => tod(m[1])],
    [/(?<!\p{L})(?:amaneció|amanece|anocheció|anochece|oscureció|oscurece|(?:cae|cayó)\s+la\s+noche|se\s+(?:hizo|hace)\s+de\s+(?:noche|día))(?!\p{L})/iu,
      (m) => tod(/amanec|de\s+día/i.test(m[0]) ? "amanecer" : /anochec/i.test(m[0]) ? "anochecer" : "noche")],
    [/(?<!\p{L})(?:el\s+)?sol\s+(?:sale|salió|asoma|asomó|se\s+alza|se\s+alzó)(?!\p{L})/iu, () => tod("amanecer")],
    [/(?<!\p{L})(?:el\s+)?sol\s+(?:se\s+pone|se\s+puso|se\s+oculta|se\s+ocultó|cae|cayó)(?!\p{L})/iu, () => tod("anochecer")],
    [/(?<!\p{L})(?:esa|aquella)\s+(noche|tarde|madrugada)(?!\p{L})|(?<!\p{L})(?:ese|aquel)\s+(anochecer|atardecer)(?!\p{L})/iu, (m) => tod(m[1] || m[2])],
    [/(?<!\p{L})(?:una\s+hora|unas\s+horas|horas|un\s+rato|un\s+tiempo)\s+(?:después|más\s+tarde)(?!\p{L})|(?<!\p{L})al\s+cabo\s+de\s+un\s+rato(?!\p{L})|(?<!\p{L})más\s+tarde\s+ese\s+(?:mismo\s+)?día(?!\p{L})/iu, () => ({ step: 1 })],
  ];
  // solo la narración mueve el reloj: los diálogos, pensamientos y recuerdos ("recuerdo aquella noche") no
  // ponytail: una línea que empieza por raya es diálogo entero, incisos del narrador incluidos ("—Hasta el alba —dijo.")
  const narration = (text) => String(text).replace(/^[ \t]*[—–][^\n]*/gm, " ").replace(/"[^"\n]*"|“[^”\n]*”|«[^»\n]*»/g, " ")
    .split(/(?<=[.!?])\s+/).filter((s) => !/(?<!\p{L})(?:recuerd\p{L}*|record\p{L}*|memoria\p{L}*|hace\s+(?:años|tiempo|mucho)|solí\p{L}+|érase|antaño)(?!\p{L})/iu.test(s)).join(" ");
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
    const l = ["<<LWW", "día: " + W.day, "hora: " + todName(X, W), "acto: " + W.act, "semilla: " + W.seed];
    Object.keys(W.flags).sort().forEach((f) => l.push("marca: " + f));
    Object.keys(W.fired).sort().forEach((f) => l.push("hecho: " + f));
    l.push("LWW>>");
    return l.join("\n");
  };
  const wAdopt = (X, W, blk) => {
    const flags = {}, fired = {}, t = times(X).map((s) => s.toLowerCase());
    for (const line of blk.split("\n")) {
      const m = line.match(/^\s*([\p{L}_]+)\s*:\s*(.+?)\s*$/u);
      if (!m) continue;
      const k = fold(m[1]), v = m[2];
      if (k === "dia") W.day = Math.max(1, Math.round(num(v, W.day)));
      else if (k === "hora") { const i = t.indexOf(v.toLowerCase()); if (i >= 0) W.tod = i; }
      else if (k === "acto") W.act = Math.max(1, Math.round(num(v, W.act)));
      else if (k === "semilla") W.seed = Math.max(1, Math.round(num(v, W.seed)));
      else if (k === "marca") flags[slug(v)] = 1;
      else if (k === "hecho") fired[slug(v)] = W.fired[slug(v)] != null ? W.fired[slug(v)] : 0;
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
  // noMem: las notas del propio motor (un stat que cruza una etapa) no son recuerdos
  const addLog = (X, W, text, noMem) => {
    const t = String(text).replace(/\s+/g, " ").replace(/\]/g, ")").trim().slice(0, 220);
    if (!t) return;
    const line = (X.cfg.s.clock ? "[" + dayLabel(X, W) + "] " : "") + t;
    W.log.push(line);
    W.add.push(line);
    while (W.log.length > LOG_KEEP) W.log.shift();
    if (!noMem) remember(X, (X.cfg.s.clock ? "(" + dayLabel(X, W).replace(/,.*$/, "") + ") " : "") + t);
  };
  // cada personaje que nombra la entrada se la guarda como recuerdo propio
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
  const namesOf = (X, v) => String(v).split(/\s+(?:or|o)\s+|\//i).map((n) => findChar(X, n)).filter(Boolean);
  // returns true, false, or null when the condition cannot be read
  const evalOne = (X, L, cx, raw) => {
    const W = L.w, c = String(raw).trim().toLowerCase();
    if (!c) return true;
    let m;
    if ((m = c.match(/^prob\s*[:=]?\s*(\d+(?:\.\d+)?)$/))) return rng(hashStr(cx.key + ":" + cx.turn + ":" + W.seed))() * 100 < num(m[1], 0);
    if ((m = c.match(/^(!?)(flag|fired)\s*[:=]\s*([\p{L}\p{N}_-]+)$/u))) {
      const has = m[2] === "flag" ? !!W.flags[slug(m[3])] : W.fired[slug(m[3])] != null;
      return m[1] ? !has : has;
    }
    if ((m = c.match(/^(present|met)\s*:\s*(.+)$/))) {
      const chs = namesOf(X, m[2]);
      if (!chs.length) return false;
      return m[1] === "present" ? chs.some((ch) => cx.present.includes(ch.id)) : chs.some((ch) => L.rel[ch.id] && L.rel[ch.id].scenes > 0);
    }
    if ((m = c.match(/^time\s*[:=]\s*(.+)$/))) return m[1].split(/\s+(?:or|o)\s+|\//).map((s) => s.trim()).includes(todName(X, W).toLowerCase());
    if ((m = c.match(new RegExp("^(action|day|act|scene|met)\\s*" + COND_OP + "\\s*(-?[\\d.]+)$")))) {
      const v = m[1] === "action" ? cx.turn : m[1] === "day" ? W.day : m[1] === "act" ? W.act : m[1] === "scene" ? W.sc.n : metCount(X, L);
      return cmp(v, m[2], num(m[3], 0));
    }
    if ((m = c.match(/^any[\s.]+(.+)$/))) {
      const toks = [], re = new RegExp("([\\p{L}\\p{N}_]+)\\s*" + COND_OP + "\\s*(-?[\\d.]+)", "gu");
      let t;
      while ((t = re.exec(m[1])) !== null) { const d = X.cfg.stats.find((x) => fold(x.name) === fold(t[1])); toks.push({ stat: d ? d.name : null, op: t[2], val: num(t[3], 0) }); }
      if (!toks.length || toks.some((k) => !k.stat)) return null;
      return X.roster.some((ch) => toks.every((k) => { const v = statVal(L, ch, k.stat); return v != null && cmp(v, k.op, k.val); }));
    }
    if ((m = c.match(new RegExp("^(\\p{L}[\\p{L}\\p{N}_' -]*?)\\.([\\p{L}\\p{N}_]+)\\s*" + COND_OP + "\\s*(-?[\\d.]+)$", "u")))) {
      const ch = findChar(X, m[1]), d = X.cfg.stats.find((x) => fold(x.name) === fold(m[2]));
      if (!ch || !d) return null;
      const v = statVal(L, ch, d.name);
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
  const EVPREFIX = { public: "Lo sabe todo el mundo: ", secret: "Secreto (solo insinúalo, nunca lo digas): ", random: "Ocurre algo: " };

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
    if (b.log) addLog(X, W, b.log); else W.pendLog.push("Momento clave: " + b.title + ".");   // se le pide a la IA que escriba lo que pasó
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
    if (!W.bt && actDone(W, q)) {
      if (W.act >= A.maxAct) { W.arcDone = true; addLog(X, W, "El arco de la historia llega a su fin."); return; }
      W.act++; W.btEnd = cx.turn;
      buildQueue(X, L, A, W.act);
      const an = (A.acts[W.act] || {}).name;
      addLog(X, W, "Empieza el acto " + W.act + (an ? ": " + an : "") + ".");
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
  const twistFill = (t, who) => String(t).replace(/\{who\}/gi, who || "alguien").replace(/[.\s]+$/, "");
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
    // corta a propósito: se envía entera cada vez que alguien piensa (las repeticiones se filtran al guardar el pensamiento)
    const names = tp.instr.map((ch) => ch.first);
    const tones = tp.instr.filter((ch) => ch.cfg.vals.tone).map((ch) => ch.first + " " + String(ch.cfg.vals.tone).replace(/_/g, " "));
    const mood = X.cfg.s.mood;
    return "Empieza la respuesta con " + names.map((n) => n + (mood ? " piensa (x): «...»" : " piensa: «...»")).join(" ") +
      ": una frase nueva en primera persona cada uno, en castellano, de menos de " + X.cfg.s.thoughts_words + " palabras, nombrando a las personas, no con pronombres" +
      (mood ? "; x es + si se siente más cerca del protagonista, - si más lejos, = si igual" : "") +
      (tones.length ? "; tono: " + tones.join(", ") : "") + ". Después sigue con la historia.";
  };

  // ---- mood: was this scene good or bad for the character? ----------------------
  // manda el signo del propio pensamiento (+ - =); si no hay, las palabras de humor en las frases que nombran al personaje
  // ponytail: raíces de palabras y una ventana de negación de 2 palabras; se escapan la ironía y los pronombres ("la insultas")
  const NEGATION = /(?<!\p{L})(?:no|nunca|jamás|sin|ni)\s+(?:\S+\s+)?$/iu;
  // ch can be a list: then only sentences naming all of them count (a quarrel or a kind moment between two characters)
  const moodScore = (X, ch, text) => {
    const chs = [].concat(ch);
    let sc = 0;
    const hits = (words, sent, v) => {
      if (!words) return;
      const re = new RegExp(WB0 + "(?:" + words + ")\\p{L}*", "giu");
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
  // la línea cfg de una tarjeta: cambia una clave (la usa /pensamientos Nombre N)
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
  const matchCase = (m, to) => (/^\p{Lu}/u.test(m) && to ? to.charAt(0).toUpperCase() + to.slice(1) : to);
  const cleanText = (X, body) => {
    const s = X.cfg.s;
    if (!s.clean) return body;
    let out = body;
    for (const b of X.cfg.ban || []) {
      let re;
      try { re = new RegExp(WB0 + esc(b.phrase) + WB1, "giu"); } catch (_) { continue; }
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
        if (/ (?:piensa|thinks)(?: \([+\-=]\))?: «/.test(line)) return line;
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
    npc: { type: "character", word: "personaje", un: "un personaje nuevo llamado", tpl: "npc_template" },
    faction: { type: "faction", word: "facción", un: "una facción nueva llamada", tpl: "faction_template" },
    place: { type: "location", word: "lugar", un: "un lugar nuevo llamado", tpl: "place_template" },
  };
  const capName = (n) => n.split(" ").map((w, i) => (i > 0 && /^(de|del|la|las|los|el|y|e|von|van|of|the)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  // activadores: "Capitán Vex Dorn" -> Vex, Vex Dorn, Capitán Vex Dorn (un título solo nunca se convierte en activador)
  const keyList = (kind, name) => {
    const k = [];
    if (kind === "npc") { const core = stripTitles(name); k.push(core.split(" ")[0]); k.push(core); }
    k.push(name);
    const bare = name.replace(/^(?:el|la|los|las|the)\s+/i, "");
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
    t = t.replace(/^(?:entry|story card|card|entrada|tarjeta)\s*:\s*/i, "").replace(/^["“«]+|["”»]+$/g, "").replace(/\s{2,}/g, " ").trim();
    // la IA suele seguir con la historia después de la tarjeta: se corta en la primera frase que suena a historia
    const sents = t.split(/(?<=[.!?])\s+/), keep = [];
    for (const sn of sents) {
      if (keep.length && (/^(?:Tú|Tu|Tus|Te|Ti|You|Your)(?!\p{L})/u.test(sn) || /["“”—]/.test(sn))) break;
      keep.push(sn);
    }
    t = keep.join(" ");
    // una tarjeta termina con su frase de Aspecto
    const ap = t.search(/\b(?:Aspecto|Apariencia|Appearance):/i);
    if (ap >= 0) { const m = t.slice(ap).match(/^[^.!?]*[.!?]/); if (m) t = t.slice(0, ap + m[0].length); }
    if (t.length < 30) return "";
    // el nombre va primero, salvo que la tarjeta ya empiece con él ("Capitán Vex Dorn, ..." para /pnj Vex)
    if (!t.split(",")[0].toLowerCase().includes(stripTitles(name).toLowerCase())) t = name + ", " + t.charAt(0).toLowerCase() + t.slice(1);
    if (t.length > max) {
      const cut = t.slice(0, max), i = cut.lastIndexOf(".");
      t = i > max * 0.5 ? cut.slice(0, i + 1) : cut.trim();
    }
    return t;
  };
  // ---- autostats: the AI designs the stats for this story ------------------------
  const statsReq = (X) => ({ kind: "stats", name: "stats", done: false, doneTurn: -1,
    instr: prota(X.cfg.s, "[Fuera de personaje: antes de seguir con la historia, diseña cómo se miden en ESTA historia los sentimientos de los personajes hacia el protagonista. " +
      "Responde solo con 1 o 2 líneas como\nstat: nombre | auto | 0-10 | start N | rate N\ny después, para cada stat, una línea como\n" +
      "stages: nombre | 0=texto | 3=texto | 6=texto | 9=texto\nReglas: cada nombre es una sola palabra en castellano y en minúsculas que encaje con el género y los temas de la historia " +
      "(por ejemplo lealtad, miedo, deseo, respeto, sospecha, deuda); start de 0 a 5; rate de 0.1 a 0.3; después de rate puedes añadir: steady " +
      "(siempre crece mientras están juntos, para compulsiones o maldiciones), romance (sentimientos románticos), needs otrostat>=N. Deja en inglés las palabras " +
      "stat, stages, auto, start, rate, steady, romance y needs. Cada texto de etapa es una frase corta en castellano sobre la actitud del personaje hacia el protagonista; " +
      "0= puede ir vacío. Sé original: sorprende al jugador." +
      (X.cfg.stats.some((d) => d.keep) ? " Estos ya existen, así que añade otros nuevos y no los repitas: " + X.cfg.stats.filter((d) => d.keep).map((d) => d.name).join(", ") + "." : "") + "]") });

  // rewrite the stat and stages lines of the Config card, and set some keys
  const writeCfg = (statLines, sets, keep) => {
    const c = cardsOf("config")[0];
    if (!c) return;
    const out = [], done = {};
    let at = -1, last = -1;
    for (const l of String(c.description || "").split("\n")) {
      const m = l.match(/^\s*(stat|stages)\s*:\s*([^|]*)/i);
      const nm = m ? m[2].trim().toLowerCase() : "";
      if (m && !(m[1].toLowerCase() === "stages" && fold(nm) === "tension") && !(keep || []).includes(nm)) { if (at < 0) at = out.length; continue; }
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
      if (!/^\p{Ll}[\p{Ll}_]{1,19}$/u.test(name) || fold(name) === "tension" || kept.some((k) => fold(k) === fold(name))) continue;
      const line = m[1].toLowerCase() + ": " + [name].concat(p.slice(1).map((x) => x.trim())).join(" | ");
      if (m[1].toLowerCase() === "stages") stages.push({ name, line });
      else if (stats.length < 3 && !stats.some((s) => s.name === name)) stats.push({ name, line, auto: /^auto$/i.test((p[1] || "").trim()) });
    }
    if (!stats.length) {
      writeCfg([], { autostats: "off" }, kept);
      return "[LW: No se han podido leer stats en la respuesta, así que se quedan los de por defecto. Usa /autostats para volver a intentarlo.]";
    }
    const names = stats.map((s) => s.name), auto = stats.filter((s) => s.auto).map((s) => s.name);
    writeCfg(stats.map((s) => s.line).concat(stages.filter((s) => names.includes(s.name)).map((s) => s.line)),
      { tension_stat: kept.includes(X.cfg.s.tension_stat) ? X.cfg.s.tension_stat : auto[0] || names[0],
        chronicle_stats: kept.filter((k) => String(X.cfg.s.chronicle_stats).split("|").includes(k)).concat(auto).join("|"), autostats: "off" }, kept);
    return "[LW: Ya están listos los " + stats.length + " stats nuevos de esta historia. Son una sorpresa; si quieres saberlos, mira la tarjeta LW Config. Pulsa Continue.]";
  };

  const handleCreate = (X, L, body, turn) => {
    const W = L.w, cr = W.create;
    cr.done = true; cr.doneTurn = turn;
    if (cr.kind === "stats") return handleStats(X, L, body);
    const kind = KINDS[cr.kind], max = Math.min(1000, num(X.cfg.s.max_entry, 1000));
    const entry = cleanEntry(body, cr.name, max);
    if (!entry) return "[LW: No se ha podido leer una tarjeta para " + cr.name + " en la respuesta. Repite el comando con una descripción corta.]";
    // el nombre completo es aquello con lo que empieza el texto de la tarjeta (Kel -> Kel Doran)
    const seg = entry.split(",")[0].trim();
    const full = seg.toLowerCase().includes(stripTitles(cr.name).toLowerCase()) && seg.length <= 40 && /^[\p{L}'’ \-]+$/u.test(seg) ? seg : cr.name;
    const keys = Array.from(new Set(keyList(cr.kind, full).split(", ").concat([cr.name]))).join(", ");
    if (keyExists(cr.kind, cr.name) || keyExists(cr.kind, full)) {
      if (L.made && L.made[cr.name.toLowerCase()] === turn) {            // a retry of the same command: rewrite our own card
        const i = (storyCards || []).findIndex((c) => c && String(c.keys || "") === keys);
        if (i >= 0) { updateStoryCard(i, storyCards[i].keys, entry, storyCards[i].type); return "[LW: Reescrita la tarjeta de " + kind.word + " de " + cr.name + ".]"; }
      }
      return "[LW: Ya existe una tarjeta para " + cr.name + "; no se ha creado nada.]";
    }
    const res = addStoryCard(keys, entry, kind.type);
    if (res === false) return "[LW: No se ha podido crear la tarjeta de " + cr.name + " (activadores repetidos).]";
    for (let i = storyCards.length - 1; i >= 0; i--) {
      if (!storyCards[i] || storyCards[i].keys !== keys) continue;
      storyCards[i].title = full;                              // sin esto la tarjeta usa toda su lista de activadores como título
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
      tiesNote = done.length ? " Lazos añadidos con " + done.join(", ") + "." : " No se ha añadido ningún lazo (revisa los nombres y que exista una tarjeta Relations).";
    }
    return "[LW: Creada la tarjeta de " + kind.word + " de " + cr.name + "." + tiesNote + "]";
  };
  const startCreate = (X, L, cmd, arg) => {
    const kind = KINDS[cmd], W = L.w, turn = info.actionCount;
    let ties = "", a = arg.trim();
    const tm = a.match(/\s*;\s*(?:ties?|lazos?)\s*:?\s*(.+)$/i);
    if (tm) { ties = tm[1]; a = a.slice(0, tm.index).trim(); }
    let name, desc = "";
    const sep = a.match(/^(.+?)\s*(?:,|:|\s-\s|\s\/\s)\s*(.*)$/);
    if (sep) { name = sep[1]; desc = sep[2]; }
    else { const w = a.split(/\s+/); if (w.length <= 4) name = a; else { name = w[0]; desc = w.slice(1).join(" "); } }
    name = capName(name.replace(/[^\p{L}\p{N}'’ \-]/gu, "").replace(/\s+/g, " ").trim());
    if (!name || name.length > 40) return { note: "Pon un nombre, por ejemplo " + (cmd === "npc" ? "/pnj Kel, una camarera cotilla" : cmd === "place" ? "/lugar El Ancla Oxidada, una taberna del puerto" : "/faccion La Mano de Plata, un gremio de espías") + "." };
    const recent = L.made && L.made[name.toLowerCase()] != null && Math.abs(L.made[name.toLowerCase()] - turn) <= 1;
    if (keyExists(cmd, name) && !recent) return { note: "Ya existe una tarjeta para " + name + "." };
    const max = Math.min(1000, num(X.cfg.s.max_entry, 1000)) - 200;
    const tpl = String(X.cfg.s[kind.tpl] || "");
    W.create = { kind: cmd, name, ties, done: false, doneTurn: -1,
      instr: prota(X.cfg.s, "[Escribe solo, en castellano, el texto de la tarjeta para " + kind.un + " " + name + (desc ? " (" + desc + ")" : "") +
        ". Sigue exactamente este estilo, con el nombre al principio: \"" + tpl + "\" Que tenga menos de " + max + " caracteres, en tercera persona, sin ningún título delante del nombre y sin nada más en la respuesta.]") };
    return { note: "Escribiendo la tarjeta de " + kind.word + " de " + name + ". La próxima respuesta será la tarjeta.", create: true };
  };

  // ---- world commands -------------------------------------------------------------
  const WCMDS = ["flag", "unflag", "flags", "log", "canon", "chronicle", "event", "events", "arc", "scene", "time", "day", "thoughts", "think", "npc", "faction", "place", "autostats", "twist", "twists"];
  const parseW = (text) => {
    const m = text.match(/(^|[\s"“])\/([\p{L}\p{N}_]+)([^\n]*)/u);
    if (!m) return null;
    const cmd = cmdName(m[2]);
    if (!WCMDS.includes(cmd)) return null;
    // Do mode sends "> You /arc." and Say mode '> You say "/arc."': the closing period and quotes are not part of the command
    return { cmd, arg: m[3].replace(/["“”]/g, "").replace(/[\s.!?]+$/, "").trim(), start: m.index + m[1].length, end: m.index + m[0].length };
  };
  const arcStatus = (X, L) => {
    const A = X.arc, W = L.w;
    if (!A.beats.length) return "No hay tarjeta Arc. Crea una (Type: Arc).";
    if (!W.q[W.act]) buildQueue(X, L, A, W.act);
    const q = W.q[W.act], an = (A.acts[W.act] || {}).name;
    const left = q.f.concat(q.p).filter((id) => W.fired[id] == null).map((id) => (beatById(A, id) || {}).title).filter(Boolean);
    return (A.name || "Arco") + (W.arcDone ? " (terminado)" : ": acto " + W.act + " de " + A.maxAct + (an ? " (" + an + ")" : "")) + ", modo " + arcMode(X, W, A) +
      (W.bt ? ". Beat activo: " + (beatById(A, W.bt.id) || {}).title : "") + (left.length ? ". Pendientes: " + left.join(", ") : "") + ".";
  };
  const runW = (X, L, w) => {
    const W = L.w, arg = w.arg, turn = info.actionCount, cmd = w.cmd;
    const first = arg.split(/\s+/)[0] || "";
    if (cmd === "npc" || cmd === "faction" || cmd === "place") return startCreate(X, L, cmd, arg);
    if (cmd === "twist" || cmd === "twists") {
      if (!X.tw.length) return { note: "No hay giros. Añade líneas twist: a una tarjeta Events." };
      if (cmd === "twists") return { note: X.tw.map((t) => t.id + (W.tw && W.tw.id === t.id ? " (ahora)" : W.twUsed.includes(t.id) ? " (usado)" : "")).join(", ") + "." };
      if (W.tw) return { note: "Ya hay un giro en marcha; termina solo en unos turnos." };
      const present = presentIds(X, (history || []).slice(-4).map((h) => h.text).join(" ").replace(MARK, ""), X.cfg.s.max_present);
      const t = drawTwist(X, L, { turn, present }, rng(hashStr("tw!" + turn + ":" + W.seed)), first ? slug(first) : "");
      return { note: t ? "Se acerca un giro." : first ? "No hay ningún giro " + slug(first) + " que encaje ahora. Usa /giros para verlos." : "Ahora mismo ningún giro encaja en esta escena." };
    }
    if (cmd === "autostats") { W.create = statsReq(X); return { note: "Diseñando stats nuevos para esta historia. La próxima respuesta serán los stats.", create: true }; }
    if (cmd === "flag" || cmd === "unflag") {
      const f = slug(first);
      if (!f) return { note: "Nombra una marca, por ejemplo /" + (cmd === "flag" ? "marcar" : "desmarcar") + " puerta_abierta." };
      if (cmd === "flag") W.flags[f] = 1; else delete W.flags[f];
      return { note: "Marca " + f + (cmd === "flag" ? " puesta." : " quitada.") };
    }
    if (cmd === "flags") { const k = Object.keys(W.flags); return { note: k.length ? "Marcas: " + k.join(", ") + "." : "No hay ninguna marca puesta." }; }
    if (cmd === "log") { if (!arg) return { note: "Escribe la entrada, por ejemplo /anotar Mira perdonó al protagonista." }; addLog(X, W, arg); return { note: "Añadido a la crónica." }; }
    if (cmd === "canon") {
      const f = slug(first);
      if (!f) return { note: "Usa /canon nombre_de_marca lo que pasó." };
      W.flags[f] = 1;
      addLog(X, W, arg.slice(first.length).trim() || f.replace(/_/g, " "));
      return { note: "Canon anotado y marca " + f + " puesta." };
    }
    if (cmd === "chronicle") return { note: W.log.length ? "Crónica: " + W.log.slice(-6).join(" / ") : "La crónica está vacía." };
    if (cmd === "events") {
      if (!X.ev.length) return { note: "No hay tarjeta Events. Crea una (Type: Events)." };
      return { note: X.ev.map((e) => e.id + " (" + (W.fired[e.id] != null ? "hecho" : W.ev[e.id] ? "fase " + W.ev[e.id].st + "/" + e.stages.length : "en espera") + ")").join(", ") + "." };
    }
    if (cmd === "event") {
      const e = X.ev.find((x) => x.id === slug(first));
      if (!e) return { note: "Evento desconocido. Usa /eventos para verlos." };
      if (W.fired[e.id] != null) return { note: e.id + " ya ha ocurrido." };
      startEvent(X, L, e, { turn });
      return { note: "Evento " + e.id + " en marcha." };
    }
    if (cmd === "scene") { W.sc = { n: W.sc.n + 1, t: 0 }; if (X.cfg.s.chronicle_every > 0) W.pendLog.push(""); return { note: "Empieza la escena " + W.sc.n + "." }; }
    if (cmd === "time" || cmd === "day") {
      const a = arg.toLowerCase(), t = times(X);
      if (!a) return { note: dayLabel(X, W) + "." };
      let m;
      if (cmd === "day") {
        if ((m = a.match(/^([+-]\d+)$/))) W.day = Math.max(1, W.day + parseInt(m[1], 10));
        else if ((m = a.match(/^(\d+)$/))) W.day = Math.max(1, parseInt(m[1], 10));
        else return { note: "Usa /dia 5 o /dia +2." };
      } else {
        const dm = a.match(/\b(?:day|d[ií]a)\s*(\d+)/);
        if (dm) W.day = Math.max(1, parseInt(dm[1], 10));
        if ((m = a.match(/^([+-]\d+)$/))) advTod(X, W, parseInt(m[1], 10));
        else {
          const nm = t.find((x) => wordRe(esc(x.toLowerCase())).test(a));
          if (nm) W.tod = t.indexOf(nm); else if (!dm) return { note: "Usa /hora mañana, /hora +1 o /hora día 3 anochecer. Momentos: " + t.join(", ") + "." };
        }
      }
      W.ct = 0;
      return { note: "Ahora es " + dayLabel(X, W) + "." };
    }
    if (cmd === "think") {
      const ch = findChar(X, first);
      if (!ch) return { note: "Nombra a un personaje, por ejemplo /pensar Mira." };
      if (!W.force.includes(ch.id)) W.force.push(ch.id);
      return { note: ch.first + " pensará algo en el próximo turno en que esté en escena." };
    }
    if (cmd === "thoughts") {
      const a = arg.toLowerCase();
      if (!a) return { note: "Los pensamientos están " + (W.off || !X.cfg.s.thoughts ? "apagados" : "encendidos") + ". Intervalo por defecto: " + X.cfg.s.thoughts_interval + " turnos. Usa /pensamientos Nombre, /pensamientos Nombre 6, /pensamientos on u off." };
      if (a === "on" || a === "off") { W.off = a === "off"; return { note: "Pensamientos " + (a === "on" ? "encendidos." : "apagados.") }; }
      const ch = findChar(X, first);
      if (!ch) return { note: "Personaje desconocido. Usa su nombre de pila, por ejemplo /pensamientos Mira." };
      const nm = arg.slice(first.length).trim().match(/^\d+$/);
      if (nm) { setCfgVal(ch, "thoughts", nm[0]); return { note: ch.first + " piensa ahora cada " + nm[0] + " turnos" + (nm[0] === "0" ? " (nunca)." : ".") }; }
      const r = L.rel[ch.id];
      return { note: r && r.th.length ? ch.first + ": " + r.th.map((t) => "«" + t + "»").join(" ") : ch.first + " todavía no tiene pensamientos guardados." };
    }
    if (cmd === "arc") {
      const A = X.arc, parts = arg.split(/\s+/), val = parts.slice(1).join(" ");
      const sub = ({ siguiente: "next", rebarajar: "reroll", modo: "mode", acto: "act" })[fold(parts[0] || "")] || fold(parts[0] || "");
      if (!A.beats.length) return { note: "No hay tarjeta Arc. Crea una (Type: Arc)." };
      if (!W.q[W.act]) buildQueue(X, L, A, W.act);
      if (!sub) return { note: arcStatus(X, L) };
      if (sub === "reroll") { W.reroll++; buildQueue(X, L, A, W.act); return { note: "Beats sorteados de nuevo para el acto " + W.act + ". " + arcStatus(X, L) }; }
      if (sub === "mode") {
        const md = ({ autor: "authored", hibrido: "hybrid", aleatorio: "random" })[fold(val)] || fold(val);
        if (!/^(authored|hybrid|random)$/.test(md)) return { note: "Modos: authored (autor), hybrid (híbrido), random (aleatorio)." };
        W.mode = md; buildQueue(X, L, A, W.act);
        return { note: "El modo del arco es ahora " + W.mode + ". " + arcStatus(X, L) };
      }
      if (sub === "act") {
        const n = parseInt(val, 10);
        if (!(n >= 1 && n <= A.maxAct)) return { note: "Usa /arco acto 1 a " + A.maxAct + "." };
        W.act = n; W.bt = null; W.arcDone = false; W.btEnd = turn; buildQueue(X, L, A, n);
        return { note: "Pasamos al acto " + n + ". " + arcStatus(X, L) };
      }
      if (sub === "next") {
        const q = W.q[W.act];
        let b = W.bt ? beatById(A, W.bt.id) : null;
        if (!b) { const id = q.f.find((x) => W.fired[x] == null) || q.p.find((x) => W.fired[x] == null); b = id ? beatById(A, id) : null; }
        if (!b) return { note: "No queda nada en este acto; la historia avanza en el próximo turno." };
        fireBeat(X, L, b, { turn });
        return { note: "Beat hecho: " + b.title + "." };
      }
      return { note: "Usa /arco, /arco siguiente, /arco rebarajar, /arco modo hybrid, /arco acto 2." };
    }
    return { note: "" };
  };

  // ---- nombres sin tarjeta: pista para que el jugador cree una (las tarjetas nunca se crean solas) ----
  // ponytail: un nombre propio es una palabra en mayúscula a mitad de frase; los que solo salen al empezar frase se escapan
  const TITLES = new Set(("yo tú usted don doña señor señora señorita sr sra srta dr dra sir lady lord milord milady capitán capitana " +
    "rey reina príncipe princesa maestro maestra dios dioses oh ah ay eh vale ok bueno pues").split(" "));
  // "Capitán Vex Dorn" -> "Vex Dorn": los tratamientos delante de un nombre no son el nombre
  const HONORIFICS = new Set(("don doña señor señora señorita sr sra srta dr dra sir dama lady lord capitán capitana comandante general sargento " +
    "rey reina príncipe princesa duque duquesa conde condesa barón baronesa marqués marquesa maestro maestra padre madre hermano hermana fray sor san santa santo").split(" "));
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
    const here = new Set(), re = /(?<![\p{L}\p{N}_])\p{Lu}[\p{Ll}'’]+(?: \p{Lu}[\p{Ll}'’]+)?(?![\p{L}\p{N}_])/gu;
    let m;
    while ((m = re.exec(body)) !== null) {
      const pre = body.slice(0, m.index);
      if (/(?:^|[.!?¿¡"“”«»:—…]|\n)\s*$/.test(pre)) continue;               // principio de frase o de línea
      const words = m[0].replace(/['’]s$/, "").split(" ");
      while (words.length && TITLES.has(words[0].toLowerCase())) words.shift();  // "Capitán Vex" -> "Vex"
      if (words.length && !words.some((w) => known.has(w.toLowerCase()))) here.add(words.join(" "));
    }
    for (const n of here) { const e = L.nm[n] || (L.nm[n] = [0, -1]); if (e[1] !== turn) { e[0]++; e[1] = turn; } }
    const names = Object.keys(L.nm);
    if (names.length > 150) names.sort((a, b) => L.nm[a][0] - L.nm[b][0]).slice(0, names.length - 100).forEach((n) => delete L.nm[n]);
    const hit = Object.keys(L.nm).find((n) => L.nm[n][0] >= s.suggest_after && !n.split(" ").some((w) => known.has(w.toLowerCase())));
    if (!hit) return "";
    L.sug[hit] = turn;
    return "[LW: " + hit + " sale a menudo pero no tiene tarjeta, así que el motor no le sigue. Para añadirla, escribe /pnj " + hit +
      " y quién es en pocas palabras. Ejemplo: /pnj " + hit + ", un guardia que te debe un favor. La próxima respuesta será la tarjeta." +
      " ¿No es una persona? Usa igual /lugar " + hit + ", ... o /faccion " + hit + ", ... Para que deje de salir esta nota, añade " + hit + " a skip: en la tarjeta Config.]";
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
    W.create = null;                                                // una acción nueva sustituye cualquier petición de tarjeta anterior
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
    // lo que se le dirá a la IA sobre los personajes en juego
    const histText = (history || []).slice(-6).map((h) => h.text).join(" ").slice(-1500);
    // un roce que quien juega escribe en su propia acción cuenta como contacto y (módulo de contacto) como permiso, sin /permitir
    L.touchNow = [];
    if (!createNow && !(pc && pc.cmd === "deny")) {
      for (const sent of rest.replace(MARK, "").split(/(?<=[.!?])\s+/)) {
        if (!CONSENT.test(sent)) continue;
        let who = presentIds(X, sent, 2);
        if (!who.length) who = presentIds(X, histText.replace(MARK, ""), 1);      // "le cojo la mano": el último nombrado
        for (const id of who) L.touchNow.push([id, !rough(X, sent)]);
      }
      if (X.cfg.s.contact && X.cfg.s.auto_allow) for (const [id] of L.touchNow) if (!L.allow.includes(id)) L.allow.push(id);
    }
    const recent = histText + " " + rest;
    const ids = presentIds(X, recent.replace(MARK, ""), X.cfg.s.max_present);
    let block = "";
    // autostats: en la primera acción la IA diseña los stats de esta historia; la acción del jugador se queda en la historia
    const designing = !w && !pc && !!X.cfg.s.autostats && !L.statsDone;
    if (designing) W.create = statsReq(X);
    if (!createNow && !designing) {
      const tp = planThoughts(X, L, ids, info.actionCount);
      W.auto = tp.auto;
      block = buildInject(X, L, ids, tp);
    }
    L.lastBlock = block;
    L.lastAction = createNow ? "" : rest.replace(MARK, "");
    L.pending = block;                                              // se guarda para el paso de contexto en los dos modos
    if (String(X.cfg.s.inject).toLowerCase() !== "text") { state.memory = state.memory || {}; state.memory.frontMemory = block; }
    if (pc && pc.cmd === "peek") note = block ? "La IA recibe: " + block : "Ahora mismo no se le envía nada a la IA.";
    wPersist(X, L);
    let out = text;
    if (pc || w) {
      const mark = prota(X.cfg.s, "[LW: " + String(note).replace(/\]/g, ")") + "]");
      // lo que queda de "> You /arco." o '> You say "/arco."' es solo el envoltorio de Do/Say: se muestra solo la nota
      const left = rest.replace(/^\s*>?\s*(?:you|tú|tu)(?:\s+(?:say|dices))?(?!\p{L})/iu, "").replace(/[\s.!?,;:"“”]/g, "");
      out = createNow || !left ? mark : rest + " " + mark;
    }
    return { text: out };
  };

  // contexto lleno: se recorta el texto más antiguo de la historia que siga en él (localizado con history) para que quepa la línea;
  // las instrucciones y tarjetas de arriba y el texto más reciente se quedan
  // ponytail: las entradas de history se buscan por sus 60 primeros caracteres; si no aparece ninguna, no se recorta nada
  const makeRoom = (out, need, room) => {
    const over = out.length + need - room + 1;
    if (!room || over <= 0) return out;
    let i = -1;                                                  // el primer sitio donde aparece algún texto de history (pueden repetirse)
    for (const h of history || []) {
      const t = String(h.text || "").trim().slice(0, 60), k = t.length < 20 ? -1 : out.indexOf(t);
      if (k >= 0 && (i < 0 || k < i)) i = k;
    }
    if (i >= 0) {
      let j = i + over;
      const nl = out.indexOf("\n", j);
      if (nl >= 0 && nl - j < 300) j = nl;                       // el corte termina en un salto de línea si hay uno cerca
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
    // modo texto, o frontMemory pisada por otro script después de onInput: la línea va dentro del propio contexto
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

  // contacto que quien juega escribe en su propia acción (permiso solo para esa acción)
  // ponytail: raíces de verbos y partes del cuerpo; una forma rara de decirlo se escapa (usa /permitir)
  const CONSENT = /(?<!\p{L})(?:abraz|bes[aeoó]|acurruc|acarici|achuch|arrop)\p{L}*|(?<!\p{L})(?:toc|toq|cog|coj|tom|agarr|sujet|apriet|apret|estrech|tiend|extiend|ofrez|ofrec|pong|pon|pas[oa]|apoy|roz|acerc|entrelaz|acun|retir)\p{L}*[^.!?]*(?<!\p{L})(?:mano|manos|brazo|brazos|cara|rostro|mejilla|hombro|hombros|cintura|pelo|cabello|muñeca|dedos|palma|regazo|pecho|cuello|frente)(?!\p{L})|(?<!\p{L})(?:me\s+lanzo|corro|me\s+refugio|caigo|me\s+dejo\s+caer)[^.!?]*(?<!\p{L})brazos(?!\p{L})/iu;
  const rough = (X, sent) => !!X.cfg.s.mood_neg && new RegExp(WB0 + "(?:" + X.cfg.s.mood_neg + ")", "iu").test(sent);
  // un roce amistoso sube los touch_stats que tenga el personaje (el "needs" de cada stat se sigue respetando); sin tildes también vale
  const touchBump = (X, ch, r) => {
    const names = String(X.cfg.s.touch_stats || "").split("|").map((x) => fold(x.trim()));
    for (const d of activeStats(X, ch)) {
      if (!names.includes(fold(d.name)) || r.s[d.name] == null) continue;
      if (d.needs && !cmp(r.s[d.needs.stat] != null ? r.s[d.needs.stat] : 0, d.needs.op, d.needs.val)) continue;
      r.s[d.name] = clamp(r.s[d.name] + num(X.cfg.s.touch_bonus, 0), d.min, d.max);
    }
  };
  const TOUCH = /(?<!\p{L})(?:agarr|abraz|acarici|bes|tom|cog|coj|sujet|toc|toq|apriet|apret|roz)\p{L}*[^.!?]*(?<!\p{L})(?:mano|manos|cara|rostro|mejilla|brazo|cintura|hombro|pelo|cabello|muñeca|dedos)(?!\p{L})|(?<!\p{L})(?:agarr|abraz|acarici|bes[aeoó])\p{L}*/iu;

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

    // un /pnj /faccion /lugar pendiente: la respuesta es el texto de la tarjeta, no historia
    if (W.create) {
      let res;
      try { res = handleCreate(X, L, text, turn); }
      catch (e) { W.create.done = true; W.create.doneTurn = turn; res = "[LW: No se ha podido crear la tarjeta de " + W.create.name + ": " + String((e && e.message) || e).replace(/\]/g, ")") + "]"; }
      try { wPersist(X, L); } catch (_) { /* ignore */ }
      return { text: res };
    }

    let body = text, logged = false;
    // markers the AI may write: {flag:x} {event:x} {beat} {log:text}
    body = body.replace(/\{\s*(flag|event|beat|log)\s*(?::\s*([^}]*))?\}/gi, (m, k, v) => {
      const kind = k.toLowerCase(), val = String(v || "").trim();
      if (kind === "flag" && val) W.flags[slug(val)] = 1;
      else if (kind === "log" && val) { addLog(X, W, val); logged = true; }
      else if (kind === "event") { const e = X.ev.find((x) => x.id === slug(val)); if (e) startEvent(X, L, e, { turn }); }
      else if (kind === "beat" && W.bt) W.bt.at = -1000;
      return "";
    }).replace(/[ \t]{2,}/g, " ").replace(/\s+$/, "");
    // a twist or beat that ended last turn: the AI was asked for a {log:...}; without one, the generic text goes in
    if (W.pendLog.length) { if (!logged) W.pendLog.forEach((l) => addLog(X, W, l)); W.pendLog = []; }

    // pensamientos: la IA escribe "Nombre piensa: «...»"; el motor lo guarda en las Notes de la tarjeta y, salvo que
    // thoughts_show esté en on, lo quita del texto de la historia (como hace Inner Self)
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
      return ch.first + " piensa: «" + tx + "»";
    };
    body = body.replace(THRE, (m, ind, nm, sg, t) => {
      const ch = findChar(X, nm);
      if (!ch || !L.rel[ch.id]) return m;
      const shown = grab(ch, t, sg);
      if (shown == null) return m;
      if (showTh) return shown;
      removed = true;
      return "";
    });
    // también en mitad de un párrafo, entre «», "" o “”
    body = body.replace(/(\p{Lu}[\p{L}\p{N}_'’\-]*(?: [\p{L}\p{N}_'’\-]+){0,2}) (?:piensa|thinks)(?: \(([+\-=])\))?: (?:«([^»\n]*)»|"([^"\n]*)"|“([^”\n]*)”)[ \t]*/gu, (m, nm, sg, q1, q2, q3) => {
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
        lines.push(ch.first + " piensa: «" + a.text + "»");
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
      // la crónica anota cuando un sentimiento cruza un umbral grande
      for (const name of logStats) {
        if (snapshot[name] == null || r.s[name] == null) continue;
        let hit = null;
        for (const e of X.cfg.stages[name] || []) if (e[0] >= X.cfg.s.chronicle_min && snapshot[name] < e[0] && r.s[name] >= e[0] && e[1]) hit = e[1];
        if (hit) addLog(X, W, ch.first + ": ahora " + hit + ".", true);
      }
    }
    for (const f of found) {
      const r = L.rel[f.ch.id];
      if (!r) continue;
      if (!r.th.some((o) => thSame(o, f.text))) r.th.push(f.text);   // un pensamiento repetido no se vuelve a guardar
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
    const jump = detectJump((L.lastAction || "") + "\n" + body);           // tu acción también cuenta ("duermo hasta el amanecer")
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

    // el contacto se cuenta con el módulo encendido o apagado; el módulo solo añade permisos y avisos
    // un roce es amistoso salvo que alguna de sus frases sea brusca
    const warned = [], touched = [], kind = {};
    const hit = (id, k) => { if (!touched.includes(id)) touched.push(id); kind[id] = kind[id] !== false && k; };
    for (const [id, k] of L.touchNow || []) if (L.rel[id]) hit(id, k);
    const mine = touched.slice();
    for (const sent of body.split(/(?<=[.!?])\s+/)) {
      if (!TOUCH.test(sent)) continue;
      let who = presentIds(X, sent, 2);
      // ponytail: "Te coge la mano" no nombra a nadie: cuenta para quien tocó quien juega, o para el único personaje de la respuesta
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
      out += "\n\n[LW: posible contacto de " + warned.join(", ") + " sin permiso.]";
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