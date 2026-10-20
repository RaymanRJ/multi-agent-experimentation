# Batch p5: success per condition

```
Goal    | Brain                    | Memory | Progress | Stance  | Scenario | Success |  95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+--------------------------+--------+----------+---------+----------+---------+---------+--------+------------+---------+------------+-----------+---------
outpost | claude:claude-haiku-4-5  | plan   | off      | neutral | survival |     0/3 |  0%-56% |      - |          - |  190219 |       4868 |    0.9575 |        0
outpost | claude:claude-opus-5-5   | plan   | off      | neutral | survival |     2/3 | 21%-94% |  22020 |         27 |  141290 |       3563 |    1.0038 |        0
outpost | claude:claude-sonnet-5-5 | plan   | off      | neutral | survival |     1/3 |  6%-79% |  22320 |         30 |  271723 |       2730 |    0.7208 |        0
outpost | gpt:gpt-6-luna           | plan   | off      | neutral | survival |     1/3 |  6%-79% |  22000 |         31 |  179027 |       2833 |    0.0658 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
