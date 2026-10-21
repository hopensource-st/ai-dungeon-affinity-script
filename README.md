# LW Affinity Engine for AI Dungeon

A drop-in script that gives every character in your adventure a relationship with the protagonist (affinity, trust, attraction, and obsession for the characters you choose), private thoughts, and memory of what happened, and tells the AI about them each turn. It works in any scenario, yours or someone else's, with no setup: it reads the Character cards that are already there.

**¿Juegas en castellano?** The [`es/`](es/LEEME.md) folder has a Spanish (Spain) edition: same engine, with everything the AI and the player read, the commands and the word detection in Spanish.

Optional extras: a chronicle (story log), a day/time clock, scene pacing, ties and rivalries between characters, timed events, an authored three-act arc, a phrase cleaner, and commands that write new character, faction and place cards for you.

## Install

1. Open your scenario (or adventure) and go to `DETAILS > Scripting`, and turn on scripts.
2. **Library** tab: paste all of [`library.js`](library.js).
3. **Input**, **Context** and **Output** tabs: paste [`input.js`](input.js), [`context.js`](context.js) and [`output.js`](output.js), one per tab.
4. Save. Play one turn.

Already using another script? Keep it. In each tab, call the engine on the text first and pass its result on, for example in Output:

```js
const modifier = (text) => {
  text = LW.safe("output", text, () => LW.onOutput(text)).text;
  // ...the other script's code, working on text...
  return { text };
};
modifier(text)
```

The engine uses `state.memory.frontMemory` to talk to the AI. If another script overwrites it, the engine notices and puts its line into the context text instead, cutting the oldest story text when the context is full (`/check` says so). If thoughts still never appear, add `inject: text` to the Config card to always use the context text.

Inner Self, MindForge and Memory Palace do the same job as this engine's thoughts and memories: running one of them alongside it, both ask the AI for thoughts and fill the context with two copies of them. Use one or the other.

## What happens on the first turn

The engine creates five cards of its own. Their triggers (`lw_config`, ...) never appear in the story, so the AI never reads them. Everything lives in their **Notes**:

| Card | What it holds |
|---|---|
| **LW Config** | Every setting. Edit any line; delete the card to start over. |
| **LW Relations** | Ties between characters (`Mira \| Tobin \| childhood friends`), a deck of random ties, and tension numbers at the bottom. |
| **LW Chronicle** | The story log (lines starting with `-`) and the world state: day, time, act, flags. The AI writes the entries itself (`{log: ...}`, one short sentence of under `log_words: 15` words, removed from the story): one per scene (when time jumps, on `/scene`, or every `chronicle_every: 8` turns of a long scene) and one when a twist or beat ends. The last `chronicle_lines: 3` are sent to the AI, so the chronicle can stand in for AI Dungeon's own memory summaries. |
| **LW Events** | The twist deck (see below). |
| **LW Arc** | A generic three-act arc with random beats. |

Then, on your first action, **the AI adds one or two stats made for this story** (fear in a horror story, greed in a pirate tale, rivalry in a sports drama...) next to the four that are always there: affinity, trust, attraction and obsession. The reply only says they are ready, so you can discover them by playing; press Continue to go on. Not happy with the draw? `/autostats` replaces them with new ones (the four fixed stats, flagged `keep`, never change). Scenario authors who write their own Config card keep their stats: autodesign only runs with `autostats: on`.

## Which characters it tracks

Every story card of **type Character**, plus any card whose title starts with `@` (e.g. `@Mira`) when you cannot set the type. The character's name is the card title; every trigger also counts as a name for spotting them in the story (`Mira, the innkeeper` → "the innkeeper" counts too).

Each tracked card gets a `<<LW ... LW>>` block in its Notes with its numbers and last thoughts. Edit the numbers by hand and the engine adopts them.

**Skip the protagonist** (and anyone else) with `skip: Name, Name` in the Config card, or `[cfg skip]` in that card's Notes.

**Name the protagonist** with `protagonist: Name` in the Config card: the chronicle then always calls them by that name, whether the AI wrote "you", "the protagonist" or the name.

**Writing style:** `style:` in the Config card is sent to the AI every turn. By default it asks for literary prose, with dialogue woven into the narration and never script lines like `Name: "..."`. Write your own text there, or `style: off` to send nothing.

No character cards in the scenario? Create them as you play: `/npc Mira, the innkeeper who knows every rumor`. The AI's next reply becomes the card.

Cards are never created on their own. When the AI keeps using a name that has no card (in `suggest_after: 3` different turns), the engine hints once, with the command and an example: `[LW: Vex keeps coming up but has no card... type /npc Vex, then who they are in a few words. Example: /npc Vex, a guard who owes you a favor...]`. Ignore it, or add the name to `skip:`. `suggest_cards: off` disables the hints.

## Per-character settings

Optional. Put a `[cfg ...]` line in the character card's Notes:

- `affinity:0.4` growth per scene of an auto stat (any stat name works). For manual stats, the starting value.
- **Secret yanderes:** the first time the engine meets a character, there is a `yandere_chance: 20` % chance that their obsession starts growing on its own, at a hidden rate, however they are treated (at most `yandere_max: 1` per adventure; never for `romance:no` characters or cards that set their own obsession). Nothing announces it: you find out when they start acting on it. `yandere_chance: 0` turns it off.
- `obsession:0.3` makes this character a yandere: obsession (0 and silent for everyone else) rises by this much every scene with the protagonist, however they are treated.
- `start.trust:6` starting value.
- `romance:no` no attraction stat for this character.
- `alias:the_Queen/Her_Majesty` extra names (underscore = space).
- `thoughts:3` thinks every 3 turns in the scene (0 = never).
- `tone:proud_and_lonely` colours their thoughts.
- `noearly`, `skip`.

And any number of `base: text` lines in Notes: author-written thoughts used first, one at a time, before the AI writes its own.

## Commands

Type them in Do, Say or Story, alone or at the end of your text. The engine answers with a `[LW: ...]` note and the command is removed from the story.

- Stats: `/rel Name`, `/rels`, `/set Name trust 5`, `/affinity Name +2` (any stat name or its first 3 letters).
- Ties: `/ties [Name]`, `/tie Name Name description`, `/tension Name Name +2`, `/tensions`.
- Thoughts: `/thoughts`, `/thoughts Name`, `/thoughts Name 6`, `/thoughts on|off`, `/think Name` (that character thinks in the next reply: handy to check thoughts are being stored).
- Story: `/log text`, `/canon flag what happened`, `/chronicle`, `/flag x`, `/unflag x`, `/flags`, `/event id`, `/events`, `/arc`, `/arc next|reroll|mode hybrid|act 2`, `/scene`.
- Clock: `/time`, `/time evening`, `/time +1`, `/time day 3 morning`, `/day +2`.
- New cards: `/npc`, `/faction`, `/place` + `Name, short description`. Add `; ties Mira=friends` to an `/npc`.
- `/autostats`: the AI designs a new set of stats for this story.
- Touch-consent module (off by default): `/allow Name`, `/deny [Name]`.
- Diagnostics: `/check`, `/peek` (shows what the AI is told this turn), `/help`.

## Customizing

The Config card lists every setting. The most useful:

- `stat: name | auto or manual | min-max | start N | rate N | flags` defines the stats; a negative rate makes an auto stat move against the mood (`stat: fear | auto | 0-10 | start 0 | rate -0.15` rises when a character treats you badly), and `eases attraction>=6` makes it fall by its rate once per scene together while that holds. Writing any `stat:` line replaces the default set, so you can track `fear`, `loyalty`, `rivalry`...
- `stages: stat | 0=text | 4=text | 8=text` is what the AI is told at each value.
- **Mood:** auto stats rise after a good action with the character and fall after a bad one, on every action. The engine looks for `mood_pos` / `mood_neg` words in the sentences that name both the character and the protagonist ("you", "I", or the `protagonist:` name; in your action and the reply), so a character glaring at someone else never lowers their feelings for you, and when a character thinks, the AI tags the thought `(+)`, `(-)` or `(=)`, which counts `mood_thought` times as much. `mood_neutral: 0` means a scene with no signal changes nothing (set it to `0.3` for slow drift up). Add `steady` to a stat line to make it always rise, once per scene the character is in (like `obsession`); `mood: off` does that for every stat. A scene runs from one time jump (or `/scene`) to the next, and a long one counts again every `scene_len: 6` turns; `scenes:` in the Notes counts them. Stats flagged `keep` survive `autostats` and `/autostats`.
- **Thoughts:** up to `max_present: 4` characters are followed in a scene, and `thoughts_max: 1` of them thinks each turn, taking turns (each one every `thoughts_interval: 4` turns or when their feelings change stage). The AI writes `{Mira (+): ...}` in braces at the top of the reply, a short thought of under `thoughts_words: 20` words, like a log, so it never reads as prose; the engine knows whose thought it asked for, so a wrong name ("She", "Lady Mira") still counts; it stores it and removes it from the story (older forms, like `Mira thinks (+): «...»`, are still caught). Each character's newest `thoughts_keep: 20` thoughts are kept as `t:` lines in the block in their Notes, after the stats; the AI gets the last `thoughts_recent: 3` of `thoughts_context: 2` of them. `thoughts_show: on` also shows them in the story.
- **Memories:** every chronicle entry that names a character (`{log: ...}`, `/log`, `/canon`) is also kept in that character's Notes as an `m:` line with its day, and in the Notes of everyone else in the scene when it is about people (they witnessed it). A character who thinks in the turn it is logged keeps that thought as their own view of it: `m: (Day 3) Hero gave Mira a silver ring — «Nobody ever gave me anything this fine.»`. Up to `memories_keep: 8` are kept; when they are full, the one the scene has brought back least often goes first. While they are in the scene the AI gets `memories_recent: 2` of them (for up to `memories_context: 2` characters): the ones that share the most words with the scene, however old (hand Mira a lamp and she remembers the lamp you broke), otherwise the newest. So each character remembers what happened between you even when the chronicle has moved on. `memories_recent: 0` turns it off.
- `clock: off`, `scene: off`, `clean: off` turn whole modules off.
- **Clock:** a day and a moment of the day (`clock_times: dawn|morning|afternoon|evening|night`), sent to the AI as `Time: Day 2, evening.` It only moves when the narration or your own action says time passes: "the next morning", "3 days later", "I sleep until dawn", "the sun sets", "that night", "hours later"... Falling asleep or going to bed makes it night, and waking up after the evening or night is the next morning (a nap in the day changes nothing). "That afternoon" said in the evening talks about today, so it never skips a day; a jump that leaves the clock where it was does not close the scene. Dialogue in quotes and memories ("I remember that night") never move it. `/time evening`, `/time +1` and `/day +2` set it by hand. With no jump, it also moves one step every `clock_turns: 12` turns (`0` turns that off); `clock_on_beat: on` adds one step per arc beat.
- **Touch:** a friendly touch between a character and the protagonist (yours, or the AI's) raises their `touch_stats: affinity|attraction|trust|obsession` by `touch_bonus: 0.3`, once per turn; a sentence with `mood_neg` words makes it rough, and then nothing rises. The count shows as `touched:` in their Notes.
- `contact: on` enables the touch-consent module (characters may only touch the protagonist when the player writes it).
- `early_actions: 40` nudges the AI to introduce characters who have not appeared yet during the first 40 actions.

### Ties between characters

Write ties by hand in LW Relations (`Mira | Tobin | childhood friends`), or let them happen: the first time two characters with no tie share a scene, the engine has a `bond_chance` % chance of drawing one from the deck in that card (old friends, siblings, parent and child, rivals, a debt, a grudge, a confidant about the protagonist...) and writes it there. The AI is told a tie only while both characters are in the scene. Shape the deck like the twist deck (`bond: id | weight N | {a} owes {b} a debt`); `bonds: off` disables it. No bond pairs two characters romantically: in this deck, romance only ever points at the protagonist.

Tension between two characters rises when a sentence naming both has `mood_neg` words (a quarrel) and falls with `mood_pos` words, and also rises while both like the protagonist enough (`tension_stat`, `tension_min`): they become rivals. The AI gets the `stages: tension` text for that pair.

### Twists, events and arc

On the first turn the engine also creates **LW Events**, a deck of generic twists (a secret, a betrayal, a confession, a stranger, a mishap...), and **LW Arc**, a three-act arc whose fixed beats happen in order while its bank beats are drawn at random each playthrough. The arc moves by closed scenes (`arc_pace: scenes`): a beat starts with a scene and counts as done when that scene closes (a time jump, `/scene`, or every `scene_len: 6` turns of a long one), `beat_gap_scenes: 1` quiet scenes come between beats, and each act lasts at least `act_scenes: 4` scenes, even when its beats are done sooner. `arc_pace: turns` goes back to counting actions (`beat_hold`, `beat_gap`, `act_turns`). The chronicle never takes a beat's, event's or twist's planned text as fact: the AI is asked to log what really happened. After `twist_gap` quiet turns, each turn has a `twist_chance` % chance of drawing a twist that fits the scene: `who: low` picks a present character who dislikes the protagonist, `high` one who likes them, `any` anyone present, `absent` someone already met who is not here, and a stat condition like `obsession>=5` anyone already met who meets it, here or not, at random. The AI is told to hint at it first, then to make it happen, in its own way for this story. It is never shown to the player; the chronicle records it afterwards.

```
twist: secret | who: low | weight 2 | stages: {who} is hiding something >> {who}'s secret comes out
```

Delete or add lines to shape the deck, `weight 0` disables one, `twists: off` disables them all. `/twist` forces one now, `/twist secret` a specific one, `/twists` lists the deck. Stories that already have their own Events or Arc card keep them (add `twist:` lines to use twists there).

Events and arc beats can also be written by hand, in any card of type **Events** or **Arc**:

```
event: storm | random | when: day>=2, prob 10 | stages: Dark clouds gather >> The storm breaks | hold 3 | sets: stormed | log: A storm hit the village.

arc: Main Story | mode hybrid | pick 75% | hold 4
act: 1 | Arrival | The protagonist is new here; let them meet people.
beat: 1 | fixed | First Friend | when: any affinity>=4 | guide: Someone offers real friendship. | sets: befriended
beat: 1 | bank | A Rival | when: met>=3 | guide: Someone resents the attention the protagonist gets.
```

`pick` is how many bank beats each act draws: a number (`pick 2`), a share of that act's bank (`pick 75%`) or `pick all`. An act does not end until its drawn bank beats have happened too, unless one never fits: then the act moves on after twice `act_scenes`.

Conditions (comma-separated): `action>=30`, `day>=3`, `actscene>=8` (scenes since this act began), `time:evening`, `flag:x`, `!flag:x`, `fired:id`, `met:Name`, `present:Name`, `met>=3`, `Name.stat>=N`, `any stat>=N`, `prob 20`. The AI may also write `{flag:x}`, `{event:id}`, `{log:text}` or `{beat}`; the engine acts on them and removes them.

[`examples/cursed-court.md`](examples/cursed-court.md) is a full scenario that uses every feature.

## Testing

`node test.js` runs the hooks against a fake adventure.
