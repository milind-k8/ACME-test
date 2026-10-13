import type { SessionUser } from "@smt/shared/api-types";
import { Button } from "@/components/ui/button";

export function AppShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">ACME Salary Management</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="p-6" />
    </div>
  );
}
