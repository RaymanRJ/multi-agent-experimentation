# Batch b11: success per condition

```
Goal | Brain                            | Memory | Progress | Stance  | Scenario | Success | 95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
-----+----------------------------------+--------+----------+---------+----------+---------+--------+--------+------------+---------+------------+-----------+---------
iron | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | neutral | sandbox  |     0/1 | 0%-79% |      - |          - |  104705 |       5425 |    0.0000 |        0
iron | scripted                         | -      | -        | -       | sandbox  |     0/1 | 0%-79% |      - |          - |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
