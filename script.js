const awakeStartButton = document.querySelector("#awakeStartButton");
const testButton = document.querySelector("#testButton");
const wakeElapsed = document.querySelector("#wakeElapsed");
const wakeStopButton = document.querySelector("#wakeStopButton");
const wakeReadout = document.querySelector("#wakeReadout");
const weatherButton = document.querySelector("#weatherButton");
const weatherStatus = document.querySelector("#weatherStatus");
const weatherGrid = document.querySelector("#weatherGrid");
const locationForm = document.querySelector("#locationForm");
const locationCity = document.querySelector("#locationCity");
const locationCountry = document.querySelector("#locationCountry");
const locationSearch = document.querySelector("#locationSearch");
const newsButton = document.querySelector("#newsButton");
const newsStatus = document.querySelector("#newsStatus");
const newsList = document.querySelector("#newsList");
const themeButtons = document.querySelectorAll(".theme-option");
const layoutOptions = document.querySelectorAll(".layout-option");
const colorPicker = document.querySelector("#colorPicker");
const categoryButtons = document.querySelectorAll(".tab");
const languageSelect = document.querySelector("#languageSelect");
const wallpaperImage = document.querySelector("#wallpaperImage");
const wallpaperShuffle = document.querySelector("#wallpaperShuffle");
const wallpaperIntervalSelect = document.querySelector("#wallpaperInterval");
const newsIntervalSelect = document.querySelector("#newsInterval");
const wallpaperDownload = document.querySelector("#wallpaperDownload");
const awakeCard = document.querySelector("#awake");
const tiltCards = document.querySelectorAll("[data-tilt]");
const localTab = document.querySelector('.tab[data-category="local"]');
const radioAudio = document.querySelector("#radioAudio");
const radioPlay = document.querySelector("#radioPlay");
const radioPause = document.querySelector("#radioPause");
const radioMute = document.querySelector("#radioMute");
const muteIcon = document.querySelector("#muteIcon");
const radioGenre = document.querySelector("#radioChannel");
const radioReset = document.querySelector("#radioReset");
const radioStatus = document.querySelector("#radioStatus");

let wakeLock = null;
let startedAt = null;
let timer = null;
let shouldStayAwake = false;
let activeCategory = "technology";
let activeLanguage = localStorage.getItem("awake-news-language") || "en";
let wallpaperShuffleCount = Number(localStorage.getItem("awake-wallpaper-shuffle") || 0);
let activeTheme = localStorage.getItem("awake-theme") || "dark";
let activeLayout = localStorage.getItem("awake-layout") || "bento";
let focusRotationTimer = null;
let focusRotationIndex = 0;
const focusSources = ["news", "deals"];
let place = { label: "", city: "", country: "", countryCode: "" };
let lastNewsItems = [];
let wallpaperTimer = null;
let newsTimer = null;
let isLoadingNews = false;
let isLoadingWeather = false;
let shouldReloadNewsAfter = false;
let newsPool = [];
const MAX_DISPLAYED_NEWS = 10;
let displayedNews = [];
let readArticleUrls = new Set();
let pendingReplacements = [];
let radioChannels = [];
let currentChannelIndex = 0;
let playingChannelIndex = -1;
let radioRetryCount = 0;
let radioRetryTimer = null;
let radioUserStopped = false;

const supportedLocalCountries = ["AU", "US", "GB", "NZ", "CA"];

const weatherCodes = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Severe thunderstorm"
};

const weatherIcons = {
  0: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>',
  1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
  2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" opacity="0.4"/></svg>',
  3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
  45: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15h13.865a4 4 0 0 0 3.46-1.994 4 4 0 0 0-3.46-6.012H16.5"/><path d="M4 15l2 2m-2-2l2-2m6 6v2m0-2l2 2m-2-2l2-2" opacity="0.5"/></svg>',
  48: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15h13.865a4 4 0 0 0 3.46-1.994 4 4 0 0 0-3.46-6.012H16.5"/><path d="M4 15l2 2m-2-2l2-2m6 6v2m0-2l2 2m-2-2l2-2" opacity="0.5"/></svg>',
  51: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  53: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  55: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  61: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  63: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  65: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  71: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01"/></svg>',
  73: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01"/></svg>',
  75: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01"/></svg>',
  80: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  81: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  82: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6m-4-3v3m-4-6v6"/></svg>',
  95: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="M13 11l-4 6h6l-4 6"/></svg>',
  96: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="M13 11l-4 6h6l-4 6"/></svg>',
  99: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="M13 11l-4 6h6l-4 6"/></svg>'
};

const wallpaperThemes = {
  dark: { seed: "awake-dark" },
  mid: { seed: "awake-mid" },
  light: { seed: "awake-light" }
};


/* ─── Helpers ─── */
function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("show"));
  if (toast._hideTimer) clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { toast.hidden = true; }, 200);
  }, duration);
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours + ":" + minutes + ":" + seconds;
}

function isToday(publishedAt) {
  if (!publishedAt) return false;
  const d = new Date(publishedAt);
  if (Number.isNaN(d.valueOf())) return false;
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function updateWallpaper() {
  const wallpaper = wallpaperThemes[activeTheme] || wallpaperThemes.dark;
  const seed = wallpaper.seed + "-" + wallpaperShuffleCount;
  const src = "https://picsum.photos/seed/" + encodeURIComponent(seed) + "/2560/1440";
  wallpaperImage.src = src;
  wallpaperImage.onload = () => {
    const frame = document.querySelector(".wallpaper-frame");
    if (!frame) return;
    if (wallpaperImage.naturalHeight > wallpaperImage.naturalWidth) {
      frame.classList.add("portrait");
    } else {
      frame.classList.remove("portrait");
    }
  };
}

function downloadWallpaper() {
  const a = document.createElement("a");
  a.href = wallpaperImage.src;
  a.download = "awake-desk-wallpaper.jpg";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function setWallpaperInterval(seconds) {
  clearInterval(wallpaperTimer);
  wallpaperTimer = null;
  const interval = Number(seconds);
  if (interval > 0) {
    wallpaperTimer = setInterval(() => {
      wallpaperShuffleCount += 1;
      localStorage.setItem("awake-wallpaper-shuffle", String(wallpaperShuffleCount));
      updateWallpaper();
    }, interval * 1000);
  }
  localStorage.setItem("awake-wallpaper-interval", String(seconds));
}

function setNewsInterval(seconds) {
  clearInterval(newsTimer);
  newsTimer = null;
  const interval = Number(seconds);
  if (interval > 0) {
    newsTimer = setInterval(loadNews, interval * 1000);
  }
  localStorage.setItem("awake-news-interval", String(seconds));
}

function updateLocalTabVisibility() {
  const supported = place.countryCode && supportedLocalCountries.includes(place.countryCode.toUpperCase());
  if (localTab) localTab.hidden = !supported;
  if (!supported && activeCategory === "local") {
    activeCategory = "technology";
    categoryButtons.forEach((item) => item.classList.toggle("active", item.dataset.category === "technology"));
    loadNews();
  }
}

function setTheme(theme) {
  activeTheme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("awake-theme", theme);
  themeButtons.forEach((button) => button.classList.toggle("active", button.dataset.theme === theme));
}

function setAccent(accent) {
  document.documentElement.dataset.accent = accent;
  localStorage.setItem("awake-accent", accent);
  if (colorPicker) colorPicker.value = accent;
}

function setWakeState(active = false) {
  awakeStartButton.hidden = active;
  const btnSpan = awakeStartButton.querySelector("span");
  if (btnSpan) btnSpan.textContent = active ? "Wake lock active" : "Start wake lock";
}

function startTimer() {
  if (!startedAt) startedAt = Date.now();
  clearInterval(timer);
  timer = setInterval(() => {
    const elapsed = formatElapsed(Date.now() - startedAt);
    wakeElapsed.textContent = elapsed;
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
  startedAt = null;
  wakeElapsed.textContent = "00:00:00";
}

/* ─── Wake Lock ─── */
function setWakeActive(active) {
  if (active) {
    awakeCard.classList.add("compact");
    if (wakeReadout) wakeReadout.hidden = false;
  } else {
    awakeCard.classList.remove("compact");
    if (wakeReadout) wakeReadout.hidden = true;
  }
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    setWakeState();
    return;
  }
  try {
    shouldStayAwake = true;
    wakeLock = await navigator.wakeLock.request("screen");
    setWakeState(true);
    setWakeActive(true);
    startTimer();
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      if (shouldStayAwake && document.visibilityState !== "visible") {
        setWakeState(false);
        setWakeActive(false);
        return;
      }
      setWakeState();
      setWakeActive(false);
      stopTimer();
    });
  } catch (error) {
    setWakeState();
  }
}

async function releaseWakeLock() {
  shouldStayAwake = false;
  if (!wakeLock) {
    setWakeState();
    setWakeActive(false);
    stopTimer();
    return;
  }
  await wakeLock.release();
  wakeLock = null;
  setWakeActive(false);
}

/* ─── Weather ─── */
function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 12000
    });
  });
}

function placeLabel(data) {
  const city = data.locality || data.city || data.principalSubdivision || "";
  const region = data.city && data.city !== city ? data.city : data.principalSubdivision;
  return [city, region, data.countryName].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
}

function skeletonWeatherCards(count = 5) {
  weatherGrid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "weather-card skeleton";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = '<div class="skeleton" style="height:1em;width:50%;margin:0 auto 10px"></div><div class="skeleton" style="height:1.5em;width:60%;margin:0 auto 6px"></div><div class="skeleton" style="height:0.8em;width:40%;margin:0 auto"></div>';
    weatherGrid.append(card);
  }
}

function renderForecast(days) {
  weatherGrid.innerHTML = "";
  days.forEach((day) => {
    const date = new Date(day.date + "T12:00:00");
    const icon = weatherIcons[day.code] || weatherIcons[0];
    const card = document.createElement("article");
    card.className = "weather-card";
    card.innerHTML =
      '<h3>' + date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + '</h3>' +
      '<div class="weather-icon" aria-hidden="true">' + icon + '</div>' +
      '<p class="temp">' + (Number.isFinite(day.max) ? Math.round(day.max) : "--") + "°</p>" +
      '<p class="muted" style="font-size:0.7rem">' + (weatherCodes[day.code] || "Forecast") + "</p>" +
      '<p class="wind">' + (Number.isFinite(day.wind) ? Math.round(day.wind) : "--") + " km/h</p>";
    weatherGrid.append(card);
  });
}

const suffixToCountry = {
  nsw: "Australia", vic: "Australia", qld: "Australia", tas: "Australia",
  sa: "Australia", wa: "Australia", act: "Australia", nt: "Australia",
  australia: "Australia", usa: "United States", "united states": "United States",
  uk: "United Kingdom", "united kingdom": "United Kingdom",
  canada: "Canada", "new zealand": "New Zealand"
};

function inferCountryFromSuffix(name) {
  const m = name.match(/[,\s]+(NSW|VIC|QLD|TAS|SA|WA|ACT|NT|Australia|USA?|United States|UK|United Kingdom|Canada|New Zealand)$/i);
  if (!m) return null;
  const key = m[1].toLowerCase();
  return suffixToCountry[key] || null;
}

function stripLocationSuffixes(name) {
  return name
    .replace(/,\s*(NSW|VIC|QLD|TAS|SA|WA|ACT|NT|Australia|USA?|United States|UK|United Kingdom|Canada|New Zealand)$/i, "")
    .replace(/\s+(NSW|VIC|QLD|TAS|SA|WA|ACT|NT|Australia|USA?|United States|UK|United Kingdom|Canada|New Zealand)$/i, "")
    .trim();
}

async function geocodeCity(city, country) {
  let url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=20";
  let response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding failed.");
  let data = await response.json();
  let results = data.results || [];
  let inferredCountry = country;

  if (!results.length) {
    const stripped = stripLocationSuffixes(city);
    inferredCountry = country || inferCountryFromSuffix(city);
    if (stripped !== city) {
      url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(stripped) + "&count=20";
      response = await fetch(url);
      if (!response.ok) throw new Error("Geocoding failed.");
      data = await response.json();
      results = data.results || [];
    }
  }

  if (inferredCountry) {
    const c = inferredCountry.toLowerCase();
    results = results.filter((r) =>
      (r.country || "").toLowerCase() === c ||
      (r.country_code || "").toLowerCase() === c
    );
  }
  return results;
}

async function loadWeatherManual(event) {
  event.preventDefault();
  const city = locationCity.value.trim();
  if (!city || isLoadingWeather) return;
  isLoadingWeather = true;
  weatherButton.disabled = true;
  if (locationSearch) locationSearch.disabled = true;
  weatherStatus.textContent = "Looking up location...";
  skeletonWeatherCards();
  try {
    const results = await geocodeCity(city, locationCountry.value.trim());
    if (!results.length) throw new Error("Location not found.");
    const best = results[0];
    place = {
      label: [best.name, best.admin1, best.country].filter(Boolean).join(", "),
      city: best.name,
      country: best.country || "",
      countryCode: best.country_code || ""
    };
    weatherStatus.textContent = "Loading forecast for " + place.label + ".";
    const w = await fetch("/api/weather?latitude=" + encodeURIComponent(best.latitude.toFixed(5)) + "&longitude=" + encodeURIComponent(best.longitude.toFixed(5)));
    if (!w.ok) throw new Error("Weather request failed.");
    const data = await w.json();
    const days = data.daily.time.map((date, i) => ({
      date, code: data.daily.weather_code[i],
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
      rain: data.daily.precipitation_probability_max[i] || 0,
      wind: data.daily.wind_speed_10m_max[i]
    }));
    renderForecast(days);
    weatherStatus.textContent = "Forecast for " + place.label + ".";
    updateLocalTabVisibility();
    if (activeCategory === "local") loadNews();
  } catch (error) {
    weatherStatus.textContent = error?.message || "Could not load weather.";
    weatherGrid.innerHTML = "";
  } finally {
    isLoadingWeather = false;
    weatherButton.disabled = false;
    if (locationSearch) locationSearch.disabled = false;
  }
}

async function loadWeather() {
  if (isLoadingWeather) return;
  isLoadingWeather = true;
  weatherButton.disabled = true;
  weatherStatus.textContent = "Waiting for location permission.";
  skeletonWeatherCards();
  try {
    const position = await getPosition();
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const rev = await fetch("/api/reverse-geocode?latitude=" + encodeURIComponent(lat.toFixed(5)) + "&longitude=" + encodeURIComponent(lon.toFixed(5)));
    if (!rev.ok) throw new Error("Location lookup failed.");
    const reverse = await rev.json();
    place = {
      label: placeLabel(reverse),
      city: reverse.locality || reverse.city || "",
      country: reverse.countryName || "",
      countryCode: reverse.countryCode || ""
    };

    weatherStatus.textContent = "Loading forecast for " + (place.label || "your location") + ".";
    const w = await fetch("/api/weather?latitude=" + encodeURIComponent(lat.toFixed(5)) + "&longitude=" + encodeURIComponent(lon.toFixed(5)));
    if (!w.ok) throw new Error("Weather request failed.");
    const data = await w.json();
    const days = data.daily.time.map((date, i) => ({
      date, code: data.daily.weather_code[i],
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
      rain: data.daily.precipitation_probability_max[i] || 0,
      wind: data.daily.wind_speed_10m_max[i]
    }));
    renderForecast(days);
    weatherStatus.textContent = "Forecast for " + (place.label || "your location") + ".";
    updateLocalTabVisibility();
    if (activeCategory === "local") loadNews();
  } catch (error) {
    weatherStatus.textContent = error?.message || "Location blocked. Enter your city below.";
    weatherGrid.innerHTML = "";
    locationForm.hidden = false;
  } finally {
    isLoadingWeather = false;
    weatherButton.disabled = false;
  }
}

/* ─── News ─── */
function skeletonNewsItems(count = 6) {
  newsList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const article = document.createElement("div");
    article.className = "news-item skeleton";
    article.setAttribute("aria-hidden", "true");
    article.innerHTML = '<div class="skeleton" style="height:0.8em;width:35%;margin-bottom:8px"></div><div class="skeleton" style="height:1em;width:85%;margin-bottom:6px"></div><div class="skeleton" style="height:0.8em;width:50%"></div>';
    newsList.append(article);
  }
}

function createNewsArticle(item) {
  const published = item.publishedAt ? new Date(item.publishedAt) : null;
  const time = published && !Number.isNaN(published.valueOf())
    ? published.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : item.source;
  const article = document.createElement("article");
  article.className = "news-item";
  article.dataset.url = item.url;

  const sourceP = document.createElement("p");
  sourceP.className = "source";
  sourceP.textContent = item.source;
  const titleH3 = document.createElement("h3");
  const link = document.createElement("a");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.title;
  titleH3.appendChild(link);
  const timeP = document.createElement("p");
  timeP.className = "muted";
  timeP.textContent = time;
  article.appendChild(sourceP);
  article.appendChild(titleH3);
  article.appendChild(timeP);

  // Click dismisses the article and replaces it with the next from pool
  article.addEventListener("click", (e) => {
    // Don't trigger if user is selecting text or if already dismissing
    if (window.getSelection().toString().length > 0 || article.classList.contains("dismissing")) return;
    const isLinkClick = e.target.closest("a");
    if (!isLinkClick) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
    readArticleUrls.add(item.url);
    const idx = displayedNews.findIndex((d) => d.url === item.url);
    if (idx > -1) displayedNews.splice(idx, 1);
    const nextSibling = article.nextSibling;
    article.classList.add("dismissing");
    setTimeout(() => {
      article.remove();
      replaceNewsItem(nextSibling);
    }, 300);
  });

  return article;
}

function renderNews(items, append = false) {
  if (!append) {
    pendingReplacements = [];
    newsList.innerHTML = "";
    displayedNews = [];
  }
  items.forEach((item) => {
    const article = createNewsArticle(item);
    if (append) article.classList.add("entering");
    newsList.append(article);
    displayedNews.push(item);
  });
}

function replaceNewsItem(insertBeforeElement) {
  if (newsPool.length === 0) {
    pendingReplacements.push(insertBeforeElement);
    if (!isLoadingNews) {
      loadNews();
    }
    return;
  }
  const nextItem = newsPool.shift();
  // Skip if this item is already on screen (race-condition guard)
  const alreadyOnScreen = displayedNews.some((d) => d.url === nextItem.url);
  if (alreadyOnScreen) {
    replaceNewsItem(insertBeforeElement);
    return;
  }
  const article = createNewsArticle(nextItem);
  article.classList.add("entering");
  if (insertBeforeElement && insertBeforeElement.parentNode === newsList) {
    newsList.insertBefore(article, insertBeforeElement);
  } else {
    newsList.append(article);
  }
  displayedNews.push(nextItem);
  setTimeout(() => article.classList.remove("entering"), 50);
  updateNewsStatus();
}

function updateNewsStatus() {
  const where = activeCategory === "local" && place.label ? " for " + place.label : "";
  const count = displayedNews.length;
  if (count === 0 && newsPool.length === 0) {
    newsStatus.textContent = "No new " + activeCategory + " stories" + where + " in " + (languageSelect.selectedOptions[0]?.text || activeLanguage) + ".";
  } else {
    newsStatus.textContent = newsPool.length + " more in queue | " + count + " " + activeCategory + " stories" + where + " in " + (languageSelect.selectedOptions[0]?.text || activeLanguage) + ".";
  }
}

async function loadNews() {
  if (isLoadingNews) {
    shouldReloadNewsAfter = true;
    return;
  }
  isLoadingNews = true;
  newsButton.disabled = true;
  newsStatus.textContent = "Loading " + activeCategory + " news.";
  if (!newsList.children.length) skeletonNewsItems();
  try {
    const params = new URLSearchParams({
      category: activeCategory, language: activeLanguage,
      city: place.city, country: place.country, countryCode: place.countryCode
    });
    const response = await fetch("/api/news?" + params);
    if (!response.ok) throw new Error("News source failed.");
    const items = await response.json();
    // Filter out duplicates we've already seen or are currently on screen
    const seenInBatch = new Set();
    const newItems = items.filter((item) => {
      const inDisplayed = displayedNews.some((d) => d.url === item.url);
      const inPool = newsPool.some((p) => p.url === item.url);
      const inBatch = seenInBatch.has(item.url);
      const alreadyRead = readArticleUrls.has(item.url);
      if (!inDisplayed && !inPool && !inBatch && !alreadyRead && isToday(item.publishedAt)) {
        seenInBatch.add(item.url);
        return true;
      }
      return false;
    });
    newsPool.push(...newItems);
    // If no new items arrived, clear pending replacements (nothing to replace with)
    if (newItems.length === 0) {
      pendingReplacements = [];
    }
    // If nothing displayed yet, render the first batch
    const hasRealItems = Array.from(newsList.children).some((el) => !el.classList.contains("skeleton"));
    if (!hasRealItems) {
      pendingReplacements = [];
      newsList.innerHTML = "";
      const initialItems = newsPool.splice(0, MAX_DISPLAYED_NEWS);
      renderNews(initialItems);
    }
    lastNewsItems = items;
    updateNewsStatus();
  } catch (error) {
    newsStatus.textContent = error?.message || "Could not load news.";
    if (!newsList.children.length) newsList.innerHTML = "";
  } finally {
    isLoadingNews = false;
    newsButton.disabled = false;
    if (shouldReloadNewsAfter) {
      shouldReloadNewsAfter = false;
      loadNews();
    }
    // Process pending replacements now that the pool is replenished
    while (pendingReplacements.length > 0 && newsPool.length > 0) {
      const insertBefore = pendingReplacements.shift();
      replaceNewsItem(insertBefore);
    }
  }
}

/* ─── Radio ─── */
async function loadRadioChannels() {
  if (!radioGenre) return;
  radioStatus.textContent = "Loading stations...";
  try {
    const response = await fetch("/api/radio");
    if (!response.ok) throw new Error("Radio failed.");
    const channels = await response.json();
    radioChannels = channels;
    radioGenre.innerHTML = "";
    if (channels.length) {
      channels.forEach((ch, i) => {
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = ch.title;
        radioGenre.appendChild(option);
      });
      radioStatus.textContent = channels.length + " stations ready.";
      currentChannelIndex = 0;
      syncRadioButtons();
    } else {
      radioStatus.textContent = "No radio channels available.";
    }
  } catch (error) {
    radioStatus.textContent = "Could not load radio.";
    radioChannels = [];
  }
}

let hls = null;

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function resolveStreamUrl(url) {
  if (url.startsWith("http://")) {
    return "/api/radio-proxy?url=" + encodeURIComponent(url);
  }
  return url;
}

function attemptReconnect() {
  if (radioUserStopped || radioRetryCount >= 5) {
    radioStatus.textContent = "Stream disconnected. Press Play to retry.";
    syncRadioButtons();
    return;
  }
  radioRetryCount++;
  const delay = Math.min(radioRetryCount * 2000, 10000);
  radioStatus.textContent = "Reconnecting in " + (delay / 1000) + "s...";
  syncRadioButtons();
  radioRetryTimer = setTimeout(() => {
    playRadio();
  }, delay);
}

function syncRadioButtons() {
  const isPlaying = radioAudio && !radioAudio.paused && radioAudio.src;
  const hasPlayed = playingChannelIndex !== -1;
  const isDropdownMatch = currentChannelIndex === playingChannelIndex;

  if (isPlaying && isDropdownMatch) {
    radioPlay.hidden = true;
    radioPause.hidden = false;
    radioReset.hidden = true;
  } else if (!isPlaying && isDropdownMatch) {
    radioPlay.hidden = false;
    radioPause.hidden = true;
    radioReset.hidden = true;
  } else if (hasPlayed) {
    radioPlay.hidden = false;
    radioPause.hidden = true;
    radioReset.hidden = false;
  } else {
    radioPlay.hidden = false;
    radioPause.hidden = true;
    radioReset.hidden = true;
  }
}

function playRadio() {
  if (!radioChannels.length || !radioAudio) return;
  const channel = radioChannels[currentChannelIndex];
  if (!channel.playlists || !channel.playlists.length) {
    radioStatus.textContent = "No stream available.";
    return;
  }
  radioUserStopped = false;
  clearTimeout(radioRetryTimer);
  radioRetryTimer = null;
  destroyHls();
  radioAudio.src = "";
  radioStatus.textContent = "Connecting...";
  syncRadioButtons();

  const playlist = channel.playlists[0];
  const isHLS = playlist.format === "hls" || playlist.url.endsWith(".m3u8");

  if (isHLS && typeof Hls !== "undefined" && Hls.isSupported()) {
    hls = new Hls();
    hls.attachMedia(radioAudio);
    hls.loadSource(playlist.url);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      radioAudio.play().then(() => {
        playingChannelIndex = currentChannelIndex;
        radioRetryCount = 0;
        radioStatus.textContent = "playing " + channel.title;
        syncRadioButtons();
      }).catch(() => {
        radioStatus.textContent = "Playback blocked.";
        syncRadioButtons();
      });
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        radioStatus.textContent = "Stream unavailable.";
        syncRadioButtons();
        destroyHls();
        attemptReconnect();
      }
    });
  } else {
    radioAudio.src = resolveStreamUrl(playlist.url);
    radioAudio.play().then(() => {
      playingChannelIndex = currentChannelIndex;
      radioRetryCount = 0;
      radioStatus.textContent = "playing " + channel.title;
      syncRadioButtons();
    }).catch(() => {
      radioStatus.textContent = "Playback blocked.";
      syncRadioButtons();
    });
  }
}

function stopRadio() {
  if (!radioAudio) return;
  radioUserStopped = true;
  clearTimeout(radioRetryTimer);
  radioRetryTimer = null;
  destroyHls();
  radioAudio.pause();
  radioAudio.src = "";
  syncRadioButtons();
  radioStatus.textContent = "Stopped";
}

function pauseRadio() {
  if (!radioAudio) return;
  radioUserStopped = true;
  clearTimeout(radioRetryTimer);
  radioRetryTimer = null;
  radioAudio.pause();
  syncRadioButtons();
  radioStatus.textContent = "Paused";
}

const muteOnSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
const muteOffSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';

function toggleMute() {
  if (!radioAudio) return;
  radioAudio.muted = !radioAudio.muted;
  if (muteIcon) muteIcon.innerHTML = radioAudio.muted ? muteOffSvg : muteOnSvg;
  radioMute.setAttribute("title", radioAudio.muted ? "Unmute" : "Mute");
  radioMute.setAttribute("aria-label", radioAudio.muted ? "Unmute" : "Mute");
}

/* ─── 3D Tilt effect ─── */
function initTilt() {
  tiltCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -3;
      const ry = ((x - cx) / cx) * 3;
      card.style.transform = "perspective(800px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) scale3d(1.01, 1.01, 1.01)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
    });
  });
}

/* ─── Event listeners ─── */
wakeStopButton.addEventListener("click", releaseWakeLock);
awakeStartButton.addEventListener("click", requestWakeLock);
testButton.addEventListener("click", () => {
  const secure = window.isSecureContext ? "secure" : "insecure";
  const support = "wakeLock" in navigator ? "supported" : "unsupported";
  showToast("Wake Lock API: " + support + " / Context: " + secure, 4000);
});
weatherButton.addEventListener("click", loadWeather);
locationForm.addEventListener("submit", loadWeatherManual);
newsButton.addEventListener("click", () => {
  newsPool = [];
  pendingReplacements = [];
  readArticleUrls.clear();
  newsList.innerHTML = "";
  displayedNews = [];
  loadNews();
});
wallpaperShuffle.addEventListener("click", () => {
  wallpaperShuffleCount += 1;
  localStorage.setItem("awake-wallpaper-shuffle", String(wallpaperShuffleCount));
  updateWallpaper();
});
wallpaperDownload.addEventListener("click", downloadWallpaper);
wallpaperIntervalSelect.addEventListener("change", () => setWallpaperInterval(wallpaperIntervalSelect.value));
newsIntervalSelect.addEventListener("change", () => setNewsInterval(newsIntervalSelect.value));
themeButtons.forEach((button) =>
  button.addEventListener("click", () => setTheme(button.dataset.theme))
);
colorPicker.addEventListener("change", () => setAccent(colorPicker.value));

radioPlay.addEventListener("click", playRadio);
radioPause.addEventListener("click", pauseRadio);
radioMute.addEventListener("click", toggleMute);
radioGenre.addEventListener("change", () => {
  currentChannelIndex = Number(radioGenre.value);
  const channel = radioChannels[currentChannelIndex];
  if (channel) {
    radioStatus.textContent = "Selected: " + channel.title;
    syncRadioButtons();
  }
});

radioReset.addEventListener("click", () => {
  if (playingChannelIndex === -1) return;
  currentChannelIndex = playingChannelIndex;
  radioGenre.value = String(currentChannelIndex);
  syncRadioButtons();
});

if (radioAudio) {
  radioAudio.addEventListener("error", () => {
    if (!radioUserStopped) attemptReconnect();
  });
  radioAudio.addEventListener("ended", () => {
    if (!radioUserStopped) attemptReconnect();
  });
  radioAudio.addEventListener("stalled", () => {
    if (!radioUserStopped) attemptReconnect();
  });
}

function onCategoryClick(button) {
  activeCategory = button.dataset.category;
  categoryButtons.forEach((item) => item.classList.toggle("active", item === button));
  newsPool = [];
  pendingReplacements = [];
  readArticleUrls.clear();
  newsList.innerHTML = "";
  displayedNews = [];
  loadNews();
}

categoryButtons.forEach((button) =>
  button.addEventListener("click", () => onCategoryClick(button))
);

languageSelect.value = activeLanguage;
languageSelect.addEventListener("change", () => {
  activeLanguage = languageSelect.value;
  localStorage.setItem("awake-news-language", activeLanguage);
  newsPool = [];
  pendingReplacements = [];
  readArticleUrls.clear();
  newsList.innerHTML = "";
  displayedNews = [];
  loadNews();
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && !wakeLock && shouldStayAwake) await requestWakeLock();
});
window.addEventListener("beforeunload", () => { if (wakeLock) wakeLock.release(); });

/* ─── Deals ─── */
const dealsButton = document.querySelector("#dealsButton");
const dealsStatus = document.querySelector("#dealsStatus");
const dealsList = document.querySelector("#dealsList");

function createOzbargainItem(item) {
  const article = document.createElement("article");
  article.className = "news-item";
  article.dataset.url = item.url;

  const titleH3 = document.createElement("h3");
  const link = document.createElement("a");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.title;
  titleH3.appendChild(link);

  const metaRow = document.createElement("div");
  metaRow.className = "meta-row";
  const metaP = document.createElement("p");
  metaP.className = "muted";
  const published = item.publishedAt ? new Date(item.publishedAt) : null;
  const time = published && !Number.isNaN(published.valueOf())
    ? published.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  metaP.textContent = (item.creator || "Ozbargain") + (time ? " · " + time : "");
  metaRow.appendChild(metaP);

  article.appendChild(titleH3);
  article.appendChild(metaRow);

  article.addEventListener("click", (e) => {
    if (window.getSelection().toString().length > 0 || article.classList.contains("dismissing")) return;
    const isLinkClick = e.target.closest("a");
    if (!isLinkClick) {
      window.open(article.dataset.url, "_blank", "noopener,noreferrer");
    }
    article.classList.add("dismissing");
    setTimeout(() => article.remove(), 300);
  });

  return article;
}

async function loadOzbargain() {
  if (!dealsButton || !dealsList) return;
  dealsButton.disabled = true;
  dealsStatus.textContent = "Loading deals...";
  dealsList.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const sk = document.createElement("div");
    sk.className = "news-item skeleton";
    sk.setAttribute("aria-hidden", "true");
    sk.innerHTML = '<div class="skeleton" style="height:1em;width:85%;margin-bottom:6px"></div><div class="skeleton" style="height:0.8em;width:40%"></div>';
    dealsList.append(sk);
  }
  try {
    const res = await fetch("/api/ozbargain");
    if (!res.ok) throw new Error("Deals request failed.");
    const items = await res.json();
    dealsList.innerHTML = "";
    items.forEach((item) => {
      dealsList.appendChild(createOzbargainItem(item));
    });
    dealsStatus.textContent = items.length + " top deals from OzBargain.";
  } catch (error) {
    dealsStatus.textContent = error?.message || "Could not load deals.";
    dealsList.innerHTML = "";
  } finally {
    dealsButton.disabled = false;
  }
}

if (dealsButton) {
  dealsButton.addEventListener("click", loadOzbargain);
}

/* ─── Layouts ─── */
const focusList = document.querySelector("#focusList");

function updateFocusCard(source) {
  const focusEyebrow = document.querySelector("#focusEyebrow");
  const focusTitle = document.querySelector("#focusTitle");
  const focusStatus = document.querySelector("#focusStatus");
  if (!focusList) return;
  if (source === "news") {
    if (focusEyebrow) focusEyebrow.textContent = "Headlines";
    if (focusTitle) focusTitle.textContent = "News scan";
    if (focusStatus) focusStatus.textContent = newsStatus.textContent;
    focusList.innerHTML = newsList.innerHTML;
  } else {
    if (focusEyebrow) focusEyebrow.textContent = "Deals";
    if (focusTitle) focusTitle.textContent = "Top deals";
    if (focusStatus) focusStatus.textContent = dealsStatus.textContent;
    focusList.innerHTML = dealsList.innerHTML;
  }
}

function rotateFocusCard() {
  focusRotationIndex = (focusRotationIndex + 1) % focusSources.length;
  updateFocusCard(focusSources[focusRotationIndex]);
}

function clearFocusRotation() {
  if (focusRotationTimer) {
    clearInterval(focusRotationTimer);
    focusRotationTimer = null;
  }
}

function setLayout(layout) {
  const validLayouts = ["bento", "compact", "focus", "newsroom"];
  if (!validLayouts.includes(layout)) layout = "bento";
  activeLayout = layout;
  document.body.classList.remove("layout-bento", "layout-compact", "layout-focus", "layout-newsroom");
  document.body.classList.add("layout-" + layout);
  localStorage.setItem("awake-layout", layout);
  layoutOptions.forEach((button) => button.classList.toggle("active", button.dataset.layout === layout));

  clearFocusRotation();
  const focusCard = document.querySelector("#focusCard");
  if (focusCard) focusCard.hidden = layout !== "focus";

  if (layout === "focus") {
    focusRotationIndex = 0;
    updateFocusCard(focusSources[0]);
    focusRotationTimer = setInterval(rotateFocusCard, 30000);
  }
}

layoutOptions.forEach((button) =>
  button.addEventListener("click", () => setLayout(button.dataset.layout))
);
const focusNext = document.querySelector("#focusNext");
if (focusNext) {
  focusNext.addEventListener("click", rotateFocusCard);
}
if (focusList) {
  focusList.addEventListener("click", (e) => {
    const article = e.target.closest(".news-item");
    if (!article || article.classList.contains("dismissing")) return;
    if (window.getSelection().toString().length > 0) return;
    const isLinkClick = e.target.closest("a");
    if (!isLinkClick) {
      window.open(article.dataset.url, "_blank", "noopener,noreferrer");
    }
    article.classList.add("dismissing");
    setTimeout(() => article.remove(), 300);
  });
}

/* ─── System Stats ─── */
const statBattery = document.querySelector("#statBattery");
const statNetwork = document.querySelector("#statNetwork");
const statMemory = document.querySelector("#statMemory");
const statCores = document.querySelector("#statCores");

async function updateSystemStats() {
  if (statCores) statCores.textContent = navigator.hardwareConcurrency || "--";

  if ("getBattery" in navigator) {
    try {
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100) + "%";
      const charging = battery.charging ? " (charging)" : "";
      if (statBattery) statBattery.textContent = level + charging;
      battery.addEventListener("levelchange", () => {
        const l = Math.round(battery.level * 100) + "%";
        const c = battery.charging ? " (charging)" : "";
        if (statBattery) statBattery.textContent = l + c;
      });
      battery.addEventListener("chargingchange", () => {
        const l = Math.round(battery.level * 100) + "%";
        const c = battery.charging ? " (charging)" : "";
        if (statBattery) statBattery.textContent = l + c;
      });
    } catch (e) {
      if (statBattery) statBattery.textContent = "N/A";
    }
  } else {
    if (statBattery) statBattery.textContent = "N/A";
  }

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && statNetwork) {
    const type = conn.effectiveType || "--";
    const down = conn.downlink ? " (~" + conn.downlink + " Mbps)" : "";
    statNetwork.textContent = type + down;
    conn.addEventListener("change", () => {
      const t = conn.effectiveType || "--";
      const d = conn.downlink ? " (~" + conn.downlink + " Mbps)" : "";
      statNetwork.textContent = t + d;
    });
  } else if (statNetwork) {
    statNetwork.textContent = "online";
  }

  const perf = performance || window.performance;
  if (perf && perf.memory && statMemory) {
    const used = perf.memory.usedJSHeapSize;
    const total = perf.memory.totalJSHeapSize;
    const pct = total ? Math.round((used / total) * 100) : 0;
    statMemory.textContent = pct + "%";
  } else if (statMemory) {
    statMemory.textContent = "N/A";
  }
}

/* ─── Scratchpad (collapsible) ─── */
const scratchArea = document.querySelector("#scratchArea");
const scratchSaved = document.querySelector("#scratchSaved");
const scratchToggle = document.querySelector("#scratchToggle");
const scratchHeader = document.querySelector("#scratchHeader");
const scratchContent = document.querySelector("#scratchContent");
const scratchpad = document.querySelector("#scratchpad");

function setScratchpadCollapsed(collapsed) {
  if (!scratchpad || !scratchContent || !scratchToggle) return;
  scratchpad.classList.toggle("collapsed", collapsed);
  scratchpad.classList.toggle("expanded", !collapsed);
  scratchContent.hidden = collapsed;
  scratchToggle.setAttribute("title", collapsed ? "Expand" : "Collapse");
  scratchToggle.setAttribute("aria-label", collapsed ? "Expand scratchpad" : "Collapse scratchpad");
  localStorage.setItem("awake-scratchpad-collapsed", String(collapsed));
}

if (scratchHeader) {
  scratchHeader.addEventListener("click", () => {
    const isCollapsed = !scratchContent || scratchContent.hidden;
    setScratchpadCollapsed(!isCollapsed);
  });
}

if (scratchArea) {
  const saved = localStorage.getItem("awake-scratchpad");
  if (saved) scratchArea.value = saved;

  let saveDebounce;
  scratchArea.addEventListener("input", () => {
    if (scratchSaved) {
      scratchSaved.classList.remove("visible");
      scratchSaved.textContent = "Typing...";
    }
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
      localStorage.setItem("awake-scratchpad", scratchArea.value);
      if (scratchSaved) {
        scratchSaved.textContent = "Saved";
        scratchSaved.classList.add("visible");
        setTimeout(() => scratchSaved.classList.remove("visible"), 1500);
      }
    }, 600);
  });
}

/* ─── Init ─── */
if (localTab) localTab.hidden = true;
setTheme(activeTheme);
setLayout(activeLayout);
setAccent(localStorage.getItem("awake-accent") || "cyan");
updateWallpaper();
const savedInterval = localStorage.getItem("awake-wallpaper-interval") || "0";
wallpaperIntervalSelect.value = savedInterval;
setWallpaperInterval(savedInterval);
const savedNewsInterval = localStorage.getItem("awake-news-interval") || "0";
newsIntervalSelect.value = savedNewsInterval;
setNewsInterval(savedNewsInterval);
loadNews();
loadOzbargain();
updateSystemStats();
const scratchCollapsed = localStorage.getItem("awake-scratchpad-collapsed");
if (scratchCollapsed !== null) {
  setScratchpadCollapsed(scratchCollapsed === "true");
} else {
  setScratchpadCollapsed(true);
}
loadRadioChannels();
initTilt();
