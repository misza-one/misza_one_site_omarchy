// Terminal engine — one instance per window, shared command registry.
(function (global) {
    'use strict';

    const PROMPT_TEXT = 'visitor@misza.one:~$';

    // -------------------------------------------------------- registry

    const handlers = {};
    let menuOpen = false;

    const Commands = {
        register(name, handler, opts) {
            handlers[name] = handler;
            const aliases = (opts && opts.aliases) || handler.aliases || [];
            for (const a of aliases) handlers[a] = handler;
        },
        run(name, args, ctx) {
            const handler = handlers[name];
            if (!handler) {
                ctx.out([{ html: '<span class="t-red">command not found:</span> ' + ctx.esc(name) + ' — try <span class="t-accent">help</span>' }]);
                return false;
            }
            try {
                handler(args, ctx);
            } catch (e) {
                ctx.out([{ text: 'error: ' + (e && e.message ? e.message : e), class: 'red' }]);
            }
            return true;
        },
        setMenuOpen(open) {
            menuOpen = open;
            if (open) {
                for (const t of Terminals) t.blur();
            } else {
                if (global.WM) global.WM.focusFocusedInput();
            }
        },
        isMenuOpen: () => menuOpen
    };

    const Terminals = new Set();

    // ---------------------------------------------------------- helpers

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function link(url, label) {
        return '<a class="out-link" data-url="' + esc(url) + '">' + esc(label || url) + '</a>';
    }

    // ------------------------------------------------------------ Terminal

    class Terminal {
        constructor(hostEl, opts) {
            opts = opts || {};
            this.hostEl = hostEl;
            this.id = opts.id || 'term-' + Math.random().toString(36).slice(2, 8);

            const term = document.createElement('div');
            term.className = 'term';
            term.innerHTML =
                '<div class="term-output"></div>' +
                '<div class="term-chips"></div>';
            hostEl.appendChild(term);

            this.outputEl = term.querySelector('.term-output');
            this.chipsEl = term.querySelector('.term-chips');

            // The input line lives inside the scrollable output so the
            // prompt follows the content, like a real terminal.
            const inputline = document.createElement('div');
            inputline.className = 'term-inputline';
            inputline.innerHTML =
                '<span class="prompt">' + esc(PROMPT_TEXT) + '</span>' +
                '<span class="input-mirror"><span class="mirror-before"></span><span class="cursor"></span><span class="mirror-after"></span></span>';
            this.outputEl.appendChild(inputline);
            this.mirrorBeforeEl = inputline.querySelector('.mirror-before');
            this.mirrorAfterEl = inputline.querySelector('.mirror-after');
            this.cursorEl = inputline.querySelector('.cursor');

            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.autocomplete = 'off';
            this.input.autocapitalize = 'none';
            this.input.spellcheck = false;
            this.input.setAttribute('aria-label', 'terminal input');
            this.input.className = 'term-hidden-input';
            document.body.appendChild(this.input);

            this.history = [];
            this.historyIndex = -1;

            this.bindEvents(term);
            Terminals.add(this);
        }

        ctx() {
            return {
                out: (l) => this.out(l),
                echo: (c) => this.echo(c),
                esc,
                link,
                Terminal: this,
                WM: global.WM || null
            };
        }

        bindEvents(term) {
            const input = this.input;

            const renderMirror = () => {
                const val = input.value;
                const caret = input.selectionStart == null ? val.length : input.selectionStart;
                this.mirrorBeforeEl.textContent = val.slice(0, caret);
                this.mirrorAfterEl.textContent = val.slice(caret);
            };
            this.renderMirror = renderMirror;

            input.addEventListener('input', renderMirror);
            input.addEventListener('keyup', renderMirror);
            input.addEventListener('click', renderMirror);
            input.addEventListener('select', renderMirror);

            input.addEventListener('keydown', (e) => {
                if (Commands.isMenuOpen()) {
                    e.preventDefault();
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) return; // Shift+Enter → WM split (main.js)
                    this.submit();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (this.history.length === 0) return;
                    if (this.historyIndex === -1) this.historyIndex = this.history.length - 1;
                    else if (this.historyIndex > 0) this.historyIndex--;
                    input.value = this.history[this.historyIndex];
                    input.setSelectionRange(input.value.length, input.value.length);
                    renderMirror();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (this.historyIndex === -1) return;
                    if (this.historyIndex < this.history.length - 1) this.historyIndex++;
                    else {
                        this.historyIndex = -1;
                        input.value = '';
                    }
                    input.setSelectionRange(input.value.length, input.value.length);
                    renderMirror();
                } else if (e.key === 'Escape') {
                    input.value = '';
                    this.historyIndex = -1;
                    renderMirror();
                } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                    e.preventDefault();
                    this.clear();
                } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    if (input.value) {
                        input.value = '';
                        renderMirror();
                    } else {
                        this.appendLine('<span class="t-accent">' + esc(PROMPT_TEXT) + '</span> ^C', '');
                    }
                }
            });

            term.addEventListener('click', () => {
                if (!Commands.isMenuOpen()) this.focus();
            });

            this.outputEl.addEventListener('click', (e) => {
                const a = e.target.closest('.out-link');
                if (a) {
                    e.preventDefault();
                    window.open(a.dataset.url, '_blank', 'noopener');
                }
            });
        }

        appendLine(html, className) {
            const div = document.createElement('div');
            div.className = 'out-line' + (className ? ' ' + className : '');
            div.innerHTML = html;
            const inputline = this.outputEl.querySelector('.term-inputline');
            this.outputEl.insertBefore(div, inputline);
            this.outputEl.scrollTop = this.outputEl.scrollHeight;
            return div;
        }

        out(lines) {
            const list = Array.isArray(lines) ? lines : [lines];
            for (const line of list) {
                if (line === null || line === undefined) {
                    this.appendLine('', 'spacer');
                    continue;
                }
                if (typeof line === 'string') {
                    this.appendLine(line === '' ? '&nbsp;' : esc(line), '');
                    continue;
                }
                const cls = line.class || '';
                if (typeof line.html === 'string') {
                    this.appendLine(line.html, cls);
                } else {
                    this.appendLine(line.text === '' ? '&nbsp;' : esc(line.text), cls);
                }
            }
        }

        echo(command) {
            this.appendLine('<span class="t-accent">' + esc(PROMPT_TEXT) + '</span> ' + esc(command));
        }

        clear() {
            for (const line of [...this.outputEl.querySelectorAll('.out-line')]) line.remove();
        }

        submit() {
            const raw = this.input.value;
            const command = raw.trim();
            this.input.value = '';
            this.renderMirror();
            this.historyIndex = -1;
            if (!command) return;
            if (this.history[this.history.length - 1] !== command) this.history.push(command);
            if (this.history.length > 200) this.history.shift();
            this.echo(command);
            const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            const args = parts.map(p => p.replace(/^"|"$/g, ''));
            const name = (args.shift() || '').toLowerCase();
            Commands.run(name, args, this.ctx());
        }

        run(commandLine) {
            this.echo(commandLine);
            const parts = commandLine.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            const args = parts.map(p => p.replace(/^"|"$/g, ''));
            const name = (args.shift() || '').toLowerCase();
            if (this.history[this.history.length - 1] !== commandLine) this.history.push(commandLine);
            Commands.run(name, args, this.ctx());
        }

        setChips(chips) {
            this.chipsEl.innerHTML = '';
            for (const chip of chips) {
                const btn = document.createElement('button');
                btn.className = 'chip' + (chip.accent ? ' chip-accent' : '');
                btn.textContent = chip.label;
                btn.addEventListener('click', () => {
                    if (chip.run) {
                        chip.run(this);
                    } else {
                        this.run(chip.label);
                    }
                    this.focus();
                });
                this.chipsEl.appendChild(btn);
            }
        }

        focus() {
            this.input.focus({ preventScroll: true });
        }

        blur() {
            this.input.blur();
        }

        destroy() {
            // The window body stays intact for the close animation; only the
            // detached hidden input is removed.
            Terminals.delete(this);
            this.input.remove();
        }
    }

    global.Terminal = Terminal;
    global.Terminals = Terminals;
    global.Commands = Commands;
    if (typeof module !== 'undefined' && module.exports) module.exports = { Terminal, Commands };
})(typeof window !== 'undefined' ? window : globalThis);
