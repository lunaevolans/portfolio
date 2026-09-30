---
title: What they don't tell you about forecasting in production
description: Backtests lie, hierarchies must add up, and the model is roughly 20% of the work. Notes from shipping a demand forecast for 18k SKUs.
date: 2025-11-20
tags: [data-science, ml, forecasting]
---

> Placeholder post: replace it with your own words.

## Backtests lie (unless you make them honest)

Use rolling-origin evaluation and include promotions you didn't know about at forecast time. If your backtest peeks at the future, production will humble you.

## Hierarchies must add up

Planners look at SKU, category, and region. If the three don't sum, nobody trusts any of them. Reconciliation (MinT) is cheap and wins trust.

## The model is roughly 20% of the work

The rest is feature freshness, monitoring for drift, explaining forecasts to humans, and the fallback when upstream data is late. Architect for the fallback first.
