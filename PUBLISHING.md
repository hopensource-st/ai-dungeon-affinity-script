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
7. **Pruébalo como jugador:** en una partida cualquiera (por ejemplo, un escenario ajeno con tarjetas de personaje), añade el Script, juega una acción y escribe `/check`. Debe decir `LW Affinity Engine` y la versión (ahora `1.0.2`) y el número de personajes que ha encontrado.

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
• Thoughts: characters in the scene think in private now and then. Every thought is kept in a diary in their card's Notes, never in the story.
• Chronicle: the AI writes one line per scene into a Chronicle card and gets the last three back, so long stories keep their thread.
• Clock: day and time of day, moved only when the story says time passes.
• Surprises: twists fitted to whoever is in the scene, random ties between characters who meet, and a three-act arc whose beats are drawn differently every playthrough.
• Card hints: when the AI keeps using a name with no card, you get a note with the exact /npc command to add one.

HOW TO USE
Add the script to an adventure or scenario and play. Your first action also lets the AI design the story's own stats (press Continue after it). On the first turn the script creates five cards: LW Config, LW Relations, LW Chronicle, LW Events and LW Arc. Their Notes are never sent to the AI; edit them to change anything.

COMMANDS (type them in Do, Say or Story)
/rels · /rel Name · /set Name trust 5
/npc Name, short description (also /place and /faction)
/twist · /arc · /chronicle · /time · /peek · /check · /help

TIPS
• Keep your own character out: add "skip: YourName" to the LW Config card.
• A yandere: put [cfg obsession:0.3] in that character's card Notes.
• Using another script that also writes Front Memory? Add "inject: text" to LW Config.

WHAT'S NEW IN 1.0.2
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
- **Front Memory:** el motor escribe ahí la línea para la IA. Si otro Script también lo usa, uno pisará al otro; con `inject: text` en LW Config, el motor la mete en el contexto.
- **Marcas sueltas:** si ves en la historia restos como `{log: ...}` o `Mira thinks: «...»`, es que otro Script toca el texto antes que este. Prueba a cambiar el orden de los Scripts en la partida.
- **Su propio espacio:** el motor solo usa `state.lw` y sus tarjetas `LW`, así que no choca con los datos de otros Scripts.
