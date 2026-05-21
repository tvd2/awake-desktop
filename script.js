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

let wakeLock = null;
let startedAt = null;
let timer = null;
let shouldStayAwake = false;
let activeCategory = "technology";
let activeLanguage = localStorage.getItem("awake-news-language") || "en";
let wallpaperShuffleCount = Number(localStorage.getItem("awake-wallpaper-shuffle") || 0);
let activeTheme = localStorage.getItem("awake-theme") || "dark";
let place = { label: "", city: "", country: "", countryCode: "" };
let lastNewsItems = [];
let wallpaperTimer = null;
let newsTimer = null;
let isLoadingNews = false;
let isLoadingWeather = false;
let shouldReloadNewsAfter = false;

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

function updateWallpaper() {
  const wallpaper = wallpaperThemes[activeTheme] || wallpaperThemes.dark;
  const seed = wallpaper.seed + "-" + wallpaperShuffleCount;
  const src = "https://picsum.photos/seed/" + encodeURIComponent(seed) + "/1600/700";
  wallpaperImage.src = src;
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

function skeletonWeatherCards(count = 3) {
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
  days.slice(0, 3).forEach((day) => {
    const date = new Date(day.date + "T12:00:00");
    const icon = weatherIcons[day.code] || weatherIcons[0];
    const card = document.createElement("article");
    card.className = "weather-card";
    card.innerHTML =
      '<h3>' + date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + '</h3>' +
      '<div class="weather-icon" aria-hidden="true">' + icon + '</div>' +
      '<p class="temp">' + (Number.isFinite(day.max) ? Math.round(day.max) : "--") + "°</p>" +
      '<p class="muted" style="font-size:0.7rem">' + (weatherCodes[day.code] || "Forecast") + "</p>";
    weatherGrid.append(card);
  });
}

async function geocodeCity(city, country) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=5";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding failed.");
  const data = await response.json();
  let results = data.results || [];
  if (country) {
    const c = country.toLowerCase();
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
      rain: data.daily.precipitation_probability_max[i] || 0
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
      rain: data.daily.precipitation_probability_max[i] || 0
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

function renderNews(items) {
  newsList.innerHTML = "";
  items.slice(0, 10).forEach((item) => {
    const published = item.publishedAt ? new Date(item.publishedAt) : null;
    const time = published && !Number.isNaN(published.valueOf())
      ? published.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : item.source;
    const article = document.createElement("article");
    article.className = "news-item";
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
    newsList.append(article);
  });
}

async function loadNews() {
  if (isLoadingNews) {
    shouldReloadNewsAfter = true;
    return;
  }
  isLoadingNews = true;
  newsButton.disabled = true;
  newsStatus.textContent = "Loading " + activeCategory + " news.";
  skeletonNewsItems();
  try {
    const params = new URLSearchParams({
      category: activeCategory, language: activeLanguage,
      city: place.city, country: place.country, countryCode: place.countryCode
    });
    const response = await fetch("/api/news?" + params);
    if (!response.ok) throw new Error("News source failed.");
    const items = await response.json();
    const isSame = lastNewsItems.length && items.length &&
      lastNewsItems.slice(0, 5).every((it, i) => items[i] && it.url === items[i].url);
    renderNews(items);
    lastNewsItems = items;
    const where = activeCategory === "local" && place.label ? " for " + place.label : "";
    if (isSame) {
      const upToDate = "All news up-to-date.";
      newsStatus.textContent = upToDate;
      setTimeout(() => {
        if (newsStatus.textContent === upToDate) {
          newsStatus.textContent = items.length + " " + activeCategory + " stories" + where + " in " + languageSelect.selectedOptions[0].text + ".";
        }
      }, 3000);
    } else {
      newsStatus.textContent = items.length + " " + activeCategory + " stories" + where + " in " + languageSelect.selectedOptions[0].text + ".";
    }
  } catch (error) {
    newsStatus.textContent = error?.message || "Could not load news.";
    newsList.innerHTML = "";
  } finally {
    isLoadingNews = false;
    newsButton.disabled = false;
    if (shouldReloadNewsAfter) {
      shouldReloadNewsAfter = false;
      loadNews();
    }
  }
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
newsButton.addEventListener("click", loadNews);
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

function onCategoryClick(button) {
  activeCategory = button.dataset.category;
  categoryButtons.forEach((item) => item.classList.toggle("active", item === button));
  loadNews();
}

categoryButtons.forEach((button) =>
  button.addEventListener("click", () => onCategoryClick(button))
);

languageSelect.value = activeLanguage;
languageSelect.addEventListener("change", () => {
  activeLanguage = languageSelect.value;
  localStorage.setItem("awake-news-language", activeLanguage);
  loadNews();
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && !wakeLock && shouldStayAwake) await requestWakeLock();
});
window.addEventListener("beforeunload", () => { if (wakeLock) wakeLock.release(); });

/* ─── Init ─── */
if (localTab) localTab.hidden = true;
setTheme(activeTheme);
setAccent(localStorage.getItem("awake-accent") || "cyan");
updateWallpaper();
const savedInterval = localStorage.getItem("awake-wallpaper-interval") || "0";
wallpaperIntervalSelect.value = savedInterval;
setWallpaperInterval(savedInterval);
const savedNewsInterval = localStorage.getItem("awake-news-interval") || "0";
newsIntervalSelect.value = savedNewsInterval;
setNewsInterval(savedNewsInterval);
loadNews();
initTilt();
