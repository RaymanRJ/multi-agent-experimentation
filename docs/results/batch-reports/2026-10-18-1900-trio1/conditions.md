# Team run trio1: success per condition

```
Goal      | Brain                            | Memory | Progress | Stance        | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
----------+----------------------------------+--------+----------+---------------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
team-camp | claude:claude-haiku-4-5          | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   8160 |          9 |   28596 |       2689 |    0.0396 |        0
team-camp | claude:claude-sonnet-5-5         | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   8100 |         13 |  112120 |       4667 |    0.2924 |        0
team-camp | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   8040 |         33 |  101603 |       6454 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
