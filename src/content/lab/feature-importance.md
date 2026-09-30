---
title: What actually drives churn?
question: Which signals does the churn model rely on, and do they make sense to humans?
method: Mean |SHAP| over the holdout set, sanity-checked with permutation importance.
chart: importance
stack: [SHAP, pandas]
metrics:
  - { label: top-3 share, value: '58%' }
order: 4
---

Seat utilisation and collaborative actions dominate. Raw login counts matter far less than intuition suggested, which changed what CS monitors.
