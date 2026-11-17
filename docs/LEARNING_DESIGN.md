# Coral Classroom: learning design

This is the design for the educational side of Coral Classroom, written for the developer (Codex) who will build it. It says what the game must teach, how, and in what order to build it. It does not cover boards, art or music.

It is based on the code at commit `7d9ecc2` (November 2026). Each claim about learning is marked **[established]** (well supported in second-language research) or **[judgment]** (my own call). No study is cited by title, because I can't verify citations from here.

## 1. Goal and honest scope

- **Learner:** an adult English speaker, starting from zero, preparing for a trip to Korea. She may know some spoken Chinese, but don't assume she can read Chinese characters.
- **Target:** handle the 10 trip situations already in `DECK_SITS` without English, and hold a short friendly conversation. That is roughly CEFR A2 in speaking and listening for those situations, and A1 elsewhere.
- **What the app can't do alone:** make her broadly conversational. Korean is in the hardest group of languages for English speakers; US Foreign Service training estimates are around 2,200 class hours for professional level **[established]**. The design aims for depth in a narrow area, plus regular conversation with real people outside the app (section 10).
- **Time available:** about 20 minutes a day. The trip isn't planned yet; assume it falls within two years. That is up to about 240 hours, so the course is built in stages (section 4) and the planner paces by daily minutes, not by a deadline. When a trip date is set, the planner recomputes: it finishes the stage she is in and prioritizes the situations with the lowest readiness.

## 2. Design principles

1. **Balance four kinds of practice** (Paul Nation's "four strands") **[established]**. Each should get about a quarter of learning time over a week:
   - understanding messages (listening and reading for meaning);
   - producing messages (speaking and writing for meaning);
   - deliberate study (words, grammar, sounds);
   - fluency (doing easy, known things faster).

   Today the app is strong on deliberate study, thin on input, and has no fluency strand at all.
2. **Retrieval beats review** **[established]**. Recalling an answer strengthens memory more than seeing it again. Every task should ask the learner to produce something before showing options.
3. **Spacing and interleaving** **[established]**. One scheduler should space everything and mix item types within a session.
4. **Input must be mostly understood** **[established]**. Text is comfortable to read when about 95–98% of its running words are known. Below about 90% it becomes decoding.
5. **Many voices for new sounds** **[established]**. Learners acquire a new sound contrast better from several speakers than from one.
6. **Time on task** **[judgment]**. In any session, at least 70% of seconds should be spent on a learning task. Dice, hops and travel share the rest.
7. **Never punish.** No hearts, no lost streaks. Progress is shown as things she can do.

## 3. The content graph (build this first)

The design doc promises a content graph, but the code links content with hand tables (`DECK_SITS`, `DECK_UNITS`, `DECK_CANDO_RULES`) and keys learner items by surface text, so 커피 and 커피를 are separate items. Everything else in this document depends on fixing that.

**Item types and IDs.** Every teachable thing gets a stable ID:

| Type | ID example | Fields |
|---|---|---|
| Lexeme (dictionary word) | `lx:커피`, `lx:가다` | gloss, part of speech, level, Hanja and Chinese cousin if any, forms it appears in |
| Chunk (fixed phrase) | `ch:주세요`, `ch:얼마예요` | gloss, lexemes inside it, pattern it shows |
| Pattern (grammar) | `pt:object`, `pt:past` | already in `patterns-data.js`; add prerequisites |
| Sound contrast or rule | `sd:t`, `sr:nasal` | already in `caves-sounds.js` |
| Situation | `st:cafe` | can-do statements, required chunks, lexemes and patterns |
| Culture note | `cu:shoes` | linked situations |

**Rules:**

- The existing gloss strings (`piece=meaning=base`) already carry the base form. A build script turns them into the graph: `base` becomes the lexeme ID, and the surface piece becomes one of its forms.
- The learner model keys on the item ID, not on text. Write a migration from `v:1` (text keys) to `v:2` (ID keys), merging memories for forms of the same lexeme by keeping the stronger one. Test the migration.
- Every piece of content (story line, talk turn, sign, bottle, pattern example) lists the item IDs it contains. This is what lets the planner compute coverage, readiness and "what this teaches".
- Per-region records (`cc-caves-…`, `cc-patterns-…` and the others) either move into the learner model or get a schema version and a documented reason to stay separate.
- Storage moves from one localStorage string to IndexedDB, with an explicit error surfaced when a save fails.

**Checker (add to `tools/check`):** every Korean piece in content resolves to an item; every item has a gloss; every situation's required items appear in at least 3 pieces of content; no content uses a pattern before its prerequisite.

## 4. Curriculum

**Stages [judgment].** With no fixed trip date, the course is three stages. Each one leaves her able to travel if the trip comes early.

| Stage | Rough length at 20 min a day | Vocabulary | What she can do |
|---|---|---|---|
| 1. Survival | 4–5 months | about 600 lexemes, 150 chunks | Get through all 10 situations with set phrases |
| 2. Comfortable | 6–8 more months | about 1,200 lexemes | Handle surprises in those situations; short friendly chats |
| 3. Conversational | the rest | about 2,000 lexemes | Talk about herself, her day and her plans; follow slow natural speech |

Vocabulary is chosen by need in the situations first, then by general frequency. Plan for 4–6 new items a day, adjusted by the scheduler's workload (section 6). The numbers below (150 pieces, 15,000 words) are the Stage 1 targets; later stages each need about twice that again.

**Grammar sequence.** Keep the 12 patterns already built, in their order. Add these, in this order:

1. 이에요/예요 (it is) and 아니에요 (it isn't) — currently missing and needed from day one.
2. Question words in set chunks: 뭐, 어디, 얼마, 언제, 몇.
3. -(으)세요 as a request heard from staff, taught for understanding first.
4. -(으)ㄹ게요 (I'll do it, I'll have this).
5. -고 (and), -지만 (but), -아서/어서 (so, and then).
6. -(으)ㄹ까요? (shall we?) and -고 싶은데요 (softened wishes).
7. -아/어 주세요 with verbs (please do it for me), -아/어도 돼요? (may I?).
8. Listening-only: the 합니다 style used in announcements, and honorific -시- from staff.

**Register rule.** She speaks polite 해요 style only. She must *understand* honorific and formal speech, because that's what staff use. Casual 반말 is recognized, never drilled.

**Numbers get their own track [judgment].** Prices, times, dates, counters and both number systems are where travelers fail first, and they need speed, not knowledge. See section 8.

**Hangul.** A learner who can't read fluently can't use the rest. Add a reading-speed check at the start; below a threshold, the daily plan includes a short decoding drill until she passes.

## 5. Input: listening and reading at scale

This is the largest gap. Story Lagoon has 12 dialogues and about 1,000 running words. The picker already targets 90–95% known words, but has nothing to pick from.

**Volume target [judgment]:** 150 short pieces, about 15,000 running words, built from the 600-lexeme list so the coverage rule can actually be met. Split them:

- **Trip dialogues (60):** 6 per situation, rising in length and speed. Each situation gets variations of the same exchange with different details. Hearing the same script with small changes ("narrow listening") builds fast recognition **[established]**.
- **A serial story (40 episodes):** one continuing story with the recurring cast, so there's a reason to come back.
- **Announcements and overheard speech (25):** subway and airport announcements, a shop loudspeaker, a waiter calling a number. Formal style, for listening only.
- **Micro-texts (25):** messages, menus, notices and receipts.

**Each piece has:**

- a level (1–6), computed from its items, not assigned by hand;
- audio in at least 2 different voices, across the whole library at least 4 voices, both men and women;
- three speeds: slow (0.75×), natural (1.0×), and brisk (1.15×);
- 2–3 meaning questions, at least one answered by listening alone.

**How a piece plays:**

1. Listen with no text. Answer one gist question.
2. Listen again with Korean text. Tap any word for help; a tap records that the word wasn't known by reading.
3. Answer the detail questions.
4. Two days later the planner offers the same piece at the next speed, with no text. This repeated listening is the fluency step.

**Speed ladder.** A piece counts as mastered only when understood at natural speed with no text. The learner model stores the fastest speed understood per piece. "Hear" evidence for an item comes from answering a listening question correctly, not from *not* tapping a word.

## 6. One scheduler

Today SM-2 runs the decks and FSRS shadows them. Use FSRS for everything.

- **What is scheduled:** an (item, channel) pair. Channels stay as they are: hear, read, recall, say, use.
- **Evidence rules.** A channel is updated only by a task that really tests it:

  | Channel | Counts as evidence | Does not count |
  |---|---|---|
  | hear | choosing the meaning from audio alone; dictation | reading along |
  | read | reading for meaning with a question answered | a tap for help (records a lapse only if she then misses the question) |
  | recall | typing or assembling Korean from an English or picture cue | picking from options |
  | say | saying it aloud, then self-rating against the model voice | — |
  | use | producing it inside a new sentence, typed or built | reusing a memorized whole sentence |

- **Grades.** Use four grades where the task allows: wrong, right after a hint or slowly, right, right instantly. Response time gives the last two.
- **Weakest channel first.** A due item is tested in its weakest channel, as My words does now.
- **Sentence cards.** Lexemes are reviewed inside short sentences with one gap, drawn from content she has already met, not as bare word pairs.
- **Workload cap.** New items are released only while predicted daily reviews fit the daily minutes. If reviews pile up, new items stop until they clear.
- **Leeches.** An item missed 5 times is pulled out, shown with a memory aid (a picture, a contrasting pair, or its Chinese cousin if that aid is on), and re-entered.

## 7. Output: a ladder from choosing to speaking

Harbor Town is mostly choosing among 2–3 answers. Choosing is recognition. Each conversation should be playable at four rungs, and the planner moves her up per situation:

1. **Choose.** As now. First meeting only.
2. **Build.** Assemble the answer from word tiles, with distractors.
3. **Produce.** Type or say the answer with no options shown. Options appear only after an attempt or a "help" tap. The existing `also` lists and romanization matching accept variants.
4. **Perform.** The whole conversation at natural speed, with a time limit per turn and no text for the townsperson's lines. This is the checkpoint task.

**Speaking without speech recognition:**

- **Say, then compare.** She says the line, hears her recording next to the model voice, and rates herself. Saying a word aloud improves memory for it even without feedback **[established]**.
- **Dictation (approved by the owner).** Use the iOS Korean keyboard's dictation as a free speech-to-text path into the typed-answer box. It needs no service of ours; the audio is processed by Apple. Test it on her iPhone XS and iPad first. If it works acceptably, rung 3 can be spoken. Treat a wrong transcription as "try again", never as an error on her record. Typing must always remain available, since dictation needs a connection on older devices.
- **Shadowing** stays in Echo Caves. Remove any claim that pitch decides word meaning; keep rhythm and timing feedback.

**Writing.** Bottle Beach stays the place for it. Add short guided tasks that reuse this week's patterns, checked by the existing rules.

**Errors.** Keep one error taxonomy across regions (particle, ending, politeness, word choice, spelling, word order). Each error is recorded against a pattern ID, and two errors on a pattern in a week put a repair lesson in the voyage.

## 8. Fluency (new)

Fluency practice uses only items she already knows, under gentle time pressure **[established]**.

- **Number rush.** Hear a price, time, date or quantity at natural speed and tap it. Then say one for a displayed number. Covers both number systems and the common counters (개, 잔, 명, 병, 시, 분, 원, 번, 층, 호선).
- **Quick replies.** A townsperson's line plays; she answers a known chunk within 3 seconds.
- **Speed reading signs.** Known words flash as signs do from a moving bus.
- **Repeat listening** at the next speed (section 5).

A fluency task never introduces new items and never lowers an item's memory on a slow answer. It records speed only.

## 9. Sounds

- Re-record the Echo Caves minimal pairs in at least 4 voices. Vary the voice from trial to trial.
- Check with a fluent listener that each voice really produces the three-way contrasts (ㄷ/ㅌ/ㄸ and the others). Synthetic voices may blur them, and a blurred model teaches the wrong thing.
- Add dictation: hear a word or short phrase, type it in Hangul. This ties sound to spelling and exposes the sound-change rules.
- The sound profile feeds the planner: contrasts under 80% accuracy return every other day in short sets of 10.

## 10. Assessment and the real world

- **Placement.** A 5-minute check on first use: Hangul reading speed, 20 words, 5 heard phrases.
- **Checkpoints.** One per situation, as a performance: the rung-4 conversation, an unseen listening piece at natural speed, and a sign. Pass is 80%. A fail changes nothing in the plan except to keep the situation open.
- **Trip readiness.** Computed from the graph: for each situation, the share of required items known in the channel that situation needs (mostly hear and say), and whether its checkpoint is passed. Replace the current count of pieces completed.
- **Monthly "cold" test.** Ten unseen items of mixed type, no hints. Its trend is the honest measure of progress.
- **Missions outside the app.** Each situation ends with a real task: order in Korean at a Korean café or restaurant near home, read a real menu online, or have a 15-minute exchange with a Korean speaker. She ticks it off herself. Interaction with real people is where conversational ability is built **[established]**; the app prepares her for it.
- **Trip pack.** Before the trip, one screen with her own must-know chunks per situation, audio included, verified to work offline.

## 11. Daily session

For 20 minutes, the planner builds a voyage of four legs:

| Leg | Minutes | Strand |
|---|---|---|
| Due reviews, weakest channel first | 5 | deliberate study |
| One input piece (new, or a repeat at a faster speed) | 5 | understanding |
| One output task at her current rung | 6 | producing |
| One fluency or sound set | 4 | fluency |

Rules: reviews first; no more than one new pattern per week; every third day the output leg is writing; the planner re-plans when a leg is finished early, not only once a day. The weekly balance across the four strands is shown on Captain's Deck.

## 12. Content pipeline and quality

Content is the bottleneck, so make it cheap to add and hard to get wrong.

1. **Author** pieces as data files in the existing formats, from the allowed-items list for a level.
2. **Validate** automatically (section 3 checker, plus coverage: at least 95% of running words at or below the piece's level).
3. **Review status.** Every piece carries `review: 'draft' | 'checked'`, with the reviewer's initials and date. Only a fluent speaker sets `checked`. Draft pieces are playable but marked, and their items don't count toward readiness.
4. **Voice.** Generate each voice, then run the existing pronunciation check on every clip.
5. **Offline.** Add an explicit "Download for offline" step that fetches all voice packs and reports success. Updates must not delete downloaded audio.

The first batch for review should be the 150 chunks, since those are what she will actually say to people.

## 13. Build order for Codex

Each step ships on its own and has a test.

1. **Content graph and learner model v2.** Item IDs, the build script from glosses, the migration, the checker. *Done when:* 커피 and 커피를 share one memory, and the checker runs in `tools/check/run.sh`.
2. **One scheduler.** FSRS drives decks; evidence rules from section 6; workload cap. *Done when:* a unit test shows a picked-from-options answer doesn't raise "recall".
3. **Output ladder in Harbor Town.** Rungs 2–4 on the 8 existing talks. *Done when:* a talk can be finished with no options shown.
4. **Input engine.** Level computed from items, listen-first flow, speed ladder, repeat scheduling. Then content: the first 30 pieces, 2 voices.
5. **Fluency strand.** Number rush and quick replies.
6. **Missing grammar** (section 4, items 1–5 first).
7. **Assessment.** Placement, performance checkpoints, graph-based readiness, cold test.
8. **Sounds.** Multi-voice pairs and dictation.
9. **Storage and offline.** IndexedDB, verified download, device sync by export and merge (merge by item, keeping the later review, not replace-all).
10. **Content to full volume**, in reviewed batches.

## 14. Decisions from the owner

- **Trip:** not planned yet; assume within two years. About 20 minutes a day.
- **Fluent reviewer:** available. Build the review workflow in section 12 around short batches, starting with the 150 chunks.
- **iOS dictation for speaking:** yes.
- **Chinese cousins of Korean words:** an optional aid, off by default, switched on in settings. When on, a Sino-Korean word shows its Chinese cousin with pinyin and audio, and the character only as a secondary detail, because she may not read characters. It is never required to answer anything and never tested.
