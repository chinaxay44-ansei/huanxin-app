import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('relative flex items-center justify-center', className)}
      {...props}
    >
      {/* Outer rotating ring with gradient */}
      <div className="absolute inset-0 rounded-full border-[3px] border-primary/10" />
      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-[spin_2s_cubic-bezier(0.76,0,0.24,1)_infinite]" />
      
      {/* Middle layered rings for depth */}
      <div className="absolute inset-2 rounded-full border border-primary/20 animate-[pulse_3s_ease-in-out_infinite]" />
      <div className="absolute inset-2 rounded-full border-t-2 border-transparent border-t-brand/60 animate-[spin_3s_linear_infinite]" />
      
      {/* Inner fast dash */}
      <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-primary/80 animate-[spin_1s_ease-in-out_infinite_reverse]" />
      
      {/* Center particle with glow */}
      <div className="relative">
        <div className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)] animate-pulse" />
        <div className="absolute inset-0 size-1.5 rounded-full bg-primary/40 animate-ping" />
      </div>
      
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { Spinner }
