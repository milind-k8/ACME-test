import { useEffect, useState } from "react";
import type { SessionUser } from "@smt/shared/api-types";
import { ApiError, onUnauthorized } from "@/lib/api";
import { getMe, logout } from "./auth.api";

export type Session =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: SessionUser };

export function useSession() {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    getMe()
      .then((user) => {
        setSession({ status: "authenticated", user });
      })
      .catch((err: unknown) => {
        if (!(err instanceof ApiError)) throw err;
        setSession({ status: "anonymous" });
      });
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setSession({ status: "anonymous" });
      }),
    [],
  );

  return {
    session,
    setUser: (user: SessionUser) => {
      setSession({ status: "authenticated", user });
    },
    logout: async () => {
      await logout();
      setSession({ status: "anonymous" });
    },
  };
}
