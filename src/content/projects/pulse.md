---
title: Pulse SLO
summary: SLO toolkit in Rust. It compiles SLO specs into Prometheus recording rules and multi-window burn-rate alerts, and ships a TUI for error budgets.
role: Creator
year: 2023
status: active
category: tooling
stack: [Rust, Prometheus, OpenTelemetry, ratatui, YAML]
metrics:
  - { label: alert noise, value: '−71%' }
  - { label: services onboarded, value: '35' }
links:
  repo: https://github.com/lunaevolans
featured: false
order: 5
---

> Placeholder: replace it with your own.

Pulse takes a declarative SLO spec (for example, "99.9% of checkout requests under 300 ms over 28 days") and generates the recording rules and Google-SRE-style multi-window, multi-burn-rate alerts. Teams stopped hand-writing PromQL, and pager noise fell by 71%.
