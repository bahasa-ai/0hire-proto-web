# Pitfalls Research

**Domain:** Streaming LLM Chat Workspace — TanStack Start + React 19 + prompt-kit + Anthropic API
**Researched:** 2026-02-19
**Confidence:** HIGH (streaming/state pitfalls), MEDIUM (prompt-kit specifics), HIGH (security)

---

## Critical Pitfalls

### Pitfall 1: React 19 Strict Mode Fires `useEffect` Twice — Triggers Double API Calls

**What goes wrong:**
In development, React 19 Strict Mode intentionally mounts, unmounts, then remounts every component. Any `useEffect` that kicks off a streaming API call will fire twice, consuming two API requests (and two streaming connections) on every page load. With Anthropic API, this means doubled token costs in dev and potential race conditions between two concurrent streams updating the same state.

**Why it happens:**
This is intentional React behavior: React uses double-invocation to expose effects that would break during Suspense retries, Fast Refresh, or future Offscreen API usage. Developers either don't know about it or write effects that ignore cleanup (treating the first invocation as a false alarm to suppress rather than fix).

**How to avoid:**
- Never initiate streaming inside `useEffect` on mount without a user gesture
- Streaming should only start on explicit user action (form submit, button click) — not on component mount
- If an effect must start streaming, implement a proper `AbortController` cleanup that cancels the Anthropic SDK stream on unmount, and verify the cleanup runs correctly
- Use `useRef` to guard against double-fire: `const startedRef = useRef(false)`

**Warning signs:**
- Anthropic API console shows 2x requests per user message in development
- Message content appears duplicated in the chat
- Console shows two concurrent streaming connections starting simultaneously

**Phase to address:** Streaming implementation phase (when wiring `createServerFn` to the chat input)

---

### Pitfall 2: Stale Closure Causes Token Duplication During Streaming

**What goes wrong:**
Updating `useState` inside a fast async loop (reading stream chunks token-by-token) produces stale closure values. Each `setState(prev => prev + chunk)` reads `prev` from a render cycle that is behind the current accumulation, resulting in duplicated tokens appearing in the UI. This is documented extensively for OpenAI/Anthropic streaming in React.

**Why it happens:**
React batches state updates. When chunks arrive faster than React can commit renders, the functional updater `prev => prev + chunk` receives a stale `prev` value — one that doesn't include tokens from uncommitted batches. Result: the same tokens are appended twice or more.

**How to avoid:**
Use a `useRef` to accumulate the full streaming content outside of React's render cycle, then call `setState` with the ref's current value (not a delta):

```typescript
const accumulatedRef = useRef('')

// In the streaming loop:
accumulatedRef.current += token
setStreamingContent(accumulatedRef.current) // not prev + token
```

Reset the ref at stream start. Never use `prev => prev + token` inside a high-frequency streaming loop.

**Warning signs:**
- Repeated words or phrases appearing in the assistant's message during streaming
- Token count in displayed response doesn't match what the API reports
- The bug only appears during fast streams (short responses at high token/sec rate don't trigger it)

**Phase to address:** Streaming implementation phase — implement the ref pattern from day one, never migrate away from it later

---

### Pitfall 3: `ANTHROPIC_API_KEY` Leaked to Client Bundle via `createServerFn` Code-Splitting Failure

**What goes wrong:**
TanStack Start has a confirmed bug (Issue #3990) where `createServerFn` from `@tanstack/start-server-core` can leak server-side code into the client bundle. If this occurs, Vite emits warnings about `node:fs`, `node:path`, `node:stream` being externalized for browser compatibility — and more critically, any `process.env.ANTHROPIC_API_KEY` references may be visible in the built JS.

**Why it happens:**
Vite/TanStack's tree-shaking of server-only modules is imperfect when server functions are co-located with client code. Improper import boundaries can pull server-only modules into the client chunk.

**How to avoid:**
- Keep all Anthropic SDK calls in dedicated server-only files (e.g., `src/server/ai.ts`) with no client imports
- Never import `@anthropic-ai/sdk` anywhere except server function files
- After every build, verify the bundle: `grep -r "ANTHROPIC" dist/` should return no matches
- Use TanStack Start's recommended `process.env` access pattern (not `import.meta.env` — only `VITE_`-prefixed vars work in client via `import.meta.env`)
- Run `bun run build` and inspect `dist/` for any server module warnings after wiring the API

**Warning signs:**
- Vite warnings during build: `"node:stream" is externalized for browser compatibility`
- `process.env.ANTHROPIC_API_KEY` appears in a `dist/assets/*.js` file
- Browser network tab shows API key in request headers from client-originated calls

**Phase to address:** API wiring phase — verify bundle cleanliness immediately after first server function is added

---

### Pitfall 4: TanStack Start Env Vars Undefined in Production Builds

**What goes wrong:**
`process.env.ANTHROPIC_API_KEY` works in development (`bun run dev`) but returns `undefined` in production builds (`bun run build && bun run start`). This silently breaks Claude responses — the server function calls Anthropic with no key, gets a 401, and the app shows an error or empty response.

**Why it happens:**
TanStack Start has an open issue (#4318) where environment variable access via `process.env` behaves differently between dev (Vite dev server) and production (server bundle). The production build may not inline the env var or may require different access patterns depending on the deployment target.

**How to avoid:**
- Test with a production build locally before considering any phase "done": `bun run build && ANTHROPIC_API_KEY=xxx bun run start`
- Add an explicit startup check in the server function: throw a clear error if `!process.env.ANTHROPIC_API_KEY`
- Document the required env var in a `.env.example` file immediately when the server function is wired

**Warning signs:**
- Streaming works in `bun run dev` but all Claude responses fail after `bun run build`
- Server logs show `AuthenticationError` or `401` from Anthropic SDK in production
- `process.env.ANTHROPIC_API_KEY` logs as `undefined` in a server function in production

**Phase to address:** API wiring phase — add prod build smoke test to phase completion criteria

---

### Pitfall 5: TanStack Start Abort Signal Not Propagated to Streaming Handler

**What goes wrong:**
When a user navigates away or reloads while a stream is in progress, the stream continues running server-side. The abort signal from the HTTP request is disconnected too early in `server-functions-handler.ts` — the listener is removed right after response creation instead of being maintained for the stream's lifetime. This causes memory accumulation and continued Anthropic API token consumption with no UI to receive the response.

**Why it happens:**
This is a confirmed TanStack Start bug (Issue #4651). The handler was designed for non-streaming responses where abort is irrelevant post-creation. Streaming responses require the abort signal to remain connected until the stream closes.

**How to avoid:**
- Wrap the Anthropic SDK stream in an `AbortController`; connect the controller to the request's abort signal
- In the async generator server function, check `signal.aborted` at each `yield` and break early
- Wire cleanup in the React component: cancel the stream read loop when the component unmounts

```typescript
// Server function pattern
createServerFn().handler(async function* ({ signal }) {
  const stream = anthropic.messages.stream({ ... })
  for await (const event of stream) {
    if (signal?.aborted) break
    if (event.type === 'content_block_delta') {
      yield event.delta.text
    }
  }
})
```

**Warning signs:**
- Anthropic usage dashboard shows long-running requests that never appear in the UI
- Server memory grows over time with active streaming sessions
- Navigation during streaming doesn't stop token consumption

**Phase to address:** Streaming implementation phase — build abort handling from the start, not as a retrofit

---

## Moderate Pitfalls

### Pitfall 6: prompt-kit Uses shadcn Default/New-York Style — Not `base-nova`

**What goes wrong:**
prompt-kit components are installed via the shadcn CLI and assume the `default` or `new-york` shadcn style (Radix UI primitives). The project uses `base-nova` style wrapping `@base-ui/react` primitives. Prompt-kit components that install new shadcn primitives (Button, Textarea, ScrollArea) will install Radix-backed versions that conflict with existing base-nova variants — same component names, different underlying implementations and CSS variable expectations.

**Why it happens:**
prompt-kit is purpose-built for shadcn/ui as it exists in the broader ecosystem (Radix UI). It has no awareness of base-nova or @base-ui/react variants. The shadcn CLI overwrites or creates component files using Radix primitives when a base-nova equivalent already exists.

**How to avoid:**
- Install only prompt-kit's *chat-specific* components that have no shadcn equivalent: `PromptInput`, `Message`, `MessageList`, `MarkdownRenderer`, `Loader`
- For any prompt-kit component that wraps a generic shadcn primitive (Button, Input, ScrollArea), manually adapt it to use the existing base-nova version after installation
- Review each prompt-kit component's source immediately after `bunx shadcn@latest add` and replace `@radix-ui/*` imports with `@base-ui/react` equivalents where they exist
- Never run `bunx shadcn@latest add` for a component that already exists in `src/components/ui/`

**Warning signs:**
- After installing a prompt-kit component, existing components visually change or break
- `src/components/ui/button.tsx` now imports from `@radix-ui/react-slot` instead of `@base-ui/react`
- TypeScript errors in existing components after a prompt-kit install

**Phase to address:** prompt-kit integration phase — audit every file changed by the shadcn CLI before committing

---

### Pitfall 7: Per-Agent Chat State as Sibling `useState` Arrays Causes Race Conditions

**What goes wrong:**
The most natural approach — `const [chosMessages, setCoSMessages] = useState([])`, `const [designerMessages, setDesignerMessages] = useState([])`, etc. — creates four independent state silos in one component. When the active agent changes mid-stream (user switches channels), the streaming loop holds a stale closure over the wrong agent's setter, appending tokens to the wrong conversation or causing a crash.

**Why it happens:**
React closures capture state setters at the time of creation. An async streaming loop started for agent A captures `setAgentAMessages`. If the user switches to agent B while the stream runs, the loop still has agent A's setter — the messages go to the right place, but the UI shows agent B's (empty) conversation. Alternatively, developers use a single `setMessages` with an agent key, but the key captured in the closure may be stale.

**How to avoid:**
Model agent conversations as a single keyed map from the start:

```typescript
type ConversationMap = Record<AgentId, Message[]>
const [conversations, setConversations] = useState<ConversationMap>({ ... })

// In streaming loop, always pass agentId explicitly:
setConversations(prev => ({
  ...prev,
  [agentId]: [...(prev[agentId] ?? []), newMessage]
}))
```

The `agentId` should be captured as a `const` at stream-start and never re-read from component state inside the loop.

**Warning signs:**
- Switching agents while a response streams causes the response to disappear or appear in the wrong channel
- Messages from one agent randomly appear in another agent's history
- TypeScript never catches this — it's a runtime-only bug

**Phase to address:** State architecture phase (before any streaming is wired)

---

### Pitfall 8: Tailwind v4 + shadcn `base-nova` Style Conflicts After prompt-kit Install

**What goes wrong:**
Tailwind CSS v4 has confirmed active bugs with some shadcn component variants — notably the `destructive` Button variant where `bg-destructive` is in the DOM but overridden by default button styles in `index.css`. After installing prompt-kit components, these CSS specificity issues can appear or worsen because prompt-kit components may ship with inline style overrides or Tailwind utility classes that clash with the project's `@theme` definitions.

**Why it happens:**
Tailwind v4's `@theme inline` directive and OKLCH token system interacts differently with class-based specificity than Tailwind v3. shadcn components updated for v4 use `data-slot` attributes for scoped styling. prompt-kit components may not use `data-slot` and may rely on v3 specificity assumptions.

**How to avoid:**
- After installing any prompt-kit component, run the dev server and visually inspect all four agents' chat views
- Use `data-slot` attributes on wrapper elements when overriding prompt-kit component styles
- Add Tailwind specificity overrides using `[&_.prompt-kit-class]:bg-primary` scoping if needed
- Never use `!important` as a first resort — it signals a structural conflict that needs proper resolution

**Warning signs:**
- Prompt-kit message bubbles render with incorrect background colors
- The `PromptInput` textarea ignores the `input` semantic color token
- Button variants inside prompt-kit components appear unstyled or use browser defaults

**Phase to address:** prompt-kit integration phase — visual regression check after every component install

---

### Pitfall 9: Streaming Chunks Arriving Before Route Initialization in TanStack Start

**What goes wrong:**
When a TanStack Start route component suspends (e.g., while loading) and a streaming `ReadableStream` server function returns fast first chunks, the HTML injection order becomes corrupted — stream chunks are inserted into the document before the route initialization scripts run. This causes hydration errors or data appearing in the wrong DOM position.

**Why it happens:**
TanStack Start's SSR streaming inlines data as script tags that are injected incrementally. If a `ReadableStream` yields its first chunk before the router has committed the route to the HTML stream, the chunk script runs before the router's initialization script (Issue #3117).

**How to avoid:**
- Use async generators instead of `ReadableStream` for streaming server functions — they yield more predictably with TanStack Start's streaming infrastructure
- Do not stream Claude responses during SSR (server-side render pass) — trigger streaming only on explicit client-side user interaction after hydration
- Avoid combining suspending loaders with streaming server functions in the same route

**Warning signs:**
- Console errors: "Hydration failed because the server HTML didn't match the client"
- Chat messages appearing briefly then disappearing on initial page load
- TanStack Router warning about route context not being initialized

**Phase to address:** Streaming implementation phase

---

## Minor Pitfalls

### Pitfall 10: Markdown Rendering Flicker During Streaming

**What goes wrong:**
Rendering partial Markdown during streaming (token-by-token) causes visual flickering. Incomplete fenced code blocks, half-rendered headers, or unclosed bold spans cause the Markdown parser to re-interpret the entire document on each token, producing layout jumps.

**Prevention:**
Use prompt-kit's `MarkdownRenderer` with a streaming-aware approach: buffer tokens until a "safe boundary" (newline, period, space after punctuation) before passing them to the renderer. Alternatively render raw text during streaming and only switch to Markdown rendering when `done === true`. The `react-markdown` library with `remark-gfm` handles partial input better than most alternatives.

---

### Pitfall 11: Sending Full Conversation History in Every API Request

**What goes wrong:**
Each user message sends the entire `messages` array as context to Claude. With 4 agents each having independent long conversations, token costs grow quadratically. A 50-message conversation sends 49 messages of context with every new message. At claude-3-5-sonnet pricing, a busy prototype demo day could rack up unexpected costs.

**Prevention:**
Cap context window per agent. For a prototype, limit to the last 20 messages (`messages.slice(-20)`). Add a comment explaining the cap. This is acceptable for a demo with no persistence — users won't notice within a single session.

---

### Pitfall 12: No Visual Distinction Between "Thinking" and "Network Error" States

**What goes wrong:**
A streaming response that hangs (Anthropic API timeout, network blip, dev server restart) looks identical to a response that is still generating — the user sees the same loading animation indefinitely. This is especially bad during demos.

**Prevention:**
Add a timeout to the loading state: if no chunk arrives within 10 seconds, show an error state with a retry button. Use a `setTimeout` cleared on first chunk arrival.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `useState` arrays for each agent's messages | Simple to understand | Race conditions when streaming + agent switching coincide | Never — use a keyed map from day 1 |
| Skip AbortController on streaming | Faster to wire | Memory leaks, continued API spend on abandoned streams | Never in any phase |
| No production build smoke test | Saves 2 min per phase | API key env var silently breaks in prod, discovered at demo | Never — build test takes 2 min |
| Full conversation history in every request | Correct context window | Exponential token cost; Claude context limit hit on long sessions | Acceptable for MVP with 20-message cap |
| Inline Tailwind classes in prompt-kit overrides | Quick styling fix | Diverges from semantic token system; breaks dark mode | OK in prototype, document clearly |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Anthropic SDK + TanStack Start | Importing `@anthropic-ai/sdk` in a component file (leaks to client) | Import only in `src/server/` files called by `createServerFn` |
| prompt-kit + shadcn `base-nova` | Running `bunx shadcn add` for a component that already exists | Audit diff after every CLI install; only install chat-specific prompt-kit components |
| Claude streaming + React state | `setState(prev => prev + token)` in a tight loop | Accumulate in `useRef`, set state with full accumulated value |
| TanStack Start streaming + `AbortSignal` | No abort handling — stream runs to completion even after navigation | Pass `signal` through server function, check `signal.aborted` at each `yield` |
| `ANTHROPIC_API_KEY` + TanStack Start build | Assuming dev behavior carries to prod | Run `bun run build && ANTHROPIC_API_KEY=xxx bun run start` after first wire-up |
| React 19 Strict Mode + streaming | Starting API call on component mount via `useEffect` | Trigger streaming only on explicit user submit action |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `setState` on every streaming token | UI stutters, typing lag, 5 FPS during long responses | Buffer in `useRef`, batch state updates at 30-50ms intervals | After ~100 tokens (~5-10s into a response) |
| Rendering full message list on every token update | Component tree re-renders entire chat on each chunk | Memoize message list items with `React.memo`; isolate streaming message as a separate state slice | After ~20 messages in history |
| Sending full conversation history per request | Slow API responses, token cost spikes | Cap at last 20 messages per agent | After ~30 messages per agent |
| No `will-change` on streaming text container | Paint flickering during token updates | `will-change: contents` on the streaming message element | Noticeable on integrated GPU MacBooks |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `ANTHROPIC_API_KEY` in `VITE_` prefixed var | Key bundled into client JS, visible to all users | Only use `process.env.ANTHROPIC_API_KEY` in server functions; never prefix with `VITE_` |
| Anthropic SDK imported in component files | SDK (and transitively, env var access) reaches client bundle | Keep all SDK usage in `src/server/` or co-located server function files |
| User message content logged to console | Message content visible in browser DevTools | Strip console.log from server functions before any demo |
| No max_tokens limit on Claude requests | Runaway responses cause large unexpected API bills | Always set `max_tokens` (suggest 1024 for chat responses) in every `messages.create` call |
| Server function without input validation | Arbitrary content injection into Claude system prompt | Sanitize user message input: max length (2000 chars), strip control characters |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Input stays enabled during streaming | User sends second message before first completes; race condition | Disable input and send button while `isStreaming === true` |
| No auto-scroll during streaming | User must manually scroll to follow the response; feels broken | Auto-scroll to bottom on each state update, but only if user hasn't scrolled up |
| No indication of which agent is "thinking" vs "idle" | User doesn't know if their message was received | Show a per-agent typing indicator (pulsing dot) from the moment submit fires until stream closes |
| Switching agents clears the visual context | User forgets what they were discussing | Persist each agent's scroll position independently on tab switch |
| Error state looks like a loading state | User waits indefinitely for a failed response | Timeout after 10s of no chunks; show retry button |

---

## "Looks Done But Isn't" Checklist

- [ ] **Streaming:** Response appears in UI during streaming — verify it also appends correctly to history after stream closes
- [ ] **Agent switching:** Chat input disabled mid-stream — verify switching agents mid-stream doesn't corrupt either agent's history
- [ ] **Error handling:** Happy path works — verify 401 (wrong API key), 429 (rate limit), and network timeout all show user-facing errors
- [ ] **Abort:** Navigation away mid-stream appears to work — verify server-side stream actually terminates (check Anthropic usage dashboard)
- [ ] **API key security:** `bun run dev` works — verify `bun run build` produces no bundle warnings about node modules; grep `dist/` for `ANTHROPIC`
- [ ] **Task board:** Mock data renders — verify task counts in sidebar badge match actual task items in board
- [ ] **System prompts:** Claude responds — verify each agent's system prompt actually produces role-appropriate responses (Chief of Staff ≠ Legal)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token duplication from stale closure | LOW | Replace `prev + token` pattern with `useRef` accumulation; 30 min fix |
| API key leaked to bundle | HIGH | Rotate key in Anthropic console immediately; restructure imports; audit bundle; rebuild |
| Double API calls from Strict Mode | LOW | Add AbortController + cleanup to streaming effect; 1 hour fix |
| Wrong agent receives streamed tokens | MEDIUM | Refactor to keyed message map; 2-4 hours if state is already spread across components |
| prompt-kit shadcn overwrite of base-nova components | MEDIUM | `git diff` to identify overwritten files; restore from git; manually adapt prompt-kit component |
| Env var undefined in production | LOW | Add startup assertion in server function; test with prod build locally; 30 min |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Strict Mode double invocation | Streaming implementation | No duplicate API calls in browser network tab (dev mode) |
| Stale closure token duplication | Streaming implementation | Token count in UI matches `usage.output_tokens` in server log |
| API key bundle leak | API wiring | `grep -r "ANTHROPIC" dist/` returns no matches |
| Env vars undefined in production | API wiring | `bun run build && ANTHROPIC_API_KEY=xxx bun run start` smoke test passes |
| Abort signal not propagated | Streaming implementation | Navigating away mid-stream stops token consumption (verified in Anthropic dashboard) |
| prompt-kit base-nova conflicts | prompt-kit integration | `git diff` review after every `bunx shadcn add`; visual regression in all four agent views |
| Per-agent state race conditions | State architecture (before streaming) | Switching agents mid-stream leaves both histories intact and correct |
| Tailwind v4 + shadcn style conflicts | prompt-kit integration | All semantic color tokens render correctly in light + dark mode |
| Streaming chunk ordering / hydration | Streaming implementation | No hydration errors in console; stream triggered only after user action |
| Markdown rendering flicker | Streaming implementation | No layout jumps observed during a 500-token response stream |

---

## Sources

- TanStack Start streaming docs: https://tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions
- TanStack Start issue #4651 (abort signal bug): https://github.com/TanStack/router/issues/4651
- TanStack Start issue #3990 (server bundle leak): https://github.com/TanStack/router/issues/3990
- TanStack Start issue #4318 (env vars in production): https://github.com/TanStack/router/issues/4318
- TanStack Start issue #3117 (streaming chunk ordering): https://github.com/TanStack/router/issues/3117
- React stale closure in streaming — StackOverflow: https://stackoverflow.com/questions/79479435/react-with-openai-streaming-results-in-duplicate-values-when-updating-and-showin
- React 19 Strict Mode double invocation: https://dev.to/hobbada/why-is-useeffect-running-twice-the-complete-guide-to-react-19-strict-mode-and-effect-cleanup-1n60
- React 19 Strict Mode cleanup bug: https://github.com/facebook/react/issues/31098
- LLM chat performance analysis (112x DOM nodes, 1-5 FPS): https://dev.to/gokhan_koc_88338a026508b3/chasing-240-fps-on-llm-chats-4gde
- prompt-kit installation docs: https://www.prompt-kit.com/docs/installation
- shadcn/ui Tailwind v4 guide: https://ui.shadcn.com/docs/tailwind-v4
- shadcn Tailwind v4 destructive button bug: https://github.com/shadcn-ui/ui/issues/8810
- TanStack Start SSE guide (ollioddi.dev): https://ollioddi.dev/blog/tanstack-sse-guide
- Anthropic Claude API security best practices: https://support.anthropic.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure
- TanStack Start env var docs: https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables

---
*Pitfalls research for: Streaming LLM Chat Workspace — Zero Hire Agent MVP*
*Researched: 2026-02-19*
