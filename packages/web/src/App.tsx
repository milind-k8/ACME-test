import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginPage } from "@/features/auth/LoginPage";
import { useSession } from "@/features/auth/useSession";
import { EmployeesPage } from "@/features/employees/EmployeesPage";

export function App() {
  const { session, setUser, logout } = useSession();
  if (session.status === "authenticated")
    return (
      <AppShell user={session.user} onLogout={() => void logout()}>
        <EmployeesPage />
      </AppShell>
    );
  if (session.status === "anonymous") return <LoginPage onLoggedIn={setUser} />;
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
