// Terminal commands. Handlers receive (args, ctx) where ctx =
// { out, echo, esc, link, Terminal (instance), WM }.
(function (global) {
    'use strict';

    const { register } = global.Commands;
    const D = global.SITE_DATA;

    const pad = (s, n) => String(s).padEnd(n);

    // ------------------------------------------------------------------ help

    register('help', function (args, ctx) {
        const { out, esc } = ctx;
        out([
            { text: 'commands', class: 'section' },
            { html: '  <span class="t-bold">help</span>            <span class="t-dim">this list</span>' },
            { html: '  <span class="t-bold">about</span>           <span class="t-dim">who i am</span>' },
            { html: '  <span class="t-bold">projects</span>        <span class="t-dim">what i build</span>' },
            { html: '  <span class="t-bold">plugins</span>         <span class="t-dim">omarchy plugins</span>' },
            { html: '  <span class="t-bold">plugin</span> &lt;name&gt;    <span class="t-dim">plugin details</span>' },
            { html: '  <span class="t-bold">contact</span>         <span class="t-dim">find me online</span>' },
            { html: '  <span class="t-bold">theme</span> [&lt;name&gt;]   <span class="t-dim">list / switch themes</span>' },
            { html: '  <span class="t-bold">split</span>           <span class="t-dim">new terminal window (alt+enter)</span>' },
            { html: '  <span class="t-bold">tiles</span>           <span class="t-dim">map of open windows</span>' },
            { html: '  <span class="t-bold">close</span>           <span class="t-dim">close this window</span>' },
            { html: '  <span class="t-bold">omarchy</span>         <span class="t-dim">about omarchy</span>' },
            { html: '  <span class="t-bold">keybinds</span>        <span class="t-dim">window keybinds (alt+k)</span>' },
            { html: '  <span class="t-bold">menu</span>            <span class="t-dim">open the menu (alt+space)</span>' },
            { text: '' },
            { html: '  <span class="t-bold">whoami · date · uptime · echo</span> <span class="t-dim">·</span> <span class="t-bold">clear</span>', class: 'dim' },
            { text: '' },
            { html: '  <span class="t-dim">windows auto-arrange (dwindle) —</span> <span class="t-accent">alt+enter</span> <span class="t-dim">split, </span><span class="t-accent">alt+w</span> <span class="t-dim">close, </span><span class="t-accent">alt+←→↑↓</span> <span class="t-dim">focus.</span>' }
        ]);
    }, { aliases: ['?', 'commands'] });

    // ----------------------------------------------------------------- about

    register('about', function (args, ctx) {
        const { out, esc, link } = ctx;
        const a = D.about;
        out([
            { html: esc(a.name) + ' <span class="t-dim">·</span> ' + esc(a.tagline), class: 'head' },
            { text: '' }
        ]);
        for (const l of a.lines) out({ text: l.text });
        out([
            { text: '' },
            { html: '  ' + link(D.links.omarchy, 'omarchy.org'), class: '' },
            { html: '  ' + link(D.links.hyprland, 'hyprland.org') }
        ]);
    }, { aliases: ['whoami', 'me'] });

    // -------------------------------------------------------------- projects

    register('projects', function (args, ctx) {
        const { out, esc, link } = ctx;
        out([{ text: 'projects', class: 'section' }]);
        for (const p of D.projects) {
            out([
                { html: '  <span class="t-bold">' + esc(p.name) + '</span> <span class="t-dim">— ' + esc(p.description) + '</span>' },
                { html: '    ' + link(p.url), class: 'dim' }
            ]);
        }
    });

    // --------------------------------------------------------------- plugins

    // Flexible token match: "Matte Black" / "matte-black" / "matteblack"
    // all normalize to "matteblack" (case, spaces, hyphens, underscores ignored).
    const norm = (s) => String(s).toLowerCase().replace(/[\s\-_]+/g, '');

    function pluginById(query) {
        if (!query) return null;
        const q = norm(query);
        const raw = query.toLowerCase();
        let hit = D.plugins.find(p => norm(p.name) === q);
        if (hit) return hit;
        hit = D.plugins.find(p => norm(p.id) === q);
        if (hit) return hit;
        // id suffix: "omaherd" -> io.github.salemsayed.omaherd
        hit = D.plugins.find(p => p.id.toLowerCase().endsWith('.' + raw));
        if (hit) return hit;
        // convenience: a unique name substring ("home" -> Home Assistant)
        const sub = D.plugins.filter(p => p.name.toLowerCase().includes(raw));
        return sub.length === 1 ? sub[0] : null;
    }

    register('plugins', function (args, ctx) {
        const { out, esc } = ctx;
        const narrow = ctx.Terminal.hostEl.clientWidth < 520;
        out([
            { text: 'omarchy plugins', class: 'section' },
            { html: '  <span class="t-dim">' + D.plugins.length + ' plugins on this system — </span><span class="t-dim">type</span> <span class="t-accent">plugin &lt;name&gt;</span> <span class="t-dim">for details</span>' },
            { text: '' }
        ]);
        for (const p of D.plugins) {
            if (narrow) {
                out([
                    { html: '  <span class="t-cyan">●</span> <span class="t-bold">' + esc(p.name) + '</span>' },
                    { html: '    <span class="t-dim">' + esc(p.description) + '</span>' }
                ]);
            } else {
                out({
                    html: '  <span class="t-cyan">●</span> <span class="t-bold">' + pad(p.name, 22) + '</span> <span class="t-dim">' + esc(p.description.slice(0, 58)) + (p.description.length > 58 ? '…' : '') + '</span>'
                });
            }
        }
    }, { aliases: ['omarchy-plugins', 'plugin-list'] });

    register('plugin', function (args, ctx) {
        const { out, esc } = ctx;
        const p = pluginById(args.join(' '));
        if (!p) {
            out([
                { text: 'usage: plugin <name>', class: 'red' },
                { text: '' },
                { html: '  <span class="t-dim">try: </span>' + D.plugins.slice(0, 5).map(x => '<span class="t-accent">' + esc(x.name) + '</span>').join('  ') }
            ]);
            return;
        }
        out([
            { text: p.name, class: 'head' },
            { html: '  <span class="t-dim">id</span>      ' + esc(p.id) },
            { html: '  <span class="t-dim">author</span>  ' + esc(p.author) },
            { text: '' },
            { text: p.description }
        ]);
    });

    // --------------------------------------------------------------- contact

    register('contact', function (args, ctx) {
        const { out, esc, link } = ctx;
        out([{ text: 'find me', class: 'section' }]);
        for (const s of D.social) {
            out({
                html: '  <span class="t-bold">' + pad(s.platform, 9) + '</span> ' + link(s.url, s.handle)
            });
        }
    }, { aliases: ['social', 'socials', 'links'] });

    // ----------------------------------------------------------------- theme

    register('theme', function (args, ctx) {
        const { out, esc } = ctx;
        if (!args[0]) {
            out([{ text: 'themes', class: 'section' }]);
            for (const t of global.Themes.all()) {
                const current = global.Themes.current() === t.id;
                out({
                    html: (current ? '  <span class="t-green">✓</span> ' : '  <span class="t-dim"> </span> ') +
                        (current ? '<span class="t-bold">' : '') + esc(t.label) + (current ? '</span>' : '') +
                        (current ? ' <span class="t-dim">(current)</span>' : '')
                });
            }
            out([
                { text: '' },
                { html: '  <span class="t-dim">switch: </span><span class="t-accent">theme &lt;name&gt;</span>' }
            ]);
            return;
        }
        const wanted = norm(args.join(' '));
        const themes = global.Themes.all(); // [{ id, label }]
        const match = themes.find(t => norm(t.id) === wanted)
            || themes.find(t => norm(t.label) === wanted);
        if (!match || !global.Themes.set(match.id)) {
            out({ html: '  <span class="t-red">unknown theme:</span> ' + esc(args.join(' ')) + ' <span class="t-dim">— see</span> <span class="t-accent">theme</span>' });
            return;
        }
        out({ html: '  theme set: <span class="t-bold">' + esc(match.label) + '</span>' });
    }, { aliases: ['themes'] });

    // ----------------------------------------------------------------- tiles

    register('tiles', function (args, ctx) {
        const { out } = ctx;
        const lines = ctx.WM.map();
        out([
            { text: 'windows', class: 'section' },
            { html: '  <span class="t-dim">' + ctx.WM.count() + ' open — </span><span class="t-accent">alt+enter</span> <span class="t-dim">splits, ✕ closes, layout re-tiles</span>' },
            { text: '' }
        ].concat(lines.map(l => ({ text: l }))));
    }, { aliases: ['map'] });

    register('split', function (args, ctx) {
        const { out } = ctx;
        const win = ctx.WM.split();
        if (win) {
            out({ html: '  <span class="t-green">✓</span> new window opened' });
        } else {
            out({ html: '  <span class="t-red">no space left</span> <span class="t-dim">— close a window first</span>' });
        }
    }, { aliases: ['tile', 'new-window', 'new-window', 'open'] });

    register('close', function (args, ctx) {
        const id = ctx.WM.idForTerm(ctx.Terminal);
        if (id) {
            ctx.WM.close(id);
        }
    }, { aliases: ['exit-window', 'quit-window'] });

    // --------------------------------------------------------------- omarchy

    register('omarchy', function (args, ctx) {
        const { out, link } = ctx;
        out([
            { html: 'omarchy <span class="t-dim">—</span> <span class="t-dim">beautiful, fun &amp; opinionated linux</span>', class: 'head' },
            { text: '' },
            { text: 'Arch Linux + Hyprland, with a Quickshell-based shell for the bar,' },
            { text: 'notifications and plugins. The desktop this site is styled after.' },
            { text: '' },
            { html: '  ' + link(D.links.omarchy, 'omarchy.org') }
        ]);
    });

    // ------------------------------------------------------------------ menu

    register('menu', function (args, ctx) {
        if (global.Menu) global.Menu.open();
    }, { aliases: ['menu-open'] });

    // ------------------------------------------------------------- keybinds

    register('keybinds', function (args, ctx) {
        const { out, esc } = ctx;
        out([
            { text: 'keybinds', class: 'section' },
            { html: '  <span class="t-dim">the full list lives in the</span> <span class="t-accent">alt+k</span> <span class="t-dim">menu</span>' },
            { text: '' }
        ]);
        for (const group of global.KEYBIND_GROUPS) {
            const rows = global.KEYBINDS.filter(k => k.group === group.id);
            if (!rows.length) continue;
            out({ text: group.label, class: 'dim' });
            for (const kb of rows) {
                const pad = Math.max(1, 16 - kb.chord.length);
                out({
                    html: '  <span class="t-bold">' + esc(kb.chord) + '</span>' + ' '.repeat(pad) + '<span class="t-dim">' + esc(kb.action) + '</span>'
                });
            }
            out({ text: '' });
        }
    }, { aliases: ['binds', 'keys'] });

    // ------------------------------------------------------------------ misc

    register('clear', function (args, ctx) {
        ctx.Terminal.clear();
    }, { aliases: ['cls'] });

    register('date', function (args, ctx) {
        ctx.out([{ text: new Date().toString() }]);
    });

    let bootTime = Date.now();
    register('uptime', function (args, ctx) {
        const secs = Math.floor((Date.now() - bootTime) / 1000);
        const m = Math.floor(secs / 60);
        ctx.out([{ text: 'up ' + m + ' min ' + (secs % 60) + ' sec (session)' }]);
    });

    register('echo', function (args, ctx) {
        ctx.out([{ text: args.join(' ') }]);
    });

    register('sudo', function (args, ctx) {
        ctx.out([
            { html: '  <span class="t-yellow">visitor</span> is not in the sudoers file. <span class="t-dim">this incident will be reported.</span>' }
        ]);
    });

    register('ls', function (args, ctx) {
        ctx.out([{ html: '  <span class="t-accent">about</span>  <span class="t-accent">projects</span>  <span class="t-accent">plugins</span>  <span class="t-accent">contact</span>  <span class="t-accent">themes</span>  <span class="t-accent">windows</span>' }]);
    });

    register('exit', function (args, ctx) {
        ctx.out([{ html: '  <span class="t-dim">there is no escape. <span class="t-accent">help</span> is your friend.</span>' }]);
    });
})(typeof window !== 'undefined' ? window : globalThis);
