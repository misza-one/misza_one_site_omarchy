# misza.one

Static omarchy-style terminal desktop. No build step, no dependencies — vanilla
JS served by nginx in a Docker container.

## Stack

- `index.html` — single page, loads `css/style.css` and `js/*.js` in dependency
  order (see `index.html` `<script>` tags).
- `css/style.css` — all styling. CSS custom properties for theming
  (`--accent`, `--bg`, `--fg`, …). Themes are applied by swapping the
  `data-theme` attribute on `<html>` (see `js/themes.js`).
- `js/` — IIFE modules attached to `window`:
  - `themes.js` → `Themes` (loads from `localStorage`, exposes `apply(name)`)
  - `data.js` → `Data` (static content: projects, plugins, contact, about)
  - `terminal.js` → `Terminal` (renders one terminal pane: boot text, prompt,
    command echo, ANSI-ish color spans via `t-accent` / `t-dim` classes)
  - `layout.js` → `Layout` (dwindle-tile split tree: `split()`, `close()`,
    `focus()`, `move()`; emits geometry as CSS grid areas)
  - `windows.js` → `WindowManager` (DOM windows wrapping `Terminal` +
    `Layout`; `open()`, `split()`, `close()`, `onchange` callback)
  - `keybinds.js` → global `keydown` handler (alt+… combos)
  - `commands.js` → `Commands` (command parser + dispatch: `help`, `about`,
    `plugins`, `projects`, `contact`, `theme`, `split`, `menu`, `clear`, …)
  - `menu.js` → `Menu` (omarchy-style overlay with search)
  - `main.js` → boot: themes, clock, first window with the boot sequence,
    wires `WM` to the bar window-count label.
- `img/` — omarchy logo watermark (inline in `index.html` as SVG, also
  `img/omarchy-logo.svg` as a standalone asset).
- `favicon.png` — site icon.

## Conventions

- No build tools, no bundler, no package.json. Edits are live once copied
  into the container.
- Each `js/*.js` is an IIFE: `(function (global) { 'use strict'; … })(window);`
  and exposes one global (e.g. `global.WindowManager`). Follow that pattern.
- No comments in code unless the user asks.
- DOM ids are camelCase (`barWindows`, `menuScrim`). CSS classes are
  kebab-case or prefixed (`t-accent`, `bar-*`, `window-*`, `menu-*`).
- Theming: never hardcode colors in JS. Use CSS classes
  (`.t-accent`, `.t-dim`) or CSS variables. New themes go in
  `js/themes.js` and must set every variable used in `css/style.css`.
- The dwindle layout is the source of truth for window geometry. Do not
  position windows with absolute coordinates; go through `Layout`.

## Running locally

```sh
# static server, any port
python3 -m http.server 8080
# then open http://localhost:8080
```

Or build the Docker image:

```sh
docker compose build && docker compose up -d
# → http://localhost:8200
```

## Deploying (host `main`, container `misza-terminal`)

The live container is `misza-terminal` on port `8200`, image
`miszaone_omarchy_site:latest`, root `/usr/share/nginx/html/`.

```sh
cd /home/miszarchy/dev/misza.one
tar czf /tmp/misza-one-deploy.tar.gz index.html favicon.png css/ js/ img/
scp /tmp/misza-one-deploy.tar.gz main:/tmp/misza-one-deploy/
ssh main "docker cp /tmp/misza-one-deploy/index.html misza-terminal:/usr/share/nginx/html/ && \
          docker cp /tmp/misza-one-deploy/css/. misza-terminal:/usr/share/nginx/html/css/ && \
          docker cp /tmp/misza-one-deploy/js/. misza-terminal:/usr/share/nginx/html/js/ && \
          docker cp /tmp/misza-one-deploy/img/. misza-terminal:/usr/share/nginx/html/img/ && \
          docker exec misza-terminal nginx -s reload"
# verify
ssh main "curl -s -o /dev/null -w '%{http_code}' http://localhost:8200/health"
```

Note: `docker cp` does not change file ownership inside the container (they
land as uid 1000, which nginx running as `nginx` user can still read). If
you rebuild the image instead, `Dockerfile` `COPY`s from the repo root.

## Repo layout

```
index.html
favicon.png
css/style.css
img/omarchy-logo.svg
js/{themes,data,terminal,layout,windows,keybinds,commands,menu,main}.js
nginx.conf
Dockerfile
docker-compose.yml
```
