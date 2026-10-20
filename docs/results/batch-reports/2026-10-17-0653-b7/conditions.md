# Batch b7: success per condition

```
Goal    | Brain                            | Memory | Progress | Stance  | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+----------------------------------+--------+----------+---------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
shelter | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | sandbox  |     3/3 | 44%-100% |   2160 |          3 |    6231 |       3028 |    0.0000 |        0
shelter | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | sandbox  |     3/3 | 44%-100% |   2080 |          7 |   13379 |       2917 |    0.0000 |        0
tools   | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | sandbox  |     3/3 | 44%-100% |   2120 |          7 |   19399 |       3108 |    0.0000 |        0
tools   | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | sandbox  |     0/3 |   0%-56% |      - |          - |   84635 |       3473 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
