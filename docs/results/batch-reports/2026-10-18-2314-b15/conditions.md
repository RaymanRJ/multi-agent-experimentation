# Batch b15: success per condition

```
Goal    | Brain                            | Memory | Progress | Stance  | Scenario | Success | 95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+----------------------------------+--------+----------+---------+----------+---------+--------+--------+------------+---------+------------+-----------+---------
outpost | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | survival |     0/3 | 0%-56% |      - |          - |  542606 |       4444 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | plan   | on       | neutral | survival |     0/3 | 0%-56% |      - |          - |  561125 |       4563 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
