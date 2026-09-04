# Document 03: UI/UX Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## Table of Contents

1. [UX Principles](#1-ux-principles)
2. [Information Hierarchy](#2-information-hierarchy)
3. [Navigation](#3-navigation)
4. [Farm Screen](#4-farm-screen)
5. [Contextual Interactions](#5-contextual-interactions)
6. [Mobile Interface](#6-mobile-interface)
7. [Desktop Interface](#7-desktop-interface)
8. [Tablet Interface](#8-tablet-interface)
9. [Bottom Navigation](#9-bottom-navigation)
10. [Modals and Sheets](#10-modals-and-sheets)
11. [Tooltips](#11-tooltips)
12. [Notifications](#12-notifications)
13. [Attention System](#13-attention-system)
14. [Onboarding](#14-onboarding)
15. [Settings](#15-settings)
16. [Accessibility](#16-accessibility)
17. [Error States](#17-error-states)
18. [Loading States](#18-loading-states)
19. [Empty States](#19-empty-states)
20. [Screen Specifications](#20-screen-specifications)

---

## 1. UX Principles

**NFR-UX-001**

### Core Principles

1. **Farm First** — The farm/world view is always the primary visual. Menus and UI are overlays, not replacements.

2. **Tap to Act** — Every action is achievable through a single tap/click. No multi-step gestures required for core actions.

3. **Progressive Disclosure** — Show only what's needed now. Complexity is revealed gradually as the player advances.

4. **Immediate Feedback** — Every action produces visible, audible, or textual feedback within 100ms.

5. **Forgiving Design** — No irreversible actions without confirmation. No punishment for exploration.

6. **Respectful Interruption** — Notifications and alerts appear only when the player's attention is genuinely needed.

7. **Cozy Aesthetic** — Every UI element should feel warm, inviting, and pixel-art consistent.

8. **Mobile Priority** — Design for thumb-reach on mobile first, then enhance for larger screens.

---

## 2. Information Hierarchy

**NFR-UX-002**

### Primary Information (Always Visible)

- Farm state (crops, animals, buildings)
- Currency balance
- Time/weather indicator
- Active notifications count

### Secondary Information (One Tap Away)

- Inventory contents
- Market prices
- Active contracts
- Building status

### Tertiary Information (Two Taps Away)

- Detailed crop stats
- Animal health details
- Production queue status
- Kgotla reputation levels

### Quaternary Information (Menu/Navigational)

- Settings
- Achievement progress
- Skill trees
- History/logs

---

## 3. Navigation

**NFR-UX-003**

### Navigation Model

Molemisi uses a **context-based navigation** model rather than a traditional page-based model.

The game world (farm, Kgotla, Bushveld) is the primary navigation context. UI elements overlay on top of this world view.

```
┌─────────────────────────────────────────────┐
│                  HUD Layer                   │
│  ┌─────┐                    ┌─────────────┐ │
│  │Menu │                    │ Currency    │ │
│  │  ☰  │                    │ 💰 1,234 P  │ │
│  └─────┘                    └─────────────┘ │
│                                              │
│                                              │
│              ┌─────────────┐                 │
│              │  GAME WORLD │                 │
│              │  (Phaser)   │                 │
│              │             │                 │
│              │  Farm View  │                 │
│              │             │                 │
│              └─────────────┘                 │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  Bottom Navigation Bar                  │ │
│  │  🏠 Farm | 🏘 Kgotla | 🌿 Bush | 📦 Bag │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Navigation Contexts

| Context   | Primary View                   | Available Actions                  |
| --------- | ------------------------------ | ---------------------------------- |
| Farm      | Farm plots, buildings, animals | Plant, water, harvest, feed, build |
| Kgotla    | Kgotla square, NPCs            | Talk, quest, donate, community     |
| Bushveld  | Exploration zones              | Explore, gather, discover          |
| Market    | Market stalls, trading         | Buy, sell, contracts               |
| Inventory | Item grid                      | Use, sell, organize                |
| Settings  | Settings panels                | Configure                          |

### Navigation Transitions

When switching between contexts:

1. Current context fades out (200ms)
2. Loading indicator appears if needed (0-500ms)
3. New context fades in (200ms)
4. HUD elements update to reflect new context

---

## 4. Farm Screen

**NFR-UX-004**

### Farm Screen Layout

The farm screen is the primary game view. It displays the player's farm as a 2D pixel-art scene.

```
┌─────────────────────────────────────────────┐
│  ┌────┐  ┌────────────┐  ┌──────────────┐  │
│  │ ☰  │  │ Day 42 ☀️  │  │ 💰 1,234 P   │  │
│  └────┘  │ Spring     │  └──────────────┘  │
│          └────────────┘                      │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │            FARM SCENE                   │ │
│  │                                         │ │
│  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐         │ │
│  │   │ 🌱 │ │ 🌾 │ │    │ │ 🌻 │         │ │
│  │   │Plot│ │Plot│ │Plot│ │Plot│         │ │
│  │   │ 1  │ │ 2  │ │ 3  │ │ 4  │         │ │
│  │   └────┘ └────┘ └────┘ └────┘         │ │
│  │                                         │ │
│  │   ┌──────────┐    ┌──────────┐         │ │
│  │   │  🏠 Well │    │ 🐔 Coop  │         │ │
│  │   └──────────┘    └──────────┘         │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  🏠    🏘️    🌿    📦    ⚙️            │ │
│  │  Farm  Kgotla Bush  Bag   Settings      │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Farm Screen Components

| Component            | Position      | Purpose                 |
| -------------------- | ------------- | ----------------------- |
| Menu button          | Top-left      | Opens main menu         |
| Day/Season indicator | Top-center    | Shows current game time |
| Currency display     | Top-right     | Shows Pula balance      |
| Farm scene           | Center (main) | Interactive farm view   |
| Bottom navigation    | Bottom        | Context switching       |

### Farm Scene Interaction

**Clicking/Tapping a plot:**

1. Plot highlights with a subtle glow
2. Context menu appears with available actions
3. If crop is present: shows crop info tooltip
4. Action buttons appear below the plot

**Clicking/Tapping a building:**

1. Building highlights
2. Building name and level appear
3. Action options: Enter, Upgrade, Status
4. Building-specific menu opens

**Clicking/Tapping an animal:**

1. Animal highlights
2. Animal name and status appear
3. Action options: Feed, Collect, Pet
4. Animal-specific menu opens

---

## 5. Contextual Interactions

**NFR-UX-005**

### Context Menu System

When a player selects an element on the farm, a contextual action menu appears.

**Context menu rules:**

- Maximum 4 actions displayed at once
- Actions are ordered by priority (most common first)
- Disabled actions are shown but greyed out with reason
- Long-press on mobile shows detailed tooltip
- Context menu appears within 100ms of selection
- Context menu is positioned to not obscure the selected element

### Action Confirmation

**Non-destructive actions (no confirmation):**

- Water crop
- Feed animal
- Collect product
- Pet animal
- View building status

**Destructive actions (confirmation required):**

- Harvest crop (irreversible)
- Sell item (irreversible)
- Construct building (costs resources)
- Upgrade building (costs resources)
- Accept contract (binding)

**Confirmation dialog:**

```
┌─────────────────────────────┐
│  Harvest Sorghum?           │
│                             │
│  You will receive:          │
│  • 4x Sorghum (Normal)     │
│  • 10 XP                   │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │  Cancel   │ │ Harvest  │ │
│  └──────────┘ └──────────┘ │
└─────────────────────────────┘
```

### Drag and Drop

**Not supported.** All interactions are point-and-click / tap. This ensures mobile compatibility and simplicity.

---

## 6. Mobile Interface

**NFR-UX-006**

### Mobile Layout (Portrait)

```
┌──────────────────────┐
│ ☰          Day 42 ☀️ │
│              💰 1234  │
│                      │
│  ┌────────────────┐  │
│  │                │  │
│  │   FARM SCENE   │  │
│  │                │  │
│  │  (scrollable)  │  │
│  │                │  │
│  └────────────────┘  │
│                      │
│ ┌──────────────────┐ │
│ │ Context Actions  │ │
│ │ [Water] [Harvest]│ │
│ └──────────────────┘ │
│                      │
│ 🏠  🏘️  🌿  📦  ⚙️  │
└──────────────────────┘
```

### Mobile-Specific Behaviors

| Behavior      | Implementation                               |
| ------------- | -------------------------------------------- |
| Touch targets | Minimum 44x44px                              |
| Scroll        | Vertical scroll for farm view                |
| Pinch zoom    | Optional, disabled by default                |
| Tap           | Primary interaction                          |
| Long press    | Shows detailed tooltip (500ms hold)          |
| Swipe         | Context switching (left/right)               |
| Bottom nav    | Fixed, always accessible                     |
| Keyboard      | Hidden by default, shown for text input only |

### Mobile Performance

- Target: 60fps on mid-range devices (2022+)
- Sprite count limit: 200 visible at once
- Particle limit: 50 active particles
- Texture memory: < 100MB
- Initial load: < 3 seconds on 4G

---

## 7. Desktop Interface

**NFR-UX-007**

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ☰ Molemisi           Day 42 Spring ☀️    💰 1,234 P      │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                    FARM SCENE                        │  │
│  │                                                      │  │
│  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │
│  │   │    │ │    │ │    │ │    │ │    │ │    │       │  │
│  │   │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │ │ 6  │       │  │
│  │   └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │  │
│  │                                                      │  │
│  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │
│  │   │    │ │    │ │    │ │    │ │    │ │    │       │  │
│  │   │ 7  │ │ 8  │ │ 9  │ │ 10 │ │ 11 │ │ 12 │       │  │
│  │   └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │  │
│  │                                                      │  │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │   │   Well   │ │   Coop   │ │   Barn   │           │  │
│  │   └──────────┘ └──────────┘ └──────────┘           │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 🏠 Farm  │ │ 🏘 Kgotla│ │ 🌿 Bush  │ │ 📦 Bag   │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Desktop-Specific Behaviors

| Behavior           | Implementation                    |
| ------------------ | --------------------------------- |
| Mouse hover        | Shows element info tooltip        |
| Click              | Primary interaction               |
| Right-click        | Context menu (same as mobile tap) |
| Scroll wheel       | Zoom in/out on farm scene         |
| Keyboard shortcuts | See keyboard shortcuts section    |
| Sidebar            | Optional info panel (toggleable)  |
| Window resize      | Responsive scaling                |

### Keyboard Shortcuts

| Shortcut | Action                        |
| -------- | ----------------------------- |
| `Space`  | Pause/unpause time            |
| `M`      | Open market                   |
| `I`      | Open inventory                |
| `B`      | Open build menu               |
| `K`      | Go to Kgotla                  |
| `X`      | Go to Bushveld                |
| `Esc`    | Close current menu / deselect |
| `1-9`    | Quick select plot 1-9         |
| `F1`     | Help                          |

---

## 8. Tablet Interface

**NFR-UX-008**

### Tablet Layout (Landscape)

Tablet uses the desktop layout with touch-optimized controls.

**Tablet-specific adjustments:**

- Touch targets increased to 48x48px
- Bottom navigation bar larger
- Context actions use bottom sheet instead of inline
- Sidebar available but hidden by default
- Pinch-to-zoom enabled by default

---

## 9. Bottom Navigation

**NFR-UX-009**

### Navigation Items

| Icon | Label    | Context          | Badge                     |
| ---- | -------- | ---------------- | ------------------------- |
| 🏠   | Farm     | Farm screen      | None                      |
| 🏘️   | Kgotla   | Kgotla screen    | Quest available indicator |
| 🌿   | Bush     | Bushveld screen  | Energy indicator          |
| 📦   | Bag      | Inventory screen | Item count                |
| ⚙️   | Settings | Settings screen  | None                      |

### Navigation Behavior

- **Active state:** Icon and label highlighted, slight scale up (1.1x)
- **Inactive state:** Icon and label at 60% opacity
- **Badge:** Red dot with count or indicator
- **Transition:** Cross-fade between contexts (200ms)
- **Haptic feedback:** Light vibration on tap (mobile, if supported)

### Navigation Constraints

- Cannot switch context during an active action (e.g., harvesting)
- Cannot switch context while a modal is open
- Navigation during loading shows loading state in new context

---

## 10. Modals and Sheets

**NFR-UX-010**

### Modal Types

**Full-screen modal:**

- Covers entire screen
- Used for: Settings, Market, Inventory
- Dismiss: Close button or swipe down (mobile)
- Background: Semi-transparent dark overlay

**Half-screen sheet:**

- Covers bottom 50% of screen
- Used for: Context menus, Quick actions
- Dismiss: Swipe down or tap outside
- Background: Semi-transparent dark overlay

**Dialog:**

- Small centered overlay (max 400px wide)
- Used for: Confirmations, errors, info
- Dismiss: Button or tap outside
- Background: Semi-transparent dark overlay

### Modal Stack Rules

- Maximum 2 modals stacked at once
- Deepest modal has highest z-index
- Back button (mobile) closes deepest modal
- Esc key (desktop) closes deepest modal

### Sheet Behavior (Mobile)

**Bottom sheet states:**

1. **Collapsed:** 80px height, shows handle
2. **Half-expanded:** 50% screen height
3. **Full-expanded:** 85% screen height

**Snap points:** Sheets snap to these positions
**Drag to dismiss:** Swipe down past 30% threshold

---

## 11. Tooltips

**NFR-UX-011**

### Tooltip Types

**Info tooltip:**

- Triggered by: Hover (desktop), long-press (mobile)
- Content: Name, description, stats
- Position: Adjacent to element
- Dismiss: Mouse move away / tap elsewhere

**Action tooltip:**

- Triggered by: Hover over action button
- Content: Action name, cost, result
- Position: Above or below button
- Dismiss: Mouse move away

**Error tooltip:**

- Triggered by: Failed action
- Content: Error reason, suggestion
- Position: Near the action that failed
- Dismiss: 3 seconds auto-dismiss or tap

### Tooltip Design

```
┌─────────────────────────┐
│ 🌾 Sorghum              │
│ Stage: Growing (2/4)    │
│ Hydration: 70%          │
│ Ready in: ~8 minutes    │
│                         │
│ Actions:                │
│ 💧 Water    🌾 Harvest  │
└─────────────────────────┘
```

---

## 12. Notifications

**NFR-UX-012**

### Notification Types

**Toast notifications:**

- Brief, non-blocking
- Auto-dismiss after 3 seconds
- Stack from top-right
- Max 3 visible at once

**Banner notifications:**

- Persistent until dismissed
- Used for: Important alerts, events
- Dismiss: Swipe right (mobile), close button (desktop)

**Push notifications (PWA):**

- Used for: Offline events (crop ready, animal hungry)
- Requires user permission
- Sent via web push API

### Notification Content

| Event             | Type   | Content                                |
| ----------------- | ------ | -------------------------------------- |
| Crop ready        | Toast  | "🌾 Your Sorghum is ready to harvest!" |
| Animal hungry     | Toast  | "🐔 Your chickens need feeding!"       |
| Contract deadline | Banner | "⚠️ Contract deadline in 2 hours!"     |
| Market event      | Banner | "📈 Drought! Grain prices rising!"     |
| Payment success   | Toast  | "✅ Payment of 500 P successful!"      |
| Level up          | Banner | "🎉 Farm Level 5! New items unlocked!" |

---

## 13. Attention System

**NFR-UX-013**

### Attention Indicators

The game uses visual indicators to draw attention to elements that need action.

**Pulse indicator:**

- Gentle pulsing glow on elements needing action
- Color: Gold for urgent, Blue for informational
- Stops when player interacts with the element

**Badge indicator:**

- Red dot on navigation items with pending actions
- Number badge for count of pending items

**Speech bubble:**

- NPCs with available quests show speech bubbles
- Animals with ready products show product icons

### Priority Queue

When multiple elements need attention:

1. **Critical:** Crop about to wither (red pulse)
2. **High:** Animal hungry (orange pulse)
3. **Medium:** Product ready to collect (blue pulse)
4. **Low:** Contract deadline approaching (grey pulse)

Only the highest-priority element pulses at once. Others show static indicators.

---

## 14. Onboarding

**NFR-UX-014**

### Onboarding Flow

**Step 1: Welcome**

- "Welcome to Molemisi!"
- Brief game concept
- "Let's start your farm"

**Step 2: First Plot**

- Highlight empty plot
- "Tap this plot to plant your first crop"
- Player taps plot → Seed selection opens

**Step 3: First Plant**

- Player selects Sorghum
- "Great! Now water your crop"
- Water button highlights

**Step 4: First Water**

- Player waters crop
- "Your crop will grow over time"
- Growth timer appears

**Step 5: Time Skip (optional)**

- "Want to see it grow? Let's fast-forward"
- Time accelerates for demonstration
- Crop reaches READY state

**Step 6: First Harvest**

- "Your Sorghum is ready! Tap to harvest"
- Player harvests
- "You earned 4 Sorghum and 10 XP!"

**Step 7: Market Introduction**

- "You can sell your harvest at the Market"
- Market navigation highlighted

**Step 8: Freedom**

- "Your farm is yours. Explore, grow, and build!"
- Onboarding complete

### Onboarding Rules

- Maximum 8 steps
- Each step has a Skip option
- Onboarding state is saved (can resume)
- Onboarding can be replayed from settings
- Tooltips remain available after onboarding

---

## 15. Settings

**NFR-UX-015**

### Settings Categories

**Audio:**

- Master volume: Slider (0-100%)
- Music volume: Slider (0-100%)
- SFX volume: Slider (0-100%)

**Graphics:**

- Particle effects: Toggle (on/off)
- Screen shake: Toggle (on/off)
- Pixel perfect rendering: Toggle (on/off)

**Gameplay:**

- Auto-collect: Toggle (on/off)
- Confirmation dialogs: Toggle (on/off)
- Tutorial hints: Toggle (on/off)

**Notifications:**

- Push notifications: Toggle (on/off)
- Crop ready: Toggle (on/off)
- Animal hungry: Toggle (on/off)
- Contract deadline: Toggle (on/off)

**Account:**

- Display name: Edit
- Email: Display only
- Password change: Action
- Delete account: Action (with confirmation)

**About:**

- Version: Display
- Credits: Display
- Terms of service: Link
- Privacy policy: Link

---

## 16. Accessibility

**NFR-UX-016**

### Accessibility Features

**Visual:**

- Color-blind mode: Adjusts color indicators to use patterns + colors
- High contrast mode: Increases contrast ratios
- Text scaling: Supports up to 200% text size
- Screen reader support: All interactive elements have ARIA labels

**Motor:**

- Large touch targets: Minimum 44x44px
- Hold duration: Configurable (0-1000ms)
- One-hand mode: All actions reachable with thumb

**Cognitive:**

- Simple language throughout
- Consistent navigation patterns
- Undo available for most actions
- Clear visual hierarchy

### ARIA Labels

All interactive elements must have:

```html
<button aria-label="Water this crop">💧</button>
<button aria-label="Harvest sorghum">🌾</button>
<div role="dialog" aria-labelledby="modal-title">...</div>
```

### Color Contrast

- Text on background: Minimum 4.5:1 ratio
- Interactive elements: Minimum 3:1 ratio against background
- Status indicators: Use both color AND shape/text

---

## 17. Error States

**NFR-UX-017**

### Error Display Rules

**Inline errors:**

- Appear near the element that caused the error
- Red text with error icon
- Auto-dismiss after 5 seconds or on next action

**Modal errors:**

- Used for critical errors (network failure, payment failure)
- Center of screen
- Clear description and action button

**Toast errors:**

- Non-critical errors
- Top-right corner
- Auto-dismiss after 5 seconds

### Error Messages

| Error              | Display                                                  | Action              |
| ------------------ | -------------------------------------------------------- | ------------------- |
| Network offline    | "📡 You're offline. Changes will sync when reconnected." | Retry button        |
| Insufficient funds | "💰 Not enough Pula. You need 50 more."                  | Go to market button |
| Plot occupied      | "🌱 This plot already has a crop."                       | Close               |
| Crop withered      | "🥀 This crop has withered. Clear the plot to replant."  | Clear plot button   |
| Animal sick        | "🤒 Your goat is sick. Buy medicine from the market."    | Go to market button |
| Server error       | "⚠️ Something went wrong. Please try again."             | Retry button        |
| Auth expired       | "🔒 Your session expired. Please log in again."          | Login button        |

---

## 18. Loading States

**NFR-UX-018**

### Loading Indicators

**Initial load:**

- Full-screen loading bar
- Pixel-art themed loading animation
- Progress percentage

**Context switch:**

- Skeleton screens matching new context layout
- Loading spinner in center of content area

**Action processing:**

- Button shows loading spinner
- Action text changes to "Processing..."
- Button disabled during processing

**Data fetch:**

- Skeleton screens for lists
- Shimmer effect on placeholder elements
- Content fades in when loaded

### Loading Time Targets

| Operation         | Target | Maximum |
| ----------------- | ------ | ------- |
| Initial page load | 1.5s   | 3s      |
| Asset loading     | 2s     | 5s      |
| API response      | 200ms  | 2s      |
| Context switch    | 100ms  | 500ms   |
| Action processing | 100ms  | 1s      |

---

## 19. Empty States

**NFR-UX-019**

### Empty State Designs

**Empty inventory:**

```
┌─────────────────────────┐
│                         │
│       📦                │
│                         │
│   Your bag is empty     │
│                         │
│   Harvest crops and     │
│   collect products      │
│   to fill your bag.     │
│                         │
│   [Go to Farm]          │
│                         │
└─────────────────────────┘
```

**No active contracts:**

```
┌─────────────────────────┐
│                         │
│       📋                │
│                         │
│   No active contracts   │
│                         │
│   Visit the Kgotla or   │
│   market to find work.  │
│                         │
│   [Visit Kgotla]        │
│   [Visit Market]        │
│                         │
└─────────────────────────┘
```

**No animals:**

```
┌─────────────────────────┐
│                         │
│       🐔                │
│                         │
│   No animals yet        │
│                         │
│   Buy chickens from     │
│   the market to start   │
│   raising livestock.     │
│                         │
│   [Visit Market]        │
│                         │
└─────────────────────────┘
```

### Empty State Rules

- Every empty state has an illustration (pixel art)
- Every empty state has a clear message
- Every empty state has at least one action button
- Empty states teach the player what to do next

---

## 20. Screen Specifications

### 20.1 Farm Screen

**Purpose:** Primary game view
**Components:** Farm plots, buildings, animals, HUD
**Interactions:** Tap to select, context menu for actions
**States:** Normal, selecting, acting, loading
**Mobile:** Scrollable vertical view
**Desktop:** Full scene with zoom
**Accessibility:** All elements ARIA labeled

### 20.2 Kgotla Screen

**Purpose:** Community hub
**Components:** NPCs, quest board, donation area, events
**Interactions:** Tap NPC to talk, accept quests
**States:** Normal, talking, quest active
**Mobile:** Scrollable scene
**Desktop:** Full scene with sidebar info
**Accessibility:** NPC descriptions available

### 20.3 Bushveld Screen

**Purpose:** Exploration area
**Components:** Zone map, resource nodes, exploration UI
**Interactions:** Tap zone to explore, gather resources
**States:** Normal, exploring, gathering
**Mobile:** Zone list with exploration button
**Desktop:** Map view with zones
**Accessibility:** Zone descriptions available

### 20.4 Market Screen

**Purpose:** Trading hub
**Components:** Buy panel, sell panel, contracts list, price display
**Interactions:** Tap to buy/sell, accept contracts
**States:** Normal, buying, selling, confirming
**Mobile:** Tabbed buy/sell view
**Desktop:** Side-by-side buy/sell panels
**Accessibility:** All prices clearly labeled

### 20.5 Inventory Screen

**Purpose:** Item management
**Components:** Item grid, item details, actions
**Interactions:** Tap item for details, actions
**States:** Normal, selecting, using
**Mobile:** Grid with bottom details
**Desktop:** Grid with sidebar details
**Accessibility:** Item descriptions available

### 20.6 Building Screen

**Purpose:** Building management
**Components:** Building grid, build menu, upgrade panel
**Interactions:** Tap building for details, build/upgrade
**States:** Normal, building, upgrading
**Mobile:** List view with details
**Desktop:** Grid with details panel
**Accessibility:** Building descriptions available

### 20.7 Settings Screen

**Purpose:** Configuration
**Components:** Settings categories, toggles, sliders
**Interactions:** Toggle, slider, text input
**States:** Normal, editing
**Mobile:** Full-screen list
**Desktop:** Panel view
**Accessibility:** All controls keyboard accessible

### 20.8 Profile Screen

**Purpose:** Player profile
**Components:** Avatar, stats, achievements, skill trees
**Interactions:** View stats, select achievements
**States:** Normal, viewing details
**Mobile:** Tabbed view
**Desktop:** Sidebar panel
**Accessibility:** Stats clearly labeled
