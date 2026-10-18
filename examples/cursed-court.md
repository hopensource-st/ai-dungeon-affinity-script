# Example scenario: The Cursed Court

A complete setup for one story (a cursed protagonist at a royal court) that uses every engine feature: its own stats (an obsession that always grows, trust and attraction that follow the mood of each scene, fear), the touch-consent module, written ties plus a court bond deck, secret events plus a court twist deck, and a three-act arc with fixed beats and random ones. The engine itself is generic: see the README to use it in any adventure.

How to use: create each card in the scenario editor under Story Cards. Set the card Type exactly as shown in each header (the engine finds its own cards by Type). Each block has up to three parts:
- `Triggers:` goes in the Triggers field.
- `Notes:` goes in the Notes field. The engine keeps its numbers, thought diary and logs here; Notes are never sent to the AI.
- `Entry:` goes in the Entry field. This is the only text the AI reads, so it holds only what the AI needs every time the character is on stage. Secrets live in the Events and Arc cards, which reveal them at their own pace.

Because this story writes its own Config, Relations, Chronicle, Events and Arc cards, the engine does not create its generic `LW` cards, and `autostats` stays off.

Commands and `[cfg ...]` keys: see the README, or type `/help` in game.

## Config card (Type: Config)

Only what differs from the engine defaults. Everything not listed here uses the default (see the README).

```
Triggers: lw_config
Notes:
# The Cursed Court: only the settings that differ from the engine defaults.
# stat: name | auto or manual | min-max | start N | rate N | flags
# obsession is the curse: it always rises while they are together (steady), at each character's own rate.
# trust and attraction move with the mood of each scene: up when it goes well, down when it goes badly.
stat: obsession | auto | 0-10 | start 0 | rate 0.3 | damp | steady | keep
stat: trust | auto | 0-10 | start 3 | rate 0.12 | damp
stat: fear | manual | 0-10 | start 0
stat: attraction | auto | 0-10 | start 0 | rate 0.15 | romance | needs trust>=3
stages: obsession | 0=faintly curious about the protagonist | 2=preoccupied, thinks of the protagonist too often | 4=fixated, finds excuses to be near the protagonist | 6=possessive and jealous of others near the protagonist | 8=consumed, dangerously obsessed with the protagonist
stages: trust | 0=wary of the protagonist | 3=tentatively trusts the protagonist | 6=trusts the protagonist | 8=trusts the protagonist deeply
stages: fear | 0= | 2=the protagonist is uneasy around them | 5=the protagonist fears them | 8=the protagonist is terrified of them
stages: attraction | 0= | 2=drawn to the protagonist beyond the curse | 5=genuinely attracted to the protagonist | 8=deeply in love, unsure whether it is real
stages: tension | 0= | 2=wary rivals for the protagonist | 4=hostile rivals for the protagonist | 8=in open conflict over the protagonist
# the counter-spell: nobody touches the protagonist unless the player writes it in that action
contact: on
warn_touch: on
# veils and hoods weaken the curse
damp_words: veil|veiled|hood|hooded
# rivals: two characters with obsession 5+ who share a scene grow tension
tension_stat: obsession
tension_min: 5
tension_rate: 1
# early game: introduce the cast during the first 40 actions
early_actions: 40
chronicle_stats: obsession|attraction
# random ties between characters with no written tie: rare, and only from the court deck in the Relations card
bond_chance: 40
# cleaner (writing any ban line replaces the default list)
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

Written ties first (the AI is told a tie only while both characters are in the scene), then the court bond deck: the first time two characters with no tie share a scene, there is a `bond_chance` % chance of drawing one. No family bonds in this deck, because the family tree is fixed. The engine keeps rivalry numbers in a `<<LWR` block at the bottom.

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
# Court bond deck: bond: id | weight N | text ({a} and {b} become the two names)
bond: acquainted | weight 3 | {a} and {b} know each other only from court ceremonies
bond: allies | weight 2 | {a} and {b} are quiet allies at court
bond: rivals | weight 2 | {a} and {b} compete for favor at court
bond: debt | {a} owes {b} a favor that has never been repaid
bond: grudge | {a} holds a quiet grudge against {b} over an old slight
bond: distrust | {a} does not trust {b} and watches them closely
bond: informant | {a} passes {b} gossip from the palace corridors
bond: confidant | {a} confides in {b} about their feelings for the protagonist
bond: disapproves | {a} disapproves of how close {b} is getting to the protagonist
```

## Chronicle card (Type: Chronicle)

The engine writes the story log and the world state here. It keeps the whole chronicle (up to 200 entries); only the last two go to the AI. When a beat or twist ends, the AI writes the entry itself. Write your own opening entries before you start; the engine adopts edits.

```
Triggers: lw_chronicle
Notes:
# Chronicle. Lines that begin with a dash are story log entries.
- The protagonist has just arrived at court for the first time.
```

## Events card (Type: Events)

The five hidden plot threads, one public event, one random moment, and a court twist deck. Events follow their conditions; twists are drawn now and then and fitted to whoever is in the scene (`who: high` = someone who likes the protagonist, `low` = someone who does not, `any`, `absent`). The AI only hints at a secret until its last stage.

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
# Court twist deck: twist: id | who: high/low/any/absent | when: conditions | weight N | stages: hint >> it happens
twist: shadowed | who: high | weight 2 | stages: {who} has been following the protagonist through the palace corridors >> {who} is caught watching, and has an excuse ready
twist: letter | who: high | stages: {who} writes the protagonist a letter that says far too much
twist: keepsake | who: high | stages: {who} has taken something small that belongs to the protagonist and keeps it close
twist: cold_shoulder | who: low | stages: {who} turns cold toward the protagonist and will not say why >> the reason comes out
twist: quiet_favor | who: any | stages: {who} quietly does the protagonist a favor at some cost to themselves
twist: summons | who: absent | stages: {who} sends a formal summons that cannot politely be refused
twist: gossip | weight 2 | stages: palace servants whisper about the protagonist >> a servant brings the protagonist a piece of gossip that matters
twist: ceremony | when: met>=4 | stages: a court ceremony gathers everyone in one hall, and every fixation is on display at once
twist: missing | stages: something personal of the protagonist's goes missing >> it turns up in someone's keeping
```

## Arc card (Type: Arc)

The three-act arc. Fixed beats are the spine of the plot and happen in order; around them, two bank beats per act are drawn at random each playthrough (`pick 2`), and each one still needs its condition, so how you play decides which can happen. Keep `mode hybrid`: `random` could skip a fixed beat whose flag the next one needs. Commands: `/arc`, `/arc next`, `/arc reroll`, `/arc mode`, `/arc act N`.

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
beat: 1 | bank | An Unwanted Escort | when: any obsession>=2 | guide: Someone insists on accompanying the protagonist everywhere, with a polite excuse that does not hold up.
beat: 1 | bank | The Stolen Glance | when: met>=3, prob 25 | guide: The protagonist catches someone staring from across a room, and they do not look away.
beat: 1 | bank | Kindness Without Hunger | when: any trust>=4 | guide: Someone shows the protagonist a small kindness that wants nothing back, and it is disarming.
beat: 1 | bank | A Servant's Warning | when: met:Mira or Tobin, prob 20 | guide: A servant quietly warns the protagonist about someone at court.
beat: 2 | bank | Possessive Jealousy | when: any obsession>=5 | guide: Someone becomes visibly jealous of another character's time with the protagonist.
beat: 2 | bank | The Near-Touch | when: any obsession>=6 | guide: Someone reaches out. The counter-spell stops them, and the scene turns eerie: the hand freezes and the air turns cold. The person is shaken and invents an explanation.
beat: 2 | bank | A Genuine Moment | when: any trust>=5 | guide: A tender, sincere scene where trust is earned slowly. The protagonist doubts it even as they feel it.
beat: 2 | bank | Blood Ties Surface | when: met:Cassian or Isolde, action>=50 | guide: The truth about shared blood comes to light. The half-sibling is torn between the fixation, shame, and the possibility that some of what they feel is real. Handle it with weight, never as a casual line. The protagonist decides what, if anything, happens next. | sets: blood_ties_known
beat: 2 | bank | A Confession | when: any attraction>=7 trust>=6 | guide: Someone confesses sincerely, in words that sound unlike the curse's pleading. The protagonist cannot tell whether it is real, and must decide how to answer.
beat: 2 | fixed | Midpoint, The Breach | when: flag:gift_received, action>=60 | guide: Witnesses see the counter-spell hold. Rumors of witchcraft begin. | sets: rumors
beat: 2 | fixed | Cornered | when: flag:rumors, any obsession>=8 | guide: Someone consumed by the curse corners the protagonist with possessive pleading. Do not describe graphic violence. The protagonist's consent decides the outcome. | sets: cornered
beat: 3 | bank | A Last Plea | when: any obsession>=8 | guide: Someone consumed by the curse makes one last desperate plea before the end.
beat: 3 | bank | An Unexpected Defender | when: any trust>=6 | guide: Someone the protagonist trusts stands up for them in front of the court, at a cost.
beat: 3 | bank | The Price Named | when: flag:hespera_hinted | guide: The price of breaking the curse is finally said aloud, and it is heavier than anyone hoped.
beat: 3 | fixed | The Queen Knows | when: flag:cornered | guide: Queen Octavia Valemont makes herself known. She is lucid about her own obsession and feels no shame. | sets: queen_revealed
beat: 3 | fixed | Who Do You Let Close | when: flag:queen_revealed | guide: The protagonist must decide whom to trust, and whom, if anyone, to let touch them. | sets: choice_made
beat: 3 | fixed | Aftermath | when: flag:choice_made | guide: Show the consequences of those choices.
```

## Protagonist card (Type: Character)

Put this in the Notes field of your existing protagonist card so the engine ignores it (or add the protagonist's name to `skip:` in the Config card):

```
[cfg skip]
```

## Character cards (Type: Character)

The card title is the character's name, and every trigger also counts as a name (so `the King` already points at Aldric; `alias:` is only for names that are not triggers). Each character thinks every `thoughts:N` turns while in the scene, up to two characters per turn; every thought goes into a dated diary at the end of their Notes.

```
Triggers: Aldric, the King
Notes: [cfg obsession:0.35 start.trust:3 romance:no tone:guilty_and_conflicted]
base: It is absurd to feel this much for a stranger, and yet I cannot look away.
Entry:
Aldric Valemont, the King, 52. Charming, weary, burdened by guilt. He remembers the night with Elowen fondly. He knows nothing of the curse: he only feels an overwhelming, inexplicable pull toward the protagonist that he mistakes for fatherly love, and it turns possessive. He wants to keep them at court, close and protected. Appearance: tall and broad, graying dark-blond hair and beard, tired grey eyes, a plain gold circlet.
```

```
Triggers: Octavia, the Queen
Notes: [cfg obsession:0.4 start.trust:0 trust:0.06 start.obsession:5 fear:2 romance:no thoughts:3 tone:lucid_and_unashamed]
base: My own spell binds me, and it is only fitting. I do not regret it.
base: I want this child and I resent them in equal measure, and I am sorry for neither.
Entry:
Octavia Valemont, the Queen, 48. Regal, patient, ruthless. She cursed the protagonist out of wounded pride and fury, and she alone at court knows why everyone is drawn to them. The curse has caught her too; she knows it, feels no shame, and indulges the fixation like any appetite. The protagonist is a reminder of the King's betrayal: she resents, wants and torments them at once, keeping them close with invitations, gifts and favors that cannot be refused. The counter-spell infuriates and fascinates her, and she tests it with patience. The protagonist has real reason to fear her. Appearance: tall and pale, sharp cheekbones, dark eyes, black hair coiled under a silver crown, always in crimson.
```

```
Triggers: Cassian, the Crown Prince
Notes: [cfg obsession:0.25 start.trust:3 alias:the_Prince tone:rigid_and_conflicted]
Entry:
Cassian Valemont, the Crown Prince, 24. Disciplined, cold, raised to be the perfect heir. His sudden fixation on someone he has just met unsettles him, and he fights it with rigid control, which makes him volatile near them. If the protagonist earns his trust, the control cracks into something tender and conflicted. He cannot tell where the curse ends and he begins, and that torments him. Appearance: tall and lean, short dark hair, cold blue eyes, a stern jaw, an immaculate midnight-blue coat.
```

```
Triggers: Isolde, the Princess
Notes: [cfg obsession:0.4 start.trust:3 tone:scheming_and_lonely]
Entry:
Isolde Valemont, the Princess, 21. Sharp, ambitious, a master of court politics. The curse makes her possessive: she wants the protagonist close and hers alone, and wraps it in sweet concern. Beneath the scheming she is lonely, and real warmth could soften her. She is torn between loyalty to her mother and her own fixation. Appearance: slender, long copper-red hair in intricate braids, amber eyes, a sharp smile, jewel-toned gowns.
```

```
Triggers: Rowan, Rowan Hale
Notes: [cfg obsession:0.2 start.trust:3]
Entry:
Rowan Hale, a knight of the Royal Guard, 26. Honorable, quiet, stubborn. Assigned as the protagonist's escort. He feels the curse but clings to his oath and refuses to act on it unless they ask. His restraint makes his genuine care stand out. Appearance: broad-shouldered, short brown hair, tanned weathered skin, hazel eyes, a thin scar through his left eyebrow, plain guard armor.
```

```
Triggers: Evander, the Duke
Notes: [cfg obsession:0.35 start.trust:2 tone:calculating]
Entry:
Evander Thorne, the Duke of Ashmere, 35. Charming, calculating, and patient. He is unsettled to find a stranger consuming his thoughts and tries to understand it as politics, then as destiny. He hides his obsession behind courtesy and favors, building debts and alliances to get closer. Appearance: handsome, with slicked black hair silvering at the temples, dark eyes, a trimmed goatee, black velvet with silver embroidery.
```

```
Triggers: Seraphine
Notes: [cfg obsession:0.45 start.trust:3 tone:tender_and_jealous]
Entry:
Seraphine Marrow, a noblewoman of the court, 29. Elegant, witty, dangerous. Fixates on the protagonist with a mix of tenderness and jealousy, and quietly sabotages anyone else who gets close to them. Gifts, invitations, and "accidental" encounters are her tools. Appearance: elegant, pale gold hair in a low twist, ice-blue eyes, a beauty mark by her lip, wine-red silk gowns.
```

```
Triggers: Dorian, the physician
Notes: [cfg obsession:0.4 start.trust:3 thoughts:3 tone:analytical_and_anxious]
Entry:
Dorian Lacroix, the royal physician and scholar, 31. Curious, anxious, brilliant. He is obsessed with the protagonist and, as a scientist, with why: he tries to study his own fixation and the strange way no one can touch them. Appearance: thin and tall, untidy dark curls, tired brown eyes behind round spectacles, ink-stained fingers, a long grey coat.
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
Hespera Brindle, the nursemaid and hedge witch, 67. Blunt, wry, seen-it-all. She cast the counter-spell that protects the protagonist, and she knows more about the curse than she admits. Appearance: small and bent, a long white braid, sharp black eyes, a herb-stained shawl, hands like gnarled roots.
```
