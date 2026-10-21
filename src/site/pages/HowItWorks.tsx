import { HASH } from '../lib/route';

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
          The world runs twenty times a second; a model takes seconds to answer. So the model is never in
          the loop that moves the agent. It chooses a goal, such as <code>gather_wood(10)</code> or{' '}
          <code>build_shelter()</code>, and code in a skill library carries it out, retries, gives up when
          it must, and reports back what happened. The model then chooses again, on events (a goal done or
          failed, a monster close, night falling, a teammate's message), not on a timer.
        </p>

        <h2>What an agent is given</h2>
        <ul>
          <li>
            <strong>A goal</strong> that says what to achieve, not how: for a team, "build one large
            two-storey shelter that is home to all of you, every one of you must sleep in a bed inside it…".
          </li>
          <li>
            <strong>An observation</strong>, kept small: where it is, health and food, what it carries,
            things worth knowing nearby, monsters and teammates in sight, and what happened lately.
          </li>
          <li>
            <strong>25 skills</strong>, the only things it can do: gather, mine, craft, smelt, build a
            shelter, fight or flee, sleep, and hand things to, ask or tell teammates.
          </li>
        </ul>
        <p>
          A goal's requirements reach the agent the way they reach a player: through what the tools say
          and what fails, never through the goal text.
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
          Whether the goal was met, and how much of it; what each decision moved forward or set back; what
          broke an agent's work off and how soon it was back at it; what teammates gave, asked and told
          each other; and every token and dollar. Reports are built from the logs by code; write-ups are
          read from the logs by hand, and say what was measured, not what was hoped.
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
