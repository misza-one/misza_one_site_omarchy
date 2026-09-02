// Omarchy-style menu overlay — alt+space, keyboard nav, type-to-filter, submenus.
(function (global) {
    'use strict';

    const esc = (s) => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const D = global.SITE_DATA;
    const T = global.Themes;

    const scrimEl = document.getElementById('menuScrim');
    const cardEl = document.getElementById('menuCard');
    const inputEl = document.getElementById('menuInput');
    const listEl = document.getElementById('menuList');

    // ------------------------------------------------------------- menu tree

    const NO_TERM_CMDS = new Set(['theme', 'split', 'clear', 'tiles', 'reload', 'menu']);

    function runCmd(cmd) {
        const parts = cmd.trim().split(/\s+/);
        const name = parts[0];
        const args = parts.slice(1);
        let term = global.WM && global.WM.focusedTerm();
        if (!term && global.WM && !NO_TERM_CMDS.has(name)) {
            const win = global.WM.open();
            if (win) term = win.term;
        }
        if (term) { term.run(cmd); return; }
        const noopEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const ctx = {
            out: () => {},
            echo: () => {},
            esc: noopEsc,
            link: (u, l) => noopEsc(l || u),
            Terminal: null,
            WM: global.WM || null
        };
        if (global.Commands) global.Commands.run(name, args, ctx);
    }

    const ITEMS = {
        'about':      { icon: 'i',  label: 'About',    action: () => runCmd('about') },
        'projects':   { icon: '◆',  label: 'Projects', action: () => runCmd('projects') },
        'plugins':    { icon: '▤',  label: 'Plugins',  title: 'Omarchy plugins' },
        'contact':    { icon: '@',  label: 'Contact',  action: () => runCmd('contact') },
        'style':      { icon: '◐',  label: 'Style' },
        'omarchy':    { icon: 'O',  label: 'Omarchy',  action: () => global.open(D.links.omarchy, '_blank', 'noopener') },
        'system':     { icon: '⏻',  label: 'System' }
    };

    for (const p of D.plugins) {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        ITEMS['plugins.' + slug] = {
            icon: '●',
            label: p.name,
            detail: p.description,
            aliases: [p.id],
            action: () => runCmd('plugin ' + p.name)
        };
    }

    for (const t of T.all()) {
        ITEMS['style.theme.' + t.id] = {
            icon: '◕',
            label: t.label,
            detail: 'theme',
            checked: () => T.current() === t.id,
            action: () => runCmd('theme ' + t.id)
        };
    }

    ITEMS['style.theme'] = { icon: '◐', label: 'Theme', title: 'Theme' };
    ITEMS['system.split'] = { icon: '⧉', label: 'New Terminal Window', detail: 'alt+enter', action: () => global.WM.split() };
    ITEMS['system.map'] = { icon: '▦', label: 'Window Map', detail: 'tiles command', action: () => runCmd('tiles') };
    ITEMS['system.keybinds'] = { icon: '⌨', label: 'Keybindings', detail: 'alt+k', action: () => global.Keybinds.open() };
    ITEMS['system.clear'] = { icon: '⌫', label: 'Clear terminal', action: () => { const t = global.WM.focusedTerm(); if (t) t.clear(); } };
    ITEMS['system.reload'] = { icon: '↻', label: 'Reload site', action: () => location.reload() };

    // Normalize: build tree from dotted ids.
    const tree = { id: 'root', children: [], items: {} };

    function nodeFor(id, create) {
        if (tree.items[id]) return tree.items[id];
        if (!create) return null;
        const parts = id.split('.');
        let parent = tree;
        let path = '';
        for (const part of parts) {
            path = path ? path + '.' + part : part;
            let child = parent.children.find(c => c.id === path);
            if (!child) {
                child = { id: path, children: [], items: {} };
                parent.children.push(child);
                parent.items[path] = child;
            }
            parent = child;
        }
        tree.items[id] = parent;
        return parent;
    }

    // First pass: create all nodes.
    for (const id of Object.keys(ITEMS)) nodeFor(id, true);

    // Second pass: fill in metadata + ordering.
    for (const [id, meta] of Object.entries(ITEMS)) {
        const node = tree.items[id];
        Object.assign(node, meta);
        const parent = id.includes('.') ? tree.items[id.slice(0, id.lastIndexOf('.'))] : null;
        if (parent) {
            if (!parent.children.some(c => c.id === id)) parent.children.push(node);
        }
    }

    // Stable top-level order.
    const TOP_ORDER = ['about', 'projects', 'plugins', 'contact', 'style', 'omarchy', 'system'];
    tree.children.sort((a, b) => {
        const ia = TOP_ORDER.indexOf(a.id);
        const ib = TOP_ORDER.indexOf(b.id);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    function sortChildren(node) {
        node.children.forEach(sortChildren);
    }
    sortChildren(tree);

    // Assign parent ids for search grouping.
    (function assignParents() {
        const walk = (n, parentId) => {
            for (const c of n.children) {
                c.parentId = parentId;
                walk(c, c.id);
            }
        };
        walk(tree, 'root');
    })();

    // ------------------------------------------------------------- state

    let opened = false;
    let activeMenu = 'root';
    let navStack = [];
    let filterText = '';
    let selectedIndex = 0;
    let rows = [];

    function node(id) {
        return tree.items[id] || null;
    }

    function titleFor(id) {
        if (id === 'root') return 'Go';
        const n = node(id);
        return (n && (n.title || n.label)) || 'Go';
    }

    // Search: current menu's children first, then descendants (drilldown).
    function matches(item, query) {
        const hay = [item.label, item.detail, (item.aliases || []).join(' ')].join(' ').toLowerCase();
        return query.split(/\s+/).every(term => hay.includes(term));
    }

    function descendants(id) {
        const result = [];
        const walk = (n) => {
            for (const c of n.children) {
                result.push(c);
                walk(c);
            }
        };
        walk(node(id) || tree);
        return result;
    }

    function buildRows() {
        rows = [];
        const query = filterText.trim().toLowerCase();
        const active = node(activeMenu) || tree;

        if (query) {
            const current = [];
            const drill = [];
            const activeDesc = descendants(activeMenu);
            for (const item of activeDesc) {
                if (item.action === undefined && item.children.length === 0) continue;
                if (!matches(item, query)) continue;
                if (item.parentId === activeMenu || active.children.includes(item)) current.push({ item, detail: pathFor(item.id) });
                else drill.push({ item, detail: pathFor(item.id) });
            }
            rows = current.concat(drill.map((r, i) => ({ ...r, section: i === 0 ? 'drilldown' : '' })));
        } else {
            for (const child of active.children) {
                rows.push({ item: child, detail: child.detail || '', section: '' });
            }
        }
    }

    function pathFor(id) {
        const parts = id.split('.');
        return parts.slice(0, -1).map(p => (node(p) || {}).label || p).join(' / ');
    }

    // ------------------------------------------------------------- render

    function render() {
        buildRows();
        listEl.innerHTML = '';

        inputEl.placeholder = filterText ? filterText + '…' : titleFor(activeMenu) + ' — type to search';
        inputEl.classList.toggle('menu-input-filter', filterText.length > 0);

        if (rows.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'menu-row';
            empty.innerHTML = '<span class="menu-row-text"><span class="menu-row-label" style="color:var(--muted)">' +
                (filterText ? 'no matches' : 'empty') + '</span></span>';
            listEl.appendChild(empty);
            selectedIndex = 0;
            return;
        }

        rows.forEach((row, i) => {
            if (row.section === 'drilldown') {
                const div = document.createElement('div');
                div.className = 'menu-divider';
                listEl.appendChild(div);
            }
            const btn = document.createElement('button');
            btn.className = 'menu-row' + (i === selectedIndex ? ' menu-row-selected' : '');
            btn.dataset.index = i;

            const isMenu = row.item.children.length > 0;
            let trail = '';
            if (row.item.checked && row.item.checked()) trail += '<span class="menu-row-check">✓</span>';
            if (isMenu) trail += '<span class="menu-row-trail">›</span>';

            const showDetail = (filterText || row.detail) && row.detail;
            btn.innerHTML =
                '<span class="menu-row-icon">' + esc(row.item.icon || '·') + '</span>' +
                '<span class="menu-row-text">' +
                    '<span class="menu-row-label">' + esc(row.item.label) + '</span>' +
                    (showDetail ? '<span class="menu-row-detail">' + esc(row.detail) + '</span>' : '') +
                '</span>' +
                trail;

            btn.addEventListener('mouseenter', () => {
                if (selectedIndex !== i) {
                    selectedIndex = i;
                    updateSelection();
                }
            });
            btn.addEventListener('click', () => {
                selectedIndex = i;
                activate(i);
            });
            listEl.appendChild(btn);
        });

        if (selectedIndex >= rows.length) selectedIndex = rows.length - 1;
        if (selectedIndex < 0) selectedIndex = 0;
        revealCursor();
    }

    function updateSelection() {
        const btns = listEl.querySelectorAll('.menu-row');
        btns.forEach((b, i) => b.classList.toggle('menu-row-selected', i === selectedIndex));
        revealCursor();
    }

    function revealCursor() {
        const btn = listEl.querySelector('.menu-row-selected');
        if (btn) btn.scrollIntoView({ block: 'nearest' });
    }

    // ------------------------------------------------------------- actions

    function select(delta) {
        if (rows.length === 0) return;
        selectedIndex = (selectedIndex + delta + rows.length) % rows.length;
        updateSelection();
    }

    function activate(index) {
        const row = rows[index];
        if (!row) return;
        const item = row.item;
        if (item.children.length > 0) {
            navStack.push(activeMenu);
            activeMenu = item.id;
            filterText = '';
            selectedIndex = 0;
            render();
        } else if (item.action) {
            close();
            item.action();
        }
    }

    function goBack() {
        if (activeMenu === 'root') return false;
        let target;
        if (navStack.length > 0) {
            target = navStack.pop();
        } else {
            const dot = activeMenu.lastIndexOf('.');
            target = dot > 0 ? activeMenu.slice(0, dot) : 'root';
        }
        activeMenu = node(target) ? target : 'root';
        filterText = '';
        selectedIndex = 0;
        render();
        return true;
    }

    function setFilter(text) {
        filterText = text;
        selectedIndex = 0;
        render();
    }

    // ------------------------------------------------------------- open/close

    function open() {
        if (opened) return;
        if (global.Keybinds && global.Keybinds.isOpen()) global.Keybinds.close();
        opened = true;
        activeMenu = 'root';
        navStack = [];
        filterText = '';
        selectedIndex = 0;
        scrimEl.hidden = false;
        global.Commands.setMenuOpen(true);
        render();
        inputEl.focus({ preventScroll: true });
    }

    function close() {
        if (!opened) return;
        opened = false;
        scrimEl.hidden = true;
        global.Commands.setMenuOpen(false);
    }

    // ------------------------------------------------------------- keys

    document.addEventListener('keydown', (e) => {
        // Toggle: alt+space (or meta+space on mac)
        if ((e.altKey || e.metaKey) && e.code === 'Space') {
            e.preventDefault();
            if (opened) close(); else open();
            return;
        }
        if (!opened) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            if (filterText) setFilter('');
            else close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            select(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            select(-1);
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            select(6);
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            select(-6);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            activate(selectedIndex);
        } else if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && filterText) {
            e.preventDefault();
            setFilter(filterText.slice(0, -1));
        } else if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && !filterText) {
            e.preventDefault();
            if (!goBack()) close();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key >= ' ') {
            e.preventDefault();
            setFilter(filterText + e.key);
        }
    });

    // The input is display-only — characters are intercepted above and the
    // value is mirrored from filterText. Focus it on mobile for the keyboard.
    inputEl.addEventListener('focus', () => {
        // Keep the caret at the end of the mirrored text.
        setTimeout(() => {
            inputEl.value = filterText;
            inputEl.setSelectionRange(filterText.length, filterText.length);
        }, 0);
    });

    // Mirror filterText into the input so mobile keyboards show what's typed.
    const origRender = render;
    render = function () {
        origRender();
        inputEl.value = filterText;
    };

    scrimEl.addEventListener('click', (e) => {
        if (e.target === scrimEl) close();
    });
    cardEl.addEventListener('click', (e) => e.stopPropagation());

    // Bar hint button
    const barHint = document.getElementById('barHint');
    if (barHint) {
        barHint.addEventListener('click', () => {
            if (opened) close(); else open();
        });
    }

    global.Menu = { open, close, isOpen: () => opened };
})(typeof window !== 'undefined' ? window : globalThis);
