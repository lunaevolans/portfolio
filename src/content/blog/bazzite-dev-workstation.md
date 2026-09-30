---
title: Bazzite as a dev workstation (yes, really)
description: Why a gaming-focused Fedora Atomic image turned out to be the best developer desktop I've used. Covers distrobox, rpm-ostree layering, and staying immutable.
date: 2026-08-14
tags: [linux, bazzite, workflow]
---

> Placeholder post: replace it with your own words.

Bazzite is a Fedora Atomic image built for gaming. It is also a great developer workstation, for one reason: **the base system is an image, not a pile of state.**

## The setup

- **Host:** stock Bazzite with a handful of layered packages (`rpm-ostree install` for things that need host access).
- **Dev boxes:** `distrobox` containers per toolchain. Each is disposable and gets recreated from an `assemble` file.
- **User tools:** Nix + home-manager for CLI tools that need exact versions.

## Why it works

Updates are atomic and roll back with one reboot. When a GPU driver update breaks something, I pick the previous deployment in GRUB and move on. Since switching I've had zero "my laptop is broken, cancel the afternoon" incidents.

```bash
ujust setup-distrobox-app
distrobox assemble create --file ~/.config/distrobox/dev.ini
```

## Caveats

Some tools still assume a mutable `/usr`. Toolbx/distrobox covers 95% of them, and the remaining 5% get a tiny layered RPM.
