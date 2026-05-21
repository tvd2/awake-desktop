# Awake Desk — Architecture

## Philosophy

Build a dashboard that is **immediately useful**, **runs everywhere**, and **costs nothing to host**. Every dependency is a liability; this project ships zero npm packages in the client and uses only Node.js built-ins on the server.

## Design principles

1. **Vanilla everything** — No framework, no bundler, no build step. The app must work by opening a single HTML file.
2. **Progressive enhancement** — If a feature is unsupported (wake lock, geolocation), the UI degrades gracefully with informative messaging.
3. **Self-contained proxy** — All third-party API calls route through the Node.js server to avoid CORS and keep credentials out of the browser.
4. **Zero client storage beyond preferences** — No cookies, no tracking. Only `localStorage` keys for theme, accent color, news language, and wallpaper shuffle count.
5. **Mobile-first responsive** — Collapses from a two-panel desktop layout to stacked panels on small screens. Topbar expands vertically as needed.

## System architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────────────────────────┐
│   Browser   │◄────►│  Node.js     │◄────►│  External APIs                         │
│  (Vanilla)  │      │  Static+API  │      │  • BigDataCloud (reverse geocode)      │
│             │      │  server.js   │      │  • Open-Meteo (weather forecast)         │
│  index.html │      │              │      │  • Google News RSS (headlines)           │
│  styles.css │      │  /api/*      │      │  • Lorem Picsum (wallpaper images)       │
│  script.js  │      │  static/*    │      │                                        │
└─────────────┘      └──────────────┘      └────────────────────────────────────────┘
```

## Frontend architecture

### State management

All state is held in module-level variables in `script.js`. There is no state manager; updates are manual DOM mutations after async operations complete.

Key state atoms:
- `wakeLock` / `shouldStayAwake` / `startedAt` / `timer` — wake lock lifecycle
- `activeCategory` / `activeLanguage` — news filtering
- `activeTheme` / `accent` — theming (synced to `localStorage`)
- `place` — geolocation result shared between weather and local news
- `wallpaperShuffleCount` — deterministic seed offset (synced to `localStorage`)

### Component pattern

The UI uses CSS-based panel switching rather than a virtual DOM:

- **Navigation**: `.nav-option` buttons toggle `.active` on matching `.content-panel` elements via `showPanel(name)`.
- **Tabs**: `.tab` buttons set `activeCategory` and re-fetch news.
- **Theme/Accent**: `data-theme` and `data-accent` attributes on `<html>` drive the entire CSS variable cascade.

This is intentionally low-tech: adding a new panel means adding one `<article class="content-panel">` in HTML, one `.nav-option` button, and wiring any new JS logic.

### Theming system

CSS custom properties on `:root` define a complete color palette. Three themes (`light`, `dark`, `mid`) override all base colors. Four accent colors (`green`, `blue`, `rose`, `amber`) override `--accent`, `--accent-strong`, `--blue`, and `--on-accent`. There are 12 combinations (3 themes × 4 accents), each with hand-tuned color values for contrast consistency.

The body background is a layered gradient using `color-mix(in srgb, var(--accent), transparent 88%)` so the theme color subtly bleeds into the page without a solid wash.

### Wake lock lifecycle

```
User clicks "Start" → navigator.wakeLock.request("screen")
                                 ↓
                    ┌─► wakeLock active (green status, timer running)
                    │              ↓
   page hidden ─────┤   wakeLock auto-released by browser
   page visible ────┘   → if shouldStayAwake, re-request wakeLock
                    └─► user clicks "Stop" → wakeLock.release()
```

The `shouldStayAwake` flag is critical: it distinguishes "the browser took the lock away because the tab was hidden" from "the user intentionally stopped the session." On `visibilitychange` to visible, the app re-acquires the lock only if `shouldStayAwake` is still true.

## Server architecture

### `server.js`

A single `http.createServer` handler with two branches:

1. **`/api/*`** — `handleApi(req, res, url)` proxies to external services:
   - `/api/reverse-geocode` → BigDataCloud client-side reverse geocoding (no API key required)
   - `/api/weather` → Open-Meteo free forecast API (no API key required)
   - `/api/news` → Google News RSS search feed (no API key required)

2. **Static files** — `serveStatic(res, pathname)` reads from disk with path normalization and a `root` jail to prevent directory traversal. Sets `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.

### News aggregation logic

The `/api/news` endpoint is the most complex server logic. It builds a Google News RSS query dynamically:

1. Select language profile (10 supported languages with curated domain lists).
2. If `category === "local"`, use country-specific no-paywall sources (AU, US, GB, NZ, CA) and a location-aware query (`city + country`).
3. Otherwise, use the language profile's domain list and a category query.
4. Assemble a Google News RSS search URL with `site:` operators and a `when:7d` recency filter.
5. Parse RSS XML into JSON with CDATA and HTML entity handling.

This avoids needing API keys for news while still providing curated, no-paywall sources.

### Security considerations

- **Path traversal**: `serveStatic` normalizes paths and checks `filePath.startsWith(root)`.
- **Rate limiting**: In-memory rate limiter (60 req/min per IP) with proper window tracking.
- **Proxy IP handling**: `X-Forwarded-For` is only trusted when `TRUST_PROXY=true` is set; otherwise `remoteAddress` is used directly to prevent spoofing.
- **CORS**: Not an issue because all external requests go through the server proxy.
- **No secrets**: No API keys are required for any upstream service, so there are no credentials to leak.
- **Headers**: Static responses include `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and `Content-Security-Policy`.

## Data flow

### Weather

```
User clicks "Use my location"
  → navigator.geolocation.getCurrentPosition()
  → POST /api/reverse-geocode (lat, lon)
  → BigDataCloud → { locality, city, countryName, countryCode }
  → place state updated
  → POST /api/weather (lat, lon)
  → Open-Meteo → { daily: { time, weather_code, temperature_2m_max, ... } }
  → renderForecast(days)
```

### News

```
User selects category/language or clicks Refresh
  → GET /api/news?category=X&language=Y&city=...&country=...&countryCode=...
  → server assembles Google News RSS query
  → fetch RSS text
  → parseRss(xml) → JSON items
  → renderNews(items)
```

If the user previously loaded weather, `place` (city, country, countryCode) is already populated and local news will be location-aware.

## Deployment variants

### Docker (Node.js server)

The default deployment. `Dockerfile` copies all source files into `node:22-alpine` and runs `node server.js` on port 80. `docker-compose.yml` maps host port `8787`.

### Nginx (static only)

`nginx.conf` is provided for pure static hosting. In this mode the Node.js server is not used. The client would need to call external APIs directly (CORS permitting) or another proxy layer would need to handle `/api/*`. This is useful for deployments on static hosting platforms where running a Node process is not possible.

## Extending the app

### Adding a new panel

1. Add a `.nav-option` button in the left panel.
2. Add a `<article class="content-panel" data-content="my-panel">` in the right panel.
3. Add any panel-specific state and event listeners in `script.js`.
4. Call `showPanel("my-panel")` to navigate programmatically.

### Adding a new theme

1. Add a `:root[data-theme="new"]` block in `styles.css` defining `--bg`, `--text`, `--muted`, `--panel`, `--border`, and the accent overrides.
2. Add a `.theme-option` button in `index.html`.
3. Wire the button in `script.js` to call `setTheme("new")`.

### Adding a new news language

1. Add the language to `languageProfiles` in `server.js` with `hl` code and a curated list of no-paywall domains.
2. Add an `<option>` to the `<select id="languageSelect">` in `index.html`.

## Performance notes

- **First paint**: The HTML is self-contained; no JS is required to render the initial layout.
- **CSS**: ~10 KB, single file, no external font requests (uses system font stack).
- **JS**: ~12 KB, no async loading; all code parses and executes in one pass.
- **Images**: Only the wallpaper image loads externally (Lorem Picsum). It is lazy-loaded by virtue of being in a hidden panel until the user navigates there.
- **API calls**: Weather and news are fetched on-demand, not on page load (except news, which loads a default category on init).
