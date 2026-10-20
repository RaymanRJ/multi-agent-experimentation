# Team run trio2: success per condition

```
Goal      | Brain                            | Memory | Progress | Stance        | Scenario | Success | 95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
----------+----------------------------------+--------+----------+---------------+----------+---------+--------+--------+------------+---------+------------+-----------+---------
team-camp | claude:claude-haiku-4-5          | plan   | off      | collaborative | sandbox  |     0/1 | 0%-79% |      - |          - |  180070 |       3444 |    0.2537 |        0
team-camp | claude:claude-sonnet-5-5         | plan   | off      | collaborative | sandbox  |     0/1 | 0%-79% |      - |          - |  117048 |       4600 |    0.1557 |        0
team-camp | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | collaborative | sandbox  |     0/1 | 0%-79% |      - |          - |  162624 |       6410 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
