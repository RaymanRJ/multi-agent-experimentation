# Lessons for building agents

What this testbed has taught about building AI agents that work on their own: the tools they call,
what they are told, the state they share, the loop that runs them, how they are measured, and how
the system around them gets better. Each lesson is written for any agent, in a codebase, a ticket
queue or a business tool. The evidence under each comes from a logged run here, in one line, with a
link to the write-up that has the numbers.

The environment is Minecraft because agents in it can be watched and runs can be repeated. It is the
evidence, not the subject.

**The short version.** When an agent fails, look first at what its tools did and what it was told,
then at its judgement. Most early failures here were ours: tools that misled it, information it
couldn't see, and actions it had no tool for. Fixing those moved the agents further than any prompt
change would have, and left their own behaviour visible to study.

## Tools

A tool is the only way an agent touches the world, and the only account it gets of what happened.
The agent plans on that account. If it is wrong, every decision after it is wrong too, however good
the model.

- **Report what happened, not what was expected.** A result that says "delivered" because delivery
  was attempted sends the next decision the wrong way.
  *Evidence:* a hand-over said two pickaxes lay "beside" a teammate who had walked off; the teammate
  searched for them five times. A `take` from a chest reported items picked up off the floor on the
  way as "taken from the chest". ([06](results/write-ups/06-team-base.md))
- **A refusal must be true.** "Not possible" or "not found", when the action was possible, makes the
  agent plan around a problem that isn't there, and it rarely tries again.
  *Evidence:* mining refused reachable ore as "out of reach" 44 times in one team run, and in 34 of
  53 earlier runs that mined; it starved the part of the goal that needed iron. ([06](results/write-ups/06-team-base.md))
- **Do exactly what was asked, no more.** A bulk side effect is invisible to the agent until the
  damage shows.
  *Evidence:* asked for 1 item from the team's store, `take` took all 10 and emptied it. ([06](results/write-ups/06-team-base.md))
- **End an action when what it acted for is gone.** A long-running action that loses its subject
  should stop and say so, not carry on and report on whatever it finds.
  *Evidence:* `flee` ran on after the agent died and reported success: 39 of 86 deaths in one run
  came during a flee that then said it had worked. ([06](results/write-ups/06-team-base.md#three-of-one-model-told-whats-left-tlunap1))
- **Tell interrupted, impossible and temporary apart.** Each calls for a different next step.
  *Evidence:* an interrupted dig was reported as "a block I cannot clear"; a craft cut short by an
  interrupt blamed the server; a teammate who had left was reported as one who "doesn't exist".
  ([02](results/write-ups/02-outpost.md), [05](results/write-ups/05-team-homestead.md), [06](results/write-ups/06-team-base.md))
- **Write errors the agent can act on, and name the tool that fixes them.** A raw error from deep
  in a library is noise; one that names the next step gets followed.
  *Evidence:* "is smelted from raw_iron, not crafted" was followed by mining more ore. "Need 3 more
  cobblestone", which names no tool, was followed by the same failing craft 4–16 times.
  "Destination full" from the smelting library failed 42 times in one run. ([03](results/write-ups/03-iron.md), [06](results/write-ups/06-team-base.md))
- **Give a read-only way to look.** Without one, an agent learns the state of something by changing
  it.
  *Evidence:* an agent took food out of the shared store to see what was in it; after `look_in_chest`
  was added, agents looked 11 times and took nothing. ([06](results/write-ups/06-team-base.md#a-fourth-rep-with-what-the-earlier-reps-taught-tbase4))
- **Cover every step a plan will need, or say which you don't.** An agent will plan a step it has
  no tool for, and nothing tells it the step silently failed.
  *Evidence:* asked to "place the beds" for the team, an agent could only place a bed by sleeping in
  it; the spare stayed in its pack while a teammate had none. ([06](results/write-ups/06-team-base.md#the-clearest-finding-they-answer-requests-not-needs))
- **Fixing tools moves results more than changing models.**
  *Evidence:* the same small model went from 3 of 9 runs to 8 of 9 on fixes to tool code alone
  ([01](results/write-ups/01-local-model-memory.md)); four paid models went from 4 of 12 to 12 of 12
  ([04](results/write-ups/04-p6-outpost-after-fixes.md)).

## Observations and context

What the agent is told about its situation each time it decides. It has to be small, because every
word is paid for on every call, and true, because the agent believes it.

- **Agents trust the summary over the evidence.** A computed status ("safe", "done", "0") beats the
  raw signal beside it, even when the two contradict each other in the same observation. Check every
  status you compute against the signals it summarises.
  *Evidence:* an agent waited beside a zombie because its home was reported "closed"; another
  reasoned for 26 decisions from a health of 0 that was really 0.4; agents believed a team progress
  list over their own last action. ([06](results/write-ups/06-team-base.md#3-meeting-the-unexpected))
- **Never round away the edge case.** Formatting that is fine for most values hides the one that
  matters.
  *Evidence:* health under half a point showed as 0 (above).
- **A fixed cap drops what matters.** Truncating a list to N items cuts off whichever item came
  N+1st, which may be the important one. Give the important kinds their own place.
  *Evidence:* a cap on nearby blocks hid the team's chest from an agent standing beside it; beds
  weren't listed at all. ([06](results/write-ups/06-team-base.md))
- **What's out of range is invisible.** An agent decides as if nothing exists beyond what it is
  shown.
  *Evidence:* agents went home to a doorway crowded with monsters because hostiles were listed only
  within 24 blocks of the agent and the home's line said nothing of them; of 38 entries where an
  agent was hit, 7 got in. ([next steps](next-steps.md) records it; not yet changed)
- **Tell the agent who it is.** Without its own name, an agent addresses itself.
  *Evidence:* agents tried to hand things to themselves and ask themselves questions until the prompt
  named them. ([next steps](next-steps.md), team run trio3)
- **Carrying the agent's own plan forward can hurt.** A small model trusted its stale plan over what
  the world reported, and looped.
  *Evidence:* with a written plan carried between decisions, a 4B model met its goal in 13 of 24
  runs; with no memory, 12 of 12. One asked for "one more log" 134 times while told it held 12.
  ([01](results/write-ups/01-local-model-memory.md))
- **More context is slower and can wear an agent down.** Resending the whole conversation filled a
  small model's window and quadrupled its decision time.
  *Evidence:* about 21 seconds a decision against 4–5; five of six such runs gave up early, citing
  their own failures. ([02](results/write-ups/02-outpost.md))
- **Telling an agent what is still open helps it close what it can act on.** It doesn't help with
  what it can't.
  *Evidence:* with the goal's open parts listed each step, a team kept its food store full in 3 reps
  of 3 (1 of 3 without), refilling it unasked when a teammate ate from it; iron and beds didn't
  move. One model tried the step it had been skipping in 6 runs of 9, against 3. ([06](results/write-ups/06-team-base.md#three-of-one-model-told-whats-left-tlunap1), [02](results/write-ups/02-outpost.md))
- **State goals as outcomes.** What the task requires can reach the agent through tool descriptions
  and failure messages, the way it reaches a person, rather than through steps in the goal.
  *Evidence:* spelling out the steps made no difference for a small model with no memory (6 of 6
  either way). ([01](results/write-ups/01-local-model-memory.md))

## Shared state between agents

When several agents work toward one goal, what they believe about each other is state, and it has
the same problems as state in any distributed system.

- **One rule for shared derived state.** If each agent computes "the" shared thing for itself, they
  will disagree exactly when it matters.
  *Evidence:* with two bases built, each agent's progress list named the one it knew of first; two
  teammates were told to sleep in different homes for 118 decisions. Fixed by one rule for everyone.
  ([06](results/write-ups/06-team-base.md#three-of-one-model-told-whats-left-tlunap1))
- **Publish shared state on a clock, not when each member finishes its work.** Otherwise the view
  lags by a whole task, and the next action is taken twice.
  *Evidence:* 16 seconds after a teammate received a pickaxe, the list still said it had none, and it
  was given a second, the last one. ([06](results/write-ups/06-team-base.md#three-of-one-model-told-whats-left-tlunap1))
- **Agents answer requests, not needs.** They are generous when asked and almost never act on a need
  they can see. Design for it: turn needs into explicit requests, as tickets do for people.
  *Evidence:* 31 of 35 hand-overs between teammates followed a request; a spare bed stayed in one
  agent's pack while it was told, night after night, which teammate had none. ([06](results/write-ups/06-team-base.md#the-clearest-finding-they-answer-requests-not-needs))
- **A request works only if it maps onto something the asked agent can do.**
  *Evidence:* "bring the beds and place them" failed where "give me a bed" would have worked.
  ([06](results/write-ups/06-team-base.md))
- **Messages are interrupts, and they cost.** Each message cuts into the receiver's work. Status
  chatter drowns out the requests that matter, and orders from a peer with no authority are treated
  as suggestions.
  *Evidence:* teammates' messages broke off work 87 times against 100 for threats; questions were
  answered three times in four, instructions followed at once 1 time in 27; the same words repeated
  now interrupt only once. ([06](results/write-ups/06-team-base.md#4-working-together-and-in-each-others-way))
- **Agents organise themselves, then the plan freezes.** They split the work unprompted in their
  first few decisions, and nobody revisits the split when an owner stalls.
  *Evidence:* every team divided the goal over chat within two or three decisions; when the agent
  that owned a part stalled, no one took it over. ([06](results/write-ups/06-team-base.md#1-how-they-organised))
- **State held in one place is lost with it.** What lives only in one agent goes when that agent
  fails.
  *Evidence:* twice an agent made every pickaxe the team needed, carried them all, and died with
  them; things stored in the shared chest were the only things that survived deaths.
  ([05](results/write-ups/05-team-homestead.md), [06](results/write-ups/06-team-base.md))

## The control loop

The world moves on while the model thinks. The loop that runs the agent decides how often it is
asked, what can interrupt it and what happens without it.

- **Keep the model out of the fast loop.** The model chooses a goal; deterministic code carries it
  out, retries, gives up and reports back. One rule holds the design together: the model decides,
  the code does.
  *Evidence:* paid models finished a one-day goal in 20–33 decisions ([04](results/write-ups/04-p6-outpost-after-fixes.md));
  a team got through three in-game days on 95–188 decisions per agent ([06](results/write-ups/06-team-base.md)).
- **Replan on events, not on a timer, and filter the events.** An interrupt that doesn't change
  the right next step only costs a decision.
  *Evidence:* a monster outside a closed shelter interrupted an agent, which went out to it; once
  that stopped interrupting, no agent left its shelter at night. ([04](results/write-ups/04-p6-outpost-after-fixes.md))
- **Put what can't wait in code, as a reflex.** Some things happen faster than a model answers.
  *Evidence:* an agent was killed during its 2.3-second decision to run; agents under water now swim
  out before the model is asked anything. ([02](results/write-ups/02-outpost.md))
- **Give the agent honest ways out.** A way to say "done" that is checked, and a way to give up with
  a reason, both counted.
  *Evidence:* a premature "done" is refused once and told what is missing; a false claim of success
  is recorded as data. ([04](results/write-ups/04-p6-outpost-after-fixes.md))
- **A notice is not a circuit-breaker.** Telling an agent it is looping doesn't stop it. Here that
  is measured, not fixed; in production you would need a hard stop.
  *Evidence:* a small model chose the same decision again after 290 of 293 notes that it was
  repeating itself. ([02](results/write-ups/02-outpost.md))
- **Rate-limit side channels.** A burst of failures can turn into a burst of messages.
  *Evidence:* ten chat lines in a second got an agent kicked from the server. ([02](results/write-ups/02-outpost.md))

## Evaluation

What an agent did is only worth knowing if it can be repeated and trusted.

- **Keep a baseline with no model in it.** It tells you whether a failure is the harness or the
  model.
  *Evidence:* a scripted agent met a goal 5 of 6 times that a small model met 1 of 18: the tools
  could do it, so the open question was the model. ([02](results/write-ups/02-outpost.md))
- **Seed, reset and bound by task time, not steps.** Runs end when the goal is met, the model stops,
  or the environment's own time or a dollar cap runs out. Tokens and wall-clock are recorded, never
  limits: tokenizers differ, and wall-clock measures the hardware. ([experiments](experiments.md))
- **Log every decision with its exact prompt and answer.** It makes replay, costing and re-asking
  free.
  *Evidence:* a stuck moment was replayed to the model 6–8 times with old and new prompts to rule
  them out as the cause of a loop. ([02](results/write-ups/02-outpost.md))
- **Read the logs before believing a result, including your own checker's.**
  *Evidence:* one success was false, from a bug in the goal check; a report counted a teammate saying
  "I respawned" as a death; 45 of 49 "under water" alarms came from a library reading other
  creatures' air as the agent's. ([02](results/write-ups/02-outpost.md), [05](results/write-ups/05-team-homestead.md))
- **Test changes in the real environment, not only against fakes.** Fakes can't model physics,
  timing or the other side.
  *Evidence:* a hand-over that passed every unit test overshot its receiver in four of five live
  tries.
- **Small samples are hints.** With three runs, 3 of 3 is consistent with a true rate as low as 44%.
  Report the interval. ([01](results/write-ups/01-local-model-memory.md))
- **When a test stops separating, make it harder.**
  *Evidence:* after the fixes, every model met the one-agent goal 12 of 12; it then measured only
  cost, so the next test was a team goal. ([04](results/write-ups/04-p6-outpost-after-fixes.md))
- **Be careful crediting judgement.** A fix can remove the trigger for what looked like bad
  judgement.
  *Evidence:* agents stopped leaving their shelters at night once nothing false alarmed them; whether
  their judgement changed can't be told. ([04](results/write-ups/04-p6-outpost-after-fixes.md))
- **Measure cost per outcome, not per call.** The same one-day task cost about 1 cent a run on one
  model and 13–22 cents on others; prompt caching cut 81–86% of input on the models that support it,
  and one model's prompt was below its caching minimum and never cached. ([04](results/write-ups/04-p6-outpost-after-fixes.md), [05](results/write-ups/05-team-homestead.md))

## The improvement loop

How the structure around the agents gets better, run after run.

1. **Run** the agents on a goal, with nothing in their prompt about how to reach it.
2. **Read where they got stuck,** with three things side by side: what the agent was told, what it
   reasoned, and what really happened.
3. **Sort each stuck point:** a tool failed or misled it; it lacked information a person in its
   place would have; or it was its own judgement.
4. **Change only the first two,** and check the fix in the real environment. Judgement is left
   alone and reported: coach it away in the prompt and you measure the coaching.
5. **Run again,** and see whether the agents get further.

*Evidence:* the same mixed team went from one or two parts of a four-part goal to three, and its
failed decisions fell from about 93 a rep to 52–58, on fixes to tools and information alone
([06](results/write-ups/06-team-base.md)). Every fix so far, beside the same problem in real
systems that use agents, is in [06's table](results/write-ups/06-team-base.md#how-this-testbed-gets-better-from-where-the-agents-get-stuck).

**What is left alone.** Answering requests but not needs, one agent carrying everything, status
chatter: these are the agents' own behaviour. In organisations they are handled by how work is
routed (tickets, a shared view of what's open), and here they can be tested as separate conditions,
not made defaults.

## Further

- [Limitations](limitations.md): what the agents can't do, and what the numbers can't show.
- [Skills](skills.md): the tool set, with how each tool fails.
- [How agents communicate](communication.md): messages, requests and questions between agents.
- [Running experiments](experiments.md): batches, conditions and fair comparisons.
