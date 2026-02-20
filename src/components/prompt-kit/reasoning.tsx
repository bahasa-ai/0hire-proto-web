import { Collapsible } from '@base-ui/react/collapsible'
import { code } from '@streamdown/code'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Streamdown } from 'streamdown'
import { cn } from '@/lib/utils'

interface ReasoningProps {
  children: React.ReactNode
  className?: string
}

export function Reasoning({ children, className }: ReasoningProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={className}>
      {children}
    </Collapsible.Root>
  )
}

interface ReasoningTriggerProps {
  children: React.ReactNode
  className?: string
}

export function ReasoningTrigger({
  children,
  className,
}: ReasoningTriggerProps) {
  return (
    <Collapsible.Trigger
      className={cn(
        'group flex cursor-pointer items-center gap-1 text-sm transition-opacity hover:opacity-80',
        className,
      )}
    >
      <ChevronRight className="text-muted-foreground size-3.5 transition-transform duration-200 group-data-[panel-open]:rotate-90" />
      {children}
    </Collapsible.Trigger>
  )
}

interface ReasoningContentProps {
  children: React.ReactNode
  markdown?: boolean
  className?: string
}

export function ReasoningContent({
  children,
  markdown,
  className,
}: ReasoningContentProps) {
  return (
    <Collapsible.Panel keepMounted className="reasoning-panel">
      <div
        className={cn(
          'border-muted-foreground/20 text-muted-foreground mt-1.5 border-l-2 pl-3 text-sm leading-relaxed',
          className,
        )}
      >
        {markdown && typeof children === 'string' ? (
          <Streamdown plugins={{ code }}>{children}</Streamdown>
        ) : (
          children
        )}
      </div>
    </Collapsible.Panel>
  )
}
