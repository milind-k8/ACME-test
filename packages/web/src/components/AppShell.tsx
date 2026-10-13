import type { SessionUser } from "@smt/shared/api-types";

export function AppShell({ user }: { user: SessionUser }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">ACME Salary Management</h1>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </header>
      <main className="p-6" />
    </div>
  );
}
