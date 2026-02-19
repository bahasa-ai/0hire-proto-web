import type { VariantProps } from 'class-variance-authority'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PromptSuggestionProps = {
  children: React.ReactNode
  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
  className?: string
  highlight?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

function PromptSuggestion({
  children,
  variant,
  size,
  className,
  highlight,
  ...props
}: PromptSuggestionProps) {
  const isHighlightMode = highlight !== undefined && highlight.trim() !== ''
  const content = typeof children === 'string' ? children : ''

  if (!isHighlightMode) {
    return (
      <button
        className={cn(
          buttonVariants({ variant: variant ?? 'outline', size }),
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }

  if (!content) {
    return (
      <button
        className={cn(
          buttonVariants({ variant: variant ?? 'outline', size }),
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }

  const trimmedHighlight = highlight.trim()
  const contentLower = content.toLowerCase()
  const highlightLower = trimmedHighlight.toLowerCase()
  const shouldHighlight = contentLower.includes(highlightLower)

  return (
    <button
      className={cn(
        buttonVariants({ variant: variant ?? 'outline', size }),
        className,
      )}
      {...props}
    >
      {shouldHighlight ? (
        (() => {
          const index = contentLower.indexOf(highlightLower)
          if (index === -1) return <span className="opacity-50">{content}</span>

          const actualHighlightedText = content.substring(
            index,
            index + highlightLower.length,
          )
          const before = content.substring(0, index)
          const after = content.substring(index + actualHighlightedText.length)

          return (
            <>
              {before && <span className="opacity-50">{before}</span>}
              <span className="opacity-100">{actualHighlightedText}</span>
              {after && <span className="opacity-50">{after}</span>}
            </>
          )
        })()
      ) : (
        <span className="opacity-50">{content}</span>
      )}
    </button>
  )
}

export { PromptSuggestion }
