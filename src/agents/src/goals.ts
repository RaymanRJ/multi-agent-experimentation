/**
 * Preset goals for `--goal <name>`. The scenario sets the world rules; the goal
 * sets what the agents are asked to do, so any goal works in either scenario.
 *
 * Plain presets state only the outcome: working out the steps is part of what is being
 * measured, and what the game requires reaches the model the way it would reach a player,
 * through skill descriptions, failure messages and `canCraft`. Each `-guided` variant spells
 * the steps out, so the gap between the two measures how much a model needs that help.
 * The guided texts are exactly the earlier plain ones, so older logs report as guided.
 */
export const GOALS: Record<string, string> = {
  shelter: "Build a shelter. Once it is built, end the episode.",
  "shelter-guided":
    "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). " +
    "If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. " +
    "Once it is built, end the episode.",
  tools: "Craft a stone pickaxe. Once you have it, end the episode.",
  "tools-guided":
    "Craft a stone pickaxe. Check your inventory and do the first step you have not done yet: " +
    "gather a few logs, craft a wooden_pickaxe, mine 3 stone, craft a stone_pickaxe. Once you have it, end the episode.",
  outpost:
    "Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. " +
    "Then survive the night. The episode ends by itself at sunrise once you have all of that.",
  // A team goal: met by what the agents hold between them, so it pays to split the work and hand things over.
  "team-camp":
    "Between you, your team must end up holding a stone pickaxe, a stone axe, a stone sword and a stone shovel, " +
    "with every member carrying at least one of them, and one of you must build a two-storey shelter. " +
    "It does not matter who builds. The episode ends by itself once the team has all of that.",
  // The hard team goal (docs/ideas.md): three days, with steps that depend on each other (iron for shears
  // for wool for beds), food to find and cook, and a chest to share through.
  "team-homestead":
    "Over the next three days, your team must build a two-storey shelter, every one of you must sleep in a bed, " +
    "every one of you must end up carrying an iron pickaxe, and you must leave at least 10 cooked meat in a chest. " +
    "It does not matter who does what. The episode ends by itself once the team has all of that.",
  // team-homestead with one home: in thome1 three agents built 36 huts between them and the night never
  // passed, since the night skips only when every player is asleep.
  "team-base":
    "Over the next three days, your team must build one large two-storey shelter that is home to all of you, " +
    "every one of you must sleep in a bed inside it, every one of you must end up carrying an iron pickaxe, " +
    "and you must leave at least 10 cooked meat in a chest. It does not matter who does what. " +
    "The episode ends by itself once the team has all of that.",
  iron: "Craft an iron pickaxe. Once you have it, end the episode.",
  diamond: "Make a piece of diamond armor. Once you have it, end the episode.",
  gather: "Gather as much wood and stone as you can.",
  explore: "Explore as far as you can, and gather anything useful you find on the way.",
};

/**
 * Goals judged on the whole team: the check sees every member's inventory added together, each
 * member's own inventory, and a shelter built by any of them. Alone, an agent is a team of one.
 */
export const TEAM_GOALS = new Set(["team-camp", "team-homestead", "team-base"]);
