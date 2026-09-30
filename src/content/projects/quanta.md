---
title: Quanta Forecasting
summary: Demand-forecasting pipeline for 18k SKUs. Gradient-boosted models plus hierarchical reconciliation, served as a dbt-native feature store.
role: Data scientist · ML engineer
year: 2024
status: production
category: data
stack: [Python, Polars, LightGBM, dbt, DuckDB, Dagster, MLflow]
metrics:
  - { label: WAPE improvement, value: '−22%' }
  - { label: SKUs forecast, value: '18k' }
  - { label: training time, value: '14 min' }
featured: true
order: 3
---

> Placeholder case study: replace it with your own.

## Problem

Planners were forecasting with spreadsheet moving averages, which led to chronic over-stock on long-tail items and stock-outs on promotions.

## Approach

1. **Features:** calendar, price elasticity, promo flags, and lagged demand, all computed in dbt on DuckDB and versioned with the model.
2. **Model:** a global LightGBM model across SKUs with a Tweedie objective for intermittent demand.
3. **Reconciliation:** MinT reconciliation keeps SKU → category → region forecasts coherent.
4. **Ops:** Dagster schedules the pipeline, MLflow tracks runs, and backtests gate every promotion to production.

## Outcome

WAPE improved 22% over baseline, which is worth roughly 4% of inventory carrying cost. See the forecast notebook in `~/lab`.
