# Batch p3: success per condition

```
Goal    | Brain                    | Memory | Progress | Stance  | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+--------------------------+--------+----------+---------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
outpost | claude:claude-haiku-4-5  | plan   | off      | neutral | survival |     1/2 |   9%-91% |  22600 |         37 |  165240 |       4056 |    0.4980 |        0
outpost | claude:claude-opus-5-5   | plan   | off      | neutral | survival |     0/0 |        - |      - |          - |       - |          - |    0.0000 |        1
outpost | claude:claude-sonnet-5-5 | plan   | off      | neutral | survival |     0/1 |   0%-79% |      - |          - |   67496 |       3400 |    0.0948 |        0
outpost | gpt:gpt-6-luna           | plan   | off      | neutral | survival |     1/1 | 21%-100% |  22300 |         40 |  106632 |       2992 |    0.0153 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
