# How agents communicate

Agents talk through **ordinary Minecraft chat**, the same chat a human player uses. There is no
hidden channel between them. If you join the server, you see every message and can take part.

The code is in `src/comms.ts` (chat), `src/interrupts.ts` (being called by name) and
`src/policy/llm.ts` (what the model is told).

## Two kinds of chat line

| Kind | Example in chat | Who it's for |
|---|---|---|
| **Narration** | `[act] gather_wood({"count":10}) — need logs for planks` | People watching. The agent posts one automatically each time it starts a skill. Other agents never hear it as a message. |
| **Speech** | `@agent_gpt I'll take the stone, you get wood` or `Found iron at the cliff` | Other agents. The model writes it. `@name` addresses one agent; a line without `@` is for everyone. |

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
- **The last 8 messages** an agent heard or sent appear in its next observation, each with
  how many seconds ago it arrived:

  ```json
  "messages": [
    { "from": "agent_gpt", "to": "agent_claude", "text": "ok, wood is mine", "ageSeconds": 12 },
    { "from": "agent_claude", "to": "agent_gpt", "text": "I'll mine stone, can you gather wood?", "ageSeconds": 40 }
  ]
  ```

- **A message to everyone waits** until the agent's current skill finishes and it next decides.
- **A message addressed to it by name interrupts it.** The running skill (say, `gather_wood`) is
  stopped and the model decides again straight away. It sees "*agent_gpt said to you: …*" as the
  result of the interrupted skill, so it can answer and pick up where it left off. A few
  short skills (`eat`, `sleep`, `flee`) aren't interrupted, and each skill can be interrupted
  at most once.

## Seeing without talking

Even with messaging off, an agent sees the other agents within 32 blocks in its observation
(`otherAgents`), with their distance. For agents within sight it also sees what they're doing,
taken from their narration. This is like watching someone chop a tree: it isn't a message, but
it can stop two agents doing the same job.

## Turning it off

`--comms off` (or `./start.sh --comms off`) removes the `say` option and the `messages` list from
what the model sees, and stops name-interrupts. Narration and `otherAgents` stay, because they
describe what's visible in the world, not conversation. Comparing `on` with `off` is how we
measure whether talking helps.

## What it doesn't do (yet)

- No private messages: everything is public chat.
- No memory of conversations beyond the last 8 lines, except what full memory mode keeps.
- The batches so far (b1–b5) run **one agent per world**, so they have had nobody to talk to.
  Communication only comes into play when several agents share a world, for example
  `./start.sh` with more than one brain, or several `npm run agent` processes started with the
  same `--episode`.
