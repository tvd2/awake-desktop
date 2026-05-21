# Awake Desk

A single-page utility dashboard that keeps your screen awake while showing weather, news, and a calm wallpaper suggestion. Built to run in a browser on any device — no build step, no framework, no client-side dependencies.

## What it does

- **Screen Wake Lock** — Uses the browser's [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) to prevent your display from sleeping. Best on Chromium browsers over HTTPS or localhost.
- **Weather** — 5-day local forecast via browser geolocation and [Open-Meteo](https://open-meteo.com/). Location names resolved with BigDataCloud reverse geocoding.
- **News** — Curated headlines from public, no-paywall sources via Google News RSS. Browse by category (technology, science, world, business, health, sports, entertainment, local) and language (10 languages supported). Local news intelligently sources from country-specific outlets.
- **Wallpaper** — Seeded, theme-matched desktop wallpaper suggestions from [Lorem Picsum](https://picsum.photos/) with notes on visual composition.
- **Theming** — Three themes (light, dark, mid) and four accent colors (green, blue, rose, amber). Preferences persist in `localStorage`.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Server | Node.js `http` module (static files + API proxy) |
| Container | Docker (`node:22-alpine`) |
| External APIs | Open-Meteo, BigDataCloud, Google News RSS, Lorem Picsum |

No build tools, no bundler, no npm packages in the client. The entire frontend is three files (~31 KB).

## Running locally

### With Node.js

```bash
node server.js
```

Defaults to port 80. Set `PORT` to override:

```bash
PORT=3000 node server.js
```

### With Docker

```bash
docker compose up -d
```

Exposes the app on port `8787`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_USER` | *(none)* | Basic auth username — if set with `AUTH_PASS`, enables auth |
| `AUTH_PASS` | *(none)* | Basic auth password — if set with `AUTH_USER`, enables auth |
| `AUTH_REALM` | `Awake Desk` | Basic auth realm name |
| `TRUST_PROXY` | `false` | Trust `X-Forwarded-For` header for rate-limiting IP detection. Set to `true` only when behind a trusted reverse proxy. |
| `PORT` | `80` | Server listen port |

If `AUTH_USER` and `AUTH_PASS` are both set, the app requires Basic Auth. If either is missing, the app runs in public mode (no auth).

## API endpoints

The Node.js server proxies three external APIs to avoid CORS issues in the browser:

| Endpoint | Purpose | Upstream |
|----------|---------|----------|
| `GET /api/reverse-geocode?latitude=...&longitude=...` | Location name from coordinates | BigDataCloud |
| `GET /api/weather?latitude=...&longitude=...` | 5-day forecast | Open-Meteo |
| `GET /api/news?category=...&language=...&city=...&country=...&countryCode=...` | RSS headlines | Google News RSS |

Static assets are served from the filesystem with correct MIME types and security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Content-Security-Policy`).

## Browser support

- **Wake Lock**: Chrome, Edge, Opera, and other Chromium-based browsers. Requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (HTTPS or localhost). Firefox and Safari do not support the API.
- **Geolocation**: All modern browsers; requires user permission.
- **CSS**: Uses modern features (`color-mix`, `clamp`, CSS custom properties) — any evergreen browser.

## Project structure

```
.
├── index.html          # Single-page markup
├── styles.css          # Theme system, layout, components (~10 KB)
├── script.js           # Wake lock, weather, news, wallpaper logic (~12 KB)
├── server.js           # Node.js static server + API proxy (~6 KB)
├── Dockerfile          # Alpine Node image, single-stage
├── docker-compose.yml  # Service definition
├── nginx.conf          # Nginx config (for deployments using nginx instead of Node)
└── docs/               # Documentation and screenshots (not tracked)
```

## Deployment notes

- The app is designed to be lightweight enough to run on a small VPS or home server behind a reverse proxy.
- `nginx.conf` is provided for deployments that prefer nginx static hosting over the Node.js server. In that case, the API proxy would need to be handled separately (e.g., via nginx `proxy_pass` rules) or omitted if CORS is not a concern.

## License

MIT
