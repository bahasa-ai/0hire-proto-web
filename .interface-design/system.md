# 0hire Interface Design System

**Product:** Multi-agent AI hiring/ops workspace — four specialist agents (Chief of Staff, Designer, Finance, Legal) in a Slack-like single-page shell.

**User:** A founder or solo operator, early-stage startup. Switching context constantly. Opens 0hire to delegate, check status, or fire off a task. Moves fast. Not browsing — operating.

---

## Direction & Feel

**Operations room.** Dark, focused, professional. Not a consumer chat app — a tool where serious work happens. Warm enough to feel human (this is a team you trust), precise enough to communicate competence.

Reference feeling: a startup war room at 10pm. Walnut desk, brass lamp, printed briefs, dark walls. Every element earns its place.

**Not:** Generic SaaS dark theme. Not Slack. Not a terminal. Not cozy productivity.

---

## Color System

### Base Palette (OKLCH)

```css
/* Surfaces — four whisper-quiet elevation steps */
--color-base: oklch(0.11 0.008 55); /* sidebar bg — darkest */
--color-surface: oklch(0.14 0.008 55); /* content pane bg */
--color-surface-2: oklch(0.17 0.007 55); /* raised cards, input bg */
--color-surface-3: oklch(0.21 0.006 55); /* hover states, popovers */

/* Borders — barely visible structure */
--color-border: oklch(0.22 0.005 55); /* default dividers */
--color-border-2: oklch(0.27 0.005 55); /* stronger separation */

/* Text hierarchy */
--color-text: oklch(0.92 0.008 75); /* primary — warm off-white */
--color-text-2: oklch(0.65 0.007 65); /* secondary — mid warm grey */
--color-text-3: oklch(0.42 0.006 65); /* tertiary — muted labels */

/* Accent — single interaction color */
--color-accent: oklch(0.72 0.12 75); /* brass/amber — hover, focus, active */
--color-accent-dim: oklch(0.72 0.12 75 / 0.15); /* accent glow on surfaces */
```

### Agent Identity Colors (muted, professional)

Each agent has ONE identity color used only on: avatar initial background, active channel left-border hairline, channel header accent.

```css
--agent-chief: oklch(0.6 0.09 75); /* brass — authority, leadership */
--agent-designer: oklch(0.58 0.1 20); /* dusty coral — creative energy */
--agent-finance: oklch(0.52 0.08 220); /* deep teal — precision, numbers */
--agent-legal: oklch(0.52 0.07 145); /* stamp green — approval, compliance */
```

Agent colors are **never used as background fills** on large surfaces. Only as:

- 2px left border on the active sidebar item
- Avatar initial background (at ~15% opacity with the color as text)
- Hairline accent at top of channel header

---

## Depth Strategy

**Borders-only.** No shadows.

This is a dense work tool. Shadows add softness and lift — wrong for this context. Borders communicate structure without depth theater.

- All card/panel separation via `--color-border`
- Elevated surfaces (dropdowns, popovers) use `--color-surface-3` background + `--color-border-2` border
- No `box-shadow` anywhere except focus rings

**Focus ring:** `outline: 2px solid var(--color-accent)` at `2px offset`. Not a glow — a precise indicator.

---

## Spacing Scale

Base unit: **4px**. All spacing is multiples of 4.

```
4px   — tight inline gaps (icon + label)
8px   — component internal padding (tight)
12px  — component internal padding (default)
16px  — section padding, card padding
20px  — larger card padding
24px  — section gaps
32px  — major layout gaps
48px  — page-level breathing room
```

Sidebar internal padding: `12px` horizontal, `8px` vertical per item.
Content pane padding: `24px` horizontal, `20px` vertical.

---

## Typography

Font: **Inter Variable** (`--font-sans`) — already in project.

```
/* Type scale */
--text-xs:   0.6875rem / 1.4  (10-11px) — timestamps, meta
--text-sm:   0.8125rem / 1.5  (13px)    — labels, secondary content
--text-base: 0.9375rem / 1.6  (15px)    — body, message content
--text-lg:   1.0625rem / 1.4  (17px)    — section headers
--text-xl:   1.25rem   / 1.2  (20px)    — page/channel titles
```

Weight system:

- `400` — body text, message content
- `500` — labels, nav items, secondary headings
- `600` — primary headings, agent names
- `700` — only for numeric emphasis in data

Tracking:

- Body/labels: `letter-spacing: 0` (Inter is well-spaced at normal)
- ALL-CAPS labels: `letter-spacing: 0.06em` + `font-size: --text-xs` + `font-weight: 500`
- No decorative tracking on regular text

---

## Border Radius

Sharp-leaning. This is a work tool, not a consumer app.

```
--radius-sm:  2px   — inputs, tags, tiny elements
--radius-md:  4px   — buttons, cards
--radius-lg:  6px   — modals, larger panels
--radius-full: 9999px — avatars only
```

**Never** use `rounded-xl`, `rounded-2xl`, or `rounded-3xl`.

---

## Message Style

**No bubbles.** Document-style.

```
User messages:
  - Right-aligned text
  - No bubble, no background
  - Subtle right border: 2px solid --color-accent-dim
  - Text color: --color-text
  - Timestamp: right-aligned, --color-text-3, --text-xs

Assistant messages:
  - Full-width, left-aligned
  - No bubble, no background
  - Avatar initial (agent color) floats left, 28px, rounded-full
  - Content area fills remaining width
  - Markdown rendered via prompt-kit Markdown component
  - Separator: 1px --color-border between messages (not above every message — only when role changes)
```

Message grouping: consecutive messages from the same role get `4px` gap; role-change gets `16px` gap + separator line.

---

## Sidebar (WorkspaceSidebar)

```
Width: 220px, fixed
Background: --color-base
Border-right: 1px --color-border

Header: Logo + product name, 48px height, 16px horizontal padding
  Logo: small wordmark or icon — brass color

Agent channel item (AgentChannelItem):
  Height: 44px
  Padding: 12px horizontal, 0 vertical (centered)
  Layout: [2px active border] [28px avatar] [8px gap] [name + role stack]

  Avatar: round, 28px
    Background: agent-color at 12% opacity
    Text: agent-color, 11px, weight 600, initials

  Name: --text-sm, weight 500, --color-text
  Role: --text-xs, --color-text-3

  Default state: transparent bg
  Hover: --color-surface-2 bg
  Active: --color-surface bg + 2px left border in agent-color + name weight 600

  Unread indicator: 6px dot, --color-accent, absolutely positioned top-right of avatar
```

---

## Channel Header (ChannelHeader)

```
Height: 56px
Background: --color-surface
Border-bottom: 1px --color-border
Padding: 16px horizontal

Left: [40px avatar] [12px gap] [name + role stack]
  Avatar: 40px round, same style as sidebar but larger
  Name: --text-lg, weight 600
  Role: --text-sm, --color-text-2

Agent identity accent: 3px horizontal line at very bottom of header, in agent-color, full width

Right: status indicator + action buttons (icon only, 32px)
```

---

## Chat Input (ChatInput / PromptInput)

```
Background: --color-surface-2
Border: 1px --color-border-2
Border-radius: --radius-sm (2px — intentionally sharp)
Padding: 12px 16px
Min-height: 44px, auto-grows

Placeholder: --color-text-3
Text: --color-text, --text-base

Focus: border-color → --color-accent (no glow, just border change)

Submit button: icon-only, 28px, brass accent on active
  Default: --color-text-3
  Hover: --color-accent
  Active (has content): --color-accent
```

---

## Task Board (TaskBoard)

```
Panel width: 260px, fixed right
Background: --color-base (matches sidebar — unified dark frame)
Border-left: 1px --color-border

Header: "Tasks" + agent name, 48px, 16px padding, --text-sm weight 600

Task item:
  Height: auto, min 36px
  Padding: 8px 12px
  Border-bottom: 1px --color-border

  Status indicator: 16px circle outline left of text
    todo: --color-border-2 outline
    in-progress: --color-accent outline + --color-accent-dim fill
    done: --agent-{id} outline + solid fill, checkmark

  Text: --text-sm, --color-text
  Done text: line-through, --color-text-3

Empty state: centered, --color-text-3, --text-sm, italic
  "No tasks yet"
```

---

## Animation

```
Duration: 150ms for micro-interactions (hover, focus, active states)
Duration: 200ms for panels expanding/collapsing
Easing: cubic-bezier(0.2, 0, 0, 1)  — fast in, smooth out
No spring/bounce. No decorative animation.
```

---

## States Checklist

Every interactive element must have:

- [ ] Default
- [ ] Hover (background shift to `--color-surface-3` or border color change)
- [ ] Active/pressed (`scale-[0.98]` on buttons)
- [ ] Focus (brass `outline`, never removed)
- [ ] Disabled (`opacity-40`, `cursor-not-allowed`, no hover effect)

Data states:

- [ ] Loading (Loader component from prompt-kit)
- [ ] Empty (centered message, --color-text-3)
- [ ] Error (--color-destructive text, brief description)
- [ ] Streaming (Loader indicator, content appears inline)

---

## What To Avoid

- Box shadows (borders-only strategy)
- `rounded-xl` or larger on non-avatar elements
- Hardcoded hex/rgb values — always reference CSS custom properties
- Multiple accent colors for interaction states
- Bubble-style chat messages
- White/light backgrounds in the content pane
- Agent colors as large surface fills
- Pure black (`oklch(0 0 0)`) — always use warm dark
- Decorative gradients
- Bouncy/spring animations
