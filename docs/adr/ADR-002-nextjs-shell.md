# ADR-002: Next.js for Web Application Shell

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs a web application shell for:

- Authentication UI
- Payment processing
- Settings management
- PWA support
- Landing pages

## Decision

Use **Next.js (App Router)** as the web application framework.

## Rationale

1. **React ecosystem:** Large ecosystem, many libraries
2. **App Router:** Modern routing with server components
3. **SSR/SSG:** Good for landing pages, SEO
4. **PWA:** Good PWA support with next-pwa
5. **Deployment:** Easy deployment to Vercel
6. **TypeScript:** First-class support

## Consequences

- Game logic stays in NestJS (not Next.js)
- Next.js handles UI, not game rendering
- Server components for initial load performance
