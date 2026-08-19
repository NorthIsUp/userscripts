// ==UserScript==
// @name         CodeHelpers: GitHub PR — Submit Review Button
// @namespace    https://github.com/
// @version      3.0.0
// @description  "Submit review" button next to Code on the PR page — opens GitHub's own Finish-your-review dialog.
// @match        https://github.com/*/*/pull/*
// @grant        none
// @run-at       document-end
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-pr-submit-review.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-pr-submit-review.user.js
// ==/UserScript==

(function () {
  'use strict';

  var MARKER = 'data-pr-submit-review';
  var NATIVE = 'button[class*="ReviewMenuButton-module"]';
  // Only for the full-load fallback below; cleared on read so it can't loop.
  var FLAG = 'pr-submit-review-open';

  function pr() {
    var m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    return m && { base: '/' + m[1] + '/' + m[2] + '/pull/' + m[3], number: m[3] };
  }

  function onDiffRoute() {
    return /\/(files|changes)(\/|$)/.test(location.pathname);
  }

  function whenNative(fn) {
    var tries = 0;
    (function poll() {
      var btn = document.querySelector(NATIVE);
      if (btn) return fn(btn);
      if (tries++ < 40) setTimeout(poll, 250);
    })();
  }

  function diffTabLink() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      if (/\/(files|changes)$/.test(links[i].getAttribute('href') || '')) return links[i];
    }
    return null;
  }

  // The review UI only mounts on the diff route and React unmounts it when you leave,
  // so a copied node is dead — hop routes client-side and click GitHub's own button.
  function openReview(p) {
    var tab = diffTabLink();
    if (tab) {
      tab.click();
      whenNative(function (btn) {
        btn.click();
      });
      return;
    }
    sessionStorage.setItem(FLAG, p.number);
    location.assign(p.base + '/changes');
  }

  function addButton() {
    var p = pr();
    if (!p || onDiffRoute()) return;
    if (document.querySelector(NATIVE)) return;

    // The Code label also appears in collapsed menus; only the rendered one has a box.
    var buttons = document.querySelectorAll('button');
    var code = null;
    for (var i = 0; i < buttons.length && !code; i++) {
      if ((buttons[i].textContent || '').trim() === 'Code' && buttons[i].getClientRects().length) {
        code = buttons[i];
      }
    }
    if (!code || !code.parentElement) return;
    if (code.parentElement.querySelector('[' + MARKER + ']')) return;

    // Clone the live Code button: Primer's class hashes change per release, and
    // cloneNode drops React's listeners so ours is the only handler.
    var btn = code.cloneNode(true);
    btn.setAttribute(MARKER, 'true');
    btn.type = 'button';
    btn.setAttribute('data-variant', 'primary');
    btn.removeAttribute('id');
    btn.removeAttribute('popovertarget');
    btn.removeAttribute('aria-expanded');
    btn.removeAttribute('aria-haspopup');
    // Drop Code's icon and its dropdown caret — this button opens a dialog, not a menu.
    var visuals = btn.querySelectorAll(
      '[data-component=leadingVisual],[data-component=trailingVisual],[data-component=trailingAction]',
    );
    for (var v = 0; v < visuals.length; v++) visuals[v].remove();
    var label = btn.querySelector('[data-component=text]') || btn;
    label.textContent = 'Submit review';
    btn.addEventListener('click', function () {
      openReview(p);
    });

    code.parentElement.insertBefore(btn, code.nextSibling);
  }

  function resumeAfterReload() {
    var p = pr();
    if (!p || sessionStorage.getItem(FLAG) !== p.number) return;
    sessionStorage.removeItem(FLAG);
    whenNative(function (btn) {
      btn.click();
    });
  }

  function tick() {
    try {
      addButton();
    } catch (e) {
      console.error('[pr-submit-review]', e);
    }
  }

  resumeAfterReload();
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
