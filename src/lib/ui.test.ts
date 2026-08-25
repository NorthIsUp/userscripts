import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { JSDOM } from 'jsdom';

// The library is DOM-only, so give it a DOM before importing it.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
for (const key of ['window', 'document', 'HTMLElement', 'KeyboardEvent', 'Event'] as const) {
  (globalThis as Record<string, unknown>)[key] =
    key === 'window' ? dom.window : (dom.window as unknown as Record<string, unknown>)[key];
}

type UiModule = typeof import('./ui.ts');
let ui: UiModule;

before(async () => {
  ui = await import('./ui.ts');
});

const panelBody = (id: string) =>
  (document.getElementById(id)?.shadowRoot?.querySelector('.body') as HTMLElement) ?? null;

describe('settingsEditor', () => {
  it('reads each control back into the config shape', () => {
    const editor = ui.settingsEditor(
      [
        { key: 'flag', kind: 'boolean', label: 'Flag' },
        { key: 'count', kind: 'number', label: 'Count', min: 1, max: 10 },
        { key: 'who', kind: 'text', label: 'Who' },
      ],
      { flag: false, count: 5, who: 'ada' },
    );

    const [flag, count, who] = [...editor.el.querySelectorAll('input')];
    flag.checked = true;
    count.value = '7';
    who.value = '  grace  ';

    assert.deepEqual(editor.read(), { flag: true, count: 7, who: 'grace' });
  });

  it('clamps numbers to the declared range and keeps the old value for junk', () => {
    const editor = ui.settingsEditor(
      [{ key: 'count', kind: 'number', label: 'Count', min: 1, max: 10 }],
      { count: 5 },
    );
    const input = editor.el.querySelector('input') as HTMLInputElement;

    input.value = '999';
    assert.equal(editor.read().count, 10);
    input.value = '0';
    assert.equal(editor.read().count, 1);
    input.value = 'nonsense';
    assert.equal(editor.read().count, 5);
  });
});

describe('rowsEditor', () => {
  it('round-trips rows, and drops removed ones', () => {
    const editor = ui.rowsEditor<{ login: string; name: string }>({
      columns: [
        { key: 'login', placeholder: 'login' },
        { key: 'name', placeholder: 'name' },
      ],
      items: [
        { login: 'claude', name: 'Claude' },
        { login: 'copilot', name: 'Copilot' },
      ],
    });

    assert.deepEqual(editor.read(), [
      { login: 'claude', name: 'Claude' },
      { login: 'copilot', name: 'Copilot' },
    ]);

    const removeSecond = editor.el.querySelectorAll('.row')[1].querySelector('button');
    removeSecond?.dispatchEvent(new dom.window.Event('click'));
    assert.deepEqual(editor.read(), [{ login: 'claude', name: 'Claude' }]);
  });

  it('adds an empty row that reads back once filled in', () => {
    const editor = ui.rowsEditor<{ login: string }>({
      columns: [{ key: 'login', placeholder: 'login' }],
      items: [],
    });

    const add = editor.el.querySelector('button') as HTMLElement;
    add.dispatchEvent(new dom.window.Event('click'));
    const input = editor.el.querySelector('.row input') as HTMLInputElement;
    input.value = 'dependabot';

    assert.deepEqual(editor.read(), [{ login: 'dependabot' }]);
  });
});

describe('openPanel', () => {
  it('builds a panel, refreshes it, and closes it', () => {
    let builds = 0;
    const panel = ui.openPanel({
      id: 'test-panel',
      title: 'Test',
      build: (body) => {
        builds++;
        body.appendChild(document.createElement('span'));
      },
    });

    assert.ok(panel);
    assert.equal(builds, 1);
    assert.equal(panelBody('test-panel')?.childElementCount, 1);

    // refresh replaces the body rather than appending to it
    panel.refresh();
    assert.equal(builds, 2);
    assert.equal(panelBody('test-panel')?.childElementCount, 1);

    panel.close();
    assert.equal(document.getElementById('test-panel'), null);
  });

  it('refuses to open twice for the same id', () => {
    const first = ui.openPanel({ id: 'dupe-panel', title: 'Test', build: () => {} });
    const second = ui.openPanel({ id: 'dupe-panel', title: 'Test', build: () => {} });

    assert.ok(first);
    assert.equal(second, null);
    first.close();
  });

  it('runs a footer button against the panel', () => {
    let closed = false;
    const panel = ui.openPanel({
      id: 'footer-panel',
      title: 'Test',
      build: () => {},
      footer: [
        {
          label: 'Save',
          primary: true,
          onClick: (p) => {
            closed = true;
            p.close();
          },
        },
      ],
    });

    const save = document
      .getElementById('footer-panel')
      ?.shadowRoot?.querySelector('footer button') as HTMLElement;
    save.dispatchEvent(new dom.window.Event('click'));

    assert.ok(closed);
    assert.equal(document.getElementById('footer-panel'), null);
    assert.equal(panel?.body.isConnected, false);
  });
});

describe('toast', () => {
  it('renders text plus its actions, and fires them', () => {
    let clicked = 0;
    ui.toast({ text: 'blocked', actions: [{ label: 'allow', onClick: () => clicked++ }] });

    const stack = document.getElementById('us-toast-host')?.shadowRoot?.querySelector('.stack');
    const node = stack?.querySelector('.toast') as HTMLElement;
    assert.equal(node.querySelector('.msg')?.textContent, 'blocked');

    const [allow] = [...node.querySelectorAll('button')];
    allow.dispatchEvent(new dom.window.Event('click'));
    assert.equal(clicked, 1);

    // the trailing ✕ dismisses
    const dismiss = [...node.querySelectorAll('button')].at(-1) as HTMLElement;
    dismiss.dispatchEvent(new dom.window.Event('click'));
    assert.equal(stack?.querySelector('.toast'), null);
  });
});
