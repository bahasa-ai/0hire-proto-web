import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import type { AgentStep } from './workspace-context'
import { cn } from '@/lib/utils'

function StepIcon({ status }: { status: AgentStep['status'] }) {
  switch (status) {
    case 'pending':
      return <Circle className="text-muted-foreground/40 size-3.5 shrink-0" />
    case 'running':
      return <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />
    case 'done':
      return <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
    case 'error':
      return <XCircle className="text-destructive size-3.5 shrink-0" />
  }
}

function AgentStepRow({ step }: { step: AgentStep }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <StepIcon status={step.status} />
      <span
        className={cn(
          'text-sm',
          step.status === 'pending'
            ? 'text-muted-foreground/60'
            : 'text-foreground',
        )}
      >
        {step.label}
      </span>
    </div>
  )
}

export function AgentPlanCard({ steps }: { steps: Array<AgentStep> }) {
  return (
    <div className="border-border/60 bg-muted/20 mb-3 rounded-xl border px-3.5 py-2">
      <div className="divide-border/30 divide-y">
        {steps.map(step => (
          <AgentStepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  )
}
