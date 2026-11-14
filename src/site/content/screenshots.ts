import type { Figure } from '../lib/Screenshot';
import modelCall from '../assets/screenshots/minds-model-call.webp';
import run from '../assets/screenshots/minds-run.webp';
import timeline from '../assets/screenshots/minds-timeline.webp';
import building from '../assets/screenshots/world-building.webp';
import shelter from '../assets/screenshots/world-shelter.webp';

/**
 * The site's screenshots. The minds panel shows agent la of run tsol4, one of the ten runs of three GPT-6.1 Sol agents
 * on frozen code that all met the goal, read from its log; it was taken at twice screen size. The world is from a free
 * run of the scripted baseline in the same world (seed multiagent), taken at screen size by a spectator camera placed
 * for the pictures: the agents did what is shown, only the camera was placed. On How it works, Method and the
 * model case study; never the landing page.
 */
export const FIGURES = {
  decision: {
    shots: [
      {
        src: modelCall,
        width: 1348,
        height: 1558,
        density: 2,
        text: true,
        title: 'One decision',
        alt: 'The minds panel showing one model call. Sent to the model: the step, the scenario, the team’s goal, the agent’s position, health and food, how far underground it is, and an unfinished large shelter 23 blocks away. The model replied: the skill mine_ore with ore iron and count 11, its rationale, its plan, and a message to its teammate lc.',
      },
    ],
    caption:
      'One decision, as the log keeps it and the minds panel shows it. Above, what the agent’s body sent the model: the goal and a short account of its situation. Below, the model’s answer: one skill with its arguments, a reason, a plan and a message for a teammate. From a team of three GPT-6.1 Sol agents that met the whole goal (run tsol4).',
  },
  world: {
    shots: [
      {
        src: building,
        width: 1440,
        height: 810,
        density: 1,
        title: 'A shelter going up',
        alt: 'A clearing in a dark-oak forest: an agent stands inside a shelter whose plank walls are rising from the ground, beside a crafting table, and another agent stands by a tree. A lake shows at the edge.',
      },
      {
        src: shelter,
        width: 1140,
        height: 641,
        density: 1,
        title: 'The shelter finished',
        alt: 'A small shelter of dark-oak planks, half dug into the ground under a tree, with a crafting table in front and a lake behind.',
      },
    ],
    caption:
      'The world, from a camera placed in it for these pictures: a shelter going up beside a crafting table, with two of the agents at hand, and the shelter finished. These agents are the scripted baseline, which follows fixed rules with no model. Every run can also be watched live in a browser.',
  },
  run: {
    shots: [
      {
        src: run,
        width: 2240,
        height: 1696,
        density: 2,
        text: true,
        title: 'A run at a glance',
        alt: 'The minds panel’s summary of one agent’s run: goal met; the team’s goal; 75 decisions, 4 deaths, 35:38 of game time, a typical think time of 3.3 seconds, 515,867 tokens and $0.38; the four parts of the goal, each checked, with the step it was met at; and the deaths, newest first, with what caused each.',
      },
    ],
    caption:
      'One agent’s run in the minds panel, where every run is read: the goal and the step each part of it was met at; decisions, deaths, game time, think time, tokens and cost; and, below this, every decision with its reason. One of the three GPT-6.1 Sol agents in run tsol4.',
  },
  sizingIron: {
    shots: [
      {
        src: timeline,
        width: 1488,
        height: 1266,
        density: 2,
        text: true,
        title: 'Sizing its iron to the team',
        alt: 'Two decisions of one agent in the minds panel, newest first. Decision 6: mine ore, iron, count 11, aborted when a creeper came within 8 blocks, with its reason and plan, its teammates’ messages confirming their parts, and its own message to lc. Decision 5: mine ore, coal, count 8, which worked.',
      },
    ],
    caption:
      '“Mine the visible iron first; eleven ingots will cover three pickaxes and lc’s shears.” One Sol agent sizing its iron to the team, after its teammates confirmed their parts, one the home and the other the beds and the meat; a creeper then cut the mining short. Two of its decisions in the minds panel, newest first (run tsol4).',
  },
} satisfies Record<string, Figure>;
