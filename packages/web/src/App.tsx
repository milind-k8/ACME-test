import { AppShell, PATHS } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginPage } from "@/features/auth/LoginPage";
import { useSession } from "@/features/auth/useSession";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { EmployeesPage } from "@/features/employees/EmployeesPage";
import { usePath } from "@/lib/router";

export function App() {
  const { session, setUser, logout } = useSession();
  const path = usePath();
  if (session.status === "authenticated") {
    // Any unknown path shows the Dashboard, the landing page.
    const activePath = path === PATHS.employees ? PATHS.employees : PATHS.dashboard;
    return (
      <AppShell user={session.user} activePath={activePath} onLogout={() => void logout()}>
        {activePath === PATHS.employees ? <EmployeesPage /> : <DashboardPage />}
      </AppShell>
    );
  }
  if (session.status === "anonymous") return <LoginPage onLoggedIn={setUser} />;
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
