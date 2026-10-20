# Batch b5: success per condition

```
Goal           | Brain                            | Memory | Progress | Stance | Scenario | Success |   95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
---------------+----------------------------------+--------+----------+--------+----------+---------+----------+--------+------------+---------+------------+-----------+---------
shelter        | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | legacy | sandbox  |     1/3 |   6%-79% |  11460 |         10 |   13785 |       2833 |    0.0000 |        0
shelter        | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1980 |          3 |    3451 |       4125 |    0.0000 |        0
shelter        | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | legacy | sandbox  |     3/3 | 44%-100% |   2200 |          5 |    6241 |       3058 |    0.0000 |        0
shelter        | scripted                         | -      | -        | -      | sandbox  |     3/3 | 44%-100% |   3020 |          6 |       0 |          1 |    0.0000 |        0
shelter-guided | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1900 |          2 |    2735 |       2809 |    0.0000 |        0
shelter-guided | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1960 |          3 |    3586 |       3684 |    0.0000 |        0
shelter-guided | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | legacy | sandbox  |     3/3 | 44%-100% |   1980 |          3 |    3781 |       2769 |    0.0000 |        0
shelter-guided | scripted                         | -      | -        | -      | sandbox  |     3/3 | 44%-100% |   3040 |          6 |       0 |          1 |    0.0000 |        0
tools          | ollama:qwen3-4b-instruct:ctx8192 | full   | off      | legacy | sandbox  |     3/3 | 44%-100% |   2520 |          9 |   21438 |       3007 |    0.0000 |        0
tools          | ollama:qwen3-4b-instruct:ctx8192 | none   | off      | legacy | sandbox  |     3/3 | 44%-100% |   2740 |         12 |   14722 |       4469 |    0.0000 |        0
tools          | ollama:qwen3-4b-instruct:ctx8192 | plan   | off      | legacy | sandbox  |     1/3 |   6%-79% |   9500 |         26 |   78047 |       3367 |    0.0000 |        0
tools          | scripted                         | -      | -        | -      | sandbox  |     3/3 | 44%-100% |   1860 |          4 |       0 |          1 |    0.0000 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
