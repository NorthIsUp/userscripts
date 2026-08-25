// Legacy GM_* grants (DataStore uses the GM4 `GM.*` API, which @types/greasemonkey
// already declares), plus the page window.

declare function GM_getValue<T = string>(key: string, fallback: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_registerMenuCommand(caption: string, fn: () => void): number;

declare const unsafeWindow: Window & typeof globalThis & Record<string, unknown>;
