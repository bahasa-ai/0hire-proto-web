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
        return <Loader2 className="size-3.5 animate-spin text-blue-500" />
      case 'input-available':
        return <Settings className="size-3.5 text-orange-500" />
      case 'output-available':
        return <CheckCircle className="size-3.5 text-green-500" />
      case 'output-error':
        return <XCircle className="size-3.5 text-red-500" />
    }
  }

  // Human-readable title from input.title, falling back to humanized function name
  const getTitle = () => {
    if (input?.title && typeof input.title === 'string') return input.title
    return toolPart.type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  // Strip the leading verb (create_, generate_, build_, draft_, etc.) to get the task type noun
  const getTaskType = () => {
    const stripped = toolPart.type.replace(
      /^(create|generate|build|draft|make|get|fetch|run|execute)_/,
      '',
    )
    return stripped.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
            'bg-muted/40 flex h-auto w-full cursor-pointer items-center justify-between rounded-none px-3 py-2.5 font-normal',
            'hover:bg-muted/60 transition-colors',
          )}
        >
          <div className="flex items-center gap-2.5">
            {getStateIcon()}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Task
                </span>
                <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                  {getTaskType()}
                </span>
              </div>
              <span className="text-foreground text-sm leading-none font-medium">
                {getTitle()}
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform duration-200',
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
