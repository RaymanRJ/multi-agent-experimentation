# Team run quad1: success per condition

```
Goal      | Brain                            | Memory | Progress | Stance        | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
----------+----------------------------------+--------+----------+---------------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
team-camp | claude:claude-haiku-4-5          | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   5860 |         16 |   68976 |       4954 |    0.1054 |        0
team-camp | claude:claude-sonnet-5-5         | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   5880 |         16 |  134092 |       4839 |    0.1695 |        0
team-camp | gpt:gpt-6-luna                   | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   5640 |         10 |   32601 |       3046 |    0.0045 |        0
team-camp | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | collaborative | sandbox  |     1/1 | 21%-100% |   5500 |         21 |   72103 |       7986 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
