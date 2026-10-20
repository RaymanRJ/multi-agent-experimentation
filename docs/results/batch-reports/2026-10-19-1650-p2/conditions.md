# Batch p2: success per condition

```
Goal    | Brain                    | Memory | Progress | Stance  | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+--------------------------+--------+----------+---------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
outpost | claude:claude-haiku-4-5  | plan   | off      | neutral | survival |     0/1 |   0%-79% |      - |          - |  199822 |       4101 |    0.3003 |        0
outpost | claude:claude-opus-5-5   | plan   | off      | neutral | survival |     1/1 | 21%-100% |  22240 |         32 |  144177 |       4184 |    0.3309 |        0
outpost | claude:claude-sonnet-5-5 | plan   | off      | neutral | survival |     1/1 | 21%-100% |  22080 |         48 |  215034 |       2480 |    0.2352 |        0
outpost | gpt:gpt-6-luna           | plan   | off      | neutral | survival |     1/1 | 21%-100% |  22060 |         44 |  118171 |       2993 |    0.0170 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
