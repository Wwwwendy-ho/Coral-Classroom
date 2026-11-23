# Coral Classroom: the adaptive teacher

This is a companion to the learning design (`docs/LEARNING_DESIGN.md`), written for the developer (Codex). It describes how the game should adjust itself to the learner the way a good teacher does: by watching how she is doing and how often she shows up, changing a few settings at a time, and saying what it changed and why.

Claims about learning are marked **[established]** or **[judgment]**, as in the learning design.

## 1. Principles

1. **Rules, not a black box.** The teacher is a set of plain rules over counted evidence. It runs on the device, gives the same result for the same history, and can be unit-tested. FSRS stays the only statistical model.
2. **Aim for "hard but doable."** Learning is best when tasks take effort and mostly succeed **[established]**. The working target is 80–90% first-try success on practice tasks **[judgment]**. Above that, raise the difficulty; below it, add support.
3. **Change slowly.** One setting, one step, and only on enough evidence. A teacher who changes everything after one bad day is worse than none.
4. **Say what changed.** Every adjustment produces a short note in plain words, with an undo.
5. **The learner outranks the teacher.** She can say "easier today" or "push me," pin any setting, or turn adjusting off.
6. **Never punish absence.** Coming back after a gap is met with a lighter session, not a wall of overdue reviews.
7. **No reminders.** The owner decided the game sends no notifications or reminders of any kind. It adjusts only when she opens it.

## 2. What the teacher watches

All of it is recorded locally as small events and rolled up into daily and weekly totals. Keep raw events for 60 days.

**How she is doing**

| Signal | Measured as |
|---|---|
| Success | first-try accuracy, per task type and per channel (hear, read, recall, say, use) |
| Effort | response time against her own median for that task type |
| Support used | hint taps, word-help taps, replays, drops to "show options" |
| Memory | share of due reviews remembered, against the scheduler's target |
| Listening | fastest speed understood without text, per level |
| Error causes | counts per pattern and per sound contrast |
| Within a session | accuracy and speed in the last third against the first third (fatigue) |

**How she is showing up**

| Signal | Measured as |
|---|---|
| Rhythm | sessions in the last 7 and 28 days; usual time of day |
| Length | minutes of active learning per session (not time with the app open) |
| Gaps | days since the last session |
| Completion | legs finished, skipped or abandoned midway |
| Choices | which regions she opens unprompted, and which she avoids |

**What she says** (optional, one tap at the end of a session): "too easy," "about right," or "too hard." It counts as evidence, weighted like 20 answers.

## 3. What the teacher can change

Each setting has a floor, a ceiling, a default and a step size, all in one table in the code.

| Setting | Range | Raise it when | Lower it when |
|---|---|---|---|
| New items per day | 0–8 (default 5) | reviews fit the day and success is above 90% | reviews overflow, success under 80%, or after a gap |
| Target memory rate (FSRS) | 85–92% | she plays most days and has time to spare | reviews overflow her minutes |
| Session length | 2–4 legs | she regularly finishes with strong accuracy | she often leaves midway or fatigue shows |
| Share of each strand | within ±10 points of an even split | — | — (it shifts toward the weakest strand) |
| Output level, per situation | choose → build → produce → perform | two clean runs at the current level | two failed runs |
| Listening speed, per level | slow → natural → brisk | understood without text twice | missed the gist question twice |
| Text support | none → Korean → Korean with tap help → English shown | — | comprehension falls |
| Story level | 1–6 | coverage is above 98% and questions are easy | coverage is under 92% or questions are missed |
| Time limits in fluency tasks | scaled from her own median speed | she beats the limit comfortably | she misses it often |
| Number of answer options and distractor closeness | 2–4, far → near | success above 90% | success under 75% |
| Share of the interface in Korean | 0–100% | a label has been seen often and its word is known | she turns it back |

## 4. When it adjusts: four timescales

**Within a task (seconds).** Immediate, and never recorded as a setting change.

- Two misses in a row on an item: add a hint, then show the answer, and bring the item back within the session.
- A missed production: step down one level for that turn only (produce → build → choose), then step back up.
- Five fast correct answers in a row: skip the remaining easy items of that kind.

**Within a session (minutes).**

- If accuracy drops 20 points or speed slows by half in the last third, end the current leg early with two easy items, so the session ends on success, and offer to stop.
- If she finishes early and strong, offer one bonus leg from the strand she has done least this week. A bonus leg is input or fluency, never new items.

**Day to day.** The planner applies the current settings and the attendance policy (section 5) when it builds the voyage.

**Week to week: the teacher's review.** Once every 7 days of calendar time, at the first session after it falls due:

1. Compare the last 7 days with the 7 before.
2. Pick at most two settings to change, by the priority order in section 6.
3. Write the teacher's note (section 7).
4. Check the last change: if the measure it was meant to help got worse, revert it.

## 5. Attendance: what to do about how often she plays

Classify her from the last 28 days, and re-check at each session.

| Pattern | Definition | Policy |
|---|---|---|
| **Steady** | 5+ sessions a week | Defaults. New items at the full rate. |
| **Light** | 2–4 sessions a week | Halve new items. Put reviews and one input piece first. Offer a slightly longer session. |
| **Occasional** | about 1 session a week | No new items until the review load is clear. Sessions are review, a familiar story and a fluency set. |
| **Burst** | several sessions in one day | Cap new items for the day. Extra sessions are input, fluency and repeats. Cramming new items in one day is forgotten fast **[established]**. |

**Coming back after a gap:**

| Days away | First session back |
|---|---|
| 3–6 | Normal session. Reviews capped at the usual number, most valuable first. No new items today. |
| 7–20 | A "welcome back" session: a story she liked, then 10 reviews of trip-critical items, then one easy win. New items resume once success is back above 80%. |
| 21 or more | A 3-minute re-check of 15 sampled items across stages. Items she misses are reset to relearn; the rest keep their schedule. The plan resumes from where the re-check places her. |

**Rules for the overdue pile:**

- Never show the count of overdue reviews as a debt. Show today's set only.
- Cap reviews per session. Order them by value: items needed for her next checkpoint first, then items most at risk of being forgotten.
- Let the scheduler use the real time elapsed. An item remembered after a long gap has earned a much longer next interval **[established]**.

## 6. Priority order for weekly changes

When several things call for a change, take the first that applies.

1. **Overload:** reviews exceed her minutes on 3 or more days. Lower new items; if already at the floor, lower the target memory rate.
2. **Struggle:** overall success under 80%. Lower the setting tied to the weakest task type (text support, listening speed, output level or story level).
3. **A weak channel:** one channel trails the others by 20 points. Shift the strand share toward it and test more due items in that channel.
4. **A repeated error cause:** the same pattern or sound contrast, twice in a week. Add its repair lesson; the settings stay as they are.
5. **Coasting:** success above 90% and fast answers for two weeks. Raise one difficulty setting, preferring output level, then listening speed, then new items.
6. **Avoidance:** a strand skipped for two weeks. Offer it in a shorter, easier form first in the session, once. If she skips it again, ask her why with one tap ("too hard," "boring," "no time") and act on the answer.
7. **Plateau:** the monthly cold test is flat for two months. Raise input volume and the output level before adding new items.

**Guardrails:**

- **Evidence needed:** at least 30 answers or 3 sessions for the measure in question.
- **Pace:** at most two changes a week, one step each.
- **Cooldown:** a setting just changed can't change again for 7 days, except to revert.
- **Bounds:** every setting stays inside its range.
- **Pinned settings:** never touched.

## 7. Telling her: the teacher's note

A short card on Captain's Deck after each weekly review, spoken by the region's host or Shelly from pre-written, pre-recorded sentence templates so it works offline.

It has three parts:

1. **What I noticed**, with one specific strength first. "You caught every price at natural speed this week."
2. **What I changed.** "Stories will now play without text the first time."
3. **Your call.** Buttons: Keep it, Undo, Easier, Push me.

Rules for the wording: specific and about effort, never about talent; no guilt about missed days; one change explained, not a list of numbers. Praise tied to effort and strategy supports persistence **[established]**.

A "How I'm teaching you" screen lists every current setting in plain words, when it last changed and why, with a pin on each.

## 8. Data and code shape

- **Events:** `{ t, kind, item, channel, task, ok, ms, hints, speed, level }`, appended locally, rolled into `day` and `week` summaries.
- **Teacher state**, per profile: `{ v, settings: { name: { value, pinned, changedAt, reason } }, attendance, history: [{ at, setting, from, to, reason, reverted }], lastReview }`.
- **Pure functions**, each with unit tests and no screen code:
  - `teacherSummarize(events, now)` → the signals in section 2;
  - `teacherAttendance(summary, now)` → pattern and gap policy;
  - `teacherReview(summary, state, now)` → new state plus note data;
  - `teacherMicro(taskState)` → the within-task step.
- The planner reads settings only through `teacherSetting(name)`, so every dial has one source.
- Teacher state is included in backup and device sync.

**Tests to write:** each rule in section 6 fires on a synthetic history and not on its near-miss; no rule changes a pinned setting; cooldown and bounds hold over a simulated year; a 30-day gap never produces more than the review cap; an undo restores the exact prior state.

## 9. Checking that it helps

- Compare actual memory rate with the target each week; a persistent gap means the scheduler's parameters need refitting to her data.
- Track the cold-test trend and sessions per week before and after each change, and store the result in `history`.
- A hidden "teacher log" export lets the owner or a developer see every decision and its evidence.

## 10. Build order

1. Event log and summaries.
2. Settings table with `teacherSetting`, read by the planner; no automatic changes yet.
3. Attendance patterns and the gap policies.
4. Within-task and within-session steps.
5. Weekly review, guardrails and the "How I'm teaching you" screen.
6. Teacher's notes with recorded voice.
7. The checks in section 9.

Steps 1–3 don't depend on the content graph. Steps 4–7 work best after the learning design's steps 1–3 (item IDs, one scheduler, output levels).

## 11. Open questions for the owner

- Should the child profile get the same teacher with gentler ranges, or stay as it is for now?

