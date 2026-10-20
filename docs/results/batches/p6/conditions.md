# Batch p6: success per condition

```
Goal    | Brain                    | Memory | Progress | Stance  | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+--------------------------+--------+----------+---------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
outpost | claude:claude-haiku-4-5  | plan   | off      | neutral | survival |     3/3 | 44%-100% |  22820 |         28 |  124644 |       3984 |    0.5238 |        0
outpost | claude:claude-opus-5-5   | plan   | off      | neutral | survival |     3/3 | 44%-100% |  22120 |         23 |  122904 |       3188 |    0.6764 |        0
outpost | claude:claude-sonnet-5-5 | plan   | off      | neutral | survival |     3/3 | 44%-100% |  22300 |         33 |  175361 |       2184 |    0.4325 |        0
outpost | gpt:gpt-6-luna           | plan   | off      | neutral | survival |     3/3 | 44%-100% |  22060 |         22 |   71443 |       3044 |    0.0263 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
