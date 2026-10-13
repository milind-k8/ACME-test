import { useState, type SubmitEvent } from "react";
import type { SessionUser } from "@smt/shared/api-types";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { LogoMark } from "@/components/LogoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { LINKS } from "@/lib/links";
import { login } from "./auth.api";
import { LOGIN_HIGHLIGHTS } from "./auth.constants";

export function LoginPage({ onLoggedIn }: { onLoggedIn: (user: SessionUser) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : "";
    };
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({
        email: field("email"),
        password: field("password"),
      });
      onLoggedIn(user);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside
        className="relative hidden overflow-hidden bg-neutral-900 bg-cover bg-center text-white lg:flex"
        style={{ backgroundImage: `url(${LINKS.loginBrandPhoto})` }}
      >
        {/* Neutral shade, never lighter than black/60, keeps white text at AA (>= 5.7:1) even over the photo's white sky. */}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-black/60 to-black/80" />
        <div className="relative flex flex-1 flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <LogoMark className="bg-primary-foreground text-primary" />
            <span className="text-lg font-semibold">ACME Salary Management</span>
          </div>
          <div className="max-w-md">
            <p className="text-4xl leading-tight font-semibold tracking-tight">
              Every salary, every country, in one place.
            </p>
            <ul className="mt-8 flex flex-col gap-4">
              {LOGIN_HIGHLIGHTS.map((text) => (
                <li key={text} className="flex gap-3">
                  <CheckIcon />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm">For the ACME HR team</p>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMark className="bg-primary text-primary-foreground" />
            <span className="text-lg font-semibold">ACME Salary Management</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your HR account to continue.</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@acme.com"
                className="h-10"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-10"
                required
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" className="h-10 w-full" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-8 text-xs text-muted-foreground">
            This is salary data. Sessions end automatically after 8 hours.
          </p>
        </div>
      </main>
    </div>
  );
}
