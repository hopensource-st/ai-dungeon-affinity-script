# LW Affinity Engine for AI Dungeon

A drop-in script that gives every character in your adventure a relationship with the protagonist (affinity, trust, attraction), private thoughts, and memory of what happened, and tells the AI about them each turn. It works in any scenario, yours or someone else's, with no setup: it reads the Character cards that are already there.

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

The engine uses `state.memory.frontMemory` to talk to the AI. If another script also writes it, add `inject: text` to the Config card.

## What happens on the first turn

The engine creates five cards of its own. Their triggers (`lw_config`, ...) never appear in the story, so the AI never reads them. Everything lives in their **Notes**:

| Card | What it holds |
|---|---|
| **LW Config** | Every setting. Edit any line; delete the card to start over. |
| **LW Relations** | Ties between characters (`Mira \| Tobin \| childhood friends`), a deck of random ties, and tension numbers at the bottom. |
| **LW Chronicle** | The story log (lines starting with `-`) and the world state: day, time, act, flags. |
| **LW Events** | The twist deck (see below). |
| **LW Arc** | A generic three-act arc with random beats. |

Then, on your first action, **the AI designs the stats for this story** (fear and debt in a horror story, respect and rivalry in a sports drama...) and writes them into LW Config. The reply only says they are ready, so you can discover them by playing; press Continue to go on. Not happy with the draw? `/autostats` designs a new set. Scenario authors who write their own Config card keep their stats: autodesign only runs with `autostats: on`.

## Which characters it tracks

Every story card of **type Character**, plus any card whose title starts with `@` (e.g. `@Mira`) when you cannot set the type. The character's name is the card title; every trigger also counts as a name for spotting them in the story (`Mira, the innkeeper` → "the innkeeper" counts too).

Each tracked card gets a `<<LW ... LW>>` block in its Notes with its numbers and last thoughts. Edit the numbers by hand and the engine adopts them.

**Skip the protagonist** (and anyone else) with `skip: Name, Name` in the Config card, or `[cfg skip]` in that card's Notes.

No character cards in the scenario? Create them as you play: `/npc Mira, the innkeeper who knows every rumor`. The AI's next reply becomes the card.

Cards are never created on their own. When the AI keeps using a name that has no card (in `suggest_after: 3` different turns), the engine hints once: `[LW: Vex keeps coming up. Give them a card with /npc Vex...]`. Ignore it, or add the name to `skip:`. `suggest_cards: off` disables the hints.

## Per-character settings

Optional. Put a `[cfg ...]` line in the character card's Notes:

- `affinity:0.4` growth per scene of an auto stat (any stat name works). For manual stats, the starting value.
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
- Thoughts: `/thoughts`, `/thoughts Name`, `/thoughts Name 6`, `/thoughts on|off`, `/think Name`.
- Story: `/log text`, `/canon flag what happened`, `/chronicle`, `/flag x`, `/unflag x`, `/flags`, `/event id`, `/events`, `/arc`, `/arc next|reroll|mode hybrid|act 2`, `/scene`.
- Clock: `/time`, `/time evening`, `/time +1`, `/time day 3 morning`, `/day +2`.
- New cards: `/npc`, `/faction`, `/place` + `Name, short description`. Add `; ties Mira=friends` to an `/npc`.
- `/autostats`: the AI designs a new set of stats for this story.
- Touch-consent module (off by default): `/allow Name`, `/deny [Name]`.
- Diagnostics: `/check`, `/peek` (shows what the AI is told this turn), `/help`.

## Customizing

The Config card lists every setting. The most useful:

- `stat: name | auto or manual | min-max | start N | rate N | flags` defines the stats. Writing any `stat:` line replaces the default set, so you can track `fear`, `loyalty`, `rivalry`...
- `stages: stat | 0=text | 4=text | 8=text` is what the AI is told at each value.
- **Mood:** auto stats rise after a good scene with the character and fall after a bad one. The engine looks for `mood_pos` / `mood_neg` words in the sentences that name the character (in your action and the reply), and when a character thinks, the AI tags the thought `(+)`, `(-)` or `(=)`, which counts `mood_thought` times as much. `mood_neutral: 0` means a scene with no signal changes nothing (set it to `0.3` for slow drift up). Add `steady` to a stat line to make it always rise while the character is present (e.g. a curse); `mood: off` restores that for every stat.
- `thoughts: on/off`, `thoughts_show: on` to see the thoughts in the story (by default they only live in Notes).
- `clock: off`, `scene: off`, `clean: off` turn whole modules off.
- `contact: on` enables the touch-consent module (characters may only touch the protagonist when the player writes it).
- `early_actions: 40` nudges the AI to introduce characters who have not appeared yet during the first 40 actions.

### Ties between characters

Write ties by hand in LW Relations (`Mira | Tobin | childhood friends`), or let them happen: the first time two characters with no tie share a scene, the engine has a `bond_chance` % chance of drawing one from the deck in that card (old friends, siblings, parent and child, rivals, a debt, a grudge, a confidant about the protagonist...) and writes it there. The AI is told a tie only while both characters are in the scene. Shape the deck like the twist deck (`bond: id | weight N | {a} owes {b} a debt`); `bonds: off` disables it. No bond pairs two characters romantically: in this deck, romance only ever points at the protagonist.

Tension between two characters rises when a sentence naming both has `mood_neg` words (a quarrel) and falls with `mood_pos` words, and also rises while both like the protagonist enough (`tension_stat`, `tension_min`): they become rivals. The AI gets the `stages: tension` text for that pair.

### Twists, events and arc

On the first turn the engine also creates **LW Events**, a deck of generic twists (a secret, a betrayal, a confession, a stranger, a mishap...), and **LW Arc**, a three-act arc whose fixed beats happen in order while its bank beats are drawn at random each playthrough. After `twist_gap` quiet turns, each turn has a `twist_chance` % chance of drawing a twist that fits the scene: `who: low` picks a present character who dislikes the protagonist, `high` one who likes them, `any` anyone present, `absent` someone already met who is not here. The AI is told to hint at it first, then to make it happen, in its own way for this story. It is never shown to the player; the chronicle records it afterwards.

```
twist: secret | who: low | weight 2 | stages: {who} is hiding something >> {who}'s secret comes out
```

Delete or add lines to shape the deck, `weight 0` disables one, `twists: off` disables them all. `/twist` forces one now, `/twist secret` a specific one, `/twists` lists the deck. Stories that already have their own Events or Arc card keep them (add `twist:` lines to use twists there).

Events and arc beats can also be written by hand, in any card of type **Events** or **Arc**:

```
event: storm | random | when: day>=2, prob 10 | stages: Dark clouds gather >> The storm breaks | hold 3 | sets: stormed | log: A storm hit the village.

arc: Main Story | mode hybrid | pick 2 | hold 4
act: 1 | Arrival | The protagonist is new here; let them meet people.
beat: 1 | fixed | First Friend | when: any affinity>=4 | guide: Someone offers real friendship. | sets: befriended
beat: 1 | bank | A Rival | when: met>=3 | guide: Someone resents the attention the protagonist gets.
```

Conditions (comma-separated): `action>=30`, `day>=3`, `time:evening`, `flag:x`, `!flag:x`, `fired:id`, `met:Name`, `present:Name`, `met>=3`, `Name.stat>=N`, `any stat>=N`, `prob 20`. The AI may also write `{flag:x}`, `{event:id}`, `{log:text}` or `{beat}`; the engine acts on them and removes them.

[`examples/cursed-court.md`](examples/cursed-court.md) is a full scenario that uses every feature.

## Testing

`node test.js` runs the hooks against a fake adventure.
