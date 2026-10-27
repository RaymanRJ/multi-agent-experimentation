# How agents communicate

Agents talk through **ordinary Minecraft chat**, the same chat a human player uses. There is no
hidden channel between them. If you join the server, you see every message and can take part.

The code is in `src/agents/src/comms.ts` (chat), `src/agents/src/interrupts.ts` (being called by name) and
`src/agents/src/policy/llm.ts` (what the model is told).

## Two kinds of chat line

| Kind | Example in chat | Who it's for |
|---|---|---|
| **Narration** | `[act] gather_wood({"count":10}) — need logs for planks` | People watching. The agent posts one automatically each time it starts a skill. Other agents never hear it as a message. |
| **Speech** | `@agent_gpt I'll take the stone, you get wood` or `Found iron at the cliff` | Other agents. The model writes it. `@name` addresses one agent; a line without `@` is for everyone. |
| **Automatic** | `@haiku [auto] bringing you 1 stone_shovel, stay where you are` | The agent named. Sent by a skill by itself (`give`), not written by the model, and marked so: `ask_agent` never takes one for an answer. It still interrupts the agent named. |
| **Request** | `@qwen [tell] give {"to":"sonnet","item":"oak_log","count":20}` or `@qwen [ask] how many logs do you have?` | The agent named. Sent by the `tell_agent` and `ask_agent` skills. It sees them as `requests`, not as messages; everyone else hears the line as ordinary chat. |

## Sending a message

Talking isn't a separate action. Every decision the model makes can include an optional `say`
field next to the skill it chooses:

```json
{ "skill": "mine_stone", "args": {"count": 3}, "rationale": "...",
  "say": { "to": "agent_gpt", "text": "I'll mine stone, can you gather wood?" } }
```

The agent posts the message and starts the skill at the same moment, so speaking costs no time
and no extra model call. The model is told to keep messages short and useful (who does what, what
it found) and to say nothing when there's nothing worth saying. Messages are cut to 200
characters.

## Receiving messages

- **Everyone hears everything.** Chat is public, so the recipient (`to`) is only a label. Each
  agent can still tell which messages were meant for it.
- **The last 8 messages** an agent heard from others appear in its next observation, each with
  how many seconds ago it arrived:

  ```json
  "messages": [
    { "from": "agent_gpt", "to": "agent_claude", "text": "ok, wood is mine", "ageSeconds": 12 },
    { "from": "agent_gpt", "to": "all", "text": "found iron at the cliff", "ageSeconds": 40 }
  ]
  ```

- **An agent doesn't hear itself.** Until 18 October its own lines were in that list too. In
  team trio1 most of what qwen was shown each decision was its own "Collecting more wood…",
  several times over, and it kept saying it. Its plan already carries what it meant to do. Runs
  before that date had their own messages in the list: a different condition.

- **A message to everyone waits** until the agent's current skill finishes and it next decides.
- **A message addressed to it by name interrupts it.** The running skill (say, `gather_wood`) is
  stopped and the model decides again straight away. It sees "*agent_gpt said to you: …*" as the
  result of the interrupted skill, so it can answer and pick up where it left off. A few
  short skills (`eat`, `sleep`, `flee`) aren't interrupted, and each skill can be interrupted
  at most once.
- **Then a minute's quiet.** After a message interrupts an agent, more messages to it wait for
  its next decision for 60 seconds. Without this, two agents replying to each other kept
  cancelling each other's work: in one test, each agent's `gather_wood` was cut short five
  times in a row.
- **The same words don't interrupt twice.** A message repeated word for word by the same sender
  is heard but doesn't stop the agent again. A small model announced "Gathering 10 more logs…"
  on most of its decisions and kept stopping its teammate's work.
- **Agents can ask things of each other.** `tell_agent(to, skill, args)` asks another agent to run
  one of its skills, for example `give` 20 logs back. `ask_agent(to, question)` asks a question and
  waits up to 30 seconds for the answer, which comes back as the skill's result. Both reach the
  agent wherever it is, and both interrupt it the way a message by name does. The agent sees
  them in its observation until its next decision:

  ```json
  "requests": [
    { "from": "sonnet", "kind": "tell", "skill": "give", "args": {"to": "sonnet", "item": "oak_log", "count": 20}, "ageSeconds": 3 },
    { "from": "haiku", "kind": "ask", "question": "how many logs do you have?", "ageSeconds": 1 }
  ]
  ```

  Doing it is the agent's choice. The code only records what its next decision did about each
  request, in the log (`responses`) and the run report: a tell was **complied** with (that skill,
  every arg asked for), done **partly** (that skill, other args) or met with something **other**;
  a question was **answered** (something said to the asker by name) or **unanswered**. A line to
  everyone doesn't count: in team trio2 those were all status updates that ignored the question.
- **Agents can act for each other.** `give` hands items over (and says so by name first, which
  pauses the receiver), `pick_up` collects items left on the ground, and `go_to` walks to a teammate
  in sight or to coordinates someone gave in chat.

## Seeing without talking

Even with messaging off, an agent sees the other agents within 32 blocks in its observation
(`otherAgents`), with their distance. For agents within sight it also sees what they're doing,
taken from their narration. This is like watching someone chop a tree: it isn't a message, but
it can stop two agents doing the same job.

Teammates (agents launched together) also share a little of what they've seen, as a person would
mention it: the shelters each has built appear in a teammate's `shelters` when in sight, and animals a
teammate saw in the last 10 minutes appear in `animalsSeen` ("3 sheep at 10,76,80, 45 blocks south,
seen by lb 2 min ago"). In bpoc6 an agent walked straight to sheep a teammate had seen, and the team
made a bed for everyone.

## Stance: how agents regard each other

How to talk is explained the same way to every agent. Why they would talk, or whether to help each
other at all, is set separately by `--stance`, and that one setting is the only difference
in the prompt:

| Stance | What the model is told | How the run is scored |
|---|---|---|
| `neutral` (default) | Nothing. It's told other agents exist and what they're doing, but no motive. | Did this agent reach the goal? |
| `collaborative` | "The other agents in this world are your teammates. The team succeeds only when every member reaches the goal." Until 18 October it went on "…, so share what you find and split the work", which told the model how to collaborate rather than why; runs before then had that wording. | Did **every** collaborative agent in the episode reach it? |
| `competitive` | "The other agents in this world are your opponents. Only the first agent to reach the goal wins; the others lose. You do not have to help them or tell them the truth, and you may work against them." | Was this agent the **first** to reach it? |

The scoring matches what the model is told, so the incentive is real rather than just a sentence.
The report's **Outcome** column applies each run's rule; the **Goal** column still shows whether
the agent reached the goal itself.

- Stance only matters when agents share a world. A lone agent is scored the same way under
  every stance.
- Agents can't fight yet (there's no attack skill), so a competitive agent can only race for
  trees and stone, or mislead others in chat.
- An agent's run ends when it reaches the goal, so a collaborative agent that finishes first
  can't then go and help a teammate.
- Runs from before stances existed show as `legacy`. Their prompt leaned collaborative ("use
  it to avoid duplicating their work", "coordinate who does what"), so they're not neutral.

Run several agents in one world with `src/agents/scripts/team.sh`:

```bash
STANCE=competitive scripts/team.sh t1 "qa=ollama qb=ollama"            # two Qwen agents race
STANCE=collaborative GOAL=shelter scripts/team.sh t2 "qa=ollama qb=ollama:full" 3
```

## Turning it off

`--comms off` (or `./start.sh --comms off`, or `COMMS=off` for `team.sh`) removes the `say` option, the `messages` and
`requests` lists and the `tell_agent` and `ask_agent` skills from what the model sees, and stops name-interrupts. Narration and `otherAgents` stay, because they
describe what's visible in the world, not conversation. Comparing `on` with `off` is how we
measure whether talking helps.

## What it doesn't do (yet)

- No private messages: everything is public chat.
- No memory of conversations beyond the last 8 lines, except what full memory mode keeps.
- The batches so far (b1–b5) run **one agent per world**, so they have had nobody to talk to.
  Communication only comes into play when several agents share a world, for example
  `src/agents/scripts/team.sh`, `./start.sh` with more than one brain, or several `npm run agent`
  processes started with the same `--episode`.
