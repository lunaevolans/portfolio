---
title: Behavioural customer segments
question: Which customer groups exist in our usage data, and do they deserve different onboarding?
method: UMAP projection of 38 behavioural features → HDBSCAN clustering, validated with silhouette + product interviews.
chart: clusters
stack: [scikit-learn, UMAP, HDBSCAN]
metrics:
  - { label: segments, value: '4' }
  - { label: silhouette, value: '0.61' }
order: 2
---

Four segments emerged: power users, collaborators, dormant trialists, and API-first integrators. The dormant trialists got a new onboarding flow, which lifted week-4 retention by 9 pts.
