# ADR-011: Capacitor for Native Packaging

**Status:** Accepted (Future)
**Date:** 2026-09-02

---

## Context

If native app features are needed (deep push notifications, background sync), Molemisi needs native packaging.

## Decision

Use **Capacitor** for native packaging when needed.

## Rationale

1. **Web-first:** Wraps existing web app, no rewrite
2. **Cross-platform:** iOS and Android from one codebase
3. **Progressive:** Can add native features incrementally
4. **Ionic ecosystem:** Good community and plugins

## Consequences

- PWA codebase becomes native app
- Native plugins for OS features
- App store submission required
- Two deployment paths (web + native)

## When to Use

- When iOS push notifications are required
- When background sync is needed
- When app store presence is desired
