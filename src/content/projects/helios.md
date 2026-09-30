---
title: Helios Event Platform
summary: Multi-tenant event-streaming backbone that moves 2B+ events/day between 40 services with exactly-once semantics and per-tenant isolation.
role: Lead architect · backend
year: 2025
status: production
category: platform
stack: [Go, Kafka, PostgreSQL, Kubernetes, gRPC, OpenTelemetry, Terraform]
metrics:
  - { label: events / day, value: '2.1B' }
  - { label: p99 publish, value: '11 ms' }
  - { label: availability, value: '99.97%' }
links:
  repo: https://github.com/lunaevolans
featured: true
order: 1
---

> Placeholder case study: replace it with your own. The shape is what matters: **problem → architecture → trade-offs → outcome**.

## Problem

Forty services were talking to each other through a tangle of synchronous REST calls and cron jobs. A slow downstream could take out checkout. Nobody could answer "what happened to order #123?" without grepping six log systems.

## Architecture

- **Ingress:** a thin Go gateway validates events against a schema registry (Protobuf) and stamps trace context.
- **Backbone:** Kafka with per-tenant topics and quotas. Idempotent producers and transactional outbox tables in Postgres give exactly-once delivery from the services' point of view.
- **Consumers:** a shared Go SDK handles retries with jittered backoff, dead-letter queues, and poison-pill quarantine.
- **Observability:** every hop emits OTel spans, so an order's lifecycle is one trace.

## Trade-offs

I chose Kafka over NATS JetStream for its ecosystem maturity and tiered storage, and accepted the operational weight by running it through Strimzi on Kubernetes with Terraform-managed node pools.

## Outcome

Checkout's dependency on synchronous calls fell from 9 services to 2. Incident MTTR dropped 63% because traces made cross-service failures obvious.
