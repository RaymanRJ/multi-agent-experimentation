# Batch b4: success per condition

```
Goal         | Brain                            | Memory | Progress | Stance | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
-------------+----------------------------------+--------+----------+--------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
tools-guided | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1160 |          4 |    6760 |       2936 |    0.0000 |        0
tools-guided | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | legacy | sandbox  |     3/3 | 44%-100% |   2380 |          7 |    8598 |       4331 |    0.0000 |        0
tools-guided | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | legacy | sandbox  |     2/3 |  21%-94% |   2490 |         13 |   21362 |       3447 |    0.0000 |        0
tools-guided | scripted                         | -      | -        | -      | sandbox  |     3/3 | 44%-100% |   1360 |          4 |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
