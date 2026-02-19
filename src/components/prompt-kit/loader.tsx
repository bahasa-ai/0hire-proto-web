import React from 'react'

import { cn } from '@/lib/utils'

export interface LoaderProps {
  variant?:
    | 'circular'
    | 'classic'
    | 'pulse'
    | 'pulse-dot'
    | 'dots'
    | 'typing'
    | 'wave'
    | 'bars'
    | 'terminal'
    | 'text-blink'
    | 'text-shimmer'
    | 'loading-dots'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function DotsLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dotSizes = { sm: 'h-1.5 w-1.5', md: 'h-2 w-2', lg: 'h-2.5 w-2.5' }
  const containerSizes = { sm: 'h-4', md: 'h-5', lg: 'h-6' }

  return (
    <div
      className={cn(
        'flex items-center space-x-1',
        containerSizes[size],
        className,
      )}
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-muted-foreground animate-[bounce-dots_1.4s_ease-in-out_infinite] rounded-full',
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TypingLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dotSizes = { sm: 'h-1 w-1', md: 'h-1.5 w-1.5', lg: 'h-2 w-2' }
  const containerSizes = { sm: 'h-4', md: 'h-5', lg: 'h-6' }

  return (
    <div
      className={cn(
        'flex items-center space-x-1',
        containerSizes[size],
        className,
      )}
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-muted-foreground animate-[typing_1s_infinite] rounded-full',
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 250}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TextShimmerLoader({
  text = 'Thinking',
  className,
  size = 'md',
}: {
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

  return (
    <div
      className={cn(
        'bg-[linear-gradient(to_right,var(--muted-foreground)_40%,var(--foreground)_60%,var(--muted-foreground)_80%)]',
        'animate-[shimmer_4s_infinite_linear] bg-[length:200%_auto] bg-clip-text font-medium text-transparent',
        textSizes[size],
        className,
      )}
    >
      {text}
    </div>
  )
}

export function Loader({
  variant = 'dots',
  size = 'md',
  text,
  className,
}: LoaderProps) {
  switch (variant) {
    case 'dots':
      return <DotsLoader size={size} className={className} />
    case 'typing':
      return <TypingLoader size={size} className={className} />
    case 'text-shimmer':
      return <TextShimmerLoader text={text} size={size} className={className} />
    default:
      return <DotsLoader size={size} className={className} />
  }
}
