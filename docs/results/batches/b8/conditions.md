# Batch b8: success per condition

```
Goal    | Brain                            | Memory | Progress | Stance  | Scenario | Success | 95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+----------------------------------+--------+----------+---------+----------+---------+--------+--------+------------+---------+------------+-----------+---------
outpost | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | survival |     0/3 | 0%-56% |      - |          - |  113292 |       4220 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | neutral | survival |     0/3 | 0%-56% |      - |          - |  186332 |       5033 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | survival |     0/3 | 0%-56% |      - |          - |  145013 |       3702 |    0.0000 |        0
outpost | scripted                         | -      | -        | -       | survival |     1/3 | 6%-79% |  22600 |         26 |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
