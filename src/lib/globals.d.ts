// Legacy GM_* grants (the GM4 `GM.*` promise API is not used by these scripts),
// plus the page window and anything pulled in via @require.

declare function GM_getValue<T = string>(key: string, fallback: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_registerMenuCommand(caption: string, fn: () => void): number;

declare const unsafeWindow: Window & typeof globalThis & Record<string, unknown>;

type ToastifyOptions = {
  node?: Node;
  text?: string;
  duration?: number;
  close?: boolean;
  gravity?: 'top' | 'bottom';
  position?: 'left' | 'center' | 'right';
  style?: Record<string, string>;
};
declare function Toastify(options: ToastifyOptions): { showToast(): void };
