// ==UserScript==
// @name         CodeHelpers: GitHub PR — Submit Review Button
// @namespace    https://github.com/
// @version      2.0.1
// @description  "Submit review" button next to Code on the PR page — opens a Finish-your-review dialog and submits without leaving the page.
// @match        https://github.com/*/*/pull/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
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
