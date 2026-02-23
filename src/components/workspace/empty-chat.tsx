import { AGENT_SUGGESTIONS } from './agents'
import type { Agent } from './agents'
import { PromptSuggestion } from '@/components/prompt-kit/prompt-suggestion'
import { cn } from '@/lib/utils'

const SUGGESTION_COLORS = [
  { card: 'hover:text-rose-500', icon: 'group-hover:text-rose-500' },
  { card: 'hover:text-sky-500', icon: 'group-hover:text-sky-500' },
  { card: 'hover:text-teal-500', icon: 'group-hover:text-teal-500' },
  { card: 'hover:text-violet-500', icon: 'group-hover:text-violet-500' },
  { card: 'hover:text-orange-500', icon: 'group-hover:text-orange-500' },
  { card: 'hover:text-amber-500', icon: 'group-hover:text-amber-500' },
]

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
        <div className="bg-muted mb-4 flex size-14 items-center justify-center overflow-hidden rounded-full">
          <img
            src={agent.avatar}
            alt={agent.name}
            className="size-full object-cover"
          />
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
          {suggestions.map(({ text, icon: Icon }, i) => {
            const color = SUGGESTION_COLORS[i % SUGGESTION_COLORS.length]
            return (
              <PromptSuggestion
                key={text}
                variant="outline"
                size="default"
                onClick={() => onSuggestionClick(text)}
                className={cn(
                  'group text-foreground/70 h-auto flex-col items-start gap-2 rounded-lg border bg-gray-50 p-3 text-left text-sm shadow-xs inset-shadow-2xs inset-shadow-white',
                  color.card,
                )}
              >
                <Icon
                  className={cn(
                    'text-muted-foreground size-4 shrink-0 transition-colors',
                    color.icon,
                  )}
                />
                <span className="line-clamp-2 leading-snug">{text}</span>
              </PromptSuggestion>
            )
          })}
        </div>
      )}
    </div>
  )
}
