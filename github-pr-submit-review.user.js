// ==UserScript==
// @name         Code Helpers: GitHub PR — Submit Review Button
// @namespace    https://github.com/
// @version      4.6.1
// @description  Review actions next to Code on the PR page — approve, approve/reject/comment with a note, close — all driving GitHub's own review dialog.
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @match        https://github.com/*/*/pull/*
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/NorthIsUp/userscripts/releases/latest/download/github-pr-submit-review.user.js
// @downloadURL  https://github.com/NorthIsUp/userscripts/releases/latest/download/github-pr-submit-review.user.js
// ==/UserScript==

(function () {
    'use strict';

    /** Run `fn` now and after any DOM change, coalesced to one call per frame. */
    function observeDom(fn, root = document.documentElement) {
        let queued = false;
        const tick = () => {
            if (queued)
                return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                fn();
            });
        };
        fn();
        new MutationObserver(tick).observe(root, { childList: true, subtree: true });
    }
    /** Poll `get` until it returns something truthy, then hand it to `fn`. */
    function poll(get, fn, tries = 40) {
        let n = 0;
        const next = () => {
            const found = get();
            if (found)
                return fn(found);
            if (n++ < tries)
                setTimeout(next, 250);
        };
        next();
    }
    /** An SVG string sized like GitHub's own octicons. */
    function octicon(path, opts = {}) {
        var _a;
        const size = (_a = opts.size) !== null && _a !== void 0 ? _a : 16;
        const style = opts.color
            ? ` style="color:var(--fgColor-${opts.color});vertical-align:text-bottom"`
            : '';
        return (`<svg class="octicon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
            `viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"${style}><path d="${path}"></path></svg>`);
    }
    /** First rendered element matching `selector` whose text passes `test`. */
    function findByText(selector, test, visibleOnly = true) {
        const found = document.querySelectorAll(selector);
        for (const el of found) {
            if (!test((el.textContent || '').trim()))
                continue;
            if (visibleOnly && el.getClientRects().length === 0)
                continue;
            return el;
        }
        return null;
    }

    /** The PR the given github.com path belongs to, or null off a PR page. */
    function parsePr(pathname = location.pathname) {
        const m = pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (!m)
            return null;
        return {
            owner: m[1],
            repo: m[2],
            number: m[3],
            base: `/${m[1]}/${m[2]}/pull/${m[3]}`,
        };
    }
    /** Login of the signed-in user, from the meta tag GitHub still ships. */
    function currentUser() {
        const meta = document.querySelector('meta[name="user-login"]');
        return (meta === null || meta === void 0 ? void 0 : meta.content) || null;
    }

    const MARKER = 'data-pr-submit-review';
    const ROW = 'data-pr-submit-review-row';
    const NATIVE = 'button[class*="ReviewMenuButton-module"]';
    // Only for the full-load fallback below; cleared on read so it can't loop.
    const FLAG = 'pr-submit-review-open';
    // Octicon paths, lifted from the rendered page so they match GitHub's own icons.
    const CHECK = 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z';
    const EX = 'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z';
    const COMMENT = 'M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z';
    const CLOSED = 'M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l.97.97.97-.97a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.97.97.97.97a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-.97-.97-.97.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z';
    function onDiffRoute() {
        return /\/(files|changes)(\/|$)/.test(location.pathname);
    }
    function linkTo(re) {
        const links = document.querySelectorAll('a[href]');
        for (const link of links) {
            if (re.test(link.getAttribute('href') || ''))
                return link;
        }
        return null;
    }
    function reviewDialog() {
        return findByText('dialog,[role=dialog]', (t) => /Finish your review/.test(t), false);
    }
    // The review UI only mounts on the diff route and React unmounts it when you leave,
    // so a copied node is dead — hop routes client-side and drive GitHub's own dialog.
    function withDialog(p, key, fn) {
        const openIt = () => poll(() => document.querySelector(NATIVE), (btn) => {
            btn.click();
            poll(reviewDialog, fn);
        });
        if (onDiffRoute())
            return openIt();
        const tab = linkTo(/\/(files|changes)$/);
        if (tab) {
            tab.click();
            return openIt();
        }
        sessionStorage.setItem(FLAG, `${p.number}|${key}`);
        location.assign(`${p.base}/changes`);
    }
    function chooseEvent(dialog, value) {
        const radios = dialog.querySelectorAll('input[type=radio]');
        for (const radio of radios) {
            if (radio.value === value) {
                radio.click();
                return true;
            }
        }
        return false;
    }
    function dialogSubmit(dialog) {
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
            if (/^Submit review/.test((btn.textContent || '').trim()))
                return btn;
        }
        return null;
    }
    // Type-then-submit actions stop at the open dialog; GitHub keeps Submit disabled
    // until there's a body anyway, and ⌘↵ finishes from the textarea.
    function compose(p, key, event) {
        withDialog(p, key, (dialog) => {
            var _a;
            chooseEvent(dialog, event);
            (_a = dialog.querySelector('textarea')) === null || _a === void 0 ? void 0 : _a.focus();
        });
    }
    function approveNow(p) {
        withDialog(p, 'approve', (dialog) => {
            chooseEvent(dialog, 'approve');
            poll(() => {
                const btn = dialogSubmit(dialog);
                return btn && !btn.disabled ? btn : null;
            }, (btn) => btn.click());
        });
    }
    // GitHub refuses self review events; grey ours out rather than let the dialog dance
    // run and fail. The header's author link is gone in the React PR page, so fall back
    // to the document title ("<subject> by <login> · Pull Request #N").
    const selfCache = {};
    function prAuthor() {
        const link = document.querySelector('a.author');
        if (link)
            return (link.textContent || '').trim();
        const m = document.title.match(/ by ([\w.-]+) · Pull Request #\d+/);
        return m && m[1];
    }
    function isSelfPR() {
        if (location.pathname in selfCache)
            return selfCache[location.pathname];
        const me = currentUser();
        const self = !!me && prAuthor() === me;
        selfCache[location.pathname] = self;
        return self;
    }
    // Header state pill, live across an in-page merge; unknown text fails open.
    function prState() {
        const pill = document.querySelector('[data-testid="header-state"], .gh-header .State');
        const text = ((pill === null || pill === void 0 ? void 0 : pill.textContent) || '').trim().toLowerCase();
        return /^(open|draft|merged|closed)$/.test(text) ? text : null;
    }
    function blockedReason(action) {
        if (action.review && isSelfPR())
            return "can't review your own PR";
        const state = prState();
        if (state === 'merged' || state === 'closed') {
            // Reviews still submit after a merge, but only a comment is worth offering.
            if (action.key !== 'comment')
                return `PR is ${state}`;
        }
        return null;
    }
    function nativeClose() {
        return findByText('button', (t) => /^Close pull request$/.test(t));
    }
    function closePR(p) {
        const btn = nativeClose();
        if (btn)
            return btn.click();
        const conv = linkTo(new RegExp(`${p.base.replace(/\//g, '\\/')}$`));
        if (conv)
            conv.click();
        poll(nativeClose, (found) => found.click());
    }
    const ACTIONS = [
        {
            key: 'approve',
            review: true,
            title: 'Approve',
            html: octicon(CHECK, { color: 'success' }),
            run: approveNow,
        },
        {
            key: 'approve-comment',
            review: true,
            title: 'Approve with comment',
            html: octicon(CHECK, { color: 'success' }) + octicon(COMMENT, { color: 'muted' }),
            run: (p) => compose(p, 'approve-comment', 'approve'),
        },
        {
            key: 'request-changes',
            review: true,
            title: 'Request changes with comment',
            html: octicon(EX, { color: 'danger' }) + octicon(COMMENT, { color: 'muted' }),
            run: (p) => compose(p, 'request-changes', 'request changes'),
        },
        {
            key: 'comment',
            title: 'Comment',
            html: octicon(COMMENT, { color: 'muted' }),
            run: (p) => compose(p, 'comment', 'comment'),
        },
        {
            key: 'close',
            title: 'Close pull request',
            html: octicon(CLOSED, { color: 'danger' }),
            run: closePR,
        },
    ];
    function makeButton(code, p, action) {
        // Clone the live Code button: Primer's class hashes change per release, and
        // cloneNode drops React's listeners so ours is the only handler.
        const btn = code.cloneNode(true);
        btn.setAttribute(MARKER, action.key);
        btn.type = 'button';
        btn.removeAttribute('id');
        btn.removeAttribute('popovertarget');
        btn.removeAttribute('aria-expanded');
        btn.removeAttribute('aria-haspopup');
        // Drop Code's icon and dropdown caret — these open dialogs, not menus.
        const visuals = btn.querySelectorAll('[data-component=leadingVisual],[data-component=trailingVisual],[data-component=trailingAction]');
        for (const visual of visuals)
            visual.remove();
        const label = btn.querySelector('[data-component=text]') || btn;
        const blocked = blockedReason(action);
        btn.title = blocked ? `${action.title} — ${blocked}` : action.title;
        btn.setAttribute('aria-label', btn.title);
        label.innerHTML = action.html;
        if (blocked) {
            btn.disabled = true;
            btn.style.opacity = '.5';
            btn.style.cursor = 'not-allowed';
        }
        else {
            btn.addEventListener('click', () => action.run(p));
        }
        return btn;
    }
    function addButtons() {
        const p = parsePr();
        if (!p || onDiffRoute())
            return;
        if (document.querySelector(NATIVE))
            return;
        // The Code label also appears in collapsed menus; only the rendered one has a box.
        const code = findByText('button', (t) => t === 'Code');
        if (!(code === null || code === void 0 ? void 0 : code.parentElement))
            return;
        const stateNow = prState() || 'unknown';
        const existing = document.querySelector(`[${ROW}]`);
        if (existing) {
            if (existing.getAttribute(ROW) === stateNow)
                return;
            existing.remove();
        }
        // Own row under Ready to merge / Code: the header strip is nowrap, so a
        // full-basis child is what makes it break to a second line.
        const actions = code.parentElement.parentElement || code.parentElement;
        actions.style.flexWrap = 'wrap';
        const row = document.createElement('div');
        row.setAttribute(ROW, stateNow);
        row.className = 'd-flex gap-2';
        row.style.flexBasis = '100%';
        row.style.justifyContent = 'flex-end';
        row.style.marginTop = '8px';
        for (const action of ACTIONS)
            row.appendChild(makeButton(code, p, action));
        actions.appendChild(row);
    }
    function resumeAfterReload() {
        var _a;
        const p = parsePr();
        const flag = p && sessionStorage.getItem(FLAG);
        if (!flag || flag.split('|')[0] !== (p === null || p === void 0 ? void 0 : p.number))
            return;
        sessionStorage.removeItem(FLAG);
        const key = flag.split('|')[1];
        (_a = ACTIONS.find((a) => a.key === key)) === null || _a === void 0 ? void 0 : _a.run(p);
    }
    resumeAfterReload();
    observeDom(() => {
        try {
            addButtons();
        }
        catch (e) {
            console.error('[pr-submit-review]', e);
        }
    });

})();
