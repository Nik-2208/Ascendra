# Ascendra Codebase Engineering Handbook
*An Architectural Blueprint and Systems Explanation Guide*

---

## 1. Project Overview & Design Philosophy

ASCENDRA is a gamified self-improvement platform built using a modern fullstack architecture. It is designed to transform real-world habits, study, focus, and productivity into RPG-style character progression. By completing tasks, users damage realm bosses, gain XP, earn Gold coins, unlock regions on a World Map, build villages, acquire loot items, hatch pets, and progress through campaigns.

```
+-------------------------------------------------------------+
|                         CLIENT UI                           |
|  (World Map, Boss Arena, Dashboard, Village, Achievements)  |
+-------------------------------------------------------------+
                               |
                               | (React Query / mutations)
                               v
+-------------------------------------------------------------+
|                       SERVER ACTIONS                        |
|  (Secure Auth Session, Route Revalidation, JSON Payloads)  |
+-------------------------------------------------------------+
                               |
                               | (Transactions & Services)
                               v
+-------------------------------------------------------------+
|                      PROGRESSION ENGINE                     |
|    (XP formulas, Region locks, Boss scaling, Loot drops)    |
+-------------------------------------------------------------+
                               |
                               | (Prisma queries)
                               v
+-------------------------------------------------------------+
|                      DATABASE STORAGE                       |
|           (PostgreSQL: Characters, Progress, Items)         |
+-------------------------------------------------------------+
```

---

## 2. Directory Structure & Module Boundaries

The project is organized under the standard Next.js app directory structure inside `/src`:

```
c:\Users\Nikhilesh\Desktop\ASCENDRA
├── prisma
│   └── schema.prisma           # Prisma Data Schema definitions
├── src
│   ├── actions                 # Server Actions (Route Handlers & Security Guards)
│   │   ├── boss-actions.ts     # Boss targeting, combat, task actions
│   │   ├── game-actions.ts     # Notifications, general game mechanics
│   │   ├── task-actions.ts     # User task additions and deletions
│   │   └── ...
│   ├── app                     # Next.js Pages router (Client & Server Components)
│   │   ├── (game)              # Authenticated game routes (Map, Arena, Village)
│   │   │   ├── boss-arena      # Boss Arena combat scene
│   │   │   ├── life-map        # Interactive SVG World Map
│   │   │   ├── village         # Level-governed Village milestones
│   │   │   └── ...
│   │   ├── layout.tsx          # Root HTML frame & Theme provider
│   │   └── page.tsx            # Authenticated landing / redirection
│   ├── components              # Client-side UI & Game Components
│   │   ├── game                # Game-specific modules (HUD, Init, Defeat cinematic)
│   │   └── ui                  # Reusable low-level widgets (GlassSurface, Portal)
│   ├── lib                     # Core utilities & Service layer
│   │   ├── services            # Backend game services (Single Source of Truth)
│   │   │   ├── boss-service.ts        # Infinite Bounties & Scaling HP
│   │   │   ├── progression-service.ts # Central XP, Level & Region Unlock engine
│   │   │   └── ...
│   │   ├── game-math.ts        # Deterministic level/stat calculation formulas
│   │   └── prisma.ts           # Dynamic evaluation-time cache-busting PrismaClient
│   └── stores                  # Zustand global state (Character, inventory)
```

---

## 3. Libraries & Dependencies

The project relies on a carefully selected modern stack. Here is the operational analysis of each dependency:

*   **Next.js (v15+)**: Selected as the foundational web framework. Server components are used for initial static shell compilation, while Client components are loaded for dynamic, reactive gameplay elements.
*   **React (v19)**: Governs state representation. Uses portals to escape parent container layout scopes (e.g. mounting the notification center to `document.body` to avoid parent stacking context conflicts).
*   **Prisma ORM**: Mediates database queries. Configured with a dynamic evaluation-time cache buster to bypass Next.js hot-reload caching mismatches during local development.
*   **NextAuth.js / Auth.js**: Provides secure session verification using JWT. Active session checks act as a security gateway at the top of all Server Actions.
*   **TanStack React Query**: Manages client-side server state. Automatic cache invalidation ensures changes on the server instantly propagate to HUD elements.
*   **Framer Motion**: Handles complex gaming animations (slide-ins, bounce effects, health bar progress adjustments, and ambient particles).
*   **Zustand**: Manages local client state (stores for money jars, character attributes, and inventory) that do not require server calls.

---

## 4. Database Architecture & Schema

The relational schema is configured in `prisma/schema.prisma`. Below are the primary models driving progression:

### 4.1 User & Character
- **User**: The root identity. Contains basic profile links and credentials.
- **Character**: Holds the gamified progression state.
  - `level`: The current character level, derived from XP.
  - `xp`: Total experience points.
  - `buildings`: A flexible JSON field used to store arbitrary stats (like `timesFled` or skill points spent).
- **CharacterStats**: Tracks core gaming attributes (Strength, Defense, Agility, Agility, Luck) for combat scaling.

### 4.2 Combat & Map Persistence
- **Boss**: Static configuration for seeded bosses (Dummy to mastery, recommended level, and base stats).
- **BossProgress**: Authoritative session state for active boss combat.
  - `currentBossId`: The ID of the boss currently active.
  - `dedicatedBossId`: Persisted dedicated target.
  - `bossHP`: Current health of the active boss.
  - `maxHP`: Max scaled health of the active boss.
  - `activeEasyTask`, `activeMediumTask`, `activeHardTask`: Store active bounties serialized as JSON string arrays.
- **WorldRegion**: Persists the unlocked state of map sectors.

---

## 5. Core Game Systems & Mathematics

### 5.1 Progression Engine & XP Calculations
The Progression Engine (`ProgressionService`) controls all XP gains and level-up checks.
- **Level Calculation**:
  $$\text{Level} = \text{gameMath.levelFromXP(xp)}$$
  Every time XP is added, the new level is calculated deterministically from the total XP balance.
- **Unlock Triggers**: Unlocks occur instantly when the calculated level satisfies:
  - **Level 1–4**: Dummy Village / Region 1
  - **Level 5–9**: Health Village / Region 2
  - **Level 10–14**: Knowledge Village / Region 3
  - **Level 15–19**: Strength Village / Region 4
  - **Level 20–24**: Creativity Village / Region 5
  - **Level 25–29**: Finance Village / Region 6
  - **Level 30–34**: Discipline Village / Region 7
  - **Level 35–39**: Master Village / Region 8
  - **Level 40+**: Eternal Citadel

### 5.2 Boss Combat & Damage Mechanics
Bosses scale dynamically depending on region indexes and player levels:
- **Scaling HP Table**:
  $$\text{Max HP} = \text{Base HP} \times \text{Level Scaling (+3\% per level above recommended)}$$
- **Strike damage**: Fixed damage is dealt immediately when tasks are marked complete:
  - **Easy Task**: 20 HP damage.
  - **Medium Task**: 35 HP damage.
  - **Hard Task**: 50 HP damage.

### 5.3 Procedural Task Generator
Active tasks are populated as JSON arrays of strings:
`activeEasyTask: '["Drink water", "Stretch for 2 min", "Mindful breathing"]'`
Completing a task uses the index to substitute it with a fresh procedural self-improvement task (Study, Programming, Meditation, stretching).

### 5.4 Flee Mechanics & Penalties
Fleeing combat imposes a strict penalty that scales with player level:
- **XP Loss Formula**:
  $$\text{XP Loss} = \min(200 + (\text{Level} - 1) \times 20, 1200)$$
- **Coin Loss Formula**:
  $$\text{Coin Loss} = \min(300 + (\text{Level} - 1) \times 25, 1500)$$
- Clamps player parameters at 0 (never negative).
- Preserves the dedicated target selection and boss HP.

---

## 6. Behind the Scenes: Task Completion Lifecycle

Here is the exact execution flow when a user completes a combat bounty:

```
[Client UI] Clicking 'Strike Boss'
     |
     v
[Server Action] completeBossTaskAction(taskText, bossId, difficulty)
     |
     v
[Database Transaction] ($transaction in boss-service.ts)
     |
     +--> Loads BossProgress & Character
     +--> Validates taskText is in active slots
     +--> Calculates damage (e.g. 35 HP) & decreases HP
     +--> Replaces task with a new procedural generation
     +--> Deducts/adds XP & Coins (awards XP to Progression Engine)
     +--> Recalculates level up & unlocks regions if new milestone hit
     |
     v
[Chronicles] Logs entry of type BATTLE
     |
     v
[Notifications] Adds system notification (level ups / region unlocks)
     |
     v
[Client UI Refresh] React Query cache invalidation triggers HUD animation & damage popups
```

---

## 7. Visual Hierarchy & Layering System

To prevent z-index issues and clipping contexts across browsers, ASCENDRA implements a strict global stacking system:

```
+--------------------------------------------------------------+  z-index: 999999
|                   NOTIFICATION CENTER                        |
+--------------------------------------------------------------+  z-index: 999998
|                   BACKDROP / OVERLAYS                        |
+--------------------------------------------------------------+  z-index: 1000 - 1999
|                   MODALS / DIALOGS                           |
+--------------------------------------------------------------+  z-index: 500 - 999
|                   FLOATING TOOLBARS / WIDGETS                |
+--------------------------------------------------------------+  z-index: 100 - 499
|                   MAIN LAYOUT CONTENT                        |
+--------------------------------------------------------------+  z-index: 0 - 99
|                   BACKGROUND PANELS / CINEMATICS             |
+--------------------------------------------------------------+
```

---

## 8. Technical Glossary

- **React Portal**: A React method to render children into a DOM node that exists outside the DOM hierarchy of the parent component. Used to escape `overflow: hidden` parent boundaries.
- **Atomic Transaction**: An database execution strategy ($transaction) where either all queries succeed or all fail together, preventing stale or desynchronized game states.
- **Zustand Store**: Client-side state manager used to coordinate non-persisted user settings and instant animation triggers.
- **Chronicles**: The game's audit log system that records combat history, store purchases, levels gained, and achievements unlocked.
- **Glassmorphism**: A UI design style featuring frosted-glass effects (using CSS backdrops and subtle borders) used to separate HUD elements without sacrificing text readability.
