---
title: Demand forecast with prediction intervals
question: How many units will SKU 4471 sell over the next 8 weeks, and how sure are we?
method: Global LightGBM (Tweedie) + conformal prediction intervals, rolling-origin backtest.
chart: forecast
stack: [Polars, LightGBM, MAPIE]
metrics:
  - { label: WAPE, value: '11.8%' }
  - { label: PI coverage (90%), value: '91.2%' }
order: 1
---

Actuals are shown in the foreground and the forecast is the dashed line. The shaded band is a split-conformal 90% interval, calibrated on the last 12 backtest folds. Coverage came in at 91.2%, so the intervals are honest.
