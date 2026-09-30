---
title: Tessera Analytics
summary: Real-time analytics workspace with sub-second queries over 30 days of raw events. Typed end to end, from ClickHouse schema to React components.
role: Full-stack lead
year: 2024
status: production
category: fullstack
stack: [TypeScript, React, tRPC, ClickHouse, WebSockets, Tailwind, Playwright]
metrics:
  - { label: median query, value: '240 ms' }
  - { label: weekly users, value: '3.4k' }
  - { label: Lighthouse, value: '98' }
links:
  repo: https://github.com/lunaevolans
featured: true
order: 2
---

> Placeholder case study: replace it with your own.

## Problem

Product teams waited a day for batch dashboards and exported CSVs to answer simple questions.

## Architecture

- **Storage:** ClickHouse with materialised views for the hot aggregations and TTL-based roll-ups for older data.
- **API:** tRPC procedures generated from a query DSL. The same Zod schema validates inputs on the server and powers the query builder UI.
- **Live tiles:** a WebSocket fan-out service pushes incremental aggregates, so dashboards tick without polling.
- **Frontend:** React with virtualised tables, a canvas-based chart layer, and URL-serialised state, so every view is shareable.

## Outcome

Time from question to answer went from hours to seconds. The query builder replaced about 70% of ad-hoc SQL requests to the data team.
