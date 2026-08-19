// ==UserScript==
// @name         CodeHelpers: GitHub PR — Submit Review Button
// @namespace    https://github.com/
// @version      2.0.0
// @description  "Submit review" button next to Code on the PR page — opens a Finish-your-review dialog and submits without leaving the page.
// @match        https://github.com/*/*/pull/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-pr-submit-review.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-pr-submit-review.user.js
// ==/UserScript==

(function () {
  'use strict';

  var MARKER = 'data-pr-submit-review';
  var API = 'https://api.github.com';

  function pr() {
    var m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    return m && { owner: m[1], repo: m[2], number: m[3] };
  }

  function token() {
    return GM_getValue('token', '');
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: {
        Authorization: 'Bearer ' + token(),
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) throw new Error(json.message || res.status + ' ' + res.statusText);
        return json;
      });
    });
  }

  // A queued review (line comments left but not submitted) must be finished via
  // /events — POSTing a new review would 422 with "one pending review per pull request".
  function submitReview(p, body, event) {
    var base = '/repos/' + p.owner + '/' + p.repo + '/pulls/' + p.number + '/reviews';
    return api(base + '?per_page=100')
      .then(function (reviews) {
        for (var i = 0; i < reviews.length; i++) {
          if (reviews[i].state === 'PENDING') return reviews[i].id;
        }
        return null;
      })
      .then(function (pending) {
        return pending
          ? api(base + '/' + pending + '/events', {
              method: 'POST',
              body: { body: body, event: event },
            })
          : api(base, { method: 'POST', body: { body: body, event: event } });
      });
  }

  var CSS =
    '#pr-sr-dialog{border:1px solid var(--borderColor-default,#d1d9e0);border-radius:12px;padding:0;' +
    'width:min(720px,92vw);color:var(--fgColor-default,#1f2328);background:var(--bgColor-default,#fff);' +
    'font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
    '#pr-sr-dialog::backdrop{background:rgba(0,0,0,.4)}' +
    '#pr-sr-dialog h2{margin:0;padding:16px;font-size:16px;border-bottom:1px solid var(--borderColor-default,#d1d9e0)}' +
    '#pr-sr-dialog .pr-sr-body{padding:16px;display:grid;gap:12px}' +
    '#pr-sr-dialog textarea{width:100%;box-sizing:border-box;min-height:140px;padding:8px;border-radius:6px;' +
    'border:1px solid var(--borderColor-default,#d1d9e0);background:var(--bgColor-default,#fff);color:inherit;font:inherit}' +
    '#pr-sr-dialog input[type=password]{width:100%;box-sizing:border-box;padding:6px 8px;border-radius:6px;' +
    'border:1px solid var(--borderColor-default,#d1d9e0);background:var(--bgColor-default,#fff);color:inherit;font:inherit}' +
    '#pr-sr-dialog label{display:block}#pr-sr-dialog label span{color:var(--fgColor-muted,#59636e);display:block;' +
    'margin-left:20px;font-size:13px}' +
    '#pr-sr-dialog footer{display:flex;gap:8px;justify-content:flex-end;padding:16px;' +
    'border-top:1px solid var(--borderColor-default,#d1d9e0)}' +
    '#pr-sr-dialog button{border-radius:6px;padding:5px 16px;font:inherit;font-weight:500;cursor:pointer;' +
    'border:1px solid var(--borderColor-default,#d1d9e0);background:var(--bgColor-default,#f6f8fa);color:inherit}' +
    '#pr-sr-dialog button[value=submit]{background:var(--bgColor-success-emphasis,#1f883d);color:#fff;border-color:transparent}' +
    '#pr-sr-dialog button[disabled]{opacity:.6;cursor:default}' +
    '#pr-sr-error{color:var(--fgColor-danger,#d1242f)}#pr-sr-error:empty{display:none}';

  var EVENTS = [
    ['COMMENT', 'Comment', 'Submit general feedback without explicit approval.'],
    ['APPROVE', 'Approve', 'Submit feedback and approve merging these changes.'],
    ['REQUEST_CHANGES', 'Request changes', 'Submit feedback suggesting changes.'],
  ];

  function buildDialog(p) {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var dialog = document.createElement('dialog');
    dialog.id = 'pr-sr-dialog';
    dialog.innerHTML =
      '<h2>Finish your review</h2><div class="pr-sr-body">' +
      '<textarea placeholder="Add your comment here, be kind"></textarea>' +
      EVENTS.map(function (e, i) {
        return (
          '<label><input type="radio" name="pr-sr-event" value="' +
          e[0] +
          '"' +
          (i === 0 ? ' checked' : '') +
          '> <b>' +
          e[1] +
          '</b><span>' +
          e[2] +
          '</span></label>'
        );
      }).join('') +
      '<label id="pr-sr-token-row" hidden>GitHub token (repo scope, stored locally — <code>gh auth token</code>)' +
      '<input type="password" id="pr-sr-token" autocomplete="off"></label>' +
      '<div id="pr-sr-error"></div></div>' +
      '<footer><button value="cancel">Cancel</button>' +
      '<button value="submit">Submit review</button></footer>';
    document.body.appendChild(dialog);

    var textarea = dialog.querySelector('textarea');
    var error = dialog.querySelector('#pr-sr-error');
    var tokenRow = dialog.querySelector('#pr-sr-token-row');
    var tokenInput = dialog.querySelector('#pr-sr-token');
    var submit = dialog.querySelector('button[value=submit]');

    dialog.querySelector('button[value=cancel]').addEventListener('click', function () {
      dialog.close();
    });

    function send() {
      if (tokenInput.value) GM_setValue('token', tokenInput.value.trim());
      if (!token()) {
        tokenRow.hidden = false;
        error.textContent = 'A GitHub token is needed to submit.';
        return;
      }
      var event = dialog.querySelector('input[name=pr-sr-event]:checked').value;
      if (event !== 'APPROVE' && !textarea.value.trim()) {
        error.textContent = 'Comment and Request changes need a body.';
        return;
      }
      error.textContent = '';
      submit.disabled = true;
      submit.textContent = 'Submitting…';
      submitReview(p, textarea.value, event).then(
        function () {
          location.reload();
        },
        function (e) {
          error.textContent = e.message;
          if (/[Bb]ad credentials|Not Found|401|403/.test(e.message)) tokenRow.hidden = false;
          submit.disabled = false;
          submit.textContent = 'Submit review';
        },
      );
    }

    submit.addEventListener('click', send);
    dialog.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
    });

    return function open() {
      tokenRow.hidden = !!token();
      error.textContent = '';
      dialog.showModal();
      textarea.focus();
    };
  }

  var openDialog = null;

  function addButton() {
    var p = pr();
    if (!p) return;
    // Files changed tab already renders GitHub's own review menu button.
    if (document.querySelector('[data-hotkey="v"]')) return;

    var code = null;
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if ((buttons[i].textContent || '').trim() === 'Code') code = buttons[i];
    }
    if (!code || !code.parentElement) return;
    if (code.parentElement.querySelector('[' + MARKER + ']')) return;

    // Clone the live Code button rather than restyling from scratch: Primer's class
    // hashes change per release, and cloneNode drops React's listeners.
    var btn = code.cloneNode(true);
    btn.setAttribute(MARKER, 'true');
    btn.type = 'button';
    btn.setAttribute('data-variant', 'primary');
    btn.removeAttribute('id');
    btn.removeAttribute('popovertarget');
    btn.removeAttribute('aria-expanded');
    btn.removeAttribute('aria-haspopup');
    var caret = btn.querySelector('[data-component=trailingAction]');
    if (caret) caret.remove();
    var label = btn.querySelector('[data-component=text]') || btn;
    label.textContent = 'Submit review';
    btn.addEventListener('click', function () {
      if (!openDialog) openDialog = buildDialog(p);
      openDialog();
    });

    code.parentElement.insertBefore(btn, code.nextSibling);
  }

  GM_registerMenuCommand('Set GitHub token', function () {
    var t = prompt('GitHub token with repo scope (gh auth token):', token());
    if (t !== null) GM_setValue('token', t.trim());
  });

  function tick() {
    try {
      addButton();
    } catch (e) {
      console.error('[pr-submit-review]', e);
    }
  }

  tick();

  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      tick();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
