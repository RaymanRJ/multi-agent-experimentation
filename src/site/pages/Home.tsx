import { useEffect, useState } from 'react';
import { FIGURES, HEADLINE } from '../content/headline';
import { CONTACT } from '../lib/contact';
import { LinkedInIcon, MailIcon } from '../lib/icons';
import { HREF } from '../lib/route';



const LESSONS = [
  {
    title: 'Most failures were in the tools, not the model',
    body: 'One tool reported “the animal got away” when it had in fact never left the building. The agents believed it, 208 times over two nights, and planned around a problem that wasn’t there. Fixing it, with three smaller tool fixes, took success from 2 in 6 to 8 in 10.',
    you: 'Audit what your agent’s tools report, not just what the agent decides. A misleading status costs more than a weak model.',
  },
  {
    title: 'Fix the structure first, then choose the model',
    body: 'Fixing the tools took a team of the smallest, cheapest model from under 1 in 3 to about half. Six more fixes, each checked, didn’t move it: what was left was its own judgement. A stronger model on the same structure succeeded 20 times in 20, at about $1 a success.',
    you: 'Spend on the structure first, and measure. When fixes stop moving the success rate, a short trial of a stronger model is cheaper than more tuning, and the structure you built still pays off.',
  },
  {
    title: 'Measure before you believe a number',
    body: 'Six sets of ten runs of the cheapest model, on nearly the same code, scored between 4 and 8. A streak of five straight successes came inside a set that scored 7. Every claim here is checked against the logged runs.',
    you: 'Know your real success rate on frozen code before you ship, and keep cost per success visible.',
  },
  {
    title: 'Agents coordinate, but asking beats telling',
    body: 'The agents split the work among themselves within their first few steps. Questions between them were answered about 7 times in 10; instructions were acted on fewer than 2 times in 10.',
    you: 'Design hand-offs between agents, or between agents and people, as clear requests with an owner.',
  },
];

const STEPS = [
  { title: 'Define the goal and the bar', body: 'An outcome to reach, not steps to follow, and the success rate and cost that would make it worth deploying.' },
  { title: 'Run it and log every decision', body: 'What each agent was told, what it chose and why, and what really happened.' },
  { title: 'Sort every failure', body: 'A tool that failed or misled, information the agent lacked, or its own judgement. Fix the first two, checked in the real environment.' },
  { title: 'Measure again, on frozen code', body: 'Report the success rate and the cost per success, honestly, before calling it done.' },
];

export function Home({ section }: { section?: string }) {
  // One figure's explanation open at a time, in place: tapping a number shouldn't take a reader off the page.
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [section]);

  return (
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">AI agents that deliver</p>
        <h1>Give three AI agents a goal, not instructions.</h1>
        <p className="lede strong">They plan, divide the work and finish the job: {HEADLINE.successRate} runs, at about {HEADLINE.costPerSuccess} a success.</p>
        <p className="lede">
          I build the structure around AI models: the tools they use, what they are told and how they are measured.
          That structure is what turns a model into an agent a business can rely on.
        </p>
        <div className="actions">
          <a className="button primary" href={HREF.contact}>
            Get in touch
          </a>
          <a className="button" href={HREF.deep}>
            The technical detail
          </a>
        </div>
      </section>

      <section aria-label="Results">
        <div className="figures">
          {FIGURES.map((f, i) => (
            <div className={`figure${open === i ? ' open' : ''}`} key={f.label}>
              <button type="button" aria-expanded={open === i} aria-controls={`figure-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                <strong>{f.value}</strong>
                <span>{f.label}</span>
                <span className="figure-more" aria-hidden="true">{open === i ? 'Less' : 'How we know'}</span>
              </button>
              {/* Always in the page, hidden until opened, so the reason for each figure is in the pre-rendered HTML. */}
              <div className="figure-detail" id={`figure-${i}`} hidden={open !== i}>
                <p>{f.detail}</p>
                <a href={f.href}>Full technical write-up →</a>
              </div>
            </div>
          ))}
        </div>
        <p className="fineprint">
        Figures as of {HEADLINE.asOf}. Model costs only, at the provider’s billed rates. One demanding goal, measured over many runs: twenty runs on one
        version of the code, all twenty successful.
        </p>
      </section>


      <section>
        <h2 className="section-title">What this means for your company</h2>
        <div className="lessons-grid">
          {LESSONS.map((l) => (
            <article className="card" key={l.title}>
              <h3>{l.title}</h3>
              <p>{l.body}</p>
              <p className="you">
                <span>For your team</span>
                {l.you}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">How I’d approach your agents</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-n">{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="muted">
          The same loop that took these agents from under 1 in 3 to 20 in 20 applies to support desks, operations,
          internal tools, or any work you want agents to carry on their own.
        </p>
      </section>

      <section className="task">
        <h2 className="section-title">The task</h2>
        <p>
          Three agents share one goal over three simulated days: build a base that houses all of them, give each a
          place to sleep in it, equip each one with a tool that has to be found, refined and made, and leave a stock
          of food. Nobody tells them who does what, or how. They plan, split the work, talk to each other, and recover
          when things go wrong: a teammate lost, supplies gone, the plan blocked.
        </p>
        <p className="muted">
          The proving ground is Minecraft: a shared world where every step an agent takes can be watched, measured and
          replayed. The game isn’t the point. It is a demanding, observable stand-in for real multi-step work, and the
          models already know it, so nothing here is trained or coached.
        </p>
      </section>

      <section className="contact" id="contact">
        <h2 className="section-title">Let’s talk</h2>
        <p>
          I work on AI engineering, technical leadership and AI consulting. If you are building agents, or deciding
          whether to, I’d be glad to hear about it.
        </p>
        <div className="contact-links">
          <a className="button primary" href={`mailto:${CONTACT.email}`}>
            <MailIcon />
            {CONTACT.email}
          </a>
          <a className="button" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
            <LinkedInIcon />
            LinkedIn
          </a>
          <a className="button" href={CONTACT.website} target="_blank" rel="noreferrer">
            rrjamal.ca
          </a>
        </div>
      </section>

      <section className="deep-cta">
        <div>
          <strong>Want the technical detail?</strong>
          <p>Architecture, every run and its logs, the failure analysis, and what didn’t work.</p>
        </div>
        <a className="button" href={HREF.deep}>
          The technical deep dive →
        </a>
      </section>
    </main>
  );
}
