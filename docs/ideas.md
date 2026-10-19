# Ideas

Skills and changes that look worth having but aren't started. Each comes from something seen in the
logs. Move an item to `docs/next-steps.md` when it is picked up. As with every skill, the model would
choose it and deterministic code would do it.

## Skills

1. **`hunt` / `fight`: attack a mob or animal.** The biggest gap. Agents can't attack anything,
   so there is no food beyond what they start with and no defence but `flee`, and no wool without
   shears (a killed sheep drops 1). A creeper killed
   Sonnet in p2, and Haiku died at night; both might have gone differently. It would also let agents
   attack each other, which changes what the experiment allows: the owner decides whether it covers
   animals and hostile mobs only, or players too.
2. **`store` / `take`: use a chest.** Teams share only by `give`, which needs both agents in one
   place. A shared chest at camp would let them coordinate without meeting, and is a good team test.
3. **`farm`: plant and harvest wheat or carrots.** Only matters for runs of several days: in
   today's one-day outpost runs no agent's food fell below 15 of 20.
4. **`shear`: wool from a sheep, with shears** (crafted from 2 iron ingots, which agents can already
   mine and smelt). Wool is what beds need, so `sleep` is unusable without this or `hunt`. Agents also
   can't see animals yet: observations list only hostiles and players, so either skill needs that too.
5. **`light`: place torches.** Mobs spawn in the dark, including in an unlit shelter or mine.
   Cheap to build, but torches need coal, which ties it to `mine_ore`.
