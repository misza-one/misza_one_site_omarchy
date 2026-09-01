// Boot: theme, clock, window manager, global shortcuts.
(function (global) {
    'use strict';

    function boot() {
        global.Themes.load();
        startClock();

        const desktop = document.getElementById('desktop');
        const wm = new global.WindowManager(desktop);
        global.WM = wm;

        const barWindows = document.getElementById('barWindows');
        const updateBar = (count) => {
            if (barWindows) {
                barWindows.textContent = count + (count === 1 ? ' window' : ' windows');
            }
        };
        wm.onchange = updateBar;
        updateBar(0);

        // First window: the classic boot sequence.
        wm.open({
            boot: (term) => {
                const seq = [
                    { html: '<span class="t-accent">misza.one</span> <span class="t-dim">· terminal desktop</span>', class: 'head' },
                    { text: '' },
                    { html: 'type <span class="t-accent">help</span> to see what you can do here.' },
                    { text: '' },
                    { html: '<span class="t-dim">alt+enter</span> <span class="t-dim">split ·</span> <span class="t-dim">alt+w</span> <span class="t-dim">close ·</span> <span class="t-dim">alt+←→↑↓</span> <span class="t-dim">focus ·</span> <span class="t-dim">alt+k</span> <span class="t-dim">keybinds</span>', class: 'dim' }
                ];
                let i = 0;
                (function step() {
                    if (i < seq.length) {
                        term.out([seq[i]]);
                        i++;
                        setTimeout(step, 140);
                    }
                })();
            }
        });

        // Global keybinds (hyprland-style), capture phase so they win over
        // the terminal input's own key handling:
        //   alt+enter  split (new window)
        //   alt+w      kill focused window
        //   alt+arrow  focus window in direction
        //   alt+k      keybindings menu (the omarchy menu is alt+space)
        document.addEventListener('keydown', (e) => {
            if (!(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey)) return;
            const k = e.key.toLowerCase();
            const overlayOpen =
                (global.Menu && global.Menu.isOpen()) ||
                (global.Keybinds && global.Keybinds.isOpen());

            if (k === 'k') {
                e.preventDefault();
                e.stopPropagation();
                if (global.Keybinds.isOpen()) {
                    global.Keybinds.close();
                } else {
                    if (global.Menu.isOpen()) global.Menu.close();
                    global.Keybinds.open();
                }
                return;
            }
            if (overlayOpen) return;

            if (k === 'enter') {
                e.preventDefault();
                e.stopPropagation();
                global.WM.split();
            } else if (k === 'w') {
                e.preventDefault();
                e.stopPropagation();
                global.WM.closeFocused();
            } else if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') {
                e.preventDefault();
                e.stopPropagation();
                global.WM.focusDirection(k.slice(5));
            }
        }, true);
    }

    function startClock() {
        const clockEl = document.getElementById('clock');
        function tick() {
            const now = new Date();
            clockEl.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        }
        tick();
        setInterval(tick, 1000);
    }

    document.addEventListener('DOMContentLoaded', boot);
})(typeof window !== 'undefined' ? window : globalThis);
