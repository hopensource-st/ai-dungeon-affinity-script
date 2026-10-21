# Publicar el motor como Script de AI Dungeon

Desde el parche 2.39.0 (agosto de 2026), AI Dungeon tiene **Scripts como contenido**: un escenario con scripts se marca como Script, se publica, y cualquier jugador lo añade a sus partidas o escenarios (hasta 10 por partida, con orden y activables por separado). Este documento tiene todo lo que hay que pegar. Las notas están en español; los bloques de código, en inglés, se pegan tal cual.

> Los nombres exactos de botones y menús no los he podido comprobar (la web de AI Dungeon necesita sesión). Si algo no coincide, guíate por el sentido del paso.

---

## Paso a paso

1. **Crea un escenario nuevo** de tipo **Simple Start**. Solo los Simple Start y Character Creator admiten scripts.
2. **DETAILS > Scripting:** activa los scripts y pega `library.js` en Library, y `input.js`, `context.js` y `output.js` en sus pestañas. Guarda.
3. **Rellena el escenario** con los textos de abajo (título, descripción, AI Instructions, apertura). Así también sirve como demo jugable si alguien lo abre directamente.
4. **Marca el escenario como Script.**
5. **Portada:** una imagen que represente vínculos, recuerdos o hilos entre personajes.
6. **Publica.** Los escenarios pasan por la moderación automática antes de publicarse.
7. **Pruébalo como jugador:** en una partida cualquiera (por ejemplo, un escenario ajeno con tarjetas de personaje), añade el Script, juega una acción y escribe `/check`. Debe decir `LW Affinity Engine` y la versión (ahora `1.1.5`) y el número de personajes que ha encontrado.

### Al actualizar
1. Sube el número en `const VERSION = "1.0.0"` (línea 8 de `library.js`): `1.0.1` para arreglos, `1.1.0` para funciones nuevas.
2. Pega el nuevo `library.js` en el Script y guarda.
3. Comprueba con `/check` en una partida que la versión ha cambiado.

---

## Textos para pegar

### Título
```
LW Affinity Engine
```

### Descripción corta (una línea)
```
Characters who feel, think and remember: relationships, private thoughts, a story chronicle, a clock and surprise twists for any adventure.
```

### Descripción completa
```
Give every character in your adventure a relationship with you that grows or sours with how you treat them, private thoughts, and a memory of what happened. Works in any story with no setup: it reads the Character story cards that are already there.

WHAT IT DOES
• Feelings: affinity, trust, attraction and obsession for every character card, plus one or two stats the AI designs for your story on the first action. Kind scenes raise them, cruel ones lower them, and the AI is only told what changed.
• Thoughts: one character in the scene thinks in private each turn, in a short line. Their latest thoughts are kept in their card's Notes, under their stats, never in the story.
• Chronicle: the AI writes one line per scene into a Chronicle card and gets the last three back, so long stories keep their thread. Each character also keeps what they lived through as memories of their own, and they come back when the scene touches them.
• Clock: day and time of day, moved only when the story says time passes.
• Surprises: twists fitted to whoever is in the scene, random ties between characters who meet, and a three-act arc whose beats are drawn differently every playthrough.
• Card hints: when the AI keeps using a name with no card, you get a note with the exact /npc command to add one.

HOW TO USE
Add the script to an adventure or scenario and play. Your first action also lets the AI design the story's own stats (press Continue after it). On the first turn the script creates five cards: LW Config, LW Relations, LW Chronicle, LW Events and LW Arc. Their Notes are never sent to the AI; edit them to change anything.

COMMANDS (type them in Do, Say or Story)
/rels · /rel Name · /set Name trust 5
/npc Name, short description (also /place and /faction)
/thoughts Name (their latest thoughts) · /think Name (they think next turn)
/twist · /arc · /chronicle · /time · /peek · /check · /help

TIPS
• Keep your own character out: add "skip: YourName" to the LW Config card.
• Choose your own yandere: put [cfg obsession:0.3] in that character's card Notes. No surprise yanderes: add "yandere_chance: 0" to LW Config.
• Another script also writes Front Memory? The engine notices and sends its line another way. If characters still never think, add "inject: text" to LW Config.

WHAT'S NEW IN 1.1.5
• Feelings move only with how a character treats you: someone glaring at a stranger no longer lowers their affinity for you.
• Memories come back when the scene touches them: hand someone a lamp and they remember the lamp you broke, however long ago. The ones that keep coming back are the last to be forgotten.
• Witnesses: everyone in the scene remembers what happened there, and a character who thinks right then keeps their own view of it.
• The chronicle and memories no longer repeat the same moment twice.
• Thoughts: one character thinks per turn, in a short line, stored and sent whole, never cut in the middle of a word. A thought is kept even when the AI gets the name wrong ("She", "Lady Mira").
• Chronicle lines are asked for short, so they read like a log, not a recap.
• Numbers you edit by hand in a card's Notes are kept even if you deleted the block's last line by mistake.
• Thoughts are written in braces, like the chronicle's logs, so they never read as prose, and more of the AI's slips are caught: narration under a thought tag stays in the story, and dialogue written like a script stays dialogue.
• A style line asks the AI for literary prose, with dialogue woven into the narration (style: in LW Config; style: off sends nothing).
• The arc moves by scenes, not actions: each beat gets a whole scene to happen, with a quiet scene between beats, and each act lasts at least 4 scenes (act_scenes). The chronicle records what really happened, never the plan.
• The clock understands sleep: falling asleep makes it night, waking after the evening is the next morning, and "that afternoon" never skips a day.
• Name your character with protagonist: Name in LW Config, and the chronicle always calls them by it.
• For scenario authors: beats, events and twists can raise everyone's stats with adds (who.fear+2 for the twist's own character); a stat can fade while another holds (eases), or move against the mood with a negative rate, like fear; [cfg crowd] makes a collective character such as a royal court; twists can pick by a stat (who: obsession>=5); actscene>=N lets a beat wait. See the README.

WHAT'S NEW IN 1.1.4
• Continue no longer counts your last action twice (time jumps, mood, touches).
• Rivalries between characters grow once per scene, like obsession.
• More of the AI's variations are understood: thoughts with no quotes or in mid-paragraph, signs like (+1), tags like (Name: =), and logs with no key.
• /think stays asked until that character actually thinks.
• Obsession (and any steady stat) rises once per scene, not on every action. How you treat someone still counts on every action.
• The arc takes its time: each act lasts at least 30 actions (act_turns).
• Chronicle entries are no longer lost: the AI writes them on the first line of its reply, where they cannot be cut off, and one left unclosed is still saved.
• Thoughts written with no quotes no longer swallow the rest of the line: the next character's thought and the narration stay where they belong.
• Memories: each character keeps the chronicle moments that name them in their Notes, and remembers them when they are back in the scene.

WHAT'S NEW IN 1.1.3
• A friendly touch raises affinity, attraction, trust and obsession a little (a rough one does not). Touches are counted in every story: yours, and "she takes your hand" with no name.

WHAT'S NEW IN 1.1.2
• Thoughts the AI writes in the middle of a paragraph, with plain "quotes", are now stored too.
• Works next to scripts that overwrite Front Memory: the engine notices and puts its line into the context, even when it is full.

WHAT'S NEW IN 1.1.1
• No more thought diary: the latest 20 thoughts stay in the Notes block, under the stats, and the AI remembers the last 3.

WHAT'S NEW IN 1.1.0
• Secret yanderes: any character you meet might become quietly, dangerously obsessed with you. One per adventure at most, never announced.
• Commands now work in Do and Say mode, not only in Story mode.
• Cards made with /npc, /place and /faction get a proper title, no repeated name, and no lone title like "Lady" or "Captain" as a trigger.

Full guide and source code: https://github.com/hopensource-st/ai-dungeon-affinity-script
```

### Etiquetas sugeridas
```
script, relationships, characters, memory, romance, utility
```

### AI Instructions (para la demo jugable)
```
Second person, present tense: the protagonist is "you". You are controlled only by the player: never write your actions, words, thoughts or feelings. Build the world and its people from the player's first actions. Give every named character a distinct voice, wants and history. No summaries, no moral lessons.
```

### Apertura (para la demo jugable)
```
Before the story begins, tell it who you are and where you stand. Write your first action as the opening of your own tale: your name, the place, and what you want. The world, and the people in it, will remember how you treat them.
```

---

## Si se combina con otros Scripts
- **Front Memory:** el motor escribe ahí la línea para la IA. Si otro Script la pisa, el motor lo detecta y mete la línea en el contexto, recortando lo más antiguo de la historia si va lleno (`/check` lo dice). Si el otro Script la pisa más tarde y el motor no llega a verlo, pon `inject: text` en LW Config.
- **Marcas sueltas:** si ves en la historia restos como `{log: ...}` o `Mira thinks: «...»`, es que otro Script toca el texto antes que este. Prueba a cambiar el orden de los Scripts en la partida.
- **Su propio espacio:** el motor solo usa `state.lw` y sus tarjetas `LW`, así que no choca con los datos de otros Scripts.

---

# Publicar el escenario The Cursed Court

El escenario usa el motor (pega los cuatro archivos en su Scripting, o añade el Script publicado) y las tarjetas de [`examples/cursed-court.md`](examples/cursed-court.md). **No pongas el giro final en ningún texto público:** solo vive en el beat *The Queen's Confession* de la tarjeta Arc.

### Título
```
The Cursed Court
```

### Descripción corta (una línea)
```
Everyone at the royal court is drawn to you. Only four people know about the curse, and one of them cast it.
```

### Descripción completa
```
You and your mother arrive at the royal palace as the King's honored guests, hoping to break the curse you have lived with since birth: everyone who meets you is drawn to you, and it never stops growing. Only you, your mother Elowen, your old nursemaid Hespera and the Queen know about it. Hespera's counter-spell keeps any hand from touching you unless you allow it. Everyone else just feels the pull, and does not know why.

WHAT TO EXPECT
• A court of twelve, each with their own obsession, trust, attraction, and how much you fear them. The court itself watches, whispers and grows fixated as one.
• Act 1 presents the court one occasion at a time: the King, your sworn escort, the Queen, a presentation tea, the stables, a ball, and a night when the Queen makes you perform your greatest talent before everyone.
• Act 2 follows each person you get close to, in two scenes of their own: the shape their obsession takes, and then a crossroads, tender if they trust you, dark if they do not. Around it, the court turns dangerous.
• Act 3: a final scene for each, from real feeling or from fear, and an ending that changes everything.
• Nobody wants you dead. The danger is being kept.

HOW TO PLAY
Choose your greatest talent when the adventure starts. Play as you like: how you treat each person decides which scenes come. /rels shows how everyone feels about you; /arc shows where the story stands.

Dark themes: obsession, captivity, manipulation and fear. Nothing graphic.

Runs on the LW Affinity Engine 1.1.5.
```

### Novedades de esta actualización
```
WHAT'S NEW
• Act 1 presents the court in order, one occasion at a time, from the King's welcome to a night when the Queen makes you perform your greatest talent (you choose it when the adventure starts). Rowan is sworn in as your escort.
• Act 2: everyone you get close to has two scenes of their own, the shape of their obsession and a crossroads that depends on whether they trust you.
• Act 3: a final scene for each, from real feeling or from fear, and a new ending.
• The court is a character: it watches, whispers and grows fixated as one, and public moments make everyone there more drawn to you.
• Dread: a masked ball, a hidden room, footsteps at night, an envoy who will not take no, the Church, an abduction, and a court that tears itself apart over you.
• Fear is now part of every relationship: it grows when someone treats you badly or frightens you, and eases with real trust.
• Elowen and Hespera feel the pull too, very slowly; their love for you runs deeper.
• No more random friendships between people the story keeps apart.
```

### Etiquetas sugeridas
```
romance, horror, mystery, dark, court, obsession, script
```
