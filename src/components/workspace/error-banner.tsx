import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ChatErrorType =
  | 'rate-limited'
  | 'network'
  | 'timeout'
  | 'generic'
  | null

const ERROR_MESSAGES: Record<NonNullable<ChatErrorType>, string> = {
  'rate-limited': 'Rate limited — wait a moment before trying again.',
  network: 'Connection lost — check your network and retry.',
  timeout: 'Response timed out — try again.',
  generic: 'Something went wrong. Try again.',
}

interface ErrorBannerProps {
  error: ChatErrorType
  onRetry: () => void
  className?: string
}

export function ErrorBanner({ error, onRetry, className }: ErrorBannerProps) {
  if (!error) return null

  const message = ERROR_MESSAGES[error]
  const isNetwork = error === 'network'

  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/8 flex items-center gap-3 rounded-lg border px-4 py-2.5',
        className,
      )}
    >
      {isNetwork ? (
        <WifiOff className="text-destructive size-4 shrink-0" />
      ) : (
        <AlertCircle className="text-destructive size-4 shrink-0" />
      )}
      <span className="text-destructive flex-1 text-sm">{message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 gap-1.5 px-2 text-xs"
      >
        <RefreshCw className="size-3" />
        Retry
      </Button>
    </div>
  )
}
