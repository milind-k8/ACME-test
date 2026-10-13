import type { ReactNode } from "react";
import type { SessionUser } from "@smt/shared/api-types";
import { Button } from "@/components/ui/button";

export function AppShell({
  user,
  onLogout,
  children,
}: {
  user: SessionUser;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">ACME Salary Management</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>
      <div className="flex flex-1">
        <nav className="w-48 shrink-0 border-r p-4">
          {/* One screen for now; the router arrives with Insights. */}
          <a href="/" aria-current="page" className="block rounded-md bg-muted px-3 py-2 text-sm font-medium">
            Employees
          </a>
        </nav>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
