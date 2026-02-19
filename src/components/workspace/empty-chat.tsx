import { ArrowRight } from 'lucide-react'
import { AGENT_SUGGESTIONS } from './agents'
import type { Agent } from './agents'


import { PromptSuggestion } from '@/components/prompt-kit/prompt-suggestion'
import { cn } from '@/lib/utils'


interface EmptyChatProps {
  agent: Agent
  onSuggestionClick: (text: string) => void
}

export function EmptyChat({ agent, onSuggestionClick }: EmptyChatProps) {
  const suggestions = AGENT_SUGGESTIONS[agent.id] ?? []

  return (
    <div className="flex flex-1 flex-col justify-end px-6 pb-6">
      {/* Agent intro block — anchored near the bottom like Slack's channel header */}
      <div className="mb-6">
        <div
          className={cn(
            'text-primary-foreground mb-4 flex size-14 items-center justify-center rounded-2xl text-base font-semibold',
            agent.accentColor,
          )}
        >
          {agent.initials}
        </div>
        <h2 className="text-foreground mb-0.5 text-xl font-bold">
          {agent.name}
        </h2>
        <p className="text-muted-foreground mb-1 text-sm font-medium">
          {agent.role}
        </p>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
          {agent.description}
        </p>
      </div>

      {/* Suggestion prompts */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-muted-foreground/60 mb-2 text-[11px] font-semibold tracking-widest uppercase">
            Try asking
          </p>
          <div className="space-y-1">
            {suggestions.map(suggestion => (
              <PromptSuggestion
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                className={cn(
                  'border-border hover:bg-accent text-foreground/70 hover:text-foreground',
                  'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                )}
              >
                <ArrowRight className="text-muted-foreground/50 size-3.5 shrink-0" />
                {suggestion}
              </PromptSuggestion>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
