# Team run trio3: success per condition

```
Goal      | Brain                            | Memory | Progress | Stance        | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
----------+----------------------------------+--------+----------+---------------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
team-camp | claude:claude-haiku-4-5          | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |  18980 |         63 |  318026 |       3295 |    0.4375 |        0
team-camp | claude:claude-sonnet-5-5         | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |  19120 |         36 |  382037 |       7618 |    0.8466 |        0
team-camp | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |  18720 |         76 |  263779 |       7461 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
