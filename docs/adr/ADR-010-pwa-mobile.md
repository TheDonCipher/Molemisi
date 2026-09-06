# ADR-010: PWA-First Mobile Strategy

**Status:** Accepted (minimal PWA)
**Date:** 2026-09-02
**As-built (2026-09-06):** `manifest.json` + `public/sw.js` (network-first, skips `/api/`). No next-pwa, no push.

---

## Context

Molemisi needs mobile support. The question is: native app, PWA, or both?

## Decision

Start with **PWA-first** approach, with native packaging (Capacitor) as a later option.

## Rationale

1. **Fastest to market:** No app store approval needed
2. **Cross-platform:** Works on iOS and Android
3. **Lower cost:** Single codebase
4. **Updateable:** Instant updates, no app store review
5. **Installable:** Can be installed on home screen

## Consequences

- Service worker for offline support
- Web push notifications
- Limited native features (no deep OS integration)
- App store submission possible later with Capacitor

## Future: Capacitor

If native features are needed (background sync, push notifications on iOS), Capacitor can wrap the PWA into a native app.
