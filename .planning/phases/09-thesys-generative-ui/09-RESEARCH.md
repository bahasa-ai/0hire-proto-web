# Phase 9: Thesys Generative UI - Research

**Researched:** 2026-02-20
**Domain:** Thesys C1 Generative UI API + React SDK integration
**Confidence:** MEDIUM-HIGH (SDK is real and documented; some model naming details LOW)

---

## Summary

Thesys C1 is a real, production-available Generative UI API that transforms LLM responses into
interactive React components rather than text. It is **not** `@thesys/sdk` — the correct npm
package is `@thesysai/genui-sdk` (current: v0.8.3, published one week ago as of research date).
A companion open-source design system, **Crayon** (`@crayonai/react-core`, `@crayonai/react-ui`),
provides the underlying component primitives built on Radix/shadcn patterns.

The integration model is an **API proxy**: your backend switches from calling
`api.openai.com` or `generativelanguage.googleapis.com` to calling
`https://api.thesys.dev/v1/embed` using the same OpenAI Chat Completions format. C1 wraps your
prompt in its own LLM pipeline and returns an XML-tagged structured payload that the React SDK
(`<C1Component>`) interprets and renders as live, streamable UI.

**Critical architectural implication for this project:** The current stack uses `@google/genai`
with direct Gemini API calls plus a custom `StreamChunk` protocol over TanStack Start server
functions. Integrating C1 requires **replacing that direct Gemini call with a C1-proxied call
via the OpenAI SDK**. C1 supports Google Gemini models (`c1/google/gemini-3-pro/v-20251230`,
`c1/google/gemini-3-flash/v-20251230`) but only through its own routing layer — direct
`@google/genai` calls cannot stream into `<C1Component>`.

**Primary recommendation:** Thesys C1 is a viable path for rich generative UI in tool call
results, but it requires replacing the existing server-side AI call architecture. If the goal
is only richer tool call card rendering (not full-page generative UI), building custom React
components is less disruptive and keeps the existing `@google/genai` streaming pipeline intact.

---

## CRITICAL FINDING: @thesys/sdk Does Not Exist

`@thesys/sdk` returns a 404 on the npm registry. The correct packages are:

| Intended | Actual |
|----------|--------|
| `@thesys/sdk` | `@thesysai/genui-sdk` |
| (not scoped) | `@crayonai/react-core` |
| (not scoped) | `@crayonai/react-ui` |

All three are published and maintained by the same team (`rabi@thesys.dev`).

---

## Standard Stack

### Core Packages

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@thesysai/genui-sdk` | 0.8.3 | Render C1 API responses as React UI | The primary rendering SDK |
| `@crayonai/react-ui` | 0.9.16+ | Crayon component primitives (charts, forms, tables) | Required peer dep for C1 rendering |
| `@crayonai/react-core` | 0.7.7 | Hooks: `useOnAction`, `useC1State`, state mgmt | Required for interactive custom components |
| `openai` | ^4.x | HTTP client to call C1 API (OpenAI-compatible) | C1 API is OpenAI-format only |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod-to-json-schema` | latest | Convert Zod schemas → JSON Schema for custom component registration | When adding custom components |

**Installation:**
```bash
bun add @thesysai/genui-sdk @crayonai/react-ui @crayonai/react-core openai
```

### SDK Version Matrix

From the compatibility matrix at `docs.thesys.dev/api-reference/compatibility-matrix`:

| Model Tier | `@thesysai/genui-sdk` | `@crayonai/react-ui` | `@crayonai/react-core` |
|------------|----------------------|---------------------|----------------------|
| Stable production | ~0.7.15 | ~0.9.9 | ~0.7.6 |
| Artifacts endpoint | ~0.8.3 | ~0.9.16 | ~0.7.6 |
| Legacy/experimental | ~0.6.27 | ~0.8.14 | ~0.7.6 |

---

## Architecture: How C1 Works

### Data Flow

```
User message
    ↓
TanStack Start server function
    ↓
OpenAI SDK → POST https://api.thesys.dev/v1/embed
    (Authorization: Bearer THESYS_API_KEY)
    (model: "c1/google/gemini-3-flash/v-20251230")
    ↓
C1 API (Thesys infrastructure wraps chosen LLM)
    ↓
Structured XML-tagged response string:
    <thinking>...</thinking>
    <content>[Crayon component DSL]</content>
    <artifact>...</artifact>
    ↓
Streamed back to client (text/event-stream)
    ↓
<C1Component c1Response={responseText} isStreaming={true} />
    ↓
Interactive React UI (charts, forms, tables, buttons, cards)
```

### Response Format

C1 does NOT return plain text or Markdown. It returns an XML-tagged structured payload:

```
<thinking>Processing the request...</thinking>
<content>
  [Crayon component specification — internal DSL]
</content>
<artifact>
  [Optional: document/slide content for Artifacts API]
</artifact>
```

The `<C1Component>` understands this format. You **cannot** use a standard Markdown renderer
or the existing prompt-kit `Message` component to display C1 output.

### Supported UI Component Categories

1. **Display**: Cards, lists, text blocks, headers, badges
2. **Form Elements**: Inputs, selects, checkboxes, sliders, date pickers
3. **Action Triggers**: Buttons, links, toggle switches — wired via `onAction` callback
4. **Data Visualization**: Charts (bar, line, pie, scatter), tables with sorting/filtering
5. **Artifacts**: Full documents, slide decks (with PDF/PPTX export)

---

## Architecture Patterns

### Pattern 1: Drop-in Chat Replacement (`<C1Chat>`)

**What:** Replace entire chat UI with Thesys-managed component.

**When to use:** Greenfield or full rewrite. Not applicable to this project — existing
TanStack Start routing, workspace context, sidebar, and custom agents make this too invasive.

```tsx
// Source: docs.thesys.dev/guides/rendering-ui
import { C1Chat } from '@thesysai/genui-sdk'

function App() {
  return <C1Chat apiUrl="/api/chat" />
}
```

### Pattern 2: Inline Component Rendering (`<C1Component>`)

**What:** Pass a C1 API response string directly; SDK renders it. You own the chat loop.

**When to use:** Existing chat infrastructure you want to preserve — matches this project's
architecture. Replace just the tool call card rendering portion.

```tsx
// Source: docs.thesys.dev/guides/rendering-ui
import { C1Component, ThemeProvider } from '@thesysai/genui-sdk'
import '@crayonai/react-ui/styles/index.css'

function ToolResultCard({ responseText, isStreaming }: {
  responseText: string
  isStreaming: boolean
}) {
  return (
    <ThemeProvider>
      <C1Component
        c1Response={responseText}
        isStreaming={isStreaming}
        onAction={(actionLabel, actionDescription) => {
          // Handle button clicks and form submissions
          // Typically triggers next LLM turn
        }}
      />
    </ThemeProvider>
  )
}
```

### Pattern 3: Server Function (TanStack Start)

No official TanStack Start guide exists. The adaptation of the Next.js pattern is:

```typescript
// src/server/chat.ts — adapted from Next.js example at docs.thesys.dev/guides/implementing-api
import OpenAI from 'openai'
import { createServerFn } from '@tanstack/react-start'

const c1Client = new OpenAI({
  apiKey: process.env.THESYS_API_KEY,
  baseURL: 'https://api.thesys.dev/v1/embed',
})

// Model format: "c1/{provider}/{model}/{version}"
const C1_MODEL = 'c1/google/gemini-3-flash/v-20251230'

export const streamC1Chat = createServerFn({ method: 'POST' })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    const stream = await c1Client.chat.completions.create({
      model: C1_MODEL,
      messages: data.messages,
      stream: true,
    })
    // Stream chunks back to client
  })
```

### Pattern 4: Custom Components

Register Zod-typed React components that C1 can instantiate:

```typescript
// Source: docs.thesys.dev/guides/custom-components
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { useOnAction, useC1State } from '@thesysai/genui-sdk'

const CandidateCardSchema = z.object({
  name: z.string(),
  role: z.string(),
  score: z.number().min(0).max(100),
}).describe('Displays a hiring candidate with match score and action buttons')

// Register with API call
const metadata = {
  thesys: JSON.stringify({
    c1_custom_components: {
      CandidateCard: zodToJsonSchema(CandidateCardSchema),
    },
  }),
}

// Register with component renderer
<C1Chat customizeC1={{ customComponents: { CandidateCard } }} />
```

### Recommended Project Structure (if adopting)

```
src/
├── server/
│   ├── chat.ts              # Existing: extend with C1 client alongside @google/genai
│   └── chat-c1.ts           # New: C1-specific server function
├── components/
│   ├── workspace/
│   │   └── c1-message.tsx   # New: wraps <C1Component> with ThemeProvider
│   └── prompt-kit/
│       └── tool.tsx         # Existing: keep for non-C1 tool calls or replace
└── styles.css               # Add: @crayonai/react-ui/styles/index.css import
```

### Anti-Patterns to Avoid

- **Passing C1 response to a Markdown renderer**: C1 output is XML-tagged DSL, not Markdown.
  The `<C1Component>` is the only correct consumer.
- **Using existing `@google/genai` StreamChunk pipeline to C1**: C1 requires its own API call
  through the OpenAI-compatible endpoint. The current `tool_call_start/end` custom protocol
  doesn't apply.
- **Mixing `ThemeProvider` tokens with project's OKLCH theme**: C1's `ThemeProvider` injects
  its own CSS custom properties. Collision with the project's `src/styles.css` tokens is likely.
  Test in isolation first.
- **Assuming streaming works like the existing Gemini setup**: C1 streams the XML-tagged payload
  progressively. The SDK handles partial rendering internally via `isStreaming` prop.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming XML parser | Custom chunk accumulator | `<C1Component isStreaming>` | Progressive rendering with partial XML is handled by the SDK |
| Chart components | Custom recharts wrapper | C1's built-in data viz | C1 renders charts from LLM intent — no manual props needed |
| Form state from LLM | Custom controlled form | `useC1State` + `updateMessage` | Handles persistence across page refreshes |
| Action dispatch | Custom event bus | `onAction` callback | Standard C1 interactivity pattern |

---

## Common Pitfalls

### Pitfall 1: CSS Conflicts with ThemeProvider

**What goes wrong:** `@crayonai/react-ui/styles/index.css` and Thesys `ThemeProvider` inject
their own CSS custom property tokens (`--color-primary`, `--radius`, etc.) which likely conflict
with the project's OKLCH theme tokens in `src/styles.css`.

**Why it happens:** Two design systems with overlapping CSS variable namespaces.

**How to avoid:** Scope the `ThemeProvider` to the C1 rendering container. Test in a sandboxed
route before integrating into the main layout. Check for variable name collisions.

**Warning signs:** Button colors, border radii, or font sizes changing in non-C1 parts of the app
after adding the C1 CSS import.

### Pitfall 2: Architecture Replacement is Required, Not Additive

**What goes wrong:** Assuming C1 can wrap the existing `@google/genai` streaming — it cannot.
C1 **is** the LLM call; it proxies through its own routing layer.

**Why it happens:** Marketing language ("integrate in 2 steps") obscures the fact that the
backend AI call must switch to `https://api.thesys.dev/v1/embed`.

**How to avoid:** Treat Phase 9 as a server-side chat function replacement, not decoration.
The existing two-turn Gemini function call loop cannot be reused; C1 handles tool calling
internally.

**Warning signs:** Trying to pass `@google/genai` streaming output into `<C1Component>` — the
response format is incompatible.

### Pitfall 3: Model Naming Convention

**What goes wrong:** Using wrong model strings.

**Why it happens:** No UI to discover available models; naming format
(`c1/{provider}/{model}/{version}`) is not obvious.

**Current known model strings (LOW confidence — verify at console.thesys.dev):**

- `c1/google/gemini-3-flash/v-20251230` — Gemini Flash (recommended for speed)
- `c1/google/gemini-3-pro/v-20251230` — Gemini Pro
- `c1/anthropic/claude-sonnet-4/v-20251230` — Claude Sonnet 4

**Warning signs:** API returns 400 with invalid model error.

### Pitfall 4: THESYS_API_KEY Environment Variable

**What goes wrong:** Missing or misconfigured API key causes silent failures in server functions.

**Why it happens:** New env var required; existing `GOOGLE_AI_API_KEY` does not work with the
C1 endpoint.

**How to avoid:** Add `THESYS_API_KEY` to `.env` and verify with console.thesys.dev before
starting implementation.

### Pitfall 5: Crayon CSS Import Must Precede Component Usage

**What goes wrong:** Components render without styles (unstyled raw HTML).

**Why it happens:** The CSS must be imported globally — `@crayonai/react-ui/styles/index.css`
is not auto-injected.

**How to avoid:** Add the import to `src/styles.css` or the root layout before any C1 components.

---

## Code Examples

### Server Function (TanStack Start adaptation)

```typescript
// Source: docs.thesys.dev/guides/implementing-api (Next.js original, adapted)
import OpenAI from 'openai'
import { createServerFn } from '@tanstack/react-start'

const c1 = new OpenAI({
  apiKey: process.env.THESYS_API_KEY,
  baseURL: 'https://api.thesys.dev/v1/embed',
})

export const streamC1 = createServerFn({ method: 'POST' })
  .handler(async ({ data: { messages } }) => {
    const stream = c1.chat.completions.stream({
      model: 'c1/google/gemini-3-flash/v-20251230',
      messages,
      stream: true,
    })
    // Use TanStack Start's streaming response pattern
    return new Response(stream.toReadableStream(), {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  })
```

### C1 Component Rendering

```tsx
// Source: docs.thesys.dev/guides/rendering-ui
import { C1Component, ThemeProvider } from '@thesysai/genui-sdk'
import '@crayonai/react-ui/styles/index.css'

function C1MessageBubble({
  content,
  isStreaming,
  onAction,
}: {
  content: string
  isStreaming: boolean
  onAction: (label: string, description: string) => void
}) {
  return (
    <ThemeProvider>
      <C1Component
        c1Response={content}
        isStreaming={isStreaming}
        onAction={onAction}
      />
    </ThemeProvider>
  )
}
```

### Custom Component Registration

```typescript
// Source: docs.thesys.dev/guides/custom-components
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { useOnAction, useC1State } from '@thesysai/genui-sdk'

const AgentStatusSchema = z.object({
  agentName: z.string(),
  status: z.enum(['idle', 'running', 'complete', 'error']),
  progress: z.number().optional(),
}).describe('Displays real-time agent status with progress')

function AgentStatusCard() {
  const onAction = useOnAction()
  const { getValue } = useC1State('agentStatus')
  // ... render using getValue()
}

// API call metadata to register the component
const thesysMetadata = {
  thesys: JSON.stringify({
    c1_custom_components: {
      AgentStatusCard: zodToJsonSchema(AgentStatusSchema),
    },
  }),
}
```

---

## Pricing and Authentication

### API Key

- Obtain at: `console.thesys.dev`
- Environment variable: `THESYS_API_KEY`
- Used in: `Authorization: Bearer <THESYS_API_KEY>` (handled by OpenAI SDK automatically)

### Pricing Tiers (as of 2026-02-20)

| Tier | Monthly Cost | C1 API Calls | LLM Credits |
|------|-------------|-------------|-------------|
| Free | $0 | 5,000/mo | $10 free credits |
| Build | $49/mo | 25,000/mo | Provider rates, no markup |
| Grow | $499/mo | 500,000/mo | Provider rates, no markup |
| Scale | Custom | Custom | Custom |

LLM token costs are billed separately at provider rates (no markup on tokens).
The free tier is sufficient for development and prototype use.

---

## Integration Complexity Assessment

### What changes if C1 is adopted

| Current | After C1 | Effort |
|---------|----------|--------|
| `@google/genai` streaming in `chat.ts` | OpenAI SDK call to `api.thesys.dev` | MEDIUM — new server function |
| Custom `StreamChunk` protocol | C1 XML payload streamed as raw text | MEDIUM — client streaming logic changes |
| `tool_call_start/end` StreamChunk types | C1 handles tool calling internally | HIGH — existing two-turn loop removed |
| prompt-kit `Tool` component (collapsible cards) | `<C1Component>` in message render | LOW — replace render target |
| OKLCH CSS theme tokens | Potential collision with C1 `ThemeProvider` | MEDIUM — CSS scoping required |
| `GOOGLE_AI_API_KEY` env var | Add `THESYS_API_KEY` (both coexist possible) | LOW |

### What does NOT change

- TanStack Start server function pattern (`createServerFn`)
- TanStack Router file-based routing
- Workspace context and chat message state shape
- Sidebar, task board, all non-chat UI
- The `@google/genai` dependency (other agents can still use it directly)

---

## Alternative Approach: Rich Custom Tool Cards (No Thesys)

If the goal is richer tool call rendering without the architectural disruption, the existing
Phase 8 foundation supports building custom React components instead:

**What you already have:**
- `tool_call_start/end` StreamChunk types with structured `input`/`output` fields
- `ToolCall` type in workspace context with full lifecycle (`running → done | error`)
- Collapsible card pattern (`prompt-kit/tool.tsx`)

**What you'd add:** Replace the generic collapsible card with output-type-specific renders:
- JSON output → formatted table using `@tanstack/react-table` (already a dep of `@thesysai/genui-sdk`)
- Structured data → custom card components with the project's existing OKLCH tokens
- Charts → `recharts` or similar (one additional dep)

**Tradeoffs:**

| Approach | Richness | Complexity | Architectural Disruption | External Dependency |
|----------|---------|-----------|--------------------------|---------------------|
| Thesys C1 | Very high (LLM-generated adaptive UI) | High | High (server-side rewrite) | Yes (API key, SaaS) |
| Custom components | Medium (handcrafted per output type) | Medium | None | No |
| Keep current collapsible | Low (JSON in expandable panel) | None | None | No |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Render all LLM output as Markdown | C1 generates interactive component trees | Users get forms, charts, buttons instead of walls of text |
| Custom tool call display components | Zod-schema-registered custom components + C1 built-ins | Component library grows with LLM intent |
| Direct LLM API calls in server functions | API middleware layer (C1 as proxy) | Adds latency; gains structured UI output |

**Deprecated patterns (Thesys-specific):**
- `@thesysai/genui-sdk` below 0.6.34 lacks custom component support — use 0.7.15+
- C1 model versions before `v-20250915` lack custom component support on the API side

---

## Open Questions

1. **CSS collision severity**
   - What we know: `@crayonai/react-ui/styles/index.css` injects design tokens
   - What's unclear: Whether token names overlap with the project's OKLCH custom properties
   - Recommendation: Create an isolated test route to verify before main integration

2. **Google Gemini model availability via C1**
   - What we know: Documentation lists `c1/google/gemini-3-pro/v-20251230` and
     `c1/google/gemini-3-flash/v-20251230` (from compatibility matrix)
   - What's unclear: Whether these exact version strings are current; model naming may have
     changed after research date
   - Recommendation: Verify at `console.thesys.dev` models page before hardcoding

3. **TanStack Start streaming compatibility**
   - What we know: C1 returns OpenAI-compatible streaming (SSE); TanStack Start uses `createServerFn`
   - What's unclear: Whether `c1Client.chat.completions.stream()` response can be piped through
     `createServerFn` without transformation
   - Recommendation: Prototype the streaming pipe before committing to full integration

4. **Phase 8 tool call loop compatibility**
   - What we know: C1 handles tool calling internally — you declare tool capabilities via
     system prompt or metadata, not `functionDeclarations`
   - What's unclear: Whether the existing per-agent `AGENT_TOOLS` declarations can be expressed
     as C1 metadata
   - Recommendation: Plan for complete replacement of the two-turn loop if adopting C1

---

## Sources

### Primary (HIGH confidence)
- `https://docs.thesys.dev` — Official documentation, architecture overview
- `https://docs.thesys.dev/guides/rendering-ui` — C1Component and C1Chat API
- `https://docs.thesys.dev/guides/implementing-api` — Server-side implementation
- `https://docs.thesys.dev/guides/custom-components` — Custom component registration
- `https://docs.thesys.dev/guides/migrate-to-genui` — Migration steps
- `https://docs.thesys.dev/api-reference/compatibility-matrix` — Package version matrix
- `https://docs.thesys.dev/guides/frameworks` — Framework integration list
- `https://www.thesys.dev/pricing` — Pricing tiers
- `https://www.thesys.dev/blogs/generative-ui-architecture` — Technical architecture

### Secondary (MEDIUM confidence)
- npm registry: `@thesysai/genui-sdk@0.8.3` — Package existence, deps, publish date verified
- npm registry: `@crayonai/react-core@0.7.7` — Package existence verified
- `https://docs.thesys.dev/guides/frameworks/vercel-ai-sdk` — Integration pattern (adapted for TanStack)
- `https://github.com/thesysdev/crayon` — Open-source Crayon design system backing the SDK

### Tertiary (LOW confidence — flag for validation)
- Model strings `c1/google/gemini-3-*` — From search results, not official docs page; verify at console
- `@thesys/sdk` confirmed 404 — npm registry direct check (HIGH confidence this name is wrong)

---

## Metadata

**Confidence breakdown:**
- SDK existence and package names: HIGH — npm registry confirmed
- React integration API: HIGH — official docs
- Architecture overview: HIGH — official blog + docs
- Model strings: LOW — derived from search, not dedicated models page (404)
- CSS theming conflict: MEDIUM — inferred from dependency analysis, not tested
- TanStack Start streaming compatibility: LOW — no official guide exists

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — Thesys is actively releasing; check model names sooner)
