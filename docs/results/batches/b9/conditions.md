# Batch b9: success per condition

```
Goal    | Brain                            | Memory | Progress | Stance  | Scenario | Success |  95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+----------------------------------+--------+----------+---------+----------+---------+---------+--------+------------+---------+------------+-----------+---------
outpost | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | survival |     0/3 |  0%-56% |      - |          - |  258296 |      21547 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | neutral | survival |     1/3 |  6%-79% |  26220 |         62 |  165929 |       5062 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | survival |     0/3 |  0%-56% |      - |          - |  298657 |       3809 |    0.0000 |        0
outpost | scripted                         | -      | -        | -       | survival |     2/3 | 21%-94% |  22380 |         53 |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
