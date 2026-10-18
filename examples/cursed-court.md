# Example scenario: The Cursed Court

A complete setup for one story (a cursed protagonist at a royal court), showing every engine feature. The engine itself is generic: see the README to use it in any adventure. These cards override the defaults with story-specific stats (obsession, fear), the touch-consent module and an authored arc.

How to use: create each card in the scenario editor under Story Cards. Set the card Type exactly as shown in each header (the engine finds cards by Type, not by name). Each block has up to three parts:
- `Triggers:` goes in the Triggers field.
- `Notes:` goes in the Notes field of the card. The engine keeps all of its numbers here, and Notes are never sent to the AI.
- `Entry:` (or the lines after Triggers, when there is no Entry heading) goes in the Entry field. This is the only text the AI reads.

Entry is limited to 1000 characters; Notes has no limit.

The `[cfg ...]` line in Notes holds that character's engine settings. The engine adds a `<<LW ... LW>>` block of numbers under it by itself and keeps it updated. You can edit those numbers by hand and the engine adopts them.

Commands (type them in Do, Say or Story, on their own line or at the end of your text):
- Stats and relations: `/rel Name`, `/rels`, `/set Name stat N`, `/obs Name +2` (any stat name or its first 3 letters), `/ties [Name]`, `/tie Name Name description`, `/tension Name Name +2`, `/tensions`, `/allow Name`, `/deny [Name]`.
- Thoughts: `/thoughts`, `/thoughts Name` (lists them), `/thoughts Name 6` (every 6 turns, 0 = never), `/thoughts on|off`, `/think Name` (next turn they are in the scene).
- Story: `/log text`, `/canon flag_name what happened`, `/chronicle`, `/flag x`, `/unflag x`, `/flags`, `/event id`, `/events`, `/arc`, `/arc next`, `/arc reroll`, `/arc mode authored|hybrid|random`, `/arc act 2`, `/scene`.
- Clock: `/time`, `/time evening`, `/time +1`, `/time day 3 morning`, `/day +2`.
- New cards: `/npc Kel, a barmaid who gossips`, `/faction The Silver Hand, a guild of spies`, `/place The Rusty Anchor, a dockside tavern`. Add `; ties Mira=friends, Tobin=cousin` to an `/npc` to add ties. The next reply becomes the card.
- Checks: `/check`, `/peek`, `/help`.

`[cfg ...]` keys:
- plain stat name: for auto stats (obsession, trust, attraction) it is the growth rate per scene; for manual stats (fear) it is the starting value.
- `start.<stat>:N` sets the starting value of an auto stat.
- `romance:no` removes the attraction stat and romance beats for this character.
- `alias:the_Queen/the_Duke` extra names for presence detection (underscore = space).
- `thoughts:N` this character thinks every N turns when in the scene (0 = never). Overrides the default in the Config card.
- `tone:conflicted` a word or words joined by underscores that colour this character's thoughts (for example `lucid_and_unashamed`).
- `base: text` (own line in Notes, any number of them): author-written thoughts shown first, one at a time, without asking the AI (free in tokens). After they run out the AI writes them.
- `noearly` excludes the character from the early-game "give them a moment" nudge.
- `skip` excludes a Character card from the system (use it on the protagonist card).

## Config card (Type: Config)

One card holds all the engine settings, and it lives in the Notes field, which has no length limit and is never sent to the AI. Leave the Entry empty. (If you already created the two older Config cards, they still work; the engine reads every Config card, in Entry and in Notes.)

```
Triggers: lw_config
Notes:
# Engine settings. Lines starting with # are ignored.
# stat: name | auto or manual | min-max | start N | rate N | flags (damp, romance, needs stat>=N)
stat: obsession | auto | 0-10 | start 0 | rate 0.3 | damp | steady
stat: trust | auto | 0-10 | start 3 | rate 0.12 | damp
stat: fear | manual | 0-10 | start 0
stat: attraction | auto | 0-10 | start 0 | rate 0.15 | romance | needs trust>=3
# stages: stat | threshold=text the AI receives | ...   (empty text = nothing is sent)
stages: obsession | 0=faintly curious about the protagonist | 2=preoccupied, thinks of the protagonist too often | 4=fixated, finds excuses to be near the protagonist | 6=possessive and jealous of others near the protagonist | 8=consumed, dangerously obsessed with the protagonist
stages: trust | 0=wary of the protagonist | 3=tentatively trusts the protagonist | 6=trusts the protagonist | 8=trusts the protagonist deeply
stages: fear | 0= | 2=the protagonist is uneasy around them | 5=the protagonist fears them | 8=the protagonist is terrified of them
stages: attraction | 0= | 2=drawn to the protagonist beyond the curse | 5=genuinely attracted to the protagonist | 8=deeply in love, unsure whether it is real
stages: tension | 0= | 2=wary rivals for the protagonist | 4=hostile rivals for the protagonist | 8=in open conflict over the protagonist
# settings
max_present: 3
max_stats: 3
contact: on
# auto_allow: on lets a touch you write in your own action count as permission for that action (no /allow needed)
auto_allow: on
warn_touch: on
inject: frontMemory
accel_scenes: 40
early_actions: 40
damp_words: veil|veiled|hood|hooded
damp_factor: 0.5
# rivalry: two characters whose tension_stat is at least tension_min who share a scene gain tension_rate
tension_stat: obsession
tension_min: 5
tension_rate: 1
tension_max: 10
max_pairs: 3
# thoughts: every character in the scene thinks every thoughts_interval turns (thoughts:N in a [cfg] line overrides)
thoughts: on
# thoughts_show: off keeps thoughts only in the character's Notes; on also shows them in the story
thoughts_show: off
thoughts_interval: 4
thoughts_max: 1
thoughts_keep: 5
thoughts_words: 20
thoughts_context: 2
# chronicle: the engine notes big changes; the last chronicle_lines are sent to the AI
chronicle_lines: 4
chronicle_max: 60
chronicle_stats: obsession|attraction
chronicle_min: 4
# clock: advances on time-jump words ("the next morning"), on beats, and every clock_turns turns
clock: on
clock_times: dawn|morning|afternoon|evening|night
clock_day: 1
clock_time: morning
clock_turns: 12
clock_on_beat: on
# scenes: a mini three-act rhythm over scene_len turns (setup, complication, climax)
scene: on
scene_len: 6
# arc and events
arc_mode: hybrid
beat_hold: 4
beat_gap: 3
event_hold: 3
events_max: 2
# the bracketed line sent to the AI each turn is capped; the least important parts are dropped first
inject_max: 1300
# cleaner: banned phrases (phrase | replacement) and repeated sentences
clean: on
clean_repeat: on
ban: barely above a whisper | very softly
ban: sent shivers down her spine | made her shiver
ban: sent shivers down his spine | made him shiver
ban: let out a breath she didn't know she was holding | exhaled
ban: let out a breath he didn't know he was holding | exhaled
ban: ministrations | touch
ban: orbs | eyes
ban: a testament to | proof of
```

## Relations card (Type: Relations)

One card holds every tie between characters, in Notes (no length limit, never sent to the AI). Leave the Entry empty. Each line is `Name | Name | description`, using first names (or full names or aliases). The engine tells the AI a tie only when both characters are in the scene. At the bottom of these Notes the engine keeps a `<<LWR ... LWR>>` block with the rivalry tension between pairs; you can edit it by hand. This replaces the older Family and Court cards, which you can delete (keep the secrets cards).

```
Triggers: lw_relations
Notes:
# One tie per line: Name | Name | description
Aldric | Octavia | married; the marriage is cold, political, and strained
Aldric | Cassian | father and son
Aldric | Isolde | father and daughter
Octavia | Cassian | mother and son
Octavia | Isolde | mother and daughter, very close; Isolde trusts her mother fully
Cassian | Isolde | siblings who love each other and quietly compete
Rowan | Cassian | old training partners and close friends
Rowan | Tobin | good friends; Rowan often visits the stables
Mira | Tobin | friends; she secretly passes him palace gossip
Mira | Isolde | Mira serves in the royal wing and Isolde trusts her
Seraphine | Isolde | closest friends and confidantes; Seraphine is jealous of anyone close to Isolde
Evander | Octavia | political allies
Evander | Aldric | quiet rivals
Evander | Seraphine | he uses her to gather information
Evander | Cassian | distrust each other
Dorian | Octavia | her trusted advisor, whom she secretly fears
Elowen | Aldric | he once loved her briefly and she never forgot it
Elowen | Hespera | Hespera was her nursemaid when she was a child
```

## Chronicle card (Type: Chronicle)

The engine writes the story log and the world state here, in Notes: lines starting with a dash are chronicle entries (the last few are sent to the AI), and the block at the bottom holds the day, time of day, act, seed, flags and finished events and beats. You can write your own opening entries before you start, edit any line, or change a flag by hand; the engine adopts your edits. Leave the Entry empty.

```
Triggers: lw_chronicle
Notes:
# Chronicle. Add your own starting entries below as lines that begin with a dash.
- The protagonist has just arrived at court for the first time.
```

## Events card (Type: Events)

One line per event, in Notes (any number of Events cards work). The five hidden plot threads from before live here now, and you can delete their old secret cards. Format: `event: id | public, secret or random | when: conditions | stages: hint >> escalation >> reveal | hold N | sets: flags | log: chronicle line`. Conditions are separated by commas: `action>=30`, `day>=3`, `time:evening`, `flag:x`, `!flag:x`, `fired:id`, `met:Name` (has appeared), `present:Name` (in this scene), `met>=3`, `Name.stat>=N`, `any stat>=N`, `any attraction>=7 trust>=6` (same person), `prob 20` (percent chance per turn). Each stage is sent to the AI for `hold` turns, then the next one starts; after the last one the event is finished, its flags are set and its log line is written. The AI may also write `{event:id}`, `{flag:x}` or `{log:text}` in its reply; the engine acts on them and removes them.

```
Triggers: lw_events
Notes:
# Hidden plot threads (secret): the AI only hints, never states them outright.
event: octavia_secret | secret | when: met:Octavia, action>=30 | stages: Octavia looks at the protagonist a moment too long and knows details she should not >> Octavia speaks of "what is owed" and lets the protagonist understand with a look or a private word that she knows about the curse, without ever confessing aloud | hold 6 | sets: octavia_hinted | log: Octavia let the protagonist understand she knows about the curse.
event: hespera_secret | secret | when: met:Hespera, flag:octavia_hinted | stages: Hespera deflects questions about the curse and grows evasive when pressed >> Hespera hints that there may be a way to weaken or break the curse, at a heavy price she has told no one | hold 6 | sets: hespera_hinted | log: Hespera hinted at a price for breaking the curse.
event: dorian_secret | secret | when: met:Dorian, Dorian.obsession>=4 | stages: Dorian has noticed that a few people near the protagonist are less affected, and hints at his private notes without sharing them >> Dorian is close to the truth and weighs sharing it against using it | hold 6 | sets: dorian_close | log: Dorian is close to understanding the curse.
event: aldric_secret | secret | when: met:Aldric, action>=15 | stages: Aldric's sudden devotion to the protagonist frightens him, and he wonders about the child he never met >> Aldric almost speaks of the night with Elowen, then stops himself | hold 6 | sets: aldric_wondering
event: evander_secret | secret | when: met:Evander, Evander.obsession>=5 | stages: Evander quietly gathers proof of witchcraft, in small polite unsettling moments >> Evander is sure; he offers silence in exchange for something, politely and without threats | hold 6 | sets: evander_leverage | log: Evander suspects witchcraft and wants something for his silence.
# Public news and a random moment.
event: court_rumors | public | when: flag:rumors, prob 40 | stages: Whispers of witchcraft spread through the court; servants fall silent when the protagonist passes >> Someone openly repeats the rumor within the protagonist's hearing | hold 4 | sets: rumors_spread | log: Rumors of witchcraft are now openly spoken at court.
event: quiet_hour | random | when: action>=30, time:evening, prob 8 | stages: An unplanned, quiet moment: no one demands anything of the protagonist for a while, and the silence feels strange | hold 2
```

## Arc card (Type: Arc)

The three-act arc, in Notes (an Arc card can be split across several cards). Format:
- `arc: Name | mode hybrid | pick 2 | hold 4 | seed 7` mode is authored (every beat, in listed order, bank beats open any time), hybrid (all fixed beats in order, plus `pick` bank beats drawn per act) or random (a draw of `pick` + the number of fixed beats from all of them). `hold` is how many turns a beat's guide is sent to the AI.
- `act: N | Name | text sent to the AI during the act`
- `beat: N | fixed or bank | Title | when: conditions | guide: text sent while the beat is active | sets: flags | log: chronicle line`
Fixed beats happen in order, each when its condition is true. Bank beats can happen at any time in their act when their condition is true. An act ends when its fixed beats are done. The same conditions as the Events card work here. Commands: `/arc`, `/arc next` (finish the current beat), `/arc reroll` (draw the bank again), `/arc mode`, `/arc act N`. Seed and mode can also be changed in the Chronicle card block.

```
Triggers: lw_arc
Notes:
arc: The Obsession Spiral | mode hybrid | pick 2 | hold 4
act: 1 | The Veil | The curse is new and invasive. Keep the mood uneasy and intimate, and give each character a distinct first moment.
act: 2 | The Spiral | The obsession deepens and the court begins to notice. Tension, jealousy, and doubt about what is real.
act: 3 | The Choice | The curse comes to a head. The protagonist decides whom to trust and who may touch them.
beat: 1 | fixed | Eyes on You | when: action>=1 | guide: The first stares at court. Make the obsession feel invasive and wrong, never flattering. | sets: first_stares
beat: 1 | fixed | The First Normal Person | when: flag:first_stares, met>=2 | guide: Someone who resists, or only shows quiet courtesy, stands out sharply (Rowan Hale or Tobin Wren). The protagonist feels a rare, wary relief. | sets: first_calm
beat: 1 | fixed | The Gift | when: flag:first_calm, action>=25 | guide: A gift arrives that shows far too much knowledge of the protagonist. The sense of being watched grows. | sets: gift_received
beat: 2 | bank | Possessive Jealousy | when: any obsession>=5 | guide: Someone becomes visibly jealous of another character's time with the protagonist.
beat: 2 | bank | The Near-Touch | when: any obsession>=6 | guide: Someone reaches out. The counter-spell stops them, and the scene turns eerie: the hand freezes and the air turns cold. The person is shaken and invents an explanation.
beat: 2 | bank | A Genuine Moment | when: any trust>=5 | guide: A tender, sincere scene where trust is earned slowly. The protagonist doubts it even as they feel it.
beat: 2 | bank | Blood Ties Surface | when: met:Cassian or Isolde, action>=50 | guide: The truth about shared blood comes to light. The half-sibling is torn between the fixation, shame, and the possibility that some of what they feel is real. Handle it with weight, never as a casual line. The protagonist decides what, if anything, happens next. | sets: blood_ties_known
beat: 2 | bank | A Confession | when: any attraction>=7 trust>=6 | guide: Someone confesses sincerely, in words that sound unlike the curse's pleading. The protagonist cannot tell whether it is real, and must decide how to answer.
beat: 2 | fixed | Midpoint, The Breach | when: flag:gift_received, action>=60 | guide: Witnesses see the counter-spell hold. Rumors of witchcraft begin. | sets: rumors
beat: 2 | fixed | Cornered | when: flag:rumors, any obsession>=8 | guide: Someone consumed by the curse corners the protagonist with possessive pleading. Do not describe graphic violence. The protagonist's consent decides the outcome. | sets: cornered
beat: 3 | fixed | The Queen Knows | when: flag:cornered | guide: Queen Octavia Valemont makes herself known. She is lucid about her own obsession and feels no shame. | sets: queen_revealed
beat: 3 | fixed | Who Do You Let Close | when: flag:queen_revealed | guide: The protagonist must decide whom to trust, and whom, if anyone, to let touch them. | sets: choice_made
beat: 3 | fixed | Aftermath | when: flag:choice_made | guide: Show the consequences of those choices.
```

## Protagonist card (Type: Character)

Put this in the Notes field of your existing protagonist card so the engine ignores it:

```
[cfg skip]
```

## Character cards (Type: Character)

```
Triggers: Aldric, the King
Notes: [cfg obsession:0.35 start.trust:3 romance:no alias:the_King tone:guilty_and_conflicted]
base: It is absurd to feel this much for a stranger, and yet I cannot look away.
Entry:
Aldric Valemont, the King, 52. Charming, weary, burdened by guilt. He remembers the night with Elowen fondly and is genuinely curious about his child. He knows nothing of the curse: he only feels an overwhelming, inexplicable pull toward the protagonist that he mistakes for fatherly love, and it turns possessive. He wants to keep them at court, close and protected. Appearance: tall and broad, graying dark-blond hair and beard, tired grey eyes, a plain gold circlet.
```

```
Triggers: Octavia, the Queen
Notes: [cfg obsession:0.4 start.trust:0 trust:0.06 start.obsession:5 fear:2 romance:no alias:the_Queen thoughts:3 tone:lucid_and_unashamed]
base: My own spell binds me, and it is only fitting. I do not regret it.
base: I want this child and I resent them in equal measure, and I am sorry for neither.
Entry:
Octavia Valemont, the Queen, 48. Regal, patient, ruthless. Appearance: tall and pale, sharp cheekbones, dark eyes, black hair coiled under a silver crown, always in crimson. She cursed the protagonist out of wounded pride and fury, and she alone at court knows why everyone is drawn to them. The curse has caught her too, and she knows it. She feels no shame: it is darkly fitting that her own spell binds her, and indulges the fixation like any appetite. She knows it is not real affection and does not care. The protagonist is a reminder of the King's betrayal and the object of her obsession; she resents, wants, and torments them at once, keeping them close with invitations, gifts, and favors that cannot be refused. She cannot touch them unless they permit it, which infuriates and fascinates her, so she tests the counter-spell with patience. The protagonist truly has reason to fear her. She never confesses the curse, but lets them know with a look that she understands.
```

```
Triggers: Cassian, the Crown Prince
Notes: [cfg obsession:0.25 start.trust:3 alias:the_Crown_Prince/the_Prince tone:rigid_and_conflicted]
Entry:
Cassian Valemont, the Crown Prince, 24, the protagonist's half-brother. Disciplined, cold, raised to be the perfect heir. His sudden fixation on someone he has just met unsettles him, and he fights it with rigid control, which makes him volatile near them. If the protagonist earns his trust, the control cracks into something tender and conflicted. He cannot tell where the curse ends and he begins, and that torments him. Appearance: tall and lean, short dark hair, cold blue eyes, a stern jaw, an immaculate midnight-blue coat.
```

```
Triggers: Isolde, the Princess
Notes: [cfg obsession:0.4 start.trust:3 alias:the_Princess tone:scheming_and_lonely]
Entry:
Isolde Valemont, the Princess, 21, the protagonist's half-sister. Sharp, ambitious, a master of court politics. The curse makes her possessive: she wants the protagonist close and hers alone, and wraps it in sisterly concern. Beneath the scheming she is lonely, and real warmth could soften her. She is the Queen's daughter, torn between loyalty to her mother and her own fixation. Appearance: slender, long copper-red hair in intricate braids, amber eyes, a sharp smile, jewel-toned gowns.
```

```
Triggers: Rowan, Rowan Hale
Notes: [cfg obsession:0.2 start.trust:3]
Entry:
Rowan Hale, a knight of the Royal Guard, 26. Honorable, quiet, stubborn. Assigned as the protagonist's escort. He feels the curse but clings to his oath and refuses to act on it unless they ask. His restraint makes his genuine care stand out. Appearance: broad-shouldered, short brown hair, tanned weathered skin, hazel eyes, a thin scar through his left eyebrow, plain guard armor.
```

```
Triggers: Evander, the Duke
Notes: [cfg obsession:0.35 start.trust:2 alias:the_Duke tone:calculating]
Entry:
Evander Thorne, the Duke of Ashmere, 35. Charming, calculating, and patient. He is unsettled to find a stranger consuming his thoughts and tries to understand it as politics, then as destiny. He hides his obsession behind courtesy and favors, building debts and alliances to get closer, and suspects the protagonist of some kind of sorcery without proof. Appearance: handsome, with slicked black hair silvering at the temples, dark eyes, a trimmed goatee, black velvet with silver embroidery.
```

```
Triggers: Seraphine
Notes: [cfg obsession:0.45 start.trust:3 tone:tender_and_jealous]
Entry:
Seraphine Marrow, a noblewoman of the court, 29. Elegant, witty, dangerous. Fixates on the protagonist with a mix of tenderness and jealousy, and quietly sabotages anyone else who gets close to them. Gifts, invitations, and "accidental" encounters are her tools. Appearance: elegant, pale gold hair in a low twist, ice-blue eyes, a beauty mark by her lip, wine-red silk gowns.
```

```
Triggers: Dorian, the physician
Notes: [cfg obsession:0.4 start.trust:3 alias:the_physician thoughts:3 tone:analytical_and_anxious]
Entry:
Dorian Lacroix, the royal physician and scholar, 31. Curious, anxious, brilliant. He is obsessed with the protagonist and, as a scientist, with why: he tries to study his own fixation and the strange way no one can touch them. He may uncover the truth about the curse, becoming an ally in breaking it or a danger if his fixation takes over. Appearance: thin and tall, untidy dark curls, tired brown eyes behind round spectacles, ink-stained fingers, a long grey coat.
```

```
Triggers: Mira
Notes: [cfg obsession:0.25 start.trust:4 alias:the_chambermaid]
Entry:
Mira Ashdown, a chambermaid, 19. Kind, observant, fiercely loyal. The curse hits her too, but she hides it behind devoted service and small acts of care. She hears every palace secret and may be the protagonist's most useful friend. Appearance: small, freckled, straw-blond hair in a tight bun, brown eyes, a plain grey uniform and apron.
```

```
Triggers: Tobin
Notes: [cfg obsession:0.2 start.trust:4 alias:the_stable_master thoughts:6 tone:gentle_and_clumsy]
Entry:
Tobin Wren, the stable master, 28. Gentle, plain-spoken, uninterested in court games. The curse makes him clumsy and tender instead of aggressive, and the stables become the one place where the protagonist can breathe. Appearance: tall and sturdy, sun-browned, messy sandy hair, warm brown eyes, hay on a worn leather vest.
```

```
Triggers: Elowen
Notes: [cfg obsession:0 start.trust:9 trust:0.04 romance:no noearly thoughts:8 tone:worried_and_protective alias:Mother/Mama]
Entry:
Elowen Marsh, the protagonist's mother, a minor noblewoman, 41. Fierce, anxious, endlessly protective. She hid the protagonist for years and fears the court will break her child. She loves them deeply but sometimes overprotects, treating them as fragile when they are not. Appearance: slight, brown hair graying at the temples, a worn kind face, plain dark dresses.
```

```
Triggers: Hespera, Brindle
Notes: [cfg obsession:0 start.trust:8 trust:0.04 romance:no noearly alias:the_nursemaid/Nanny thoughts:8 tone:wry_and_guarded]
Entry:
Hespera Brindle, the nursemaid and hedge witch, 67. Blunt, wry, seen-it-all. She cast the counter-spell that lets only the protagonist decide who may touch them. She knows more about the curse than she admits and keeps old secrets about how it might be broken, at a price. Appearance: small and bent, a long white braid, sharp black eyes, a herb-stained shawl, hands like gnarled roots.
```
