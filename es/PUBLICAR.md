# Publicar la edición en castellano como Script de AI Dungeon

Los pasos son los mismos que para la versión en inglés ([`../PUBLISHING.md`](../PUBLISHING.md)), pero con los archivos de esta carpeta y los textos de abajo. Así quien juega en castellano lo encuentra como un Script aparte.

> Los nombres exactos de botones y menús no los he podido comprobar (la web de AI Dungeon necesita sesión). Si algo no coincide, guíate por el sentido del paso.

---

## Paso a paso

1. **Crea un escenario nuevo** de tipo **Simple Start**. Solo los Simple Start y Character Creator admiten scripts.
2. **DETAILS > Scripting:** activa los scripts y pega `es/library.js` en Library, y `es/input.js`, `es/context.js` y `es/output.js` en sus pestañas. Guarda.
3. **Rellena el escenario** con los textos de abajo (título, descripción, AI Instructions y apertura). Así también sirve como demo jugable si alguien lo abre directamente.
4. **Marca el escenario como Script.**
5. **Portada:** una imagen que represente vínculos, recuerdos o hilos entre personajes. Puede ser la misma que la de la versión en inglés.
6. **Publica.** Los escenarios pasan por la moderación automática antes de publicarse.
7. **Pruébalo como jugador:** en una partida cualquiera (por ejemplo, un escenario ajeno en castellano con tarjetas de personaje), añade el Script, juega una acción y escribe `/comprobar`. Debe decir `LW Affinity Engine (castellano)`, la versión (ahora `1.1.4-es`) y el número de personajes que ha encontrado.

### Al actualizar
1. Aplica en `es/library.js` el mismo cambio que en `library.js` y ejecuta `node es/test.js`.
2. Sube el número en `const VERSION = "1.1.4-es"` (línea 8 de `es/library.js`) para que coincida con la versión en inglés, siempre con `-es` al final.
3. Pega el nuevo `es/library.js` en el Script y guarda.
4. Comprueba con `/comprobar` en una partida que la versión ha cambiado.

---

## Textos para pegar

### Título
```
LW Affinity Engine (castellano)
```

### Descripción corta (una línea)
```
Personajes que sienten, piensan y recuerdan: relaciones, pensamientos privados, una crónica, un reloj y giros por sorpresa en cualquier partida en castellano.
```

### Descripción completa
```
Dale a cada personaje de tu partida una relación contigo que mejora o se estropea según cómo le trates, pensamientos propios y memoria de lo que ha pasado. Funciona en cualquier historia sin preparar nada: lee las tarjetas de personaje que ya existen. Edición en castellano: la IA recibe todo en castellano y el script entiende tildes, eñes, diálogos con raya y frases como «a la mañana siguiente».

QUÉ HACE
• Sentimientos: afinidad, confianza, atracción y obsesión para cada personaje, más uno o dos stats que la IA diseña para tu historia en la primera acción. Las escenas amables los suben, las crueles los bajan, y la IA solo recibe lo que ha cambiado.
• Pensamientos: los personajes en escena piensan en privado de vez en cuando. Sus últimos pensamientos se guardan en las Notes de su tarjeta, debajo de sus stats, nunca en la historia.
• Crónica: la IA escribe una línea por escena en una tarjeta de crónica y recibe las tres últimas, para que las historias largas no pierdan el hilo.
• Reloj: día y momento del día, que solo avanzan cuando la historia dice que pasa el tiempo.
• Sorpresas: giros adaptados a quien esté en escena, lazos al azar entre personajes que se conocen y un arco en tres actos cuyos momentos clave se sortean en cada partida.
• Avisos de tarjetas: cuando la IA usa a menudo un nombre sin tarjeta, recibes una nota con el comando /pnj exacto para crearla.

CÓMO SE USA
Añade el script a una partida o escenario y juega. Tu primera acción también deja que la IA diseñe los stats propios de la historia (pulsa Continue después). En el primer turno el script crea cinco tarjetas: LW Config, LW Relaciones, LW Crónica, LW Eventos y LW Arco. Sus Notes nunca se envían a la IA; edítalas para cambiar lo que quieras.

COMANDOS (en Do, Say o Story; los ingleses también valen)
/relaciones · /relacion Nombre · /fijar Nombre confianza 5
/pnj Nombre, descripción corta (también /lugar y /faccion)
/pensamientos Nombre (sus últimos pensamientos) · /pensar Nombre (piensa en el turno siguiente)
/giro · /arco · /cronica · /hora · /ver · /comprobar · /ayuda

TRUCOS
• ¿Juegas con una protagonista? Añade "protagonista: la" a LW Config y la IA hablará de «la protagonista».
• Deja fuera a tu personaje: añade "skip: TuNombre" a LW Config.
• Elige tú a quien es yandere: pon [cfg obsesión:0.3] en las Notes de su tarjeta. Sin yanderes sorpresa: añade "yandere_chance: 0" a LW Config.
• ¿Otro script también escribe en Front Memory? El motor lo detecta y envía su línea por otro camino. Si aun así los personajes nunca piensan, añade "inject: text" a LW Config.

Guía completa y código: https://github.com/hopensource-st/ai-dungeon-affinity-script/tree/main/es
```

### Etiquetas sugeridas
```
script, español, castellano, relaciones, personajes, memoria, romance, utilidad
```

### AI Instructions (para la demo jugable)
```
Escribe en castellano de España, en segunda persona y en presente: el protagonista eres «tú». Solo quien juega controla al protagonista: nunca escribas sus acciones, palabras, pensamientos ni sentimientos. Construye el mundo y su gente a partir de las primeras acciones de quien juega. Dale a cada personaje con nombre una voz, unos deseos y una historia propios. Diálogos con raya. Sin resúmenes ni moralejas.
```

### Apertura (para la demo jugable)
```
Antes de que empiece la historia, dile quién eres y dónde estás. Escribe tu primera acción como el comienzo de tu propio relato: tu nombre, el lugar y lo que quieres. El mundo, y la gente que vive en él, recordará cómo la tratas.
```

---

## Si se combina con otros Scripts
- **No lo juntes con la versión en inglés** en la misma partida: las dos usan los mismos datos y las mismas tarjetas `LW`.
- **Front Memory:** el motor escribe ahí la línea para la IA. Si otro Script la pisa, el motor lo detecta y mete la línea en el contexto, recortando lo más antiguo de la historia si va lleno (`/comprobar` lo dice). Si el otro Script la pisa más tarde y el motor no llega a verlo, pon `inject: text` en LW Config.
- **Marcas sueltas:** si ves en la historia restos como `{log: ...}` o `Mira piensa: «...»`, es que otro Script toca el texto antes que este. Prueba a cambiar el orden de los Scripts en la partida.
- **Su propio espacio:** el motor solo usa `state.lw` y sus tarjetas `LW`, así que no choca con los datos de otros Scripts.
