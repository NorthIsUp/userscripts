// ==UserScript==
// @name         Code Helpers: Graphite — Open in GitHub
// @namespace    https://github.com/
// @version      1.0.0
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2028%2028%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22m20.704%207.123-9.27-2.484-6.788%206.793%202.482%209.276%209.27%202.484%206.788-6.793-2.482-9.276Z%22%3E%3C/path%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M17.644%200%203.73%203.729%200%2017.644l10.187%2010.187%2013.915-3.729%203.73-13.915L17.643%200Zm2.27%2024.312H7.917L1.92%2013.915%207.917%203.518h11.997l5.998%2010.397-5.998%2010.397Z%22%3E%3C/path%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2028%2028%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22m20.704%207.123-9.27-2.484-6.788%206.793%202.482%209.276%209.27%202.484%206.788-6.793-2.482-9.276Z%22%3E%3C/path%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M17.644%200%203.73%203.729%200%2017.644l10.187%2010.187%2013.915-3.729%203.73-13.915L17.643%200Zm2.27%2024.312H7.917L1.92%2013.915%207.917%203.518h11.997l5.998%2010.397-5.998%2010.397Z%22%3E%3C/path%3E%3C/svg%3E
// @description  Adds an "Open in GitHub" button to the current PR row in Graphite's stack view.
// @match        https://app.graphite.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/main/graphite-open-in-github.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/main/graphite-open-in-github.user.js
// ==/UserScript==

(function () {
    'use strict';

    var MARKER = 'data-github-link';
    // GitHub mark, viewBox 0 0 48 48 (same artwork as the script's @icon).
    var GH_PATH =
        'M24 1.9a21.6 21.6 0 0 0-6.8 42.2c1 .2 1.8-.9 1.8-1.8v-2.9c-6 1.3-7.9-2.9-7.9-2.9a6.5 6.5 0 0 0-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3 4.3 0 0 1 3.3 2c1.7 2.9 5.5 2.6 6.7 2.1a5.4 5.4 0 0 1 .5-2.9C12.7 32 9 28 9 22.6a10.7 10.7 0 0 1 2.9-7.6 6.2 6.2 0 0 1 .3-6.4 8.9 8.9 0 0 1 6.4 2.9 15.1 15.1 0 0 1 5.4-.8 17.1 17.1 0 0 1 5.4.7 9 9 0 0 1 6.4-2.8 6.5 6.5 0 0 1 .4 6.4 10.7 10.7 0 0 1 2.8 7.6c0 5.4-3.7 9.4-10.5 10.6a5.4 5.4 0 0 1 .5 2.9v6.2a1.8 1.8 0 0 0 1.9 1.8A21.7 21.7 0 0 0 24 1.9Z';

    function githubUrl(graphitePath) {
        var m = graphitePath.match(/\/github\/pr\/([^/]+)\/([^/]+)\/(\d+)/);
        return m && ('https://github.com/' + m[1] + '/' + m[2] + '/pull/' + m[3]);
    }

    function decorate() {
        var row = document.querySelector('a[aria-current="true"][href*="/github/pr/"]');
        if (!row) return;
        var url = githubUrl(row.getAttribute('href') || '');
        if (!url) return;

        // Graphite's action slot lives inside the row <a>; nest a <button>, not an <a>.
        var slot = row.querySelector('[class*="currentRowActions"]') || row;
        if (slot.querySelector('[' + MARKER + ']')) return;

        var btn = document.createElement('button');
        btn.setAttribute(MARKER, 'true');
        btn.type = 'button';
        btn.title = 'Open in GitHub';
        btn.setAttribute('aria-label', 'Open in GitHub');
        btn.style.cssText =
            'display:inline-flex;align-items:center;background:none;border:0;' +
            'padding:2px;margin:0 2px;cursor:pointer;color:inherit;opacity:.7';
        btn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" ' +
            'viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="' + GH_PATH + '"></path></svg>';
        btn.addEventListener('click', function (e) {
            // Don't let the row's own anchor navigation fire.
            e.preventDefault();
            e.stopPropagation();
            window.open(url, '_blank', 'noopener');
        });

        slot.appendChild(btn);
    }

    decorate();

    // Graphite is a SPA; re-decorate on DOM changes / row switches.
    var queued = false;
    new MutationObserver(function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; decorate(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
