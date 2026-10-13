import { useCallback, useSyncExternalStore } from "react";

// pushState fires no event, so our own writes notify listeners directly; popstate covers Back/Forward.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

const getSearch = () => window.location.search;

/** The URL query string as state. `undefined` or "" removes a key. */
export function useQueryParams(): [URLSearchParams, (changes: Record<string, string | undefined>) => void] {
  const search = useSyncExternalStore(subscribe, getSearch);

  const update = useCallback((changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    listeners.forEach((listener) => {
      listener();
    });
  }, []);

  return [new URLSearchParams(search), update];
}
