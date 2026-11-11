export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#b6ff3b" />
      <path d="M10 23V9h7a5 5 0 0 1 0 10h-3.5" fill="none" stroke="#0b0f02" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21.5" cy="23" r="2" fill="#0b0f02" />
    </svg>
  );
}
