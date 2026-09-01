// Keybindings — a dedicated overlay (alt+k), omarchy-style: a searchable
// list of every chord on the site, "CHORD → action". Selecting a row
// dispatches the action, like omarchy-menu-keybindings.
(function (global) {
    'use strict';

    // ------------------------------------------------------------- the data
    // Single source of truth for every keybinding on the site. The `keybinds`
    // terminal command and this overlay both render from it.
    const GROUPS = [
        { id: 'windows', label: 'windows' },
        { id: 'menus', label: 'menus' },
        { id: 'terminal', label: 'terminal' }
    ];

    const KEYBINDS = [
        { group: 'windows', chord: 'alt + enter', action: 'Split — new terminal window', run: () => global.WM.split() },
        { group: 'windows', chord: 'alt + w', action: 'Close focused window', run: () => global.WM.closeFocused() },
        { group: 'windows', chord: 'alt + ←', action: 'Focus window left', run: () => global.WM.focusDirection('left') },
        { group: 'windows', chord: 'alt + →', action: 'Focus window right', run: () => global.WM.focusDirection('right') },
        { group: 'windows', chord: 'alt + ↑', action: 'Focus window above', run: () => global.WM.focusDirection('up') },
        { group: 'windows', chord: 'alt + ↓', action: 'Focus window below', run: () => global.WM.focusDirection('down') },
        { group: 'menus', chord: 'alt + k', action: 'Keybindings — this menu' },
        { group: 'menus', chord: 'alt + space', action: 'Omarchy menu', run: () => global.Menu.open() },
        { group: 'terminal', chord: 'enter', action: 'Run command' },
        { group: 'terminal', chord: '↑ / ↓', action: 'Command history' },
        { group: 'terminal', chord: 'ctrl + l', action: 'Clear terminal' },
        { group: 'terminal', chord: 'ctrl + c', action: 'Interrupt / ^C' },
        { group: 'terminal', chord: 'esc', action: 'Clear line' }
    ];

    global.KEYBINDS = KEYBINDS;
    global.KEYBIND_GROUPS = GROUPS;

    const esc = (s) => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // ----------------------------------------------------------------- dom

    const scrim = document.createElement('div');
    scrim.className = 'kb-scrim';
    scrim.hidden = true;
    scrim.innerHTML =
        '<div class="kb-card" role="dialog" aria-label="keybindings">' +
            '<div class="kb-header">' +
                '<span class="kb-title">keybindings</span>' +
                '<span class="kb-sub">misza.one · omarchy dwindle</span>' +
                '<button class="kb-close" title="close">&times;</button>' +
            '</div>' +
            '<div class="kb-search">' +
                '<span class="kb-search-icon">&#9906;</span>' +
                '<input type="text" placeholder="type to filter…" autocomplete="off" spellcheck="false">' +
            '</div>' +
            '<div class="kb-list"></div>' +
            '<div class="kb-footer">' +
                '<span>&uarr;&darr; navigate</span>' +
                '<span>&#9166; run</span>' +
                '<span>esc close</span>' +
            '</div>' +
        '</div>';
    document.body.appendChild(scrim);

    const card = scrim.querySelector('.kb-card');
    const inputEl = scrim.querySelector('.kb-search input');
    const listEl = scrim.querySelector('.kb-list');
    const closeBtn = scrim.querySelector('.kb-close');

    // ------------------------------------------------------------- state

    let opened = false;
    let filterText = '';
    let selectedIndex = 0;
    let rows = []; // { kb, el }

    function matches(kb, query) {
        const hay = (kb.chord + ' ' + kb.action + ' ' + kb.group).toLowerCase();
        return query.split(/\s+/).every(term => hay.includes(term));
    }

    function buildRows() {
        rows = [];
        listEl.innerHTML = '';
        const query = filterText.trim().toLowerCase();

        for (const group of GROUPS) {
            const items = KEYBINDS.filter(kb =>
                kb.group === group.id && (!query || matches(kb, query)));
            if (items.length === 0) continue;

            if (GROUPS.length > 1 || query) {
                const header = document.createElement('div');
                header.className = 'kb-group';
                header.textContent = query ? items[0].group : group.label;
                listEl.appendChild(header);
            }

            for (const kb of items) {
                const btn = document.createElement('button');
                btn.className = 'kb-row';
                btn.innerHTML =
                    '<span class="kb-chord">' + esc(kb.chord) + '</span>' +
                    '<span class="kb-arrow">&#8594;</span>' +
                    '<span class="kb-action">' + esc(kb.action) + '</span>';
                listEl.appendChild(btn);
                rows.push({ kb, el: btn });
            }
        }

        // Wire selection + dispatch after rows exist.
        rows.forEach((row, i) => {
            row.el.addEventListener('mouseenter', () => setSelected(i));
            row.el.addEventListener('click', () => dispatch(row.kb));
        });

        if (selectedIndex >= rows.length) selectedIndex = Math.max(0, rows.length - 1);
        renderSelection();
    }

    function renderSelection() {
        rows.forEach((row, i) => row.el.classList.toggle('kb-row-selected', i === selectedIndex));
        const sel = rows[selectedIndex] && rows[selectedIndex].el;
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function setSelected(i) {
        if (i < 0 || i >= rows.length || i === selectedIndex) return;
        selectedIndex = i;
        renderSelection();
    }

    function dispatch(kb) {
        close();
        if (kb && typeof kb.run === 'function') kb.run();
    }

    // ------------------------------------------------------------- keys

    document.addEventListener('keydown', (e) => {
        if (!opened) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            if (filterText) setFilter('');
            else close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (rows.length) setSelected((selectedIndex + 1) % rows.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (rows.length) setSelected((selectedIndex - 1 + rows.length) % rows.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (rows[selectedIndex]) dispatch(rows[selectedIndex].kb);
        } else if ((e.key === 'Backspace') && filterText) {
            e.preventDefault();
            setFilter(filterText.slice(0, -1));
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key >= ' ') {
            e.preventDefault();
            setFilter(filterText + e.key.toLowerCase());
        }
    });

    function setFilter(text) {
        filterText = text;
        inputEl.value = text;
        selectedIndex = 0;
        buildRows();
    }

    // ---------------------------------------------------------- open/close

    function open() {
        if (opened) return;
        if (global.Menu && global.Menu.isOpen()) global.Menu.close();
        opened = true;
        filterText = '';
        inputEl.value = '';
        selectedIndex = 0;
        buildRows();
        scrim.hidden = false;
        for (const t of global.Terminals) t.blur();
        inputEl.focus({ preventScroll: true });
    }

    function close() {
        if (!opened) return;
        opened = false;
        scrim.hidden = true;
        if (global.WM) global.WM.focusFocusedInput();
    }

    // ---------------------------------------------------------------- misc

    scrim.addEventListener('click', (e) => {
        if (e.target === scrim) close();
    });
    card.addEventListener('click', (e) => e.stopPropagation());
    closeBtn.addEventListener('click', close);

    global.Keybinds = { open, close, isOpen: () => opened, dispatch };
})(typeof window !== 'undefined' ? window : globalThis);
