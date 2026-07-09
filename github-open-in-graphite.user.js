// ==UserScript==
// @name         CodeHelpers: GitHub PR — Open in Graphite
// @namespace    https://github.com/
// @version      1.8.0
// @description  Adds an "Open in Graphite" icon link next to the copy-branch button in the PR header.
// @match        https://github.com/*/*/pull/*
// @grant        none
// @run-at       document-end
// @icon                data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64              data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-open-in-graphite.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/github-open-in-graphite.user.js
// ==/UserScript==

(function () {
  'use strict';

  var MARKER = 'data-graphite-link';
  var TIP_ID = 'graphite-link-tooltip';
  var STACK_PATH =
    'M7.122.392a1.75 1.75 0 0 1 1.756 0l5.003 2.902c.83.481.83 1.68 0 2.162L8.878 8.358a1.75 1.75 0 0 1-1.756 0L2.119 5.456a1.251 1.251 0 0 1 0-2.162ZM8.125 1.69a.248.248 0 0 0-.25 0l-4.63 2.685 4.63 2.685a.248.248 0 0 0 .25 0l4.63-2.685ZM1.601 7.789a.75.75 0 0 1 1.025-.273l5.249 3.044a.248.248 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0L1.874 8.814A.75.75 0 0 1 1.6 7.789Zm0 3.5a.75.75 0 0 1 1.025-.273l5.249 3.044a.248.248 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0l-5.248-3.044a.75.75 0 0 1-.273-1.025Z';

  function graphiteUrl() {
    var m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    return m && 'https://app.graphite.dev/github/pr/' + m[1] + '/' + m[2] + '/' + m[3];
  }

  function decorate() {
    var url = graphiteUrl();
    if (!url) return;

    var copyIcon = document.querySelector('svg.octicon-copy');
    var copyBtn = copyIcon && copyIcon.closest('button');
    if (!copyBtn || !copyBtn.parentElement) return;
    if (copyBtn.parentElement.querySelector('[' + MARKER + ']')) return;

    // Reuse GitHub's current TooltipV2 class off the live copy tooltip span.
    var refTip = copyBtn.parentElement.querySelector('span[role="tooltip"][popover]');
    var tipClass = refTip ? refTip.className : 'prc-TooltipV2-Tooltip-tLeuB';

    var a = document.createElement('a');
    a.setAttribute(MARKER, 'true');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'color-fg-muted ml-1';
    a.style.display = 'inline-flex';
    a.style.alignItems = 'center';
    a.setAttribute('aria-label', 'Open in Graphite');
    a.setAttribute('aria-describedby', TIP_ID);
    a.innerHTML =
      '<svg class="octicon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" ' +
      'viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="' +
      STACK_PATH +
      '"></path></svg>';

    // GitHub's TooltipV2 span + native Popover API; positioned on show.
    var tip = document.createElement('span');
    tip.className = tipClass;
    tip.id = TIP_ID;
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('data-direction', 's');
    tip.setAttribute('data-component', 'Tooltip');
    tip.setAttribute('popover', 'auto');
    tip.textContent = 'Open in Graphite';
    tip.style.margin = '0';

    function show() {
      try {
        tip.showPopover();
        var r = a.getBoundingClientRect();
        var t = tip.getBoundingClientRect();
        tip.style.position = 'fixed';
        tip.style.left = r.left + r.width / 2 - t.width / 2 + 'px';
        tip.style.top = r.bottom + 6 + 'px';
      } catch (_e) {}
    }
    function hide() {
      try {
        tip.hidePopover();
      } catch (_e) {}
    }
    a.addEventListener('mouseenter', show);
    a.addEventListener('mouseleave', hide);
    a.addEventListener('focus', show);
    a.addEventListener('blur', hide);

    copyBtn.parentElement.insertBefore(a, copyBtn.nextSibling);
    copyBtn.parentElement.insertBefore(tip, a.nextSibling);
    console.log('[graphite] inserted icon ->', url);
  }

  function safeDecorate() {
    try {
      decorate();
    } catch (e) {
      console.error('[graphite] decorate error', e);
    }
  }

  safeDecorate();

  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      safeDecorate();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
