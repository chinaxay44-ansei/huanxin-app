export function AIPhotoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="48" height="48" rx="12" stroke="currentColor" strokeWidth="4" />
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="3" />
      <path d="M8 44 L20 32 L32 44 L44 28 L56 40 L56 56 L8 56 Z" fill="currentColor" opacity="0.3" />
      <circle cx="52" cy="12" r="8" fill="var(--color-brand)" />
      {/* </CHANGE> */}
      <path d="M48 12 L50 14 L56 8" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AnimatePhotoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" />
      <path d="M26 22 L26 42 L42 32 Z" fill="currentColor" />
      <path
        d="M32 8 A24 24 0 0 1 56 32"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <circle cx="52" cy="12" r="8" fill="var(--color-brand)" />
      {/* </CHANGE> */}
      <path d="M48 12 L50 14 L56 8" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AIOutfitIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 12 L32 8 L44 12 L44 24 L40 28 L40 56 L24 56 L24 28 L20 24 Z" stroke="currentColor" strokeWidth="4" />
      <path d="M28 28 L28 48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 28 L36 48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="52" cy="12" r="8" fill="var(--color-brand)" />
      {/* </CHANGE> */}
      <path d="M48 12 L50 14 L56 8" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AIGenerateIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="48" height="40" rx="8" stroke="currentColor" strokeWidth="4" />
      <path
        d="M20 32 L28 40 L44 24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="12" r="8" fill="var(--color-brand)" />
      {/* </CHANGE> */}
      <path d="M48 12 L50 14 L56 8" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AIRepairIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M40 8 L48 16 L28 36 L20 44 L16 40 L24 32 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M36 12 L44 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="20" cy="44" r="8" stroke="currentColor" strokeWidth="3" />
      <circle cx="52" cy="12" r="8" fill="var(--color-brand)" />
      {/* </CHANGE> */}
      <path d="M48 12 L50 14 L56 8" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
