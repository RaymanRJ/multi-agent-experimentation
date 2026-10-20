# Batch b1: success per condition

```
Goal           | Brain                    | Memory | Progress | Stance | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
---------------+--------------------------+--------+----------+--------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
shelter-guided | ollama:qwen3:4b-instruct | full   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1840 |          2 |    2670 |       3084 |    0.0000 |        0
shelter-guided | ollama:qwen3:4b-instruct | none   | off      | legacy | sandbox  |     3/3 | 44%-100% |   2040 |          3 |    3425 |       3496 |    0.0000 |        0
shelter-guided | ollama:qwen3:4b-instruct | plan   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1780 |          3 |    3628 |       2726 |    0.0000 |        0
shelter-guided | scripted                 | -      | -        | -      | sandbox  |     3/3 | 44%-100% |   5160 |         15 |       0 |          1 |    0.0000 |        0
tools-guided   | ollama:qwen3:4b-instruct | full   | off      | legacy | sandbox  |     2/3 |  21%-94% |   5520 |          5 |   11972 |       3330 |    0.0000 |        0
tools-guided   | ollama:qwen3:4b-instruct | none   | off      | legacy | sandbox  |     1/3 |   6%-79% |   8460 |         20 |   56180 |       4725 |    0.0000 |        0
tools-guided   | ollama:qwen3:4b-instruct | plan   | off      | legacy | sandbox  |     0/3 |   0%-56% |      - |          - |   84051 |       3572 |    0.0000 |        0
tools-guided   | scripted                 | -      | -        | -      | sandbox  |     3/3 | 44%-100% |   1900 |          6 |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
