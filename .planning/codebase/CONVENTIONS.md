# Coding Conventions

**Analysis Date:** 2026-02-19

## Naming Patterns

**Files:**
- kebab-case for all source files: `button.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`, `component-example.tsx`
- Route files follow TanStack Router conventions: `__root.tsx`, `index.tsx`

**Components (exports):**
- PascalCase for all exported component names: `Button`, `DropdownMenu`, `AlertDialog`, `ComponentExample`
- Compound components use `Parent` + `ChildConcept` pattern: `CardHeader`, `CardFooter`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`

**Functions:**
- camelCase for internal/non-exported functions: `getRouter`, `useComboboxAnchor`
- PascalCase for React component functions (exported or local): `FormExample`, `CardExample`, `RootDocument`

**Variables:**
- camelCase for regular variables: `buttonVariants`, `badgeVariants`, `fieldVariants`, `roleItems`, `frameworks`
- `const` preferred for variant definitions and static data

**Types/Interfaces:**
- TypeScript types inlined from component prop signatures rather than standalone interfaces
- Uses `React.ComponentProps<"element">` pattern for native element wrappers
- Uses `PrimitiveName.ComponentPart.Props` for base-ui primitive prop types

**CVA Variants:**
- Named `[componentName]Variants` (camelCase): `buttonVariants`, `badgeVariants`, `fieldVariants`, `inputGroupAddonVariants`

**data-slot attributes:**
- Every component sets `data-slot="[component-name]"` in kebab-case: `data-slot="button"`, `data-slot="card-header"`, `data-slot="dropdown-menu-item"`
- Used as CSS selection targets in compound component relationships

## Code Style

**Formatter:** Prettier 3.x

**Key settings (from `.prettierrc`):**
- `singleQuote: true` — use single quotes for strings
- `semi: false` — no semicolons
- `arrowParens: "avoid"` — omit parens for single-param arrow functions
- `quoteProps: "consistent"` — all or no object key quotes per object

**Linting:**
- ESLint via `@tanstack/eslint-config` (see `eslint.config.js`)
- TypeScript strict mode: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`

## Import Organization

Enforced by `@ianvs/prettier-plugin-sort-imports`. Order is:

1. Type imports (`<TYPES>`)
2. `react` (exact)
3. Node built-in modules
4. Third-party modules (e.g. `@base-ui/react/*`, `class-variance-authority`, `lucide-react`)
5. Internal aliased imports (`@/*`)
6. Relative imports (`./`, `../`)
7. CSS imports (`*.css`)

**Example from `src/components/ui/button.tsx`:**
```typescript
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
```

**Example with React namespace from `src/components/ui/card.tsx`:**
```typescript
import * as React from "react"

import { cn } from "@/lib/utils"
```

**Path Aliases:**
- `@/*` resolves to `src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Canonical alias targets: `@/components/ui/`, `@/lib/utils`, `@/components/`

## Component Authoring Pattern

**Primitive Wrapping (most common):**
Components wrap `@base-ui/react` primitives. The pattern is:
```typescript
function ComponentName({ className, ...props }: PrimitiveNamespace.Part.Props) {
  return (
    <PrimitiveNamespace.Part
      data-slot="component-name"
      className={cn('base-classes', className)}
      {...props}
    />
  )
}
```

**Native Element Wrapping:**
For HTML element wrappers without a base-ui primitive:
```typescript
function ComponentName({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="component-name"
      className={cn('base-classes', className)}
      {...props}
    />
  )
}
```

**CVA Variant Components:**
```typescript
const buttonVariants = cva('base-classes', {
  variants: {
    variant: { default: '...', outline: '...' },
    size: { default: '...', sm: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: PrimitiveName.Props & VariantProps<typeof buttonVariants>) {
  return (
    <PrimitiveName
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

**Render Prop Pattern (base-ui specific):**
Some base-ui primitives accept a `render` prop to substitute the rendered element:
```typescript
<AlertDialogPrimitive.Close
  render={<Button variant={variant} size={size} />}
  {...props}
/>
```

## Styling

**Always use semantic color tokens** — never hardcode hex/rgb/oklch values in components.

Available token classes (defined as CSS custom properties in `src/styles.css`):
- `bg-background`, `text-foreground` — page base
- `bg-card`, `text-card-foreground` — card surfaces
- `bg-popover`, `text-popover-foreground` — popover/dropdown
- `bg-primary`, `text-primary-foreground` — primary actions
- `bg-secondary`, `text-secondary-foreground` — secondary actions
- `bg-muted`, `text-muted-foreground` — subdued surfaces/text
- `bg-accent`, `text-accent-foreground` — hover/focus
- `text-destructive`, `bg-destructive` — destructive state
- `border-border`, `border-input`, `ring-ring` — borders/focus rings

**Class merging:** Always use `cn()` from `@/lib/utils` for conditional Tailwind merging. Never concatenate class strings manually.

**Class sorting:** `prettier-plugin-tailwindcss` enforces canonical Tailwind class order. Additional custom sort targets in `.prettierrc`: `cva`, `cn`, `clsx`, `join` functions, and custom props `enter`, `enterFrom`, etc.

**data-* state targeting:** Components use `data-[state]` Tailwind variants for ARIA/state styling:
- `data-open:animate-in`, `data-closed:animate-out`
- `data-disabled:pointer-events-none`, `data-disabled:opacity-50`
- `aria-invalid:ring-destructive/20`
- `focus-visible:ring-3`

## Error Handling

No formal error boundary or error handling patterns exist in the current codebase. It is a UI mockup with no async operations or API calls. The `FieldError` component in `src/components/ui/field.tsx` handles form-level validation errors:

```typescript
function FieldError({
  errors,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  // Deduplicates errors by message and renders single or list form
}
```

## Logging

No logging framework. No `console.log` calls in source. This is expected for a UI prototype without backend integration.

## Comments

Sparse commenting in the codebase. One inline comment found in `vite.config.ts`:
```typescript
// this is the plugin that enables path aliases
viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
```

Convention from `CLAUDE.md`:
- Write professional developer comments (concise, technical, neutral)
- Explain intent/constraints (what/why), not process
- No first-person, no future narration
- Tags: `TODO:` (deferred work), `FIXME:` (known defect), `HACK:` (workaround), `NOTE:` (factual context)

## Function Design

**Component function size:** Lean single-responsibility components. Compound components split sub-parts into separate named functions in the same file.

**Parameter destructuring:** All component props are destructured with defaults at the function signature level:
```typescript
function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & { size?: 'sm' | 'default' })
```

**Spread pattern:** `...props` always passed last to underlying primitive/element.

## Module Design

**Exports:** Named exports only. No default exports except for route objects (`export const Route = ...`) and vite config (`export default config`).

**Export style:**
```typescript
export {
  ComponentA,
  ComponentB,
  componentVariants,
}
```

**No barrel files** — each component file exports its own named items directly. Consumers import from specific paths: `@/components/ui/button`, `@/components/ui/card`.

**"use client" directive:** Present on interactive/stateful components: `alert-dialog.tsx`, `dropdown-menu.tsx`, `field.tsx`, `separator.tsx`, `component-example.tsx`. Omitted on purely presentational wrappers like `card.tsx`, `label.tsx`, `textarea.tsx`, `input.tsx`.

---

*Convention analysis: 2026-02-19*
