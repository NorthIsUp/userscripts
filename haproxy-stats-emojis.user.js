// ==UserScript==
// @name         HAProxy Stats: Section Header Emojis
// @namespace    https://github.com/NorthIsUp/userscripts/haproxy-stats-emojis
// @version      1.0.5
// @description  Add 🟢/🔴 to HAProxy proxy headers based on server row health in that section
// @match        http://haproxy.tailf01e20.ts.net:8404/*
// @match        https://github.com/NorthIsUp/userscripts/releases*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/haproxy-stats-emojis.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/haproxy-stats-emojis.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Installed-script beacon — src/lib/beacon.ts, inlined here so it runs
    // before anything else: announce this script on https://github.com/NorthIsUp/userscripts/releases,
    // then stop unless this script's own @match covers the page.
    {
      /** The attribute the tags carry, and what a reader queries for. */
      const BEACON_TAG = 'userscript-beacon';
      /**
       * On the beacon page, leave a `<meta name="userscript-beacon">` carrying this
       * script's identity. Returns whether the script should go on running here —
       * false on the beacon page when the script's own `@match` doesn't cover it.
       *
       * @param script    who this is: the header's name, namespace and version.
       * @param pageRe    source of a RegExp matching the page to announce on.
       * @param ownRes    sources of RegExps for the script's own `@match` patterns.
       */
      function announce(script, pageRe, ownRes) {
          // A fragment is never part of a @match, and never changes which page this is.
          const here = location.href.split('#')[0];
          if (new RegExp(pageRe).test(here)) {
              const tag = document.createElement('meta');
              tag.name = BEACON_TAG;
              Object.assign(tag.dataset, script);
              // document-start runs before <head> exists, so mount whenever it does.
              const mount = () => (document.head || document.documentElement).appendChild(tag);
              if (document.head || document.documentElement)
                  mount();
              else
                  document.addEventListener('DOMContentLoaded', mount, { once: true });
          }
          return ownRes.some((re) => new RegExp(re).test(here));
      }

      if (!announce({"name":"HAProxy Stats: Section Header Emojis","namespace":"https://github.com/NorthIsUp/userscripts/haproxy-stats-emojis","version":"1.0.5"}, "^https:\\/\\/github\\.com\\/NorthIsUp\\/userscripts\\/releases.*$", ["^http:\\/\\/haproxy\\.tailf01e20\\.ts\\.net:8404\\/.*$"])) return;
    }


    const DEAD_ROW_SELECTOR = 'tr.active_down, tr.backup_down';
    const LIVE_ROW_SELECTOR = 'tr.active_up, tr.backup_up, tr.active_going_up, tr.active_going_down';
    const DEAD_EMOJI = '🔴';
    const LIVE_EMOJI = '🟢';
    function setHeaderEmoji(linkEl, emoji) {
        // linkEl is <a class="px">proxy_name</a>
        const raw = (linkEl.textContent || '').replace(/^[🟢🔴]\s+/u, '');
        linkEl.textContent = `${emoji} ${raw}`;
        linkEl.style.fontWeight = '900';
    }
    function findSectionRootFromAnchorName(anchorName) {
        // Anchor is: <a name="socks5_ohd_clinic"></a> inside th.pxname
        const anchor = document.querySelector(`a[name="${CSS.escape(anchorName)}"]`);
        if (!anchor)
            return null;
        // The header table is the closest .tbl; the content (servers) is after it.
        return anchor.closest('table.tbl');
    }
    function collectSectionTables(headerTable) {
        // After the header table, HAProxy renders another table (the stats rows), then repeats for next section.
        // We collect sibling tables until the next header table that contains th.pxname.
        const tables = [];
        let el = headerTable.nextElementSibling;
        while (el) {
            if (el.tagName === 'TABLE' && el.classList.contains('tbl')) {
                // If this table is a new section header (has th.pxname), stop.
                if (el.querySelector('th.pxname'))
                    break;
                tables.push(el);
            }
            el = el.nextElementSibling;
        }
        return tables;
    }
    function sectionStatus(sectionTables) {
        // If any DOWN row exists => DEAD
        for (const t of sectionTables) {
            if (t.querySelector(DEAD_ROW_SELECTOR))
                return 'dead';
        }
        // If any LIVE-ish row exists => LIVE
        for (const t of sectionTables) {
            if (t.querySelector(LIVE_ROW_SELECTOR))
                return 'live';
        }
        // Otherwise unknown/empty (no servers)
        return 'unknown';
    }
    function updateAllSectionHeaders() {
        const headerLinks = document.querySelectorAll('tr.titre th.pxname a.px');
        for (const link of headerLinks) {
            const th = link.closest('th.pxname');
            if (!th)
                continue;
            const anchorName = th.querySelector('a[name]')?.getAttribute('name');
            if (!anchorName)
                continue;
            const headerTable = findSectionRootFromAnchorName(anchorName);
            if (!headerTable)
                continue;
            const status = sectionStatus(collectSectionTables(headerTable));
            if (status === 'dead')
                setHeaderEmoji(link, DEAD_EMOJI);
            else if (status === 'live')
                setHeaderEmoji(link, LIVE_EMOJI);
            // unknown => leave it alone
        }
    }
    function updateTabTitle() {
        const anyDead = document.querySelector(DEAD_ROW_SELECTOR);
        const base = 'HAProxy Stats';
        document.title = anyDead ? `🔴 DEAD — ${base}` : `🟢 ALIVE — ${base}`;
    }
    function run() {
        updateAllSectionHeaders();
        updateTabTitle();
    }
    run();
    // HAProxy can refresh sections / hide/show; MutationObserver keeps this correct
    new MutationObserver(run).observe(document.body, { childList: true, subtree: true });

})();
