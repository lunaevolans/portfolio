---
title: atomic-dots
summary: Reproducible Bazzite / Fedora Atomic workstation. A custom OCI image, ujust recipes, and a Hyprland rice with seven hot-swappable palettes.
role: Author
year: 2025
status: active
category: tooling
stack: [Fedora Atomic, BlueBuild, Hyprland, Nix, Bash, GitHub Actions]
metrics:
  - { label: fresh install → ready, value: '11 min' }
  - { label: palettes, value: '7' }
links:
  repo: https://github.com/lunaevolans
featured: true
order: 4
---

> Placeholder: replace it with your real dotfiles repo.

## What it is

It is my workstation as code. A BlueBuild recipe layers dev tooling onto the Bazzite image, and CI builds and signs the image nightly. `rpm-ostree rebase` gets any machine to the same state.

## Highlights

- **Immutable base, mutable home:** the system is an OCI image, and user tools come from Nix + home-manager.
- **Palettes as data:** one TOML file of colours renders templates for Hyprland, Waybar, kitty, Neovim, and GTK. The same idea powers this website's theme switcher.
- **ujust recipes** for GPU passthrough VMs, distrobox dev boxes, and backups.
