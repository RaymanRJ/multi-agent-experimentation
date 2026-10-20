# Batch b12: success per condition

```
Goal    | Brain                            | Memory | Progress | Stance  | Scenario | Success | 95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
--------+----------------------------------+--------+----------+---------+----------+---------+--------+--------+------------+---------+------------+-----------+---------
outpost | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | neutral | survival |     0/3 | 0%-56% |      - |          - |  179636 |      21190 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | full   | on       | neutral | survival |     0/3 | 0%-56% |      - |          - |   96353 |       4837 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | neutral | survival |     0/3 | 0%-56% |      - |          - |  211261 |       5740 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | none   | on       | neutral | survival |     1/3 | 6%-79% |  21960 |         70 |  149542 |       4678 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | neutral | survival |     1/3 | 6%-79% |  22260 |         66 |  141984 |       3900 |    0.0000 |        0
outpost | ollama:qwen3-4b-instruct:ctx8192 | plan   | on       | neutral | survival |     1/3 | 6%-79% |  22260 |         52 |  285272 |       4105 |    0.0000 |        0
outpost | scripted                         | -      | -        | -       | survival |     1/3 | 6%-79% |  22400 |         83 |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
