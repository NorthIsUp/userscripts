// ==UserScript==
// @name         CodeHelpers: GitHub PR — Submit Review Button
// @namespace    https://github.com/
// @version      1.0.0
// @description  Adds a "Submit review" button next to Code in the PR header; opens the review dialog on the Files changed tab.
// @match        https://github.com/*/*/pull/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-pr-submit-review.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-pr-submit-review.user.js
// ==/UserScript==

(function () {
  'use strict';

  var MARKER = 'data-pr-submit-review';
  var HASH = '#submit-review';

  function prPath() {
    var m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    return m && '/' + m[1] + '/' + m[2] + '/pull/' + m[3];
  }

  function buttonByText(re) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (re.test((buttons[i].textContent || '').trim())) return buttons[i];
    }
    return null;
  }

  // Files tab: the native button lives in the sticky diff header.
  function nativeReviewButton() {
    return buttonByText(/^(Submit review|Review changes|Finish your review)\b/);
  }

  function addButton() {
    var base = prPath();
    if (!base || /\/files(\/|$)/.test(location.pathname)) return;

    var code = buttonByText(/^Code$/);
    if (!code || !code.parentElement) return;
    if (code.parentElement.querySelector('[' + MARKER + ']')) return;

    var btn = document.createElement('button');
    btn.setAttribute(MARKER, 'true');
    btn.type = 'button';
    // Borrow GitHub's live button classes so it matches whatever Primer ships today.
    btn.className = code.className;
    btn.textContent = 'Submit review';
    btn.addEventListener('click', function () {
      location.assign(base + '/files' + HASH);
    });

    code.parentElement.insertBefore(btn, code.nextSibling);
  }

  function openReviewDialog() {
    if (location.hash !== HASH) return;
    var btn = nativeReviewButton();
    if (!btn) return;
    history.replaceState(null, '', location.pathname + location.search);
    btn.click();
  }

  function tick() {
    try {
      addButton();
      openReviewDialog();
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
