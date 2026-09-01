// WindowManager — DOM windows with the terminal, dwindle-tiled in the
// desktop area (omarchy model): the split tree always tiles the whole
// screen, a new window splits the largest existing window (which shrinks),
// and closing a window merges it into its sibling (which expands). All
// changes animate via CSS transitions.
(function (global) {
    'use strict';

    const Terminal = global.Terminal;
    const Layout = global.Layout;

    const CHIPS = [
        { label: 'help' },
        { label: 'about' },
        { label: 'plugins' },
        { label: 'projects' },
        { label: 'contact' },
        { label: 'theme' },
        { label: 'split', accent: true, run: () => global.WM.split() },
        { label: 'menu', accent: true, run: () => global.Menu && global.Menu.open() }
    ];

    class WindowManager {
        constructor(hostEl) {
            this.hostEl = hostEl;
            this.tree = Layout.root(); // dwindle split tree (null when empty)
            this.rects = new Map();    // id -> rect of the current layout
            this.windows = new Map(); // id -> {id, el, term, num}
            this.focusedId = null;
            this.counter = 0;
            this.zCounter = 10;
            this.onchange = null;

            // Desktop hint, visible when no windows are open.
            this.hintEl = document.createElement('div');
            this.hintEl.className = 'desktop-hint';
            this.hintEl.innerHTML =
                '<div class="desktop-hint-row">' +
                    '<span class="desktop-hint-key">shift</span>' +
                    '<span class="desktop-hint-plus">+</span>' +
                    '<span class="desktop-hint-key">enter</span>' +
                '</div>' +
                '<span class="desktop-hint-text">open a terminal</span>';
            hostEl.appendChild(this.hintEl);
            this.updateHint();

            // Re-apply layout when the desktop area resizes.
            if (global.ResizeObserver) {
                new ResizeObserver(() => this.applyLayout(true)).observe(hostEl);
            } else {
                global.addEventListener('resize', () => this.applyLayout(true));
            }
        }

        area() {
            return { x: 0, y: 0, w: this.hostEl.clientWidth, h: this.hostEl.clientHeight };
        }

        narrow() {
            return this.area().w < 700;
        }

        // ---------------------------------------------------------- layout

        // Compute window rects from the split tree and position all windows
        // (full-area stacking when narrow).
        applyLayout(animate) {
            const area = this.area();
            const narrow = this.narrow();
            this.rects = Layout.layoutRects(this.tree, area);
            if (animate) {
                this.hostEl.classList.add('layout-anim');
                clearTimeout(this._animT);
                this._animT = setTimeout(() => this.hostEl.classList.remove('layout-anim'), 240);
            }
            for (const [id, win] of this.windows) {
                let rect;
                if (narrow) {
                    rect = { x: 0, y: 0, w: area.w, h: area.h };
                } else {
                    rect = this.rects.get(id) || null;
                    if (!rect) continue;
                }
                const el = win.el;
                el.style.left = rect.x + 'px';
                el.style.top = rect.y + 'px';
                el.style.width = rect.w + 'px';
                el.style.height = rect.h + 'px';
                el.classList.toggle('window-hidden', narrow && id !== this.focusedId);
            }
        }

        // ----------------------------------------------------------- open

        open(opts) {
            opts = opts || {};
            const area = this.area();
            const id = 'w' + (++this.counter);
            const narrow = this.narrow();

            // Dwindle: the new window splits the largest existing one.
            const newTree = Layout.dwindleAdd(this.tree, area, id);
            if (newTree) {
                this.tree = newTree;
            } else if (!narrow) {
                this.counter--;
                return null; // wide: the screen is full
            }
            // narrow: stack anyway, even when the tree is full

            const el = document.createElement('div');
            el.className = 'window window-open';
            el.innerHTML =
                '<div class="window-titlebar">' +
                    '<span class="window-title">terminal</span>' +
                    '<button class="window-close" title="close window">&times;</button>' +
                '</div>' +
                '<div class="window-body"></div>';
            this.hostEl.appendChild(el);

            const body = el.querySelector('.window-body');
            const term = new Terminal(body, { id });
            term.setChips(CHIPS);

            const win = { id, el, term, num: this.counter };
            this.windows.set(id, win);
            el.querySelector('.window-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.close(id);
            });
            el.addEventListener('mousedown', () => {
                if (this.focusedId !== id) this.focus(id);
            });

            if (typeof opts.boot === 'function') {
                opts.boot(term);
            } else {
                term.out([
                    { html: '<span class="t-dim">new session — type</span> <span class="t-accent">help</span>' }
                ]);
            }

            this.applyLayout(false);
            this.focus(id);
            this.updateHint();
            this.emit();
            return win;
        }

        // ---------------------------------------------------------- close

        close(id) {
            const win = this.windows.get(id);
            if (!win) return;

            this.windows.delete(id);
            this.tree = Layout.dwindleRemove(this.tree, id); // sibling expands
            win.term.destroy();
            win.el.classList.add('window-closing');
            const el = win.el;
            setTimeout(() => el.remove(), 160);

            if (this.focusedId === id) {
                this.focusedId = null;
                // Focus a remaining window (last opened).
                for (const [wid] of this.windows) this.focusedId = wid;
            }
            this.applyLayout(true); // re-flows the rest, animated
            if (this.focusedId) this.focus(this.focusedId);
            this.updateHint();
            this.emit();
        }

        // ------------------------------------------------------------ focus

        focus(id) {
            const win = this.windows.get(id);
            if (!win) return;
            this.focusedId = id;
            this.zCounter++;
            win.el.style.zIndex = this.zCounter;
            const narrow = this.narrow();
            for (const [wid, w] of this.windows) {
                w.el.classList.toggle('window-focused', wid === id);
                if (narrow) w.el.classList.toggle('window-hidden', wid !== id);
                if (wid !== id) w.term.blur();
            }
            win.term.focus();
            this.emit();
        }

        focusedTerm() {
            const win = this.windows.get(this.focusedId);
            return win ? win.term : null;
        }

        focusFocusedInput() {
            const t = this.focusedTerm();
            if (t) t.focus();
        }

        idForTerm(term) {
            for (const [id, win] of this.windows) {
                if (win.term === term) return id;
            }
            return null;
        }

        // --------------------------------------------------------- actions

        // Shift+w / `close`: kill the focused window (hyprland killactive).
        closeFocused() {
            if (this.focusedId) this.close(this.focusedId);
        }

        // Shift+arrow: focus the closest window in the given direction
        // (hyprland dispatch:focuswindow).
        focusDirection(dir) {
            const target = this.rects.get(this.focusedId);
            if (!target) return;
            const tx = target.x + target.w / 2;
            const ty = target.y + target.h / 2;
            let best = null;
            let bestDist = Infinity;
            for (const id of this.windows.keys()) {
                if (id === this.focusedId) continue;
                const r = this.rects.get(id);
                if (!r) continue;
                const cx = r.x + r.w / 2;
                const cy = r.y + r.h / 2;
                let dist;
                if (dir === 'left') { if (cx >= tx) continue; dist = tx - cx; }
                else if (dir === 'right') { if (cx <= tx) continue; dist = cx - tx; }
                else if (dir === 'up') { if (cy >= ty) continue; dist = ty - cy; }
                else if (dir === 'down') { if (cy <= ty) continue; dist = cy - ty; }
                else continue;
                if (dist < bestDist) { bestDist = dist; best = id; }
            }
            if (best) this.focus(best);
        }

        // Shift+enter / `split`: new window, layout re-derived.
        split() {
            const win = this.open();
            if (!win) {
                const t = this.focusedTerm();
                if (t) t.out([{ html: '  <span class="t-yellow">no space left</span> <span class="t-dim">— close a window first</span>' }]);
            }
            return win;
        }

        count() {
            return this.windows.size;
        }

        // ASCII map of the current layout (for the `tiles` command).
        map() {
            return Layout.asciiMap(this.tree, this.area());
        }

        // ------------------------------------------------------------- misc

        updateHint() {
            this.hintEl.style.display = this.windows.size === 0 ? '' : 'none';
        }

        emit() {
            if (this.onchange) this.onchange(this.count(), this.focusedId);
        }
    }

    global.WindowManager = WindowManager;
})(typeof window !== 'undefined' ? window : globalThis);
