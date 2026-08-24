const FASTPASS_TEXT = 'Sign in with Okta FastPass';
const INTERVAL_MS = 500;

// --- Username config (persisted, editable from the Tampermonkey menu) ---
let username = GM_getValue('oktaUsername', '');

function promptUsername() {
  const next = window.prompt('Okta username to autofill:', username);
  if (next !== null) {
    // null = user hit Cancel
    username = next.trim();
    GM_setValue('oktaUsername', username);
    console.log('Okta username set to:', username || '(empty)');
  }
}

GM_registerMenuCommand('Set Okta username…', promptUsername);

// Prompt once if we've never been configured.
if (!username) promptUsername();

let identifierDone = false;

// Set a value the Okta/React widget will actually register.
function setValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// Stage 1 — identifier page: fill username, tick "Keep me signed in", click Next.
function tryIdentifier() {
  if (identifierDone || !username) return;
  const field = document.querySelector<HTMLInputElement>('input[name="identifier"]');
  const next = document.querySelector<HTMLInputElement>('.o-form-button-bar input[type="submit"]');
  if (!field || !next) return;

  if (field.value !== username) setValue(field, username);

  const remember = document.querySelector<HTMLInputElement>('input[name="rememberMe"]');
  if (remember && !remember.checked) remember.click();

  if (field.value === username) {
    identifierDone = true;
    next.click();
  }
}

// Stage 2 — app page: click the FastPass link.
function tryFastPass(): boolean {
  const a = document.querySelector<HTMLAnchorElement>('.okta-verify-container a');
  if (a && (a.textContent || '').trim() === FASTPASS_TEXT) {
    console.log('✅ Clicking FastPass link');
    a.click();
    return true;
  }
  return false;
}

const interval = setInterval(() => {
  tryIdentifier();
  if (tryFastPass()) clearInterval(interval);
}, INTERVAL_MS);
