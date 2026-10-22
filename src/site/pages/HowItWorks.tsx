import readme from '../../../README.md?raw';
import { Mermaid, mermaidBlock } from '../lib/Mermaid';
import { HASH } from '../lib/route';

// The control loop diagram is the README's own, read when the site is built, so the two can't drift.
const CONTROL_LOOP = mermaidBlock(readme, 'sequenceDiagram');

const LOOP = [
  { step: 'Run', text: 'Agents get a goal that states an outcome, never the steps, and are left alone.' },
  { step: 'Read', text: 'Where they got stuck: what each was told, what it reasoned, what happened.' },
  { step: 'Sort', text: 'Our tool failed or misled it; it lacked information a player would have; or its own judgement.' },
  { step: 'Fix', text: 'Only the first two, checked in the game. Judgement is reported, never coached.' },
  { step: 'Again', text: 'Run again, and see whether they get further.' },
];

export function HowItWorks() {
  return (
    <main className="narrow">
      <header className="page-head">
        <h1>How it works</h1>
        <p className="lede">
          One rule holds it together: <strong>the model decides, the code does.</strong>
        </p>
      </header>

      <section className="prose">
        <h2>The control loop</h2>
        <p>
          The environment moves on in real time (20 ticks a second); a model takes seconds to answer. So the
          model is never in the control loop. It chooses a <strong>goal</strong>, a tool call such as{' '}
          <code>gather_wood(10)</code> or <code>build_shelter()</code>, and deterministic code carries it
          out: it finds its own targets, retries, gives up cleanly, and reports back in plain words ("need 2
          more planks: gather wood first"). The model is consulted again only when that goal succeeds,
          fails, or something important happens.
        </p>
        <Mermaid chart={CONTROL_LOOP} label="Sequence: the environment's state reaches the agent's body, which compresses it to a short briefing and asks the model what to do next. The model answers with a goal, such as gather_wood(10). The body then acts on the environment in a deterministic loop with no model involved, until the goal completes or fails, and consults the model again only on completion, failure or a significant event." />
        <p>
          This is the most important design decision here. Put the model in the control loop and the agent
          is slow, expensive, and overtaken by events before it finishes thinking. Keep it out, and the same
          agent can work through a whole in-game day on a few dozen decisions. When an agent needs a new
          ability, the answer is a new tool (deterministic code), not more consulting of the model.
        </p>

        <h2>What an agent is given</h2>
        <ul>
          <li>
            <strong>A goal, stated as an outcome:</strong> "Make a stone pickaxe, axe, sword and shovel,
            build a shelter, then survive the night." Never the steps. (Step-by-step <code>-guided</code>{' '}
            versions exist only to measure how much a model needs that help.)
          </li>
          <li>
            <strong>Tools, and only tools.</strong> A fixed list of 25 skills, each with a plain description
            of what it does and how it fails. Nothing happens outside that list. See{' '}
            <a href={HASH.doc('skills')}>the skills</a>.
          </li>
          <li>
            <strong>Observations:</strong> a short summary of its situation (what it holds, what is nearby,
            its health, the time, who else is around), not a dump of the environment.
          </li>
          <li>
            <strong>Feedback:</strong> every tool reports success or failure in words the model can replan
            against.
          </li>
          <li>
            <strong>Optionally, other agents:</strong> it can see them, talk to them, ask them questions, ask
            them to do things and hand them items. See <a href={HASH.doc('communication')}>how agents talk</a>.
          </li>
        </ul>
        <p>
          What it is <em>not</em> given: advice. The harness adds facts, never suggestions: it says when the
          agent has made the same decision several times running, refuses a premature "done" and says what
          is still missing (a false claim of success is itself a result worth counting), lets it give up
          with a reason and flags that it did, and, as its own experimental condition, can list what the
          goal still lacks. A few reflexes are code, not the model's choice: an agent under water swims out
          before it is asked anything.
        </p>

        <h2>Who plays</h2>
        <p>
          Claude Opus 5.5, Claude Sonnet 5.5, GPT-6 Luna, and a small model that runs locally for free
          (Qwen3 4B). A scripted agent with fixed rules and no model is the baseline: without it there would
          be no way to tell whether a model adds anything. A three-day team game costs about $3.50 with the
          Claude models in the team, or about $0.30 with three GPT-6 Luna agents.
        </p>

        <h2>What gets measured</h2>
        <p>
          Every decision is logged with the exact prompt and answer, so any run can be replayed and costed
          afterwards without calling a model again. From the logs:
        </p>
        <ul>
          <li>
            <strong>Outcome:</strong> goal met or not, and how long it took.
          </li>
          <li>
            <strong>Behaviour:</strong> how many decisions worked, failed or were interrupted, whether the
            agent changed course after a failure, how long it looped, whether it kept on after being told it
            was repeating itself, how often it falsely claimed to be done, and whether it gave up, and why.
          </li>
          <li>
            <strong>Teamwork:</strong> who did what, what was handed over, who asked whom for what, and
            whether they did it.
          </li>
          <li>
            <strong>Cost:</strong> tokens in and out, dollars, and time spent waiting on the model.
          </li>
        </ul>
        <p>
          Each run writes its own report, and every batch or team run ends with one readable comparison
          across all of its agents. Reports are built from the logs by code; write-ups are read from the
          logs by hand, and say what was measured, not what was hoped.
        </p>
      </section>

      <section>
        <h2 className="section-title">How the testbed gets better</h2>
        <ol className="loop">
          {LOOP.map((item, i) => (
            <li key={item.step}>
              <span className="loop-n">{i + 1}</span>
              <strong>{item.step}</strong>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
        <p className="muted">
          Every fix so far, beside the same problem in real systems that use AI agents:{' '}
          <a href={HASH.doc('results/write-ups/06-team-base', 'how-this-testbed-gets-better-from-where-the-agents-get-stuck')}>
            the development loop
          </a>
          .
        </p>
      </section>

      <section className="prose">
        <h2>Read further</h2>
        <ul>
          <li><a href={HASH.doc('skills')}>The skills</a>: each one, what it does and how it fails.</li>
          <li><a href={HASH.doc('communication')}>How agents talk</a>: messages, requests and questions between teammates.</li>
          <li><a href={HASH.doc('experiments')}>Running experiments</a>: batches, conditions and fair comparisons.</li>
          <li><a href={HASH.doc('limitations')}>Limitations</a>: what agents can't do, and what the numbers can't show.</li>
        </ul>
      </section>
    </main>
  );
}
