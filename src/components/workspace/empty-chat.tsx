import { AGENT_SUGGESTIONS } from './agents'
import type { Agent } from './agents'

import { PromptSuggestion } from '@/components/prompt-kit/prompt-suggestion'


interface EmptyChatProps {
  agent: Agent
  onSuggestionClick: (text: string) => void
}

export function EmptyChat({ agent, onSuggestionClick }: EmptyChatProps) {
  const suggestions = AGENT_SUGGESTIONS[agent.id] ?? []

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <div className="mb-8 text-center">
        <div
          className={`text-primary-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-full text-base font-semibold tracking-wide ${agent.accentColor}`}
        >
          {agent.initials}
        </div>
        <h2 className="text-foreground text-base font-semibold">
          {agent.name}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {agent.description}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-1">
        {suggestions.map(suggestion => (
          <PromptSuggestion
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="text-foreground/70 hover:text-foreground hover:bg-accent w-full justify-start rounded-md px-3 py-2 text-sm transition-colors"
          >
            {suggestion}
          </PromptSuggestion>
        ))}
      </div>
    </div>
  )
}
