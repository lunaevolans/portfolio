---
title: Churn risk classifier
question: Can we flag accounts likely to churn 30 days ahead, early enough for CS to act?
method: Gradient boosting on product-usage aggregates, class-weighted, with a threshold tuned on a cost matrix.
chart: roc
stack: [XGBoost, SHAP, dbt]
metrics:
  - { label: ROC AUC, value: '0.89' }
  - { label: recall @ 20% FPR, value: '0.81' }
order: 3
---

The ROC curve is compared against the baseline heuristic ("no login in 14 days"). The model catches about 30% more at-risk accounts at the same false-positive rate.
