import { useState } from "react";
import type { SessionUser } from "@smt/shared/api-types";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  return user ? <AppShell user={user} /> : <LoginPage onLoggedIn={setUser} />;
}
