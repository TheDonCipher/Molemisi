# ADR-001: Phaser for 2D Game Rendering

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs a 2D rendering engine for the game client. The game requires:

- Pixel-art rendering
- Sprite animation
- Tilemap support
- Input handling (point-and-click/tap)
- Mobile performance
- TypeScript support

## Decision

Use **Phaser 3** as the 2D game rendering engine.

## Alternatives Considered

| Alternative   | Pros                                      | Cons                                        |
| ------------- | ----------------------------------------- | ------------------------------------------- |
| PixiJS        | Fast, lightweight                         | No game loop, no physics, less game-focused |
| Three.js      | Powerful                                  | Overkill for 2D, larger bundle              |
| Custom Canvas | Full control                              | High development cost                       |
| Unity WebGL   | Feature-rich                              | Heavy, licensing issues                     |
| Phaser 3      | Game-focused, TypeScript, large community | Moderate bundle size                        |

## Rationale

1. **Game-focused:** Phaser provides game loop, scene management, input, audio out of the box
2. **TypeScript:** First-class TypeScript support matches the project stack
3. **Pixel-art:** Built-in support for pixel-perfect rendering, no anti-aliasing
4. **Mobile:** Good mobile performance with WebGL/Canvas fallback
5. **Community:** Large community, extensive documentation, many examples
6. **2D only:** Phaser is designed specifically for 2D games

## Consequences

### Positive

- Rapid prototyping of game scenes
- Built-in scene management for farm, Kgotla, Bushveld
- Object pooling for performance
- Animation system for crops, animals, NPCs

### Negative

- Bundle size (~1MB) increases initial load
- Learning curve for developers unfamiliar with Phaser
- Limited to 2D (acceptable for Molemisi)

### Mitigations

- Lazy-load Phaser after initial app shell
- Use code splitting for Phaser scenes
- Provide Phaser learning resources in Agent Implementation Guide
