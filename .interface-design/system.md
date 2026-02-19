# Interface Design System — Zero Hire

_Established: 2026-02-19_

---

## Product World

**Domain:** Delegation — a business owner handing work to a trusted AI team. Not a chat app. Not a consumer product. Closer to an executive office management tool.

**User:** Non-technical business owner (Alex Rivera archetype). Between meetings. Delegating quickly. Trusting their team to handle it.

**Core verb:** Delegate. Everything in the interface should make delegation feel effortless and authoritative.

---

## Direction & Feel

**Stated intent:** Quiet authority.

Not cold like a terminal. Not warm like a consumer app. The specific quality: purposeful calm. Like communicating with a capable team you trust. Structure whispers — nothing demands attention.

**Not:** ChatGPT, iMessage, Slack. Those are the anti-patterns.

---

## Signature Element

**Agent messages render as memos, not bubbles.**

No background fill. No rounded card. A hairline `border-l-2` in the agent's accent color (`bg-chart-X` → `border-chart-X`), with `pl-3` left padding. Agent name appears above in `text-xs font-medium text-muted-foreground`. The text is `text-foreground text-sm leading-relaxed` — just type.

This signals: "considered briefing from your team," not "AI chatbot response." It is the defining visual signature of this product and must be preserved across all future message rendering work (including streaming in Phase 3).

---

## Depth Strategy

**Borders only.** No box shadows anywhere.

- Sidebar/main boundary: `border-r border-sidebar-border`
- Channel header bottom: `border-b border-border`
- Tab strip bottom: `border-b border-border` (also serves as tab underline anchor)
- Composer top: `border-t border-border`
- Popovers/dropdowns: may use a single-level subtle shadow if needed

Surfaces use barely-different background values — the existing OKLCH tokens handle this. `bg-sidebar` vs `bg-background` are intentionally close. Do not introduce card borders inside the main panel content area.

---

## Spacing Base Unit

Tailwind 4-unit scale (`4px` base). Consistent multiples throughout:

- Sidebar padding: `px-3 py-4` (header), `px-2 py-2` (nav items)
- Channel header: `px-6 h-14`
- Tab strip: `px-6 py-0` (tabs flush-bottom)
- Message area: `px-6 py-6`, message gap `space-y-5`
- Composer: `px-4 py-3`

---

## Color System

All colors are semantic tokens from `src/styles.css`. No hardcoded hex/oklch/rgb in components.

**Agent identity:** `bg-chart-2` through `bg-chart-5` — one per agent. These also appear as `border-chart-X` for the memo accent border, and `text-primary-foreground` text on avatar circles.

**Surfaces:**

- Page base: `bg-background`
- Sidebar: `bg-sidebar`
- Active sidebar item: `bg-sidebar-primary text-sidebar-primary-foreground`
- Hover sidebar item: `hover:bg-sidebar-accent`

**Text hierarchy:**

- Primary content: `text-foreground`
- Secondary / labels: `text-muted-foreground`
- Active inherited foreground sublabel: `opacity-60` (not `text-muted-foreground`, which breaks on colored backgrounds)

---

## Key Component Patterns

### Agent Message (Memo Style)

```tsx
<div className={cn('border-l-2 pl-3', accentBorder)}>
  <p className="text-muted-foreground mb-1 text-xs font-medium">{agent.name}</p>
  <MessageContent className="text-foreground text-sm leading-relaxed">
    {content}
  </MessageContent>
</div>
```

`accentBorder` = `agent.accentColor.replace('bg-', 'border-')`

### User Message (Compact Pill)

```tsx
<Message className="flex justify-end">
  <MessageContent className="bg-primary text-primary-foreground max-w-[65%] rounded-2xl px-4 py-2 text-sm leading-relaxed">
    {content}
  </MessageContent>
</Message>
```

### Thinking Indicator (Memo-Consistent)

```tsx
<div className={cn('border-l-2 pl-3', accentBorder)}>
  <p className="text-muted-foreground mb-1 text-xs font-medium">{agent.name}</p>
  <span className="text-muted-foreground animate-pulse text-sm">…</span>
</div>
```

Same structure as a real message — transition from thinking → replied is visually continuous.

### Tab Toggle (Underline Style)

```tsx
<button className={cn(
  '-mb-px border-b-2 px-1 pb-2.5 pt-2 text-sm capitalize transition-colors',
  active
    ? 'border-primary text-foreground font-medium'
    : 'border-transparent text-muted-foreground hover:text-foreground',
)}>
```

Tabs sit in a `border-b border-border` strip. Active tab's `border-b-2 border-primary` overlaps the strip border with `-mb-px`. No background fill.

### Empty State (Text-Forward)

Centered agent hero (large avatar + name + description), then a vertical list of text suggestion buttons:

```tsx
<button className="text-foreground/70 hover:text-foreground hover:bg-accent w-full justify-start rounded-md px-3 py-2 text-sm transition-colors">
```

No chip grid. No card borders. The suggestions read as a quiet list, not a marketing widget.

---

## Animation

- Micro-interactions: `transition-colors` at Tailwind default (~150ms)
- Thinking indicator: `animate-pulse` on a single `…` character
- No spring/bounce effects. No layout animations. Calm.

---

## Defaults Permanently Rejected

| Default                                                      | Replacement                           | Reason                                             |
| ------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------- |
| Both message sides as rounded filled bubbles                 | User = pill, Agent = memo border      | Agent responses are briefings, not chat            |
| `bg-accent` filled active tab                                | Underline `border-b-2 border-primary` | Typographic, not widget-y                          |
| Flex-wrap chip grid for empty state suggestions              | Vertical text list                    | Quieter, matches the editorial feel                |
| Box shadows for elevation                                    | Borders only                          | Consistent with the clean/technical depth strategy |
| `text-muted-foreground` for sublabels on colored backgrounds | `opacity-60`                          | Inherits correct foreground instead of fighting it |

---

## Phase Notes

- **Phase 3 (streaming):** The memo-style agent message MUST be preserved. Streaming appends tokens into the same `border-l-2 pl-3` structure. Do not introduce a different style for streamed vs. mock responses.
- **Phase 4 (task board):** Task cards should follow the borders-only depth strategy. No dramatic card shadows.
