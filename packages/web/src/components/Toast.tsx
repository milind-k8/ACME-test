import { useEffect } from "react";

const VISIBLE_MS = 4000;

/** A short success message in the corner. Announced politely to screen readers; hides itself. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, VISIBLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [message, onDone]);

  return (
    <div
      role="status"
      className="fixed right-6 bottom-6 z-50 rounded-lg border bg-background px-4 py-3 text-sm font-medium shadow-lg"
    >
      {message}
    </div>
  );
}
