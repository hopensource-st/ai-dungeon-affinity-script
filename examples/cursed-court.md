# Example scenario: The Cursed Court

A complete setup for one story (a protagonist everyone at a royal court is drawn to, and a curse only four people know about) that uses every engine feature: its own stats (an obsession that always grows, trust and attraction that follow the mood of each scene, fear), the touch-consent module, written ties (and no random bonds), secret events plus a court twist deck, and a three-act arc with fixed beats and random ones. The engine itself is generic: see the README to use it in any adventure.

How to use: create each card in the scenario editor under Story Cards. Set the card Type exactly as shown in each header (the engine finds its own cards by Type). Each block has up to three parts:
- `Triggers:` goes in the Triggers field.
- `Notes:` goes in the Notes field. The engine keeps its numbers, latest thoughts and logs here; Notes are never sent to the AI.
- `Entry:` goes in the Entry field. This is the only text the AI reads, so it holds only what the AI needs every time the character is on stage. Secrets live in the Events and Arc cards, which reveal them at their own pace.

Because this story writes its own Config, Relations, Chronicle, Events and Arc cards, the engine does not create its generic `LW` cards, and `autostats` stays off.

Commands and `[cfg ...]` keys: see the README, or type `/help` in game.

## Config card (Type: Config)

Only what differs from the engine defaults, plus every thoughts setting so they are easy to tune. Everything not listed here uses the default (see the README).

```
Triggers: lw_config
Notes:
# The Cursed Court: only the settings that differ from the engine defaults.
# stat: name | auto or manual | min-max | start N | rate N | flags
# obsession is the pull everyone feels toward the protagonist: it always rises while they are together (steady), at each character's own rate.
# trust and attraction move with the mood of each scene: up when it goes well, down when it goes badly.
stat: obsession | auto | 0-10 | start 0 | rate 0.3 | damp | steady | keep
stat: trust | auto | 0-10 | start 3 | rate 0.12 | damp
# fear (the protagonist's fear of them) runs against the mood: up when they treat the protagonist badly, down when kindly,
# and it eases a little every scene together while they truly trust each other (trust 6+)
stat: fear | auto | 0-10 | start 0 | rate -0.15 | eases trust>=6
stat: attraction | auto | 0-10 | start 0 | rate 0.15 | romance | needs trust>=3
stages: obsession | 0=faintly curious about the protagonist | 2=preoccupied, thinks of the protagonist too often | 4=fixated, finds excuses to be near the protagonist | 6=possessive and jealous of others near the protagonist | 8=consumed, dangerously obsessed with the protagonist
stages: trust | 0=wary of the protagonist | 3=tentatively trusts the protagonist | 6=trusts the protagonist | 8=trusts the protagonist deeply
stages: fear | 0= | 2=the protagonist is uneasy around them | 5=the protagonist fears them | 8=the protagonist is terrified of them
stages: attraction | 0= | 2=drawn to the protagonist beyond the pull | 5=genuinely attracted to the protagonist | 8=deeply in love, unsure whether it is real
stages: tension | 0= | 2=wary rivals for the protagonist | 4=hostile rivals for the protagonist | 8=in open conflict over the protagonist
# the counter-spell: nobody touches the protagonist unless the player writes it in that action
contact: on
warn_touch: on
# a friendly touch (allowed, no mood_neg word) raises these stats by touch_bonus, once per turn; touch_bonus: 0 turns it off
# this court has no affinity stat; attraction still needs trust>=3
touch_stats: attraction|trust|obsession
touch_bonus: 0.3
# veils and hoods weaken the pull
damp_words: veil|veiled|hood|hooded
# rivals: two characters with obsession 5+ who share a scene grow tension
tension_stat: obsession
tension_min: 5
tension_rate: 1
# the protagonist's name: the chronicle always calls them by it (remove the # and write the name)
# protagonist: Name
# early game: no nudges to bring in the cast; the arc's first act presents everyone in order (King, Queen, tea, ball, physician)
early_actions: 0
chronicle_stats: obsession|attraction
# thoughts (all of them listed, defaults included, so they are easy to tune)
# keep: how many stay in each character's Notes | recent: how many of those the AI gets per character
# context: from how many characters per turn | interval: every N turns (a card's [cfg thoughts:N] wins)
# max: how many characters think in one turn | words: length of each thought | show: on also shows them in the story
thoughts: on
thoughts_keep: 20
thoughts_recent: 1
thoughts_context: 2
thoughts_interval: 4
thoughts_max: 1
thoughts_words: 20
thoughts_show: off
# memories: chronicle entries that name a character stay in their Notes (m: lines)
# keep: how many per character | recent: how many the AI gets | context: from how many characters | recent 0 turns it off
memories_keep: 8
memories_recent: 2
memories_context: 2
# no random ties: the cast is fixed and every tie that matters is written in the Relations card
bonds: off
# arc pace: a beat lasts a scene (a time jump, /scene, or scene_len turns), with beat_gap_scenes quiet scenes between beats
arc_pace: scenes
beat_gap_scenes: 1
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

Written ties only (the AI is told a tie only while both characters are in the scene): with a fixed cast, a random bond could tie two people the story keeps apart, so `bonds: off` in the Config card. The engine keeps rivalry numbers in a `<<LWR` block at the bottom.

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
Elowen | Aldric | he once loved her briefly; now they share the secret of their child and pretend at court that the protagonist is only a guest
Elowen | Hespera | Hespera was her nursemaid when she was a child
Octavia | Elowen | the Queen knows Elowen bore the King's child; cold courtesy in public, enmity in private
```

## Chronicle card (Type: Chronicle)

The engine writes the story log and the world state here. It keeps the whole chronicle (up to 200 entries); only the last two go to the AI. When a beat or twist ends, the AI writes the entry itself. Write your own opening entries before you start; the engine adopts edits.

```
Triggers: lw_chronicle
Notes:
# Chronicle. Lines that begin with a dash are story log entries.
- The protagonist and their mother Elowen have just arrived at court as the King's guests, hoping to find a way to break the curse.
```

## Events card (Type: Events)

The hidden plot threads, the court's dread (a body in the chapel, a drugged cup, a foreign envoy who will not take no, the Church demanding a convent), one random moment, and a court twist deck. Nobody wants the protagonist dead: every danger is about being taken, confined or claimed. Events follow their conditions; twists are drawn now and then and fitted to whoever is in the scene (`who: high` = someone who likes the protagonist, `low` = someone who does not, `any`, `absent`, `obsession>=4` = anyone already met that obsessed, at random, so it is not always the Queen). The AI only hints at a secret until its last stage.

```
Triggers: lw_events
Notes:
# Hidden plot threads (secret): the AI only hints, never states them outright.
event: octavia_secret | secret | when: met:Octavia, action>=30 | stages: Octavia looks at the protagonist a moment too long, as if she knows exactly who the King's guest is >> Octavia speaks of "what is owed" and lets the protagonist understand, with a look or a private word, that she knows who they are and why they came, and that she will not make it easy | hold 6 | sets: octavia_hinted | log: Octavia let the protagonist understand she knows who they are and why they came.
event: hespera_secret | secret | when: met:Hespera, flag:octavia_hinted | stages: Hespera grows evasive about the curse, and studies the protagonist when she thinks no one is looking >> Hespera admits, reluctantly and in private, that in all these years she has never found the thread of the curse to cut: her ward holds something back, and she cannot say what | hold 6 | sets: hespera_hinted | log: Hespera admitted she never found the thread of the curse.
event: dorian_secret | secret | when: met:Dorian, Dorian.obsession>=4 | stages: Dorian has noticed that a few people near the protagonist are less affected, and hints at his private notes without sharing them >> Dorian has come to believe the pull does not come from anything done to the protagonist, but from the protagonist themselves, and weighs whether to say so | hold 6 | sets: dorian_close | log: Dorian came to believe the pull comes from the protagonist themselves.
event: aldric_secret | secret | when: met:Aldric, action>=15 | stages: Aldric watches the protagonist with a warmth that is too much for a mere guest, and almost lets a fatherly word slip in public >> Aldric nearly tells someone the truth (Cassian, Isolde, or the protagonist alone), then stops himself, afraid of the Queen | hold 6 | sets: aldric_wondering | log: The King nearly gave away whose child the guest is.
event: blood_suspected | secret | when: action>=45 | stages: Someone at court remarks on a likeness between the King's guest and the King, then quickly changes the subject >> A clue to the guest's true parentage turns up (an old letter, a portrait, a servant's memory) where Cassian or Isolde could find it | hold 6 | sets: blood_suspected | log: A clue to the guest's true parentage surfaced at court.
event: evander_secret | secret | when: met:Evander, Evander.obsession>=5 | stages: Evander quietly gathers proof of witchcraft, in small polite unsettling moments >> Evander is sure; he offers silence in exchange for something, politely and without threats | hold 6 | sets: evander_leverage | log: Evander suspects witchcraft and wants something for his silence.
# Public news and a random moment.
event: winter_journey | secret | when: act>=2, met>=6, prob 15 | stages: An old palace servant grows uneasy whenever the Queen and the protagonist are in the same room >> The old servant lets slip that, the winter the protagonist was born, the Queen left court in secret for days and came back changed | hold 6 | sets: winter_hint | log: An old servant spoke of the winter the Queen left court in secret.
event: court_rumors | public | when: flag:rumors, prob 40 | stages: Whispers of witchcraft spread through the court; servants fall silent when the protagonist passes >> Someone openly repeats the rumor within the protagonist's hearing | hold 4 | sets: rumors_spread | log: Rumors of witchcraft are now openly spoken at court.
event: quiet_hour | random | when: action>=30, time:evening, prob 8 | stages: An unplanned, quiet moment: no one demands anything of the protagonist for a while, and the silence feels strange | hold 2
# Court dread: the danger is being taken or claimed, never killed.
event: chapel_body | secret | when: flag:winter_hint, prob 30 | stages: The old servant who spoke of the Queen's winter journey has not been seen for two days; nobody will say where he went >> The old servant is found dead in the palace chapel, and the protagonist was the last person he spoke to | hold 5 | sets: servant_dead | log: The old servant who spoke of the Queen's winter journey was found dead in the chapel.
event: sleeping_draught | secret | when: act>=2, met>=6, prob 6 | stages: At a banquet the protagonist's food taster sways, then collapses: asleep, not dead >> Dorian finds a sleeping draught in the cup meant for the protagonist: someone meant to put them to sleep and carry them off, from inside the palace | hold 5 | sets: drugged | log: Someone tried to drug the protagonist's cup to carry them off.
event: the_envoy | public | when: act>=2, met>=8, prob 8 | stages: A foreign prince arrives on an embassy and is drawn to the protagonist at first sight; he lingers far longer than his embassy needs >> The envoy asks for the protagonist's hand as the price of an alliance. Octavia refuses, and so does Aldric; the prince will not take no, speaks of broken peace, and his men are seen near the protagonist's rooms at night | hold 6 | sets: envoy_refused | log: The foreign envoy asked for the protagonist's hand, was refused, and spoke of war.
event: tribunal | public | when: flag:rumors, prob 25 | stages: An inquisitor arrives from the Church, asking soft questions about witchcraft and watching the protagonist from across every room >> The inquisitor demands the protagonist be taken to a distant convent, to be studied and saved. Nobody wants them harmed, but the court splits: those who would defend them with steel, and those who think the convent would keep them safe, or keep them from a rival. Swords are drawn in the halls, and the inquisitor himself begins to feel the pull | hold 6 | sets: tribunal | log: The Church demanded the protagonist be sent to a convent, and the court split over it.
# Court twist deck: twist: id | who: high/low/any/absent | when: conditions | weight N | stages: hint >> it happens
twist: shadowed | who: obsession>=4 | weight 2 | stages: {who} has been following the protagonist through the palace corridors >> {who} is caught watching, and has an excuse ready
twist: letter | who: obsession>=4 | stages: {who} writes the protagonist a letter that says far too much
twist: keepsake | who: obsession>=4 | stages: {who} has taken something small that belongs to the protagonist and keeps it close
twist: cold_shoulder | who: low | stages: {who} turns cold toward the protagonist and will not say why >> the reason comes out
twist: quiet_favor | who: any | stages: {who} quietly does the protagonist a favor at some cost to themselves
twist: summons | who: absent | stages: {who} sends a formal summons that cannot politely be refused
twist: gossip | weight 2 | stages: palace servants whisper about the protagonist >> a servant brings the protagonist a piece of gossip that matters
twist: ceremony | when: met>=4 | stages: a court ceremony gathers everyone in one hall, and every fixation is on display at once
twist: missing | stages: something personal of the protagonist's goes missing >> it turns up in someone's keeping
twist: shrine | who: obsession>=5 | stages: small things of the protagonist's keep vanishing: a ribbon, a glove, a lock of hair from the brush >> the protagonist finds a hidden room full of drawings of them and every vanished thing, kept with care. It belongs to {who}
twist: footsteps | who: obsession>=5 | stages: someone comes into the protagonist's room at night while they sleep; in the morning things are moved and a flower lies on the pillow, and Rowan swears nobody passed >> the protagonist wakes at night to someone standing by the bed in the dark: {who}, who only wanted to watch them sleep
```

## Arc card (Type: Arc)

The three-act arc. Act 1 opens with the presentations, one occasion per scene: the King on arrival (and Mira), Rowan sworn in as the protagonist's escort, the Queen that evening, the Prince and Princess at a tea the next day, Tobin at the stables, the Duke and Seraphine at a ball (it waits for an evening), a performance the Queen demands before the whole court (the talent written in the protagonist's card), and Dorian when Elowen falls ill. Fixed beats are the spine of the plot and happen in order; around them, every bank beat is in play (`pick all`) and each one still needs its condition, so how you play decides which happen. Act 2 gives each character a thread of two scenes once their obsession shows (4, or 2 for Elowen and Hespera, whose obsession grows very slowly): first the shape their obsession takes, then a crossroads, tender or honest if they trust the protagonist (5+), dark if they do not (under 3). Characters the protagonist has barely dealt with get no scenes. Act 3 gives each character one final scene, from real feeling (attraction 6+, or trust for those with no romance) or fear (6+); Cassian and Isolde's real love plays out differently once the blood tie is known. Then the Queen's confession turns the story over: read the act 3 fixed beats only if you do not mind the spoiler, and keep players out of this card. Keep `mode hybrid`: `random` could skip a fixed beat whose flag the next one needs. Commands: `/arc`, `/arc next`, `/arc reroll`, `/arc mode`, `/arc act N`.

```
Triggers: lw_arc
Notes:
arc: The Obsession Spiral | mode hybrid | pick all | hold 4
act: 1 | The Veil | Everyone at court is drawn to the protagonist from the first moment, and it is invasive. Keep the mood uneasy and intimate, and give each character a distinct first moment. The court is presented in order, one occasion at a time: someone not yet presented stays offstage until their beat. Only the protagonist, Elowen, Hespera and Queen Octavia know of the curse; to everyone else it is an unexplained pull, and nobody names a curse unless the protagonist has told them. No one wants the protagonist dead, and their death would bring relief to no one: the danger is being taken, confined or claimed, and others tearing each other apart over them.
act: 2 | The Spiral | The obsession deepens and the court begins to notice. Tension, jealousy, and doubt about what is real. The four who know of the curse play cat and mouse, each sure she hides it from the rest; nobody else knows unless the protagonist confides in them. No one wants the protagonist dead, and their death would bring relief to no one: the danger is being taken, confined or claimed, and others tearing each other apart over them.
act: 3 | The Truth | Everything comes to a head: each person shows what they truly are toward the protagonist, and the Queen's game reaches its end. Nobody but the four knows of the curse unless the protagonist has told them. No one wants the protagonist dead, and their death would bring relief to no one: the danger is being taken, confined or claimed, and others tearing each other apart over them.
# The presentations: the court meets the protagonist in this order, one occasion per scene
beat: 1 | fixed | The King's Welcome | when: action>=1 | guide: The protagonist and Elowen arrive at the palace. King Aldric receives them in the throne room as his honored guests, far warmer than a king should be with strangers. Mira, a chambermaid, shows them to their rooms. The first stares at court begin: make the obsession feel invasive and wrong, never flattering. | sets: first_stares
beat: 1 | fixed | The Sworn Escort | when: flag:first_stares | guide: King Aldric sends for the protagonist and presents Rowan Hale, a knight of the Royal Guard, as their sworn escort from now on. Rowan kneels and gives his oath. He feels the pull and answers it with stiff, careful courtesy, keeping a proper distance. | sets: met_escort
beat: 1 | fixed | The Queen's Audience | when: flag:met_escort | guide: That evening Queen Octavia summons the protagonist to her private salon, alone. She is gracious, cold and very attentive, studies them like a puzzle, and gives nothing away. Before dismissing them she announces a tea tomorrow to present the King's guest to her children. | sets: met_queen
beat: 1 | fixed | The Presentation Tea | when: flag:met_queen, day>=2 | guide: The next day, a presentation tea in the palace gardens: the protagonist meets Princess Isolde, all sweet charm and sharp eyes, and Crown Prince Cassian, stiff and correct, who cannot stop looking. Before it ends, a ball is announced in the guest's honor. | sets: met_heirs
beat: 1 | fixed | The Stables | when: flag:met_heirs | guide: Away from the court, at the royal stables, the protagonist meets Tobin Wren, the stable master. He feels the pull but only grows clumsy and kind; Rowan, at the door, keeps his quiet courtesy. The protagonist feels a rare, wary relief. | sets: first_calm
beat: 1 | fixed | The Ball | when: flag:first_calm, time:evening or night | guide: The ball in the protagonist's honor. Every eye in the great hall is on them. Two nobles are presented: Evander Thorne, the Duke of Ashmere, all courtesy and calculation, and Lady Seraphine Marrow, Isolde's closest friend, who is charming to the protagonist and watches whoever dances with them. | sets: met_nobles
beat: 1 | fixed | The Queen's Entertainment | when: flag:met_nobles, time:evening or night | guide: At an evening gathering before the whole court, Queen Octavia asks the protagonist to perform, sweetly, in a way that cannot be refused: their greatest talent, the one written in their card (a song, a dance, swordplay, music, whatever it is), and she knows exactly what it is. She does it to torment everyone in the room, herself included: every eye is on the protagonist, and the pull grows in all of them at once. Let the performance be beautiful and the silence after it unbearable; show each face. | sets: performed
beat: 1 | fixed | Elowen Falls Ill | when: flag:performed, day>=3 | guide: Elowen wakes with a fever and cannot get up. The protagonist takes her to the court physician, Dorian Lacroix, in his rooms full of books and instruments. He treats her with care, and studies the protagonist with an interest that is not only medical. Elowen will recover, slowly. | sets: met_physician
beat: 1 | fixed | The Gift | when: flag:met_physician | guide: A gift arrives that shows far too much knowledge of the protagonist. The sense of being watched grows. | sets: gift_received
beat: 1 | bank | An Unwanted Escort | when: any obsession>=2 | guide: Someone insists on accompanying the protagonist everywhere, with a polite excuse that does not hold up.
beat: 1 | bank | The Stolen Glance | when: met>=3, prob 25 | guide: The protagonist catches someone staring from across a room, and they do not look away.
beat: 1 | bank | Kindness Without Hunger | when: any trust>=4 | guide: Someone shows the protagonist a small kindness that wants nothing back, and it is disarming.
beat: 1 | bank | A Servant's Warning | when: met:Mira or Tobin, prob 20 | guide: A servant quietly warns the protagonist about someone at court.
# Act 2 threads: two scenes per character, from what the protagonist has built with them. The first shows the shape of their obsession;
# the second is a crossroads: tender or honest with trust, dark without it (one or the other, never both). Nobody built, no scene.
beat: 2 | bank | A Father's Hours | when: Aldric.obsession>=4 | guide: King Aldric cancels audiences to dine alone with the protagonist and gives them keepsakes from his youth; the warmth is too much, and he cannot stop. | sets: aldric_shape
beat: 2 | bank | Almost Said | when: flag:aldric_shape, !flag:aldric_turn, Aldric.obsession>=6, Aldric.trust>=5 | guide: Aldric comes within a breath of telling the protagonist he is their father, then stops, afraid of the Queen. What he does say changes how they see him. | sets: aldric_turn
beat: 2 | bank | The Gilded Cage | when: flag:aldric_shape, !flag:aldric_turn, Aldric.obsession>=6, Aldric.trust<3 | guide: Aldric forbids the protagonist to leave the palace, "for your safety", and doubles the guard; the kindness has become a cage. | sets: aldric_turn
beat: 2 | bank | The Queen's Game | when: Octavia.obsession>=4 | guide: Queen Octavia invites the protagonist to chess and wagers favors on each game. She plays to learn them, and lets them see it. | sets: octavia_shape
beat: 2 | bank | A Truce of Sorts | when: flag:octavia_shape, !flag:octavia_turn, Octavia.obsession>=6, Octavia.trust>=5 | guide: Octavia tells the protagonist something true about herself, without apology or explanation, and offers a truce she may not keep. | sets: octavia_turn
beat: 2 | bank | The Test | when: flag:octavia_shape, !flag:octavia_turn, Octavia.obsession>=6, Octavia.trust<3 | guide: In private, Octavia tests the counter-spell: she reaches for the protagonist slowly, watching what stops her. Make it cold and frightening; the protagonist's fear of her grows. | sets: octavia_turn
beat: 2 | bank | Cracks in the Armor | when: Cassian.obsession>=4 | guide: On the training ground Prince Cassian loses control for a moment when the protagonist is near, then apologizes with rigid formality, ashamed. | sets: cassian_shape
beat: 2 | bank | Off Duty | when: flag:cassian_shape, !flag:cassian_turn, Cassian.obsession>=6, Cassian.trust>=5 | guide: Cassian takes the protagonist to a hidden place of his own and admits he cannot tell what in him is real; the control cracks into something tender. | sets: cassian_turn
beat: 2 | bank | The Heir's Order | when: flag:cassian_shape, !flag:cassian_turn, Cassian.obsession>=6, Cassian.trust<3 | guide: Cassian orders Rowan to report every move the protagonist makes, and calls it his duty as heir. | sets: cassian_turn
beat: 2 | bank | Sweet Concern | when: Isolde.obsession>=4 | guide: Princess Isolde takes over the protagonist's days: she chooses their gowns, their company and their schedule, and keeps others away, all for their own good. | sets: isolde_shape
beat: 2 | bank | Alone Together | when: flag:isolde_shape, !flag:isolde_turn, Isolde.obsession>=6, Isolde.trust>=5 | guide: Late at night Isolde's loneliness shows: she talks to the protagonist with no scheme at all, and seems frightened of how much she means it. | sets: isolde_turn
beat: 2 | bank | Isolde's Web | when: flag:isolde_shape, !flag:isolde_turn, Isolde.obsession>=6, Isolde.trust<3 | guide: Isolde starts a small rumor to drive someone away from the protagonist; the trail leads back to her, if anyone looks. | sets: isolde_turn
beat: 2 | bank | The Oath and the Pull | when: Rowan.obsession>=4 | guide: Rowan Hale asks to be reassigned from the protagonist's guard, ashamed of what he feels; he will not say why, and stays at his post until an answer comes. | sets: rowan_shape
beat: 2 | bank | Night Watch | when: flag:rowan_shape, !flag:rowan_turn, Rowan.obsession>=6, Rowan.trust>=5 | guide: On a night watch outside the protagonist's door, Rowan speaks honestly about what he feels and why he will never act on it unless they ask. | sets: rowan_turn
beat: 2 | bank | By the Book | when: flag:rowan_shape, !flag:rowan_turn, Rowan.obsession>=6, Rowan.trust<3 | guide: Rowan retreats into regulations and cold correctness, guarding himself as much as the protagonist. | sets: rowan_turn
beat: 2 | bank | A Debt Offered | when: Evander.obsession>=4 | guide: Duke Evander Thorne does the protagonist a real favor (Elowen's papers, a debt paid, a door opened) and makes sure they know a debt now exists. | sets: evander_shape
beat: 2 | bank | An Honest Bargain | when: flag:evander_shape, !flag:evander_turn, Evander.obsession>=6, Evander.trust>=5 | guide: Evander proposes a true alliance, cards on the table, and tells the protagonist exactly what he wants from it. | sets: evander_turn
beat: 2 | bank | The Ledger | when: flag:evander_shape, !flag:evander_turn, Evander.obsession>=6, Evander.trust<3 | guide: The protagonist discovers that Evander keeps a ledger about them: habits, visitors, things said in passing. | sets: evander_turn
beat: 2 | bank | Accidental Encounters | when: Seraphine.obsession>=4 | guide: Lady Seraphine is everywhere the protagonist goes, always by accident, always with a gift or an invitation ready. | sets: seraphine_shape
beat: 2 | bank | Jealous of a Friend | when: flag:seraphine_shape, !flag:seraphine_turn, Seraphine.obsession>=6, Seraphine.trust>=5 | guide: Seraphine confesses that she has grown jealous of Isolde, her closest friend, because of the protagonist, and hates herself for it. | sets: seraphine_turn
beat: 2 | bank | Sabotage | when: flag:seraphine_shape, !flag:seraphine_turn, Seraphine.obsession>=6, Seraphine.trust<3 | guide: Someone close to the protagonist is humiliated in public, and every sign points to Seraphine, who is all sympathy. | sets: seraphine_turn
beat: 2 | bank | The Study | when: Dorian.obsession>=4 | guide: Dorian Lacroix asks to observe the protagonist: notes, measurements, tests of the strange force that stops every hand, from a careful distance. His hands shake a little. | sets: dorian_shape
beat: 2 | bank | Shared Notes | when: flag:dorian_shape, !flag:dorian_turn, Dorian.obsession>=6, Dorian.trust>=5 | guide: Dorian shows the protagonist what he has found about the force around them and asks for their help, as an equal. | sets: dorian_turn
beat: 2 | bank | The Notebook | when: flag:dorian_shape, !flag:dorian_turn, Dorian.obsession>=6, Dorian.trust<3 | guide: The protagonist finds Dorian's notebook: page after page about them, and not all of it is science. | sets: dorian_turn
beat: 2 | bank | Small Devotions | when: Mira.obsession>=4 | guide: Mira anticipates every need before it is spoken, and has started sleeping on a pallet by the protagonist's door. | sets: mira_shape
beat: 2 | bank | What the Walls Hear | when: flag:mira_shape, !flag:mira_turn, Mira.obsession>=6, Mira.trust>=5 | guide: Mira brings the protagonist a palace secret that puts her own place, or her safety, at risk. | sets: mira_turn
beat: 2 | bank | Too Close | when: flag:mira_shape, !flag:mira_turn, Mira.obsession>=6, Mira.trust<3 | guide: Mira is caught going through the protagonist's things, and has an excuse ready that does not quite hold. | sets: mira_turn
beat: 2 | bank | The Refuge | when: Tobin.trust>=5 | guide: The stables become the one place the protagonist can breathe; Tobin keeps it that way without being asked, clumsy and kind. | sets: tobin_shape
beat: 2 | bank | Clumsy Courage | when: flag:tobin_shape, !flag:tobin_turn, Tobin.obsession>=6, Tobin.trust>=5 | guide: Tobin does something brave and foolish for the protagonist, and is embarrassed to be thanked. | sets: tobin_turn
beat: 2 | bank | Keeping Away | when: flag:tobin_shape, !flag:tobin_turn, Tobin.obsession>=6, Tobin.trust<3 | guide: Tobin starts avoiding the protagonist, because he no longer trusts himself near them. | sets: tobin_turn
beat: 2 | bank | A Mother's Fear | when: Elowen.obsession>=2 | guide: After her illness Elowen wants to leave the court at once; she checks on the protagonist at night and wants to know where they are at every hour. | sets: elowen_shape
beat: 2 | bank | What She Gave Up | when: flag:elowen_shape, !flag:elowen_turn, Elowen.obsession>=4, Elowen.trust>=5 | guide: Elowen tells the protagonist about Aldric, and why she hid them from everyone all these years. Her love is fierce, and she is beginning to hold too tight. | sets: elowen_turn
beat: 2 | bank | Locked Doors | when: flag:elowen_shape, !flag:elowen_turn, Elowen.obsession>=4, Elowen.trust<3 | guide: Elowen plans to take the protagonist away from the palace at night, without asking them. | sets: elowen_turn
beat: 2 | bank | Old Wards | when: Hespera.obsession>=2 | guide: Hespera redoubles the counter-spell: herbs at every door, salt on the sills, and she sleeps across the protagonist's threshold. | sets: hespera_shape
beat: 2 | bank | The Nursemaid's Story | when: flag:hespera_shape, !flag:hespera_turn, Hespera.obsession>=4, Hespera.trust>=5 | guide: Hespera tells the protagonist about the night she cast the counter-spell over their cradle, and what it cost her. | sets: hespera_turn
beat: 2 | bank | Her Charge | when: flag:hespera_shape, !flag:hespera_turn, Hespera.obsession>=4, Hespera.trust<3 | guide: Hespera decides for the protagonist: she hides a letter, or turns a visitor away, for their own good. | sets: hespera_turn
beat: 2 | bank | Cat and Mouse | when: flag:octavia_hinted, met:Elowen | guide: Octavia, Elowen and Hespera in one room, all courtesy: every word is a move in a game only the four of them know they are playing, and nobody else in the room notices. | sets: cat_and_mouse
beat: 2 | bank | A Secret Shared | when: any trust>=7 | guide: Someone the protagonist trusts deeply sees that they carry a secret and gently asks. The protagonist may tell them about the curse, or not: their choice. | sets: secret_offered
beat: 2 | bank | The Near-Touch | when: any obsession>=6 | guide: Someone reaches out. The counter-spell stops them, and the scene turns eerie: the hand freezes and the air turns cold. The person is shaken and invents an explanation.
beat: 2 | bank | The Masked Ball | when: met>=6, time:evening or night | guide: A masked ball. The masks weaken the pull, and someone uses it: a masked figure follows the protagonist all night, and in a dark corridor a gloved hand closes on their wrist, and the ward that stops every hand does not stop it at once. It lets go and vanishes into the crowd; the protagonist never learns who it was. | sets: masked_touch
beat: 2 | bank | A Confession | when: any attraction>=7 trust>=6 | guide: Someone confesses sincerely, in words that sound unlike the pull's pleading. The protagonist cannot tell whether it is real, and must decide how to answer.
beat: 2 | fixed | Midpoint, The Breach | when: flag:gift_received, action>=100 | guide: Witnesses see the counter-spell hold. Rumors of witchcraft begin. | sets: rumors
beat: 2 | fixed | The Abduction | when: flag:rumors | guide: The protagonist is taken in the night: drugged, hooded, carried out of the palace to a hidden place. Keep the captor's face hidden at first: someone from court whose fixation has gone furthest, or the envoy's men if he was refused. The captor wants to keep them, not hurt them, and that is the horror: kindness, a locked door, a voice saying they are safe now. | sets: abducted
beat: 2 | fixed | The Court Ablaze | when: flag:abducted | guide: The court tears itself apart over the abduction. Aldric seals the gates and threatens everyone; Octavia is cold with fury that someone took what she considers hers; Cassian and Rowan lead the searches and come to blows over who failed; Evander and Seraphine trade accusations; servants are questioned in the cellars; steel is drawn in the corridors. The protagonist is found, or escapes, and who reaches them first matters. | sets: court_ablaze
beat: 2 | fixed | Blood Ties Surface | when: flag:blood_suspected | guide: The truth comes out: the King's guest is his child, and Cassian and Isolde are their half-siblings. Whoever learns it is torn between the fixation, shame, and the possibility that some of what they feel is real, and the King's pretense starts to crack. Handle it with weight, never as a casual line. The protagonist decides what, if anything, happens next. | sets: blood_ties_known
beat: 2 | fixed | Cornered | when: flag:rumors, any obsession>=8 | guide: Someone consumed by their fixation corners the protagonist with possessive pleading. Do not describe graphic violence. The protagonist's consent decides the outcome. | sets: cornered
# Act 3: one final scene per character, from what was built: real feeling (attraction 6+, or trust for those with no romance) or fear (6+).
# One or the other, never both; nobody built, no scene. The Queen's confession waits for them (actscene>=12: room for about six).
beat: 3 | bank | A Father, Not a Jailer | when: !flag:aldric_end, Aldric.trust>=7 | guide: Aldric names the protagonist his child before the court and lets them choose their own life, whatever it costs him with the Queen. | sets: aldric_end
beat: 3 | bank | The King's Will | when: !flag:aldric_end, Aldric.fear>=6 | guide: Aldric uses the crown to keep the protagonist: decrees, guards, a gilded confinement, all in the name of love. | sets: aldric_end
beat: 3 | bank | The Game Dropped | when: !flag:octavia_end, Octavia.trust>=5 | guide: For one evening Octavia drops the game: she admits she has lied to the protagonist about something that matters, and promises to tell all of it, in front of Elowen and Hespera, when the time comes. She says nothing more. | sets: octavia_end
beat: 3 | bank | Checkmate | when: !flag:octavia_end, Octavia.fear>=6 | guide: Octavia moves to own the protagonist: a wardship, a marriage of her choosing, or a quiet confinement, all perfectly lawful. | sets: octavia_end
beat: 3 | bank | Released From the Oath | when: !flag:rowan_end, Rowan.attraction>=6 | guide: Rowan asks to be released from his oath so he can court the protagonist honestly, as a man and not a guard; if they refuse, he keeps the oath and says it once, plainly. | sets: rowan_end
beat: 3 | bank | The Oath Breaks | when: !flag:rowan_end, Rowan.fear>=6 | guide: The man who resisted longest breaks: Rowan will not let the protagonist out of his sight, and calls it duty. | sets: rowan_end
beat: 3 | bank | Cards on the Table | when: !flag:evander_end, Evander.attraction>=6 | guide: Evander burns his ledger in front of the protagonist and asks for nothing but an honest answer. | sets: evander_end
beat: 3 | bank | The Price of Silence | when: !flag:evander_end, Evander.fear>=6 | guide: Evander lays out his proof of witchcraft and names his price for silence, politely. | sets: evander_end
beat: 3 | bank | Without Rivals | when: !flag:seraphine_end, Seraphine.attraction>=6 | guide: Seraphine ends her sabotage and asks to be chosen fairly, even if it costs her Isolde's friendship. | sets: seraphine_end
beat: 3 | bank | Thorns | when: !flag:seraphine_end, Seraphine.fear>=6 | guide: Seraphine hurts someone close to the protagonist, perhaps Isolde, to clear the way, and comes to them for comfort. | sets: seraphine_end
beat: 3 | bank | The Control Group | when: !flag:dorian_end, Dorian.attraction>=6 | guide: Dorian finds a way to test whether what he feels is truly his, and is ready to burn his research for the answer. | sets: dorian_end
beat: 3 | bank | The Experiment | when: !flag:dorian_end, Dorian.fear>=6 | guide: Dorian tries to break the force that stops every hand, to finally touch the protagonist, and the attempt goes wrong. | sets: dorian_end
beat: 3 | bank | Not Your Servant | when: !flag:mira_end, Mira.attraction>=6 | guide: Mira asks the protagonist to see her as herself, not as their chambermaid, and is terrified of the answer. | sets: mira_end
beat: 3 | bank | For Your Safety | when: !flag:mira_end, Mira.fear>=6 | guide: Mira locks the protagonist's doors from outside to keep them safe, and cries while she does it. | sets: mira_end
beat: 3 | bank | Hay and Honesty | when: !flag:tobin_end, Tobin.attraction>=6 | guide: Tobin says plainly what he feels and asks for nothing. | sets: tobin_end
beat: 3 | bank | The Gentle One Snaps | when: !flag:tobin_end, Tobin.fear>=6 | guide: Tobin fights someone over the protagonist and is frightened of himself afterwards. | sets: tobin_end
beat: 3 | bank | Letting Go | when: !flag:elowen_end, Elowen.trust>=7 | guide: Elowen accepts that her child is grown and lets them choose their own life, at court or away from it. | sets: elowen_end
beat: 3 | bank | Mother Knows Best | when: !flag:elowen_end, Elowen.fear>=6 | guide: Elowen tries to take the protagonist away from the palace, by force or by trick, for their own good. | sets: elowen_end
beat: 3 | bank | The Last Ward | when: !flag:hespera_end, Hespera.trust>=7 | guide: Hespera offers to bind herself to her ward for good, whatever it costs her, so the protagonist can live as they choose. | sets: hespera_end
beat: 3 | bank | The Witch's Bargain | when: !flag:hespera_end, Hespera.fear>=6 | guide: Hespera strikes a bargain with the Queen behind the protagonist's back. | sets: hespera_end
beat: 3 | bank | Not the Pull | when: !flag:cassian_end, !flag:blood_ties_known, Cassian.attraction>=6 | guide: Cassian finds that what he feels survives everything he does to control it, and says so plainly: it is not a fixation, it is love. The truth of their blood is close and unspoken. | sets: cassian_end
beat: 3 | bank | The Line | when: !flag:cassian_end, flag:blood_ties_known, Cassian.attraction>=6 | guide: Cassian and the protagonist love each other knowing they share the King's blood. He must decide what to do with it: keep it secret, defy the court, or give up the crown. Handle it with weight; it has consequences at court. | sets: cassian_end
beat: 3 | bank | The Heir's Claim | when: !flag:cassian_end, Cassian.fear>=6 | guide: Cassian's control breaks: he claims the protagonist by right of the heir and will not hear no. | sets: cassian_end
beat: 3 | bank | No Schemes Left | when: !flag:isolde_end, !flag:blood_ties_known, Isolde.attraction>=6 | guide: Isolde stops scheming and asks the protagonist to choose her as she is, without tricks. | sets: isolde_end
beat: 3 | bank | Against the Crown | when: !flag:isolde_end, flag:blood_ties_known, Isolde.attraction>=6 | guide: Isolde loves the protagonist knowing they share the King's blood, and stands against her mother and the court for them, aware of the scandal. Handle it with weight. | sets: isolde_end
beat: 3 | bank | The Gilded Trap | when: !flag:isolde_end, Isolde.fear>=6 | guide: Isolde stages a scandal that leaves the protagonist with no one at court but her. | sets: isolde_end
beat: 3 | fixed | The Queen's Confession | when: flag:cornered, actscene>=12 | guide: Queen Octavia tells the truth, before the protagonist, Elowen and Hespera: there was never a curse. The winter the protagonist was born she went in secret to kill the King's child, and at the cradle she could not do it: she was the first to fall under whatever the child has carried since birth. She invented the curse and told Elowen she had cast it, so mother and child would flee and hide where no one else could have them; for years she planned their return, the rumor of a cure at court, the King's invitation. Hespera's ward never countered a spell: it only dampens what the protagonist is. If Octavia already admitted in private that she lied, this is where she says all of it. Tell it with weight. | sets: queen_revealed
beat: 3 | fixed | What You Are | when: flag:queen_revealed | guide: There is no curse to break and no cure to find: the pull is part of who the protagonist is. Everyone who learns it must face that what they feel was never a spell. The protagonist decides what to do with what they are: stay at court, leave with Elowen and Hespera, use it, or live under Hespera's ward for good, and whom, if anyone, to let close. | sets: choice_made
beat: 3 | fixed | Aftermath | when: flag:choice_made | guide: Show what each person does with the truth that it was never a curse: who stays because what they felt was theirs, who cannot bear it, and what becomes of the Queen.
```

## Protagonist card (Type: Character)

Put this in the Notes field of your existing protagonist card so the engine ignores it (or add the protagonist's name to `skip:` in the Config card):

```
[cfg skip]
```

And write the protagonist's greatest talent in its Entry: in act 1 the Queen makes them perform it before the whole court. For example:

```
Fiona's greatest talent is the fire dance.
```

## Character cards (Type: Character)

The card title is the character's name, and every trigger also counts as a name (so `the King` already points at Aldric; `alias:` is only for names that are not triggers). Each character thinks every `thoughts:N` turns while in the scene, up to two characters per turn; their latest thoughts are kept in their Notes, under their stats.

```
Triggers: Aldric, the King
Notes: [cfg obsession:0.35 start.trust:3 romance:no tone:guilty_and_conflicted]
base: It is absurd to feel this much for a stranger, and yet I cannot look away.
Entry:
Aldric Valemont, the King, 52. Charming, weary, burdened by guilt. He invited the protagonist to court as a guest, and in private he knows they are his child by Elowen; to keep the Queen calm he hides it from everyone, his own children included. He knows nothing of any curse: he only feels an overwhelming pull toward the protagonist that he tells himself is a father's love finally allowed, and it turns possessive. He wants to keep them at court, close and protected. Appearance: tall and broad, graying dark-blond hair and beard, tired grey eyes, a plain gold circlet.
```

```
Triggers: Octavia, the Queen
Notes: [cfg obsession:0.4 start.trust:0 trust:0.06 start.obsession:5 fear:2 romance:no thoughts:3 tone:lucid_and_unashamed]
base: They came, as I knew they would. Everything is as I planned it.
base: I want this child and I resent them in equal measure, and I am sorry for neither.
Entry:
Octavia Valemont, the Queen, 48. Regal, patient, ruthless. Elowen and Hespera believe that years ago, when she learned of the King's child, she cursed the baby out of wounded pride and fury so that everyone would be drawn to them, and Octavia has never denied it. Only she, Elowen, Hespera and the protagonist know of the curse, and she plays a quiet game of cat and mouse with the other three, letting them believe she holds its key. Now the child is here as the King's "guest", and she plays along with his pretense, knowing far more than he does. She is drawn to the protagonist herself, feels no shame, and indulges it like any appetite. She resents, wants and torments the protagonist at once, keeping them close with invitations, gifts and favors that cannot be refused. Hespera's counter-spell infuriates and fascinates her, and she tests it with patience. The protagonist has real reason to fear her. Appearance: tall and pale, sharp cheekbones, dark eyes, black hair coiled under a silver crown, always in crimson.
```

```
Triggers: Cassian, the Crown Prince
Notes: [cfg obsession:0.25 start.trust:3 alias:the_Prince tone:rigid_and_conflicted]
Entry:
Cassian Valemont, the Crown Prince, 24. Disciplined, cold, raised to be the perfect heir. His sudden fixation on someone he has just met unsettles him, and he fights it with rigid control, which makes him volatile near them. If the protagonist earns his trust, the control cracks into something tender and conflicted. He cannot tell where this pull ends and he begins, and that torments him. Appearance: tall and lean, short dark hair, cold blue eyes, a stern jaw, an immaculate midnight-blue coat.
```

```
Triggers: Isolde, the Princess
Notes: [cfg obsession:0.4 start.trust:3 tone:scheming_and_lonely]
Entry:
Isolde Valemont, the Princess, 21. Sharp, ambitious, a master of court politics. The pull makes her possessive: she wants the protagonist close and hers alone, and wraps it in sweet concern. Beneath the scheming she is lonely, and real warmth could soften her. She is torn between loyalty to her mother and her own fixation. Appearance: slender, long copper-red hair in intricate braids, amber eyes, a sharp smile, jewel-toned gowns.
```

```
Triggers: Rowan, Rowan Hale
Notes: [cfg obsession:0.2 start.trust:3]
Entry:
Rowan Hale, a knight of the Royal Guard, 26. Honorable, quiet, stubborn. Assigned as the protagonist's escort. He feels the same unexplained pull as everyone, but clings to his oath and refuses to act on it unless they ask. His restraint makes his genuine care stand out. Appearance: broad-shouldered, short brown hair, tanned weathered skin, hazel eyes, a thin scar through his left eyebrow, plain guard armor.
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
Mira Ashdown, a chambermaid, 19. Kind, observant, fiercely loyal. The pull reaches her too, but she hides it behind devoted service and small acts of care. She hears every palace secret and may be the protagonist's most useful friend. Appearance: small, freckled, straw-blond hair in a tight bun, brown eyes, a plain grey uniform and apron.
```

```
Triggers: Tobin
Notes: [cfg obsession:0.2 start.trust:4 alias:the_stable_master thoughts:6 tone:gentle_and_clumsy]
Entry:
Tobin Wren, the stable master, 28. Gentle, plain-spoken, uninterested in court games. The pull makes him clumsy and tender instead of aggressive, and the stables become the one place where the protagonist can breathe. Appearance: tall and sturdy, sun-browned, messy sandy hair, warm brown eyes, hay on a worn leather vest.
```

```
Triggers: Elowen
Notes: [cfg obsession:0.08 start.trust:9 trust:0.2 romance:no noearly thoughts:8 tone:worried_and_protective alias:Mother/Mama]
Entry:
Elowen Marsh, the protagonist's mother, a minor noblewoman, 41. Fierce, anxious, endlessly protective. She hid her child from the curse all their life and has come to court with them to find a way to break it. She keeps the curse from the King, afraid of what he would do, and plays along with the pretense that her child is only a guest. She sometimes treats the protagonist as fragile when they are not. Only she, Hespera, the Queen and the protagonist know of the curse; to everyone else it does not exist. Appearance: slight, brown hair graying at the temples, a worn kind face, plain dark dresses.
```

```
Triggers: Hespera, Brindle
Notes: [cfg obsession:0.08 start.trust:8 trust:0.2 romance:no noearly alias:the_nursemaid/Nanny thoughts:8 tone:wry_and_guarded]
Entry:
Hespera Brindle, the nursemaid and hedge witch, 67. Blunt, wry, seen-it-all. She cast the counter-spell that protects the protagonist, came to court with them, and knows more about the curse than she admits. Only she, Hespera, the Queen and the protagonist know of the curse; to everyone else it does not exist. Appearance: small and bent, a long white braid, sharp black eyes, a herb-stained shawl, hands like gnarled roots.
```
