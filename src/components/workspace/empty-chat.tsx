import type { Agent } from './agents'

import { cn } from '@/lib/utils'

import { AGENT_SUGGESTIONS } from './agents'

interface EmptyChatProps {
  agent: Agent
  onSuggestionClick: (text: string) => void
}

export function EmptyChat({ agent, onSuggestionClick }: EmptyChatProps) {
  const suggestions = AGENT_SUGGESTIONS[agent.id] ?? []

  return (
    <div className="flex flex-1 flex-col justify-end pb-6">
      {/* Agent intro */}
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

      {/* 2x2 suggestion grid */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map(({ text, icon: Icon }) => (
            <button
              key={text}
              type="button"
              onClick={() => onSuggestionClick(text)}
              className={cn(
                'border-border hover:bg-accent text-foreground/70 hover:text-foreground',
                'flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
              )}
            >
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <span className="line-clamp-2 leading-snug">{text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
