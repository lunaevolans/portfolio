---
title: Make event-driven systems boring
description: The outbox pattern, idempotency keys and one trace per business transaction. These are the three habits that made our event platform uneventful.
date: 2026-05-02
tags: [architecture, distributed-systems]
---

> Placeholder post: replace it with your own words.

Event-driven architecture has a reputation for turning simple bugs into murder mysteries. It doesn't have to. Three habits made ours boring, in the good way.

## 1. Transactional outbox, always

Never "write to the DB, then publish". Write the event to an `outbox` table in the **same transaction**, and let a relay publish it. The dual-write problem disappears.

## 2. Idempotency is a consumer's job

Every event carries a stable ID. Consumers record processed IDs next to their state change, in one transaction, so that replays are safe.

## 3. One trace per business transaction

Propagate W3C trace context through message headers. When something goes wrong, you open one trace instead of six log tabs.

The architecture diagram on the desktop (`~/architecture`) shows how these pieces fit together.
