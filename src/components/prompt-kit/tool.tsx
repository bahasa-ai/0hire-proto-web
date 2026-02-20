import { useState } from 'react'

import {
  CheckCircle,
  ChevronDown,
  Loader2,
  Settings,
  XCircle,
} from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export type ToolPart = {
  type: string
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId?: string
  errorText?: string
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
  className?: string
}

export function Tool({ toolPart, defaultOpen = false, className }: ToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { state, input, output, toolCallId } = toolPart

  const getStateIcon = () => {
    switch (state) {
      case 'input-streaming':
        return <Loader2 className="size-4 animate-spin text-blue-500" />
      case 'input-available':
        return <Settings className="size-4 text-orange-500" />
      case 'output-available':
        return <CheckCircle className="size-4 text-green-500" />
      case 'output-error':
        return <XCircle className="size-4 text-red-500" />
    }
  }

  const getStateBadge = () => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium'
    switch (state) {
      case 'input-streaming':
        return (
          <span
            className={cn(
              base,
              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            )}
          >
            Processing
          </span>
        )
      case 'input-available':
        return (
          <span
            className={cn(
              base,
              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            )}
          >
            Ready
          </span>
        )
      case 'output-available':
        return (
          <span
            className={cn(
              base,
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            )}
          >
            Completed
          </span>
        )
      case 'output-error':
        return (
          <span
            className={cn(
              base,
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            )}
          >
            Error
          </span>
        )
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return String(value)
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }

  return (
    <div
      className={cn(
        'border-border mt-3 overflow-hidden rounded-lg border',
        className,
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className={cn(
            'bg-background flex h-auto w-full cursor-pointer items-center justify-between rounded-none px-3 py-2 font-normal',
            'hover:bg-accent/50 transition-colors',
          )}
        >
          <div className="flex items-center gap-2">
            {getStateIcon()}
            <span className="font-mono text-sm font-medium">
              {toolPart.type}
            </span>
            {getStateBadge()}
          </div>
          <ChevronDown
            className={cn(
              'size-4 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-border border-t">
          <div className="bg-muted/30 space-y-3 p-3">
            {input && Object.keys(input).length > 0 && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Input
                </h4>
                <div className="bg-muted rounded border p-2 font-mono text-sm">
                  {Object.entries(input).map(([key, value]) => (
                    <div key={key} className="mb-1 last:mb-0">
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span className="text-foreground">
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {output && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Output
                </h4>
                <div className="bg-muted max-h-60 overflow-auto rounded border p-2 font-mono text-sm">
                  <pre className="text-foreground whitespace-pre-wrap">
                    {formatValue(output)}
                  </pre>
                </div>
              </div>
            )}
            {state === 'output-error' && toolPart.errorText && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-red-500">Error</h4>
                <div className="bg-background rounded border border-red-200 p-2 text-sm dark:border-red-950">
                  {toolPart.errorText}
                </div>
              </div>
            )}
            {state === 'input-streaming' && (
              <div className="text-muted-foreground text-sm">
                Processing tool call…
              </div>
            )}
            {toolCallId && (
              <div className="text-muted-foreground border-t pt-2 text-xs">
                <span className="font-mono">Call ID: {toolCallId}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
