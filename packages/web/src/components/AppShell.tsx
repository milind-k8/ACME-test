import type { ReactNode } from "react";
import type { SessionUser } from "@smt/shared/api-types";
import { ChartIcon } from "@/components/icons/ChartIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";
import { LogoMark } from "@/components/LogoMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";

// Screens, in sidebar order. App.tsx picks the page for the current path.
export const PATHS = { dashboard: "/", employees: "/employees" } as const;
const NAV_ITEMS = [
  { path: PATHS.dashboard, label: "Dashboard", Icon: ChartIcon },
  { path: PATHS.employees, label: "Employees", Icon: UsersIcon },
] as const;

const SHELL_COPY = {
  accountMenu: "Account menu",
  signedInAs: "Signed in as",
  logOut: "Log out",
} as const;

export function AppShell({
  user,
  activePath,
  onLogout,
  children,
}: {
  user: SessionUser;
  activePath: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen bg-muted/50">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-background">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
          <LogoMark className="bg-primary text-primary-foreground" />
          <h1 className="text-sm leading-tight font-semibold">ACME Salary Management</h1>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ path, label, Icon }) => {
            const current = path === activePath;
            return (
              <a
                key={path}
                href={path}
                aria-current={current ? "page" : undefined}
                onClick={(event) => {
                  // Client-side navigation; a modified click (new tab, etc.) keeps the browser's default.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  navigate(path);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground",
                  current ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                <Icon className={cn("size-4", current ? "text-primary" : "text-muted-foreground")} />
                {label}
              </a>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end border-b bg-background px-6">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={SHELL_COPY.accountMenu}
              className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase outline-none hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {user.email.charAt(0)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block text-xs text-muted-foreground">{SHELL_COPY.signedInAs}</span>
                <span className="block truncate font-medium">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onLogout}>{SHELL_COPY.logOut}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {/* Pages fill the remaining height and decide what scrolls inside it. */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
