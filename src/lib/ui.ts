/**
 * Shared UI for the scripts: toasts and settings panels.
 *
 * Everything renders inside a shadow root with `all: initial`, because these
 * are injected into pages whose CSS we don't control (GitHub's Primer resets
 * are especially aggressive). Colors come from one token block that follows the
 * page's color scheme.
 */

const TOAST_HOST_ID = 'us-toast-host';

const TOKENS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  :host {
    --bg: #ffffff;
    --fg: #1f2328;
    --muted: rgba(31, 35, 40, 0.62);
    --line: rgba(128, 128, 128, 0.3);
    --btn-bg: #f6f8fa;
    --accent: #1f883d;
    --danger: #e5484d;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #161b22;
      --fg: #e6edf3;
      --muted: rgba(230, 237, 243, 0.6);
      --line: rgba(128, 128, 128, 0.35);
      --btn-bg: #21262d;
      --accent: #238636;
    }
  }
  button {
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    color: var(--fg);
    background: var(--btn-bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 10px;
  }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.plain { background: none; border: none; opacity: 0.6; padding: 2px 6px; }
  button.plain:hover { opacity: 1; }
  input {
    font: inherit;
    font-size: 13px;
    color: var(--fg);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 8px;
  }
  label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
`;

/** Run once the body exists — scripts running at document-start have none yet. */
function whenBody(fn: () => void) {
  if (document.body) return fn();
  addEventListener('DOMContentLoaded', fn, { once: true });
}

function shadowHost(id: string, css: string): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.id = id;
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = TOKENS + css;
  root.appendChild(style);
  return { host, root };
}

export type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  text: string;
  actions?: ToastAction[];
  /** Auto-dismiss after this many ms; 0 keeps it until dismissed. Default 10s. */
  duration?: number;
  tone?: 'default' | 'danger';
};

const TOAST_CSS = `
  .stack {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    max-width: min(560px, 90vw);
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--line);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    font-size: 13px;
    line-height: 1.4;
  }
  .toast.danger { background: var(--danger); color: #fff; border-color: transparent; }
  .toast.danger button { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.6); color: #fff; }
  .msg { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
`;

let toastStack: HTMLElement | null = null;

function ensureToastStack(): HTMLElement {
  if (toastStack?.isConnected) return toastStack;
  const { host, root } = shadowHost(TOAST_HOST_ID, TOAST_CSS);
  const stack = document.createElement('div');
  stack.className = 'stack';
  root.appendChild(stack);
  document.body.appendChild(host);
  toastStack = stack;
  return stack;
}

/** A dismissible message in the corner of the page, with optional buttons. */
export function toast(opts: ToastOptions): void {
  whenBody(() => {
    const stack = ensureToastStack();

    const node = document.createElement('div');
    node.className = `toast${opts.tone === 'danger' ? ' danger' : ''}`;

    const msg = document.createElement('span');
    msg.className = 'msg';
    msg.textContent = opts.text;
    node.appendChild(msg);

    for (const action of opts.actions ?? []) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.addEventListener('click', action.onClick);
      node.appendChild(btn);
    }

    const dismiss = document.createElement('button');
    dismiss.className = 'plain';
    dismiss.textContent = '✕';
    dismiss.title = 'Dismiss';
    dismiss.addEventListener('click', () => node.remove());
    node.appendChild(dismiss);

    stack.appendChild(node);

    const duration = opts.duration ?? 10_000;
    if (duration > 0) setTimeout(() => node.remove(), duration);
  });
}

const PANEL_CSS = `
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 2147483646; }
  .panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483647;
    width: min(700px, 92vw);
    max-height: 88vh;
    overflow: auto;
    padding: 16px 18px;
    border-radius: 12px;
    background: var(--bg);
    color: var(--fg);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    font-size: 13px;
  }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  h2 { font-size: 16px; margin: 0; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
  .body { display: flex; flex-direction: column; gap: 10px; }
  footer { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .spacer { flex: 1; }
  .settings { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .settings input[type='number'] { width: 64px; }
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 8px; }
  .row input { flex: 1 1 auto; min-width: 0; }
  .row img { width: 24px; height: 24px; border-radius: 50%; flex: 0 0 auto; object-fit: cover; background: var(--line); }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 3px 8px 3px 0; border-top: 1px solid var(--line); }
`;

export type Panel = {
  /** Where content goes. */
  body: HTMLElement;
  close: () => void;
  /** Rebuild the panel from scratch — for panels whose content is a live list. */
  refresh: () => void;
};

export type PanelOptions = {
  /** Dedupe key: opening twice with the same id is a no-op. */
  id: string;
  title: string;
  hint?: string;
  /** Fills in the body. Called again on refresh(). */
  build: (body: HTMLElement, panel: Panel) => void;
  /** Footer buttons, left to right. The close button is always present. */
  footer?: { label: string; primary?: boolean; onClick: (panel: Panel) => void }[];
};

/** A modal settings panel, isolated from the host page's CSS. */
export function openPanel(opts: PanelOptions): Panel | null {
  if (document.getElementById(opts.id)) return null;

  const { host, root } = shadowHost(opts.id, PANEL_CSS);

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';

  const panelEl = document.createElement('div');
  panelEl.className = 'panel';
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-modal', 'true');
  panelEl.setAttribute('aria-label', opts.title);

  const head = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = opts.title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'plain';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close';
  head.append(title, closeBtn);
  panelEl.appendChild(head);

  if (opts.hint) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = opts.hint;
    panelEl.appendChild(hint);
  }

  const body = document.createElement('div');
  body.className = 'body';
  panelEl.appendChild(body);

  const panel: Panel = {
    body,
    close: () => host.remove(),
    refresh: () => {
      body.replaceChildren();
      opts.build(body, panel);
    },
  };

  if (opts.footer?.length) {
    const footer = document.createElement('footer');
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    footer.appendChild(spacer);
    for (const spec of opts.footer) {
      const btn = document.createElement('button');
      btn.textContent = spec.label;
      if (spec.primary) btn.className = 'primary';
      btn.addEventListener('click', () => spec.onClick(panel));
      footer.appendChild(btn);
    }
    panelEl.appendChild(footer);
  }

  closeBtn.addEventListener('click', panel.close);
  backdrop.addEventListener('click', panel.close);
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') panel.close();
  });

  root.append(backdrop, panelEl);
  opts.build(body, panel);
  document.body.appendChild(host);
  return panel;
}

export type Setting =
  | { key: string; kind: 'boolean'; label: string }
  | { key: string; kind: 'number'; label: string; min?: number; max?: number }
  | { key: string; kind: 'text'; label: string; placeholder?: string };

export type Editor<T> = { el: HTMLElement; read: () => T };

/** A row of labelled controls, one per setting, that reads back as an object. */
export function settingsEditor<T extends Record<string, unknown>>(
  settings: Setting[],
  values: T,
): Editor<Partial<T>> {
  const el = document.createElement('div');
  el.className = 'settings';
  const inputs = new Map<string, HTMLInputElement>();

  for (const setting of settings) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    inputs.set(setting.key, input);
    const value = values[setting.key];

    switch (setting.kind) {
      case 'boolean':
        input.type = 'checkbox';
        input.checked = Boolean(value);
        label.append(input, setting.label);
        break;
      case 'number':
        input.type = 'number';
        if (setting.min != null) input.min = String(setting.min);
        if (setting.max != null) input.max = String(setting.max);
        input.value = String(value ?? '');
        label.append(setting.label, input);
        break;
      case 'text':
        input.type = 'text';
        input.placeholder = setting.placeholder ?? '';
        input.value = String(value ?? '');
        label.append(setting.label, input);
        break;
    }
    el.appendChild(label);
  }

  return {
    el,
    read: () => {
      const out: Record<string, unknown> = {};
      for (const setting of settings) {
        const input = inputs.get(setting.key);
        if (!input) continue;
        if (setting.kind === 'boolean') out[setting.key] = input.checked;
        else if (setting.kind === 'number') {
          const n = Number.parseInt(input.value, 10);
          const clamped = Number.isNaN(n) ? Number(values[setting.key]) : n;
          out[setting.key] = Math.max(
            setting.min ?? -Infinity,
            Math.min(setting.max ?? Infinity, clamped),
          );
        } else out[setting.key] = input.value.trim();
      }
      return out as Partial<T>;
    },
  };
}

export type Column = { key: string; placeholder: string; width?: string };

export type RowsOptions<T> = {
  columns: Column[];
  items: T[];
  /** Column whose value is an image URL, shown as a preview at the row's start. */
  previewKey?: string;
  /** Fallback image while a preview URL is empty or broken. */
  previewFallback?: string;
  addLabel?: string;
};

/** An editable list of same-shaped records — one input per column, add/remove rows. */
export function rowsEditor<T extends Record<string, string>>(opts: RowsOptions<T>): Editor<T[]> {
  const el = document.createElement('div');
  const rows = document.createElement('div');
  rows.className = 'rows';
  el.appendChild(rows);

  const addRow = (item: Partial<T> = {}) => {
    const row = document.createElement('div');
    row.className = 'row';

    let preview: HTMLImageElement | null = null;
    if (opts.previewKey && opts.previewFallback) {
      preview = document.createElement('img');
      preview.onerror = () => {
        if (preview) preview.src = opts.previewFallback as string;
      };
      preview.src = item[opts.previewKey] || opts.previewFallback;
      row.appendChild(preview);
    }

    for (const col of opts.columns) {
      const input = document.createElement('input');
      input.dataset.k = col.key;
      input.placeholder = col.placeholder;
      input.value = item[col.key] ?? '';
      if (col.width) input.style.flex = `0 0 ${col.width}`;
      if (preview && col.key === opts.previewKey) {
        input.addEventListener('input', () => {
          preview.src = input.value || (opts.previewFallback as string);
        });
      }
      row.appendChild(input);
    }

    const remove = document.createElement('button');
    remove.className = 'plain';
    remove.textContent = '✕';
    remove.title = 'Remove';
    remove.addEventListener('click', () => row.remove());
    row.appendChild(remove);

    rows.appendChild(row);
  };

  for (const item of opts.items) addRow(item);

  const add = document.createElement('button');
  add.textContent = opts.addLabel ?? '+ Add';
  add.style.marginTop = '8px';
  add.addEventListener('click', () => addRow());
  el.appendChild(add);

  return {
    el,
    read: () =>
      [...rows.querySelectorAll('.row')].map((row) => {
        const out: Record<string, string> = {};
        for (const col of opts.columns) {
          const input = row.querySelector<HTMLInputElement>(`[data-k="${col.key}"]`);
          out[col.key] = input?.value.trim() ?? '';
        }
        return out as T;
      }),
  };
}

/** Register a userscript-manager menu entry, where the manager supports it. */
export function menuCommand(label: string, fn: () => void): void {
  if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand(label, fn);
}
