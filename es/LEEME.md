# LW Affinity Engine para AI Dungeon, edición en castellano

Un script que se añade sin más y le da a cada personaje de tu partida una relación con el protagonista (afinidad, confianza, atracción y, en los personajes que elijas, obsesión), pensamientos propios y memoria de lo que ha pasado, y se lo cuenta a la IA en cada turno. Funciona en cualquier escenario, tuyo o ajeno, sin preparar nada: lee las tarjetas de personaje que ya existen.

Extras opcionales: una crónica (diario de la historia), un reloj de día y hora, ritmo de escenas, lazos y rivalidades entre personajes, eventos programados, un arco en tres actos, un limpiador de frases hechas y comandos que escriben por ti tarjetas nuevas de personajes, facciones y lugares.

Es la misma versión que el motor en inglés de la carpeta de arriba, con todo lo que depende del idioma en castellano: lo que recibe la IA, los mensajes, los comandos, los mazos de giros, lazos y arco, y las palabras que el motor detecta en la historia (humor de la escena, contacto físico y saltos de tiempo). También entiende nombres con tilde y eñe (Inés, José, Begoña).

## Instalación

1. Abre tu escenario (o partida), ve a `DETAILS > Scripting` y activa los scripts.
2. Pestaña **Library**: pega entero [`library.js`](library.js) de esta carpeta.
3. Pestañas **Input**, **Context** y **Output**: pega [`input.js`](input.js), [`context.js`](context.js) y [`output.js`](output.js), uno en cada una.
4. Guarda. Juega un turno y escribe `/comprobar`: tiene que decir `LW Affinity Engine (castellano)`.

¿Ya usas otro script? Puedes mantenerlo. En cada pestaña, pasa primero el texto por el motor y luego dale el resultado al otro script. Por ejemplo, en Output:

```js
const modifier = (text) => {
  text = LW.safe("output", text, () => LW.onOutput(text)).text;
  // ...el código del otro script, trabajando con text...
  return { text };
};
modifier(text)
```

El motor usa `state.memory.frontMemory` para hablar con la IA. Si otro script la pisa, el motor lo detecta y mete su línea dentro del texto del contexto, recortando lo más antiguo de la historia cuando el contexto va lleno (`/comprobar` lo indica). Si aun así los personajes nunca piensan, añade `inject: text` a la tarjeta Config para usar siempre el texto del contexto.

## Qué pasa en el primer turno

El motor crea cinco tarjetas propias. Sus activadores (`lw_config`...) nunca aparecen en la historia, así que la IA nunca las lee. Todo está en sus **Notes**:

| Tarjeta | Qué guarda |
|---|---|
| **LW Config** | Todos los ajustes. Cambia la línea que quieras; borra la tarjeta para empezar de cero. |
| **LW Relaciones** | Los lazos entre personajes (`Mira \| Tobin \| amigos de la infancia`), un mazo de lazos al azar y, al final, los números de tensión. |
| **LW Crónica** | El diario de la historia (líneas que empiezan por `-`) y el estado del mundo: día, hora, acto y marcas. Las entradas las escribe la propia IA (`{log: ...}`, que se quita de la historia): una por escena (cuando salta el tiempo, con `/escena` o cada `chronicle_every: 8` turnos de una escena larga) y otra cuando termina un giro o un beat. La IA recibe las `chronicle_lines: 3` últimas, así que la crónica puede sustituir a los resúmenes de memoria de AI Dungeon. |
| **LW Eventos** | El mazo de giros (ver más abajo). |
| **LW Arco** | Un arco genérico en tres actos con beats al azar. |

Después, en tu primera acción, **la IA añade uno o dos stats pensados para esta historia** (miedo en una de terror, codicia en una de piratas, rivalidad en un drama deportivo...) junto a los cuatro que siempre están: afinidad, confianza, atracción y obsesión. La respuesta solo dice que están listos, así que los descubres jugando; pulsa Continue para seguir. ¿No te convencen? `/autostats` los cambia por otros (los cuatro fijos, marcados con `keep`, no cambian nunca). Quien escribe su propia tarjeta Config conserva sus stats: el diseño automático solo funciona con `autostats: on`.

### ¿Protagonista o la protagonista?

Por defecto, la IA lee «el protagonista». Si juegas con una protagonista, pon `protagonista: la` en la tarjeta Config: todo lo que recibe la IA pasa a «la protagonista» (también «de la» y «a la»). Los textos de las etapas de cada personaje (`receloso`, `atraído`...) están en masculino; la IA los adapta a cada personaje, pero puedes reescribirlos en la Config.

## Qué personajes sigue

Todas las tarjetas de **tipo Character**, y cualquier tarjeta cuyo título empiece por `@` (por ejemplo `@Mira`) si no puedes elegir el tipo. El nombre del personaje es el título de la tarjeta, y cada activador también cuenta como nombre para encontrarle en la historia (con `Mira, la posadera`, «la posadera» también vale).

Cada tarjeta que sigue recibe un bloque `<<LW ... LW>>` en sus Notes con sus números y sus últimos pensamientos. Si cambias los números a mano, el motor los adopta.

**Deja fuera al protagonista** (o a quien quieras) con `skip: Nombre, Nombre` en la tarjeta Config, o con `[cfg skip]` en las Notes de su tarjeta.

¿El escenario no tiene tarjetas de personaje? Créalas mientras juegas: `/pnj Mira, la posadera que conoce todos los rumores`. La siguiente respuesta de la IA se convierte en la tarjeta.

Las tarjetas nunca se crean solas. Cuando la IA usa a menudo un nombre sin tarjeta (en `suggest_after: 3` turnos distintos), el motor te avisa una vez, con el comando y un ejemplo: `[LW: Vex sale a menudo pero no tiene tarjeta... escribe /pnj Vex y quién es en pocas palabras...]`. Puedes ignorarlo o añadir el nombre a `skip:`. Con `suggest_cards: off` no hay avisos.

## Ajustes por personaje

Opcionales. Pon una línea `[cfg ...]` en las Notes de la tarjeta del personaje (los nombres de los stats valen con o sin tilde):

- `afinidad:0.4`: cuánto sube por escena un stat auto (vale cualquier stat). En los stats manuales, el valor inicial.
- **Yanderes secretos:** la primera vez que el motor se encuentra con un personaje, hay un `yandere_chance: 20` % de que su obsesión empiece a crecer sola, a un ritmo oculto, le trates como le trates. Como mucho `yandere_max: 1` por partida; nunca en personajes con `romance:no` ni en tarjetas que ya fijan su propia obsesión. Nada lo anuncia: te enteras cuando empieza a actuar. `yandere_chance: 0` lo desactiva.
- `obsesión:0.3`: este personaje es yandere. La obsesión (a 0 y callada en el resto) sube esto cada escena con el protagonista, le trate como le trate.
- `start.confianza:6`: valor inicial.
- `romance:no`: este personaje no tiene atracción.
- `alias:la_Reina/Su_Majestad`: nombres extra (el guion bajo es un espacio).
- `thoughts:3`: piensa cada 3 turnos en escena (0 = nunca).
- `tone:orgulloso_y_solitario`: da color a sus pensamientos.
- `noearly`, `skip`.

Y las líneas `base: texto` que quieras en las Notes: pensamientos escritos por ti que se usan primero, de uno en uno, antes de que la IA escriba los suyos.

## Comandos

Escríbelos en Do, Say o Story, solos o al final de tu texto. El motor responde con una nota `[LW: ...]` y el comando desaparece de la historia. Valen con o sin tildes (`/cronica` y `/crónica`), y **los comandos en inglés también funcionan** (`/think`, `/rel`...).

| Para | En castellano | En inglés |
|---|---|---|
| Ver los stats de alguien | `/relacion Nombre` | `/rel` |
| Ver los de todos | `/relaciones` | `/rels` |
| Fijar un stat | `/fijar Nombre confianza 5` | `/set` |
| Subir o bajar un stat | `/afinidad Nombre +2` (cualquier stat, o sus 3 primeras letras: `/atr`) | |
| Lazos | `/lazos [Nombre]`, `/lazo Nombre Nombre descripción` | `/ties`, `/tie` |
| Tensión | `/tension Nombre Nombre +2`, `/tensiones` | `/tensions` |
| Pensamientos | `/pensamientos`, `/pensamientos Nombre`, `/pensamientos Nombre 6`, `/pensamientos on\|off` | `/thoughts` |
| Que alguien piense ya | `/pensar Nombre` (piensa en la siguiente respuesta: sirve para comprobar que se guardan) | `/think` |
| Crónica | `/anotar texto`, `/canon marca lo que pasó`, `/cronica` | `/log`, `/chronicle` |
| Marcas | `/marcar x`, `/desmarcar x`, `/marcas` | `/flag`, `/unflag`, `/flags` |
| Eventos | `/evento id`, `/eventos` | `/event`, `/events` |
| Arco | `/arco`, `/arco siguiente\|rebarajar\|modo hybrid\|acto 2` | `/arc next\|reroll\|mode\|act` |
| Escena | `/escena` | `/scene` |
| Reloj | `/hora`, `/hora anochecer`, `/hora +1`, `/hora día 3 mañana`, `/dia +2` | `/time`, `/day` |
| Tarjetas nuevas | `/pnj`, `/faccion`, `/lugar` + `Nombre, descripción corta` (en un `/pnj` puedes añadir `; lazos Mira=amigos`) | `/npc`, `/faction`, `/place` |
| Giros | `/giro [id]`, `/giros` | `/twist`, `/twists` |
| Stats nuevos | `/autostats`: la IA diseña otros stats para esta historia | |
| Contacto (apagado por defecto) | `/permitir Nombre`, `/prohibir [Nombre]` | `/allow`, `/deny` |
| Diagnóstico | `/comprobar`, `/ver` (lo que recibe la IA este turno), `/ayuda` | `/check`, `/peek`, `/help` |

## Personalizar

La tarjeta Config lista todos los ajustes. **Las palabras clave y los nombres de los ajustes van en inglés** (`stat:`, `stages:`, `auto`, `start`, `rate`, `thoughts_keep`...); los textos van en castellano. `on` es sí y `off` es no (también valen `sí` y `no`). Los más útiles:

- `stat: nombre | auto o manual | mín-máx | start N | rate N | marcas` define los stats. En cuanto escribes una línea `stat:`, sustituye al conjunto por defecto, así que puedes seguir `miedo`, `lealtad`, `rivalidad`...
- `stages: stat | 0=texto | 4=texto | 8=texto` es lo que se le dice a la IA en cada valor.
- **Humor:** los stats auto suben tras una buena escena con el personaje y bajan tras una mala. El motor busca las palabras de `mood_pos` y `mood_neg` (raíces como `sonr`, `abraz`, `insult`, `grit`) en las frases que nombran al personaje, en tu acción y en la respuesta, y tiene en cuenta las negaciones («no le sonríe»). Cuando un personaje piensa, la IA marca el pensamiento con `(+)`, `(-)` o `(=)`, que cuenta `mood_thought` veces más. `mood_neutral: 0` hace que una escena sin señales no cambie nada (con `0.3` sube poco a poco). Añade `steady` a una línea de stat para que suba siempre que el personaje está presente (como `obsesión`); `mood: off` hace eso con todos. Los stats marcados con `keep` sobreviven a `autostats` y `/autostats`.
- **Pensamientos:** se sigue a un máximo de `max_present: 4` personajes por escena, y piensan como mucho `thoughts_max: 2` por turno, por turnos (cada uno cada `thoughts_interval: 4` turnos o cuando sus sentimientos cambian de etapa). La IA escribe `Mira piensa (+): «...»`, el motor lo guarda y lo quita de la historia. Los `thoughts_keep: 20` pensamientos más recientes de cada personaje se guardan como líneas `t:` en el bloque de sus Notes, debajo de los stats; la IA recibe los `thoughts_recent: 3` últimos de `thoughts_context: 2` de ellos. `thoughts_show: on` también los muestra en la historia.
- `clock: off`, `scene: off` y `clean: off` apagan módulos enteros.
- **Reloj:** un día y un momento del día (`clock_times: amanecer|mañana|tarde|anochecer|noche`), que la IA recibe como `Momento: Día 2, anochecer.` Solo avanza cuando la narración o tu acción dicen que pasa el tiempo: «a la mañana siguiente», «tres días después», «duermo hasta el amanecer», «se pone el sol», «esa noche», «horas después»... Los diálogos entre comillas o rayas y los recuerdos («recuerdo aquella noche») no lo mueven. `/hora anochecer`, `/hora +1` y `/dia +2` lo cambian a mano. Para que avance solo, pon `clock_turns: 12` (un paso cada 12 turnos sin salto) o `clock_on_beat: on` (un paso por beat del arco).
- `contact: on` activa el módulo de consentimiento del contacto: los personajes solo pueden tocar al protagonista cuando quien juega lo escribe («le abrazo», «le cojo la mano»...).
- `early_actions: 40` empuja a la IA a presentar, durante las 40 primeras acciones, a los personajes que aún no han salido.
- **Limpiador:** `ban: frase | sustituto` cambia frases hechas (`apenas un susurro`, `orbes`...). Si escribes alguna línea `ban:`, sustituye a la lista por defecto.

### Lazos entre personajes

Escribe los lazos a mano en LW Relaciones (`Mira | Tobin | amigos de la infancia`) o deja que surjan: la primera vez que dos personajes sin lazo coinciden en escena, el motor tiene un `bond_chance` % de sacar uno del mazo de esa tarjeta (viejos amigos, hermanos, padre e hija, rivales, una deuda, un rencor, un confidente sobre el protagonista...) y lo escribe allí. La IA solo recibe un lazo mientras los dos están en escena. El mazo se ajusta como el de giros (`bond: id | weight N | {a} le debe algo a {b}`); `bonds: off` lo desactiva. Ningún lazo empareja románticamente a dos personajes: en este mazo, el romance solo apunta al protagonista.

La tensión entre dos personajes sube cuando una frase que nombra a los dos tiene palabras de `mood_neg` (una discusión) y baja con las de `mood_pos`. También sube mientras a los dos les gusta lo bastante el protagonista (`tension_stat`, `tension_min`): se vuelven rivales. La IA recibe el texto de `stages: tensión` para esa pareja.

### Giros, eventos y arco

En el primer turno el motor también crea **LW Eventos**, un mazo de giros genéricos (un secreto, una traición, una confesión, alguien desconocido, un percance...), y **LW Arco**, un arco en tres actos cuyos beats fixed ocurren en orden y cuyos beats bank se sortean en cada partida. Tras `twist_gap` turnos tranquilos, cada turno tiene un `twist_chance` % de sacar un giro que encaje en la escena: `who: low` elige a alguien presente a quien le cae mal el protagonista, `high` a alguien a quien le cae bien, `any` a cualquiera presente y `absent` a alguien conocido que no está. Se le pide a la IA que primero lo insinúe y luego lo haga ocurrir, a su manera y en esta historia. Quien juega nunca lo ve anunciado; la crónica lo anota después.

```
twist: secreto | who: low | weight 2 | stages: {who} oculta algo >> el secreto de {who} sale a la luz
```

Borra o añade líneas para ajustar el mazo; `weight 0` desactiva un giro y `twists: off` los desactiva todos. `/giro` fuerza uno ya, `/giro secreto` uno concreto y `/giros` lista el mazo. Las historias que ya tienen su propia tarjeta Events o Arc las conservan (añade líneas `twist:` para usar giros allí).

Los eventos y los beats del arco también se pueden escribir a mano, en cualquier tarjeta de tipo **Events** o **Arc**:

```
event: tormenta | random | when: day>=2, prob 10 | stages: Se acumulan nubes negras >> Estalla la tormenta | hold 3 | sets: tormenta | log: Una tormenta azotó el pueblo.

arc: Historia Principal | mode hybrid | pick 2 | hold 4
act: 1 | Llegada | El protagonista acaba de llegar; deja que conozca a la gente.
beat: 1 | fixed | Primer Amigo | when: any afinidad>=4 | guide: Alguien le ofrece una amistad de verdad. | sets: amistad
beat: 1 | bank | Un Rival | when: met>=3 | guide: Alguien envidia la atención que recibe el protagonista.
```

Condiciones (separadas por comas): `action>=30`, `day>=3`, `time:anochecer`, `flag:x`, `!flag:x`, `fired:id`, `met:Nombre`, `present:Nombre`, `met>=3`, `Nombre.stat>=N`, `any stat>=N`, `prob 20`. El id de un beat es su título en minúsculas, sin tildes y con guiones bajos (`La Elección Difícil` → `fired:la_eleccion_dificil`). La IA también puede escribir `{flag:x}`, `{event:id}`, `{log:texto}` o `{beat}`; el motor actúa y los quita.

## Pruebas

`node es/test.js` ejecuta los hooks contra una partida falsa en castellano.

## Para quien mantiene el script

Esta carpeta es una **copia separada** de `../library.js`, no una traducción automática. Cuando cambies el motor en inglés, aplica el mismo cambio aquí a mano y ejecuta los dos tests (`node test.js` y `node es/test.js`). La versión lleva `-es` (`1.1.2-es`) para distinguirla en `/comprobar`.
