import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// Imported after the DOM exists; testing-library needs `document` at import time.
const { cleanup } = await import("@testing-library/react");
const { afterEach } = await import("bun:test");
afterEach(cleanup);
