// Site content — edit this file to change what the terminal shows.
(function () {
    'use strict';

    const DATA = {
        about: {
            name: 'Misza',
            tagline: 'Developer. Linux person. Omarchy enthusiast.',
            lines: [
                { text: 'I build things for the command line and the desktop.' },
                { text: 'These days mostly around Omarchy — Hyprland, the omarchy-shell, and plugins for it.' },
                { text: 'If it has a terminal, I probably live in it.' }
            ]
        },

        // Projects shown by `projects`. Edit freely.
        projects: [
            {
                name: 'homeassistant_addons',
                description: 'Home Assistant add-ons',
                url: 'https://github.com/misza-one/homeassistant_addons'
            },
            {
                name: 'logicgraph',
                description: 'TypeScript project',
                url: 'https://github.com/misza-one/logicgraph'
            },
            {
                name: 'misza_one',
                description: 'This site (and its predecessors)',
                url: 'https://github.com/misza-one/misza_one'
            }
        ],

        // Omarchy plugins section — `omarchy plugin` data.
        // Add your own plugins here; the terminal renders this list.
        plugins: [
            {
                id: 'akitaonrails.ai-usagebar',
                name: 'AI Usage',
                description: 'Multi-provider AI plan usage and balances in a native Omarchy Quattro panel.',
                author: 'akitaonrails'
            },
            {
                id: 'akshar.radio-atlas',
                name: 'Radio Atlas',
                description: 'Explore live radio on a rotatable globe and play stations through Omarchy media controls.',
                author: 'akshar'
            },
            {
                id: 'azambekdev.gitpulse',
                name: 'GitPulse',
                description: 'Real-time GitHub pulse, PR review requests, CI/CD status, and notification center.',
                author: 'azambekdev'
            },
            {
                id: 'b.okomart',
                name: 'Okomart',
                description: 'Browse, install, enable, disable, update, and remove Omarchy plugins from a storefront interface.',
                author: 'b.okomart'
            },
            {
                id: 'crmne.hyprmoncfg',
                name: 'hyprmoncfg',
                description: 'Multi-monitor manager: per-setup profiles applied on hotplug, lid events and suspend.',
                author: 'crmne'
            },
            {
                id: 'hass',
                name: 'Home Assistant',
                description: 'View and control Home Assistant devices from the Omarchy bar.',
                author: 'omarchy'
            },
            {
                id: 'io.github.amitcpatel.elgato-control',
                name: 'Elgato Control',
                description: 'Adaptive controls for Elgato Stream Deck, Pedal, Wave microphones, and Key Lights.',
                author: 'amitcpatel'
            },
            {
                id: 'io.github.salemsayed.omaherd',
                name: 'Omaherd',
                description: 'A local and remote HerdR attention inbox for the Omarchy bar.',
                author: 'salemsayed'
            },
            {
                id: 'oled.guard',
                name: 'OLED Guard',
                description: 'Attenuates the always-on status bar so it stops out-wearing the rest of your OLED panel.',
                author: 'oled.guard'
            },
            {
                id: 'shavanced.notification-center',
                name: 'Notification Center',
                description: 'Native notification center: live notifications, history, search, Do Not Disturb.',
                author: 'shavanced'
            },
            {
                id: 'stappmus.activity-monitor',
                name: 'Activity Monitor',
                description: 'A calm, low-overhead glance at CPU, memory, GPU, storage, and processes.',
                author: 'stappmus'
            }
        ],

        social: [
            { platform: 'GitHub',  handle: 'misza-one',  url: 'https://github.com/misza-one' },
            { platform: 'X',       handle: '@MiszaOne',  url: 'https://x.com/MiszaOne' },
            { platform: 'YouTube', handle: '@misza_one', url: 'https://youtube.com/@misza_one' },
            { platform: 'Twitch',  handle: 'misza_one',  url: 'https://twitch.tv/misza_one' }
        ],

        links: {
            omarchy: 'https://omarchy.org',
            hyprland: 'https://hyprland.org'
        }
    };

    window.SITE_DATA = DATA;
})();
