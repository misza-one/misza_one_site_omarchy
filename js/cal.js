// Calendar popover — click the bar clock to open; navigate months; esc or scrim closes.
(function (global) {
    'use strict';

    const scrimEl = document.getElementById('calScrim');
    const cardEl = document.getElementById('calCard');
    const gridEl = document.getElementById('calGrid');
    const titleEl = document.getElementById('calTitle');
    const dateEl = document.getElementById('calDate');
    const todayBtn = document.getElementById('calToday');
    const prevBtn = document.getElementById('calPrev');
    const nextBtn = document.getElementById('calNext');
    const clockEl = document.getElementById('clock');

    const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const sameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    let view;

    function render() {
        const today = new Date();
        const y = view.getFullYear();
        const m = view.getMonth();
        titleEl.textContent = MONTHS[m] + ' ' + y;

        const first = new Date(y, m, 1);
        const startOffset = (first.getDay() + 6) % 7;
        const start = new Date(y, m, 1 - startOffset);

        let html = '';
        for (const d of DOW) html += '<div class="cal-dow">' + d + '</div>';
        for (let i = 0; i < 42; i++) {
            const cell = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const inMonth = cell.getMonth() === m;
            const cls = ['cal-cell'];
            if (!inMonth) cls.push('cal-out');
            else if (cell.getDay() === 0 || cell.getDay() === 6) cls.push('cal-weekend');
            if (sameDay(cell, today)) cls.push('cal-today');
            html += '<div class="' + cls.join(' ') + '">' + cell.getDate() + '</div>';
        }
        gridEl.innerHTML = html;

        dateEl.textContent =
            DOW[(today.getDay() + 6) % 7] + ' ' +
            today.getDate() + ' ' +
            MONTHS[today.getMonth()].slice(0, 3) + ' ' +
            today.getFullYear();
    }

    function open() {
        if (global.Menu && global.Menu.isOpen()) global.Menu.close();
        if (global.Keybinds && global.Keybinds.isOpen()) global.Keybinds.close();
        view = new Date();
        render();
        scrimEl.hidden = false;
        if (clockEl) clockEl.setAttribute('aria-expanded', 'true');
    }

    function close() {
        if (scrimEl.hidden) return;
        scrimEl.hidden = true;
        if (clockEl) clockEl.setAttribute('aria-expanded', 'false');
    }

    function isOpen() {
        return !scrimEl.hidden;
    }

    function toggle() {
        if (isOpen()) close();
        else open();
    }

    scrimEl.addEventListener('click', (e) => {
        if (e.target === scrimEl) close();
    });

    todayBtn.addEventListener('click', () => {
        view = new Date();
        render();
    });

    prevBtn.addEventListener('click', () => {
        view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
        render();
    });

    nextBtn.addEventListener('click', () => {
        view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        render();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    }, true);

    if (clockEl) {
        clockEl.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle();
        });
    }

    global.Cal = { open, close, toggle, isOpen };
})(typeof window !== 'undefined' ? window : globalThis);
