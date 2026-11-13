import readme from '../../../README.md?raw';
import { Mermaid, mermaidBlock } from '../lib/Mermaid';
import { HASH } from '../lib/route';

// The control loop diagram is the README's own, read when the site is built, so the two can't drift.
const CONTROL_LOOP = mermaidBlock(readme, 'sequenceDiagram');

const LAYERS = [
  { name: 'World', text: 'A Minecraft server in Docker: the shared environment, reset from the same seed for every run.' },
  { name: 'Bodies', text: 'One Node.js process per agent, with a library of skills: deterministic code that acts in the world.' },
  { name: 'Brains', text: 'The models (Claude, GPT, or a free local model), behind one interface. Only this layer costs money.' },
];

const GIVEN = [
  { what: 'A goal, stated as an outcome', text: 'What to achieve, never the steps.' },
  { what: 'Tools, and only tools', text: 'A fixed list of 26 skills, each described with what it does and how it fails.' },
  { what: 'A short account of its situation', text: 'What it holds, what is nearby, its health, the time, who else is around.' },
  { what: 'Feedback in plain words', text: 'Every tool reports success or failure in words the model can replan against.' },
  { what: 'Teammates, when there are any', text: 'It can see them, talk, ask questions, ask for help and hand them items.' },
];

export function HowItWorks() {
  return (
    <main className="narrow">
      <header className="page-head">
        <h1>How it works</h1>
        <p className="lede">
          An agent harness: the tools, context, shared state and control loop around a model. One rule holds it
          together: <strong>the model decides, the code does.</strong>
        </p>
      </header>

      <section className="prose">
        <h2>The control loop</h2>
        <p>
          The world moves in real time, 20 ticks a second; a model takes seconds to answer. So the model is never in the
          fast loop. It chooses a goal, such as <code>gather_wood(10)</code> or <code>build_shelter()</code>, and code
          carries it out, retries, gives up cleanly and reports back. The model is asked again only when that goal
          succeeds, fails, or something important happens.
        </p>
        <Mermaid chart={CONTROL_LOOP} label="Sequence: the environment's state reaches the agent's body, which compresses it to a short briefing and asks the model what to do next. The model answers with a goal, such as gather_wood(10). The body then acts on the environment in a deterministic loop with no model involved, until the goal completes or fails, and consults the model again only on completion, failure or a significant event." />
        <p>
          Keep the model in the loop and the agent is slow, expensive and overtaken by events. Keep it out, and a team
          works through three simulated days on about a hundred decisions each. A new ability is a new tool, not more
          consulting of the model.
        </p>

        <h2>Three layers</h2>
        <dl className="layers">
          {LAYERS.map((l) => (
            <div key={l.name}>
              <dt>{l.name}</dt>
              <dd>{l.text}</dd>
            </div>
          ))}
        </dl>

        <h2>What an agent is given</h2>
        <dl className="layers">
          {GIVEN.map((g) => (
            <div key={g.what}>
              <dt>{g.what}</dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>

        <details className="more-detail">
          <summary>More detail: facts, not advice, and the reflexes</summary>
          <p>
            The harness adds facts, never suggestions. It says when an agent has made the same decision several times
            running, refuses a premature “done” once and says what is still missing (a false claim of success is itself
            counted), lets it give up with a reason, and, as its own condition, can list what the goal still lacks.
          </p>
          <p>
            A few reflexes are code, not the model’s choice, and cover only the seconds a decision takes: the body steps
            back from a monster within reach, backs away from a creeper, takes cover from an archer, and gets out of water
            or lava. Its next observation says what it did.
          </p>
        </details>
      </section>

      <section className="prose">
        <h2>Read further</h2>
        <ul>
          <li>
            <a href={HASH.method}>Method and limits</a>: how runs are done, measured and judged, and what the numbers
            can’t show.
          </li>
          <li>
            <a href={HASH.doc('skills')}>The skills</a>: each one, what it does and how it fails.
          </li>
          <li>
            <a href={HASH.doc('communication')}>How agents talk</a>: messages, requests and questions between teammates.
          </li>
        </ul>
      </section>
    </main>
  );
}
