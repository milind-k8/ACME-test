import { GlobalRegistrator } from "@happy-dom/global-registrator";

// A real origin, so history.pushState and location.search work (about:blank ignores them).
GlobalRegistrator.register({ url: "http://localhost/" });

// Imported after the DOM exists; testing-library needs `document` at import time.
const { cleanup } = await import("@testing-library/react");
const { afterEach } = await import("bun:test");
afterEach(cleanup);
