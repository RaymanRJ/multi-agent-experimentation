# Team run thome1: success per condition

```
Goal           | Brain                    | Memory | Progress | Stance        | Scenario | Success | 95% CI | Ticks* | Decisions* | TokenIn | Median(ms) | Cost(USD) | Excluded
---------------+--------------------------+--------+----------+---------------+----------+---------+--------+--------+------------+---------+------------+-----------+---------
team-homestead | claude:claude-opus-5-5   | plan   | off      | collaborative | survival |     0/3 | 0%-56% |      - |          - |  827064 |       5277 |    6.1746 |        0
team-homestead | claude:claude-sonnet-5-5 | plan   | off      | collaborative | survival |     0/3 | 0%-56% |      - |          - | 1146201 |       3569 |    3.2797 |        0
team-homestead | gpt:gpt-6-luna           | plan   | off      | collaborative | survival |     0/3 | 0%-56% |      - |          - |  535350 |       5174 |    0.2179 |        0

* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.
```
