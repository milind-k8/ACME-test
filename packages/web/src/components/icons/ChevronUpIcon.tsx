export function ChevronUpIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M14.7 12.7a1 1 0 0 1-1.4 0L10 9.4l-3.3 3.3a1 1 0 0 1-1.4-1.4l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
