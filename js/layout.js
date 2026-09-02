// Dwindle layout — the omarchy/hyprland model.
//
// The layout is a binary split tree that ALWAYS tiles the whole screen with
// the open windows (no reserved/free space):
//   { t: 'win', id }                       a window (leaf)
//   { t: 'split', d: 'h'|'v', a, b }       an internal split
// 'h' = vertical cut (a = left, b = right); 'v' = horizontal cut (a = top, b = bottom)
//
// Adding a window splits the LARGEST existing window in half: the old window
// keeps the left/top half (it animates down), the new window takes the
// right/bottom half. Removing a window merges it into its sibling (the
// sibling expands). A single window fills the entire screen. This is what
// makes windows "fit each other" — every open/close resizes a neighbour.
(function (global) {
    'use strict';

    const MIN_TILE = { w: 160, h: 100 };

    // ------------------------------------------------------------- rects

    function layoutRects(tree, screen) {
        const rects = new Map();
        (function walk(node, r) {
            if (!node) return;
            if (node.t === 'win') {
                rects.set(node.id, { x: r.x, y: r.y, w: r.w, h: r.h });
                return;
            }
            if (node.d === 'h') {
                const w1 = Math.round(r.w / 2);
                walk(node.a, { x: r.x, y: r.y, w: w1, h: r.h });
                walk(node.b, { x: r.x + w1, y: r.y, w: r.w - w1, h: r.h });
            } else {
                const h1 = Math.round(r.h / 2);
                walk(node.a, { x: r.x, y: r.y, w: r.w, h: h1 });
                walk(node.b, { x: r.x, y: r.y + h1, w: r.w, h: r.h - h1 });
            }
        })(tree, screen);
        return rects;
    }

    // -------------------------------------------------------- add/remove

    // Largest window leaf (by area) in the tree, with its current rect.
    function largestWindow(node, screen) {
        let best = null;
        (function walk(n, r) {
            if (!n) return;
            if (n.t === 'win') {
                const area = r.w * r.h;
                if (!best || area > best.area) best = { node: n, rect: r, area };
                return;
            }
            if (n.d === 'h') {
                const w1 = Math.round(r.w / 2);
                walk(n.a, { x: r.x, y: r.y, w: w1, h: r.h });
                walk(n.b, { x: r.x + w1, y: r.y, w: r.w - w1, h: r.h });
            } else {
                const h1 = Math.round(r.h / 2);
                walk(n.a, { x: r.x, y: r.y, w: r.w, h: h1 });
                walk(n.b, { x: r.x, y: r.y + h1, w: r.w, h: r.h - h1 });
            }
        })(node, screen);
        return best;
    }

    // Split direction for a rect: prefer the aspect direction, fall back to
    // the other one when it still yields a usable tile.
    function splitFor(rect) {
        const fitsH = rect.w / 2 >= MIN_TILE.w && rect.h >= MIN_TILE.h;
        const fitsV = rect.w >= MIN_TILE.w && rect.h / 2 >= MIN_TILE.h;
        if (rect.w >= rect.h) return fitsH ? 'h' : (fitsV ? 'v' : null);
        return fitsV ? 'v' : (fitsH ? 'h' : null);
    }

    function replaceNode(tree, target, replacement) {
        if (tree === target) return replacement;
        if (tree.t === 'split') {
            return {
                t: 'split',
                d: tree.d,
                a: tree.a === target ? replacement : replaceNode(tree.a, target, replacement),
                b: tree.b === target ? replacement : replaceNode(tree.b, target, replacement)
            };
        }
        return tree;
    }

    // Add a window: split the largest existing window. The old window keeps
    // the left/top half, the new window takes the right/bottom half.
    // Returns the new tree, or null when the screen is full.
    function dwindleAdd(tree, screen, id) {
        if (!tree) return { t: 'win', id };
        const largest = largestWindow(tree, screen);
        if (!largest) return null;
        const d = splitFor(largest.rect);
        if (!d) return null; // largest window is too small to split
        const split = { t: 'split', d, a: largest.node, b: { t: 'win', id } };
        return replaceNode(tree, largest.node, split);
    }

    // Remove a window: merge it into its sibling (the sibling expands).
    // Returns the new tree, or null when it was the last window.
    function dwindleRemove(tree, id) {
        if (!tree) return null;
        if (tree.t === 'win') return tree.id === id ? null : tree;
        if (tree.a.t === 'win' && tree.a.id === id) return tree.b;
        if (tree.b.t === 'win' && tree.b.id === id) return tree.a;
        const a = tree.a.t === 'split' ? dwindleRemove(tree.a, id) : tree.a;
        const b = tree.b.t === 'split' ? dwindleRemove(tree.b, id) : tree.b;
        if (!a) return b;
        if (!b) return a;
        return { t: 'split', d: tree.d, a, b };
    }

    // ---------------------------------------------------------- swap

    // Swap two windows in the tree (dwindle "swap"). In a dwindle tree every
    // window is a leaf, so swapping is just exchanging the two leaves in
    // place — the split structure (and any ratios) is untouched, only which
    // window sits where. Returns the new tree.
    function dwindleSwap(tree, idA, idB) {
        function rec(node) {
            if (node.t === 'win') {
                if (node.id === idA) return { t: 'win', id: idB };
                if (node.id === idB) return { t: 'win', id: idA };
                return node;
            }
            return { t: 'split', d: node.d, a: rec(node.a), b: rec(node.b) };
        }
        return rec(tree);
    }

    // -------------------------------------------------------------- misc

    function collectWindows(tree, rect, out) {
        if (!tree) return;
        if (tree.t === 'win') {
            out.push({ id: tree.id, rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h } });
            return;
        }
        if (tree.d === 'h') {
            const w1 = Math.round(rect.w / 2);
            collectWindows(tree.a, { x: rect.x, y: rect.y, w: w1, h: rect.h }, out);
            collectWindows(tree.b, { x: rect.x + w1, y: rect.y, w: rect.w - w1, h: rect.h }, out);
        } else {
            const h1 = Math.round(rect.h / 2);
            collectWindows(tree.a, { x: rect.x, y: rect.y, w: rect.w, h: h1 }, out);
            collectWindows(tree.b, { x: rect.x, y: rect.y + h1, w: rect.w, h: rect.h - h1 }, out);
        }
    }

    // ASCII rendering of the tiling, scaled to `cols` characters wide.
    function asciiMap(tree, screen, cols) {
        cols = cols || 58;
        const wins = [];
        collectWindows(tree, screen, wins);
        if (wins.length === 0) return ['(no windows open)'];

        const scale = (cols - 6) / screen.w;
        const rows = Math.max(6, Math.round(screen.h * scale / 2) + 4);
        const grid = [];
        for (let r = 0; r < rows; r++) grid.push(new Array(cols).fill(' '));

        wins.forEach((w, i) => {
            const x0 = Math.round((w.rect.x - screen.x) * scale) + 2;
            const y0 = Math.round((w.rect.y - screen.y) * scale / 2) + 2;
            const bw = Math.max(8, Math.round(w.rect.w * scale) - 2);
            const bh = Math.max(3, Math.round(w.rect.h * scale / 2) - 2);

            const put = (x, y, ch) => {
                if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y][x] = ch;
            };
            for (let x = x0; x < x0 + bw; x++) { put(x, y0, '─'); put(x, y0 + bh, '─'); }
            for (let y = y0; y < y0 + bh; y++) { put(x0, y, '│'); put(x0 + bw - 1, y, '│'); }
            put(x0, y0, '┌'); put(x0 + bw - 1, y0, '┐');
            put(x0, y0 + bh, '└'); put(x0 + bw - 1, y0 + bh, '┘');

            const label = ' ' + (i + 1) + ' ';
            const lx = Math.min(x0 + 1, cols - label.length - 1);
            const ly = Math.min(y0 + 1, rows - 2);
            for (let k = 0; k < label.length; k++) put(lx + k, ly, label[k]);
        });

        return grid.map(row => row.join(''));
    }

    const Layout = {
        MIN_TILE,
        layoutRects,
        dwindleAdd,
        dwindleRemove,
        dwindleSwap,
        collectWindows,
        asciiMap,
        root: () => null
    };

    global.Layout = Layout;
    if (typeof module !== 'undefined' && module.exports) module.exports = Layout;
})(typeof window !== 'undefined' ? window : globalThis);
