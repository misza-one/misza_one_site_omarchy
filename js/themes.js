// Theme system — palettes taken from /usr/share/omarchy/themes/
(function () {
    'use strict';

    const THEMES = {
        'catppuccin': {
            label: 'Catppuccin',
            background: '#1e1e2e',
            darker_background: '#101019',
            lighter_background: '#313244',
            foreground: '#cdd6f4',
            muted: '#585b70',
            accent: '#89b4fa',
            selection: '#45475a',
            red: '#f38ba8',
            green: '#a6e3a1',
            yellow: '#f9e2af',
            cyan: '#94e2d5',
            magenta: '#f5c2e7',
            orange: '#f6b6ab'
        },
        'nord': {
            label: 'Nord',
            background: '#2e3440',
            darker_background: '#191c23',
            lighter_background: '#3b4252',
            foreground: '#d8dee9',
            muted: '#4c566a',
            accent: '#81a1c1',
            selection: '#434c5e',
            red: '#bf616a',
            green: '#a3be8c',
            yellow: '#ebcb8b',
            cyan: '#88c0d0',
            magenta: '#b48ead',
            orange: '#d5967a'
        },
        'tokyo-night': {
            label: 'Tokyo Night',
            background: '#1a1b26',
            darker_background: '#0e0e14',
            lighter_background: '#24283b',
            foreground: '#a9b1d6',
            muted: '#414868',
            accent: '#7aa2f7',
            selection: '#292e42',
            red: '#f7768e',
            green: '#9ece6a',
            yellow: '#e0af68',
            cyan: '#449dab',
            magenta: '#ad8ee6',
            orange: '#eb927b'
        },
        'kanagawa': {
            label: 'Kanagawa',
            background: '#1f1f28',
            darker_background: '#111116',
            lighter_background: '#223249',
            foreground: '#dcd7ba',
            muted: '#54546d',
            accent: '#dcd7ba',
            selection: '#363646',
            red: '#c34043',
            green: '#76946a',
            yellow: '#c0a36e',
            cyan: '#6a9589',
            magenta: '#957fb8',
            orange: '#c17158'
        },
        'everforest': {
            label: 'Everforest',
            background: '#2d353b',
            darker_background: '#181d20',
            lighter_background: '#343f44',
            foreground: '#d3c6aa',
            muted: '#475258',
            accent: '#7fbbb3',
            selection: '#3d484d',
            red: '#e67e80',
            green: '#a7c080',
            yellow: '#dbbc7f',
            cyan: '#83c092',
            magenta: '#d699b6',
            orange: '#e09d7f'
        },
        'matte-black': {
            label: 'Matte Black',
            background: '#121212',
            darker_background: '#090909',
            lighter_background: '#1e1e1e',
            foreground: '#bebebe',
            muted: '#333333',
            accent: '#e68e0d',
            selection: '#2a2a2a',
            red: '#d35f5f',
            green: '#ffc107',
            yellow: '#b91c1c',
            cyan: '#bebebe',
            magenta: '#d35f5f',
            orange: '#c63d3d'
        }
    };

    const STORAGE_KEY = 'misza.one.theme';
    const DEFAULT_THEME = 'catppuccin';

    let current = DEFAULT_THEME;

    function apply(name) {
        const theme = THEMES[name] || THEMES[DEFAULT_THEME];
        const root = document.documentElement;
        const map = {
            background: '--background',
            darker_background: '--darker-background',
            lighter_background: '--lighter-background',
            foreground: '--foreground',
            muted: '--muted',
            accent: '--accent',
            selection: '--selection',
            red: '--red',
            green: '--green',
            yellow: '--yellow',
            cyan: '--cyan',
            magenta: '--magenta',
            orange: '--orange'
        };
        for (const [key, varName] of Object.entries(map)) {
            root.style.setProperty(varName, theme[key]);
        }
        current = name in THEMES ? name : DEFAULT_THEME;
        try {
            localStorage.setItem(STORAGE_KEY, current);
        } catch (e) { /* private mode */ }
        if (typeof window.onThemeChanged === 'function') {
            window.onThemeChanged(current, THEMES[current]);
        }
    }

    function load() {
        let saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch (e) { /* ignore */ }
        apply(saved && THEMES[saved] ? saved : DEFAULT_THEME);
    }

    window.Themes = {
        all: () => Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label })),
        current: () => current,
        set: (name) => {
            if (!THEMES[name]) return false;
            apply(name);
            return true;
        },
        load
    };
})();
