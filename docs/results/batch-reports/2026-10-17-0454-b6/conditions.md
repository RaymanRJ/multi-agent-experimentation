# Batch b6: success per condition

```
Goal    | Brain                            | Memory | Progress | Stance  | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+----------------------------------+--------+----------+---------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
shelter | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | sandbox  |     2/3 |  21%-94% |   3930 |          6 |   17896 |       2638 |    0.0000 |        0
shelter | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | sandbox  |     1/3 |   6%-79% |   3660 |         21 |   56582 |       3418 |    0.0000 |        0
tools   | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | sandbox  |     3/3 | 44%-100% |   2520 |          7 |   14497 |       3001 |    0.0000 |        0
tools   | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | sandbox  |     0/3 |   0%-56% |      - |          - |   89146 |       3226 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
