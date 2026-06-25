const http = require("node:http");
const https = require("node:https");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 80);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;
const AUTH_REALM = process.env.AUTH_REALM || "Awake Desk";

function checkAuth(req, res) {
  // No auth configured → public mode
  if (!AUTH_USER || !AUTH_PASS) return true;
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="' + AUTH_REALM + '"' });
    res.end("Unauthorized");
    return false;
  }
  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const sep = decoded.indexOf(":");
  const user = sep > -1 ? decoded.slice(0, sep) : "";
  const pass = sep > -1 ? decoded.slice(sep + 1) : "";
  if (user !== AUTH_USER || pass !== AUTH_PASS) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="' + AUTH_REALM + '"' });
    res.end("Unauthorized");
    return false;
  }
  return true;
}

// In-memory rate limiter: max 60 requests per IP per minute
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

function getClientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers["x-forwarded-for"];
    if (xff) return xff.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

const rateMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
function isRateLimited(ip) {
  const now = Date.now();
  const record = rateMap.get(ip);
  if (!record || now - record.windowStart > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  record.count++;
  if (record.count > RATE_LIMIT) return true;
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateMap) {
    if (now - record.windowStart > RATE_WINDOW_MS) rateMap.delete(ip);
  }
}, RATE_WINDOW_MS);

const noPaywallLocalSources = {
  AU: ["abc.net.au/news", "theguardian.com/australia-news", "sbs.com.au/news", "9news.com.au"],
  US: ["apnews.com", "npr.org", "pbs.org/newshour"],
  GB: ["bbc.com/news", "theguardian.com/uk-news"],
  NZ: ["rnz.co.nz/news", "1news.co.nz"],
  CA: ["cbc.ca/news", "globalnews.ca"],
  default: ["bbc.com/news", "apnews.com", "reuters.com"]
};
const languageProfiles = {
  en: { hl: "en", domains: ["bbc.com/news", "apnews.com", "reuters.com", "theguardian.com", "aljazeera.com", "npr.org", "pbs.org/newshour", "france24.com/en", "rfi.fr/en", "dw.com/en"], defaultCountry: "US" },
  es: { hl: "es", domains: ["bbc.com/mundo", "elpais.com", "rtve.es/noticias", "france24.com/es", "rfi.fr/es", "dw.com/es", "cnn.com/espanol", "20minutos.es"], defaultCountry: "ES" },
  fr: { hl: "fr", domains: ["france24.com/fr", "lemonde.fr", "rfi.fr", "francetvinfo.fr", "bbc.com/afrique", "dw.com/fr", "lepoint.fr", "20minutes.fr"], defaultCountry: "FR" },
  de: { hl: "de", domains: ["tagesschau.de", "dw.com/de", "zdf.de/nachrichten", "spiegel.de", "sueddeutsche.de", "france24.com/de", "rfi.fr/de"], defaultCountry: "DE" },
  zh: { hl: "zh", domains: ["bbc.com/zhongwen", "rfi.fr/cn", "dw.com/zh", "voachinese.com", "rfa.org/mandarin"], defaultCountry: "CN" },
  ar: { hl: "ar", domains: ["bbc.com/arabic", "france24.com/ar", "dw.com/ar", "aljazeera.net", "alarabiya.net", "rfi.fr/ar", "skynewsarabia.com"], defaultCountry: "SA" },
  hi: { hl: "hi", domains: ["bbc.com/hindi", "dw.com/hi", "aajtak.in", "ndtv.com", "abplive.com"], defaultCountry: "IN" },
  id: { hl: "id", domains: ["bbc.com/indonesia", "kompas.com", "tempo.co", "detik.com", "cnnindonesia.com", "liputan6.com"], defaultCountry: "ID" },
  ja: { hl: "ja", domains: ["www3.nhk.or.jp/news", "bbc.com/japanese", "asahi.com", "mainichi.jp", "yomiuri.co.jp"], defaultCountry: "JP" },
  ko: { hl: "ko", domains: ["yna.co.kr", "bbc.com/korean", "khan.co.kr", "chosun.com", "joongang.co.kr"], defaultCountry: "KR" },
  vi: { hl: "vi", domains: ["vnexpress.net", "tuoitre.vn", "thanhnien.vn", "vietnamnet.vn", "vov.vn", "dantri.com.vn", "tienphong.vn"], defaultCountry: "VN" }
};
const categoryQueries = {
  technology: "technology OR artificial intelligence OR software",
  science: "science OR space OR research",
  world: "world news OR international",
  business: "business OR economy OR markets",
  health: "health OR medicine OR public health",
  sports: "sports",
  entertainment: "entertainment OR film OR music",
  local: "local"
};
const categoryQueriesByLanguage = {
  en: categoryQueries,
  es: {
    technology: "tecnología OR inteligencia artificial OR software",
    science: "ciencia OR espacio OR investigación",
    world: "noticias mundiales OR internacional",
    business: "negocios OR economía OR mercados",
    health: "salud OR medicina OR salud pública",
    sports: "deportes",
    entertainment: "entretenimiento OR cine OR música",
    local: "local"
  },
  fr: {
    technology: "technologie OR intelligence artificielle OR logiciel",
    science: "science OR espace OR recherche",
    world: "actualités mondiales OR international",
    business: "affaires OR économie OR marchés",
    health: "santé OR médecine OR santé publique",
    sports: "sport",
    entertainment: "divertissement OR cinéma OR musique",
    local: "local"
  },
  de: {
    technology: "technologie OR künstliche intelligenz OR software",
    science: "wissenschaft OR raumfahrt OR forschung",
    world: "weltnachrichten OR international",
    business: "wirtschaft OR geschäft OR markt",
    health: "gesundheit OR medizin OR öffentliche gesundheit",
    sports: "sport",
    entertainment: "unterhaltung OR film OR musik",
    local: "lokal"
  },
  zh: {
    technology: "科技 OR 人工智能 OR 软件",
    science: "科学 OR 太空 OR 研究",
    world: "国际新闻 OR 国际",
    business: "商业 OR 经济 OR 市场",
    health: "健康 OR 医学 OR 公共卫生",
    sports: "体育",
    entertainment: "娱乐 OR 电影 OR 音乐",
    local: "本地"
  },
  ar: {
    technology: "تكنولوجيا OR ذكاء اصطناعي OR برمجيات",
    science: "علوم OR فضاء OR بحث",
    world: "أخبار العالم OR دولي",
    business: "أعمال OR اقتصاد OR أسواق",
    health: "صحة OR طب OR صحة عامة",
    sports: "رياضة",
    entertainment: "ترفيه OR سينما OR موسيقى",
    local: "محلي"
  },
  hi: {
    technology: "प्रौद्योगिकी OR कृत्रिम बुद्धिमत्ता OR सॉफ्टवेयर",
    science: "विज्ञान OR अंतरिक्ष OR शोध",
    world: "विश्व समाचार OR अंतरराष्ट्रीय",
    business: "व्यापार OR अर्थव्यवस्था OR बाजार",
    health: "स्वास्थ्य OR चिकित्सा OR सार्वजनिक स्वास्थ्य",
    sports: "खेल",
    entertainment: "मनोरंजन OR फिल्म OR संगीत",
    local: "स्थानीय"
  },
  id: {
    technology: "teknologi OR kecerdasan buatan OR perangkat lunak",
    science: "sains OR luar angkasa OR penelitian",
    world: "berita dunia OR internasional",
    business: "bisnis OR ekonomi OR pasar",
    health: "kesehatan OR kedokteran OR kesehatan masyarakat",
    sports: "olahraga",
    entertainment: "hiburan OR film OR musik",
    local: "lokal"
  },
  ja: {
    technology: "テクノロジー OR 人工知能 OR ソフトウェア",
    science: "科学 OR 宇宙 OR 研究",
    world: "国際ニュース OR 国際",
    business: "ビジネス OR 経済 OR 市場",
    health: "健康 OR 医学 OR 公衆衛生",
    sports: "スポーツ",
    entertainment: "エンターテイメント OR 映画 OR 音楽",
    local: "地域"
  },
  ko: {
    technology: "기술 OR 인공지능 OR 소프트웨어",
    science: "과학 OR 우주 OR 연구",
    world: "국제뉴스 OR 국제",
    business: "비즈니스 OR 경제 OR 시장",
    health: "건강 OR 의학 OR 공중보건",
    sports: "스포츠",
    entertainment: "엔터테인먼트 OR 영화 OR 음악",
    local: "지역"
  },
  vi: {
    technology: "công nghệ OR trí tuệ nhân tạo OR phần mềm",
    science: "khoa học OR vũ trụ OR nghiên cứu",
    world: "tin tức thế giới OR quốc tế",
    business: "kinh doanh OR kinh tế OR thị trường",
    health: "sức khỏe OR y học OR sức khỏe cộng đồng",
    sports: "thể thao",
    entertainment: "giải trí OR điện ảnh OR âm nhạc",
    local: "địa phương"
  }
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
function textFromXml(value) {
  return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "").trim();
}
function tag(block, name) {
  const match = block.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)<\\/" + name + ">", "i"));
  return textFromXml(match?.[1]);
}
function parseRss(xml, sourceFallback) {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].slice(0, 50).map(([block]) => ({
    source: tag(block, "source") || sourceFallback,
    title: tag(block, "title"),
    url: tag(block, "link"),
    publishedAt: tag(block, "pubDate")
  })).filter((item) => item.title && item.url);
}
async function fetchJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "AwakeDesk/1.0" } });
  if (!response.ok) throw new Error(url + " returned " + response.status);
  return response.json();
}
async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "AwakeDesk/1.0" } });
  if (!response.ok) throw new Error(url + " returned " + response.status);
  return response.text();
}
async function handleApi(req, res, url) {
  if (url.pathname === "/api/reverse-geocode") {
    const latitude = url.searchParams.get("latitude");
    const longitude = url.searchParams.get("longitude");
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      sendJson(res, 400, { error: "Invalid coordinates" });
      return;
    }
    sendJson(res, 200, await fetchJson("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + encodeURIComponent(latitude) + "&longitude=" + encodeURIComponent(longitude) + "&localityLanguage=en"));
    return;
  }
  if (url.pathname === "/api/weather") {
    const lat = parseFloat(url.searchParams.get("latitude"));
    const lon = parseFloat(url.searchParams.get("longitude"));
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      sendJson(res, 400, { error: "Invalid coordinates" });
      return;
    }
    const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon), daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max", timezone: "auto", forecast_days: "5" });
    sendJson(res, 200, await fetchJson("https://api.open-meteo.com/v1/forecast?" + params));
    return;
  }
  if (url.pathname === "/api/news") {
    const category = url.searchParams.get("category") || "technology";
    const language = url.searchParams.get("language") || "en";
    const city = (url.searchParams.get("city") || "").replace(/[^a-zA-Z\s\-]/g, "").slice(0, 50);
    const country = (url.searchParams.get("country") || "").replace(/[^a-zA-Z\s\-]/g, "").slice(0, 50);
    let countryCode = (url.searchParams.get("countryCode") || "default").toUpperCase();
    const validCodes = Object.keys(noPaywallLocalSources);
    if (!validCodes.includes(countryCode)) countryCode = "default";
    const profile = languageProfiles[language] || languageProfiles.en;
    const code = countryCode === "DEFAULT" ? (profile.defaultCountry || "US") : countryCode;
    const sourceDomains = category === "local" ? (noPaywallLocalSources[code] || noPaywallLocalSources.default) : profile.domains;
    const sourceQuery = sourceDomains.map((source) => "site:" + source).join(" OR ");
    const langQueries = categoryQueriesByLanguage[language] || categoryQueries;
    const baseQuery = category === "local" ? ((city || country || "local") + " " + country) : (langQueries[category] || categoryQueries[category] || categoryQueries.technology);
    const query = baseQuery + " (" + sourceQuery + ") when:24h";
    const rssUrl = new URL("https://news.google.com/rss/search");
    rssUrl.searchParams.set("q", query);
    rssUrl.searchParams.set("hl", profile.hl + "-" + code);
    rssUrl.searchParams.set("gl", code);
    rssUrl.searchParams.set("ceid", code + ":" + profile.hl);
    sendJson(res, 200, parseRss(await fetchText(rssUrl), category === "local" ? (city || country || "Local news") : category));
    return;
  }
  if (url.pathname === "/api/radio") {
    sendJson(res, 200, [
      { id: "rp-main", title: "Radio Paradise — Main Mix", description: "Eclectic rock and world mix", playlists: [{ url: "https://stream.radioparadise.com/mp3-192", format: "mp3" }] },
      { id: "rp-rock", title: "Radio Paradise — Rock", description: "Rock mix", playlists: [{ url: "https://stream.radioparadise.com/rock-192", format: "mp3" }] },
      { id: "rp-mellow", title: "Radio Paradise — Mellow", description: "Mellow mix", playlists: [{ url: "https://stream.radioparadise.com/mellow-192", format: "mp3" }] },
      { id: "rp-global", title: "Radio Paradise — Global", description: "Global mix", playlists: [{ url: "https://stream.radioparadise.com/global-192", format: "mp3" }] },
      { id: "sf-groovesalad", title: "SomaFM — Groove Salad", description: "Chillout and lofi beats", playlists: [{ url: "http://ice1.somafm.com/groovesalad-128-mp3", format: "mp3" }] },
      { id: "sf-dronezone", title: "SomaFM — Drone Zone", description: "Ambient and atmospheric", playlists: [{ url: "http://ice1.somafm.com/dronezone-128-mp3", format: "mp3" }] },
      { id: "sf-secretagent", title: "SomaFM — Secret Agent", description: "Downtempo spy music", playlists: [{ url: "http://ice1.somafm.com/secretagent-128-mp3", format: "mp3" }] },
      { id: "sf-bootliquor", title: "SomaFM — Boot Liquor", description: "Americana and alt-country", playlists: [{ url: "http://ice1.somafm.com/bootliquor-128-mp3", format: "mp3" }] },
      { id: "sf-poptron", title: "SomaFM — PopTron", description: "Indie pop and electro", playlists: [{ url: "http://ice1.somafm.com/poptron-128-mp3", format: "mp3" }] },
      { id: "fip", title: "FIP Radio", description: "Eclectic mix from France (no ads)", playlists: [{ url: "https://icecast.radiofrance.fr/fip-midfi.mp3", format: "mp3" }] },
      { id: "kexp", title: "KEXP Seattle", description: "Indie and alternative", playlists: [{ url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", format: "mp3" }] },
      { id: "mpr-peaceful", title: "MPR — Peaceful Piano", description: "Ambient solo piano", playlists: [{ url: "https://peacefulpiano.stream.publicradio.org/peacefulpiano.aac", format: "aac" }] },
      { id: "mpr-relax", title: "MPR — Relax", description: "Ambient and atmospheric", playlists: [{ url: "https://relax.stream.publicradio.org/relax.mp3", format: "mp3" }] },
      { id: "au-triplej", title: "Triple J", description: "Australian alternative and new music", playlists: [{ url: "https://abc.streamguys1.com/live/triplejnsw/icecast.audio", format: "aac" }] },
      { id: "au-rn", title: "ABC Radio National", description: "Australian news, culture, and ideas", playlists: [{ url: "https://abc.streamguys1.com/live/rnnsw/icecast.audio", format: "aac" }] },
      { id: "au-2gb", title: "2GB Sydney", description: "Talk and news radio", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/2GB.mp3", format: "mp3" }] },
      { id: "au-3aw", title: "3AW Melbourne", description: "Talk and news radio", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/3AW.mp3", format: "mp3" }] },
      { id: "au-nova", title: "Nova 969 Sydney", description: "Hit music", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVA_969.mp3", format: "mp3" }] },
      { id: "au-smooth", title: "Smooth 953 Sydney", description: "Easy listening", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SMOOTH953.mp3", format: "mp3" }] },
      { id: "au-4bc", title: "4BC Brisbane", description: "Talk and news radio", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/4BC.mp3", format: "mp3" }] },
      { id: "au-6pr", title: "6PR Perth", description: "Talk and news radio", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/6PR.mp3", format: "mp3" }] },
      { id: "au-2ca", title: "2CA Canberra", description: "Classic hits", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/2CA.mp3", format: "mp3" }] },
      { id: "au-safm", title: "SAFM Adelaide", description: "Hit music", playlists: [{ url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SAFM.mp3", format: "mp3" }] }
    ]);
    return;
  }
  if (url.pathname === "/api/radio-proxy") {
    const target = url.searchParams.get("url") || "";
    if (!target || !(target.startsWith("http://") || target.startsWith("https://"))) {
      res.writeHead(400); res.end("Bad URL"); return;
    }
    const allowedHosts = ["ice1.somafm.com", "ice2.somafm.com", "ice4.somafm.com", "ice6.somafm.com", "somafm.com", "stream.radioparadise.com", "abc.streamguys1.com", "playerservices.streamtheworld.com", "*.streamtheworld.com"];
    function isAllowedHost(hostname) {
      return allowedHosts.some((h) => h === hostname || (h.startsWith("*.") && hostname.endsWith(h.slice(1))));
    }
    const targetUrl = new URL(target);
    if (!isAllowedHost(targetUrl.hostname)) {
      res.writeHead(403); res.end("Forbidden host"); return;
    }
    function proxyTo(finalTarget, redirectCount) {
      if (redirectCount > 3) { res.writeHead(502); res.end("Too many redirects"); return; }
      const finalIsHttps = finalTarget.startsWith("https://");
      const finalClient = finalIsHttps ? https : http;
      const finalReq = finalClient.request(finalTarget, { method: "GET", headers: { "user-agent": "AwakeDesk/1.0" } }, (finalRes) => {
        if (finalRes.statusCode >= 301 && finalRes.statusCode <= 308 && finalRes.headers.location) {
          const redirectUrl = new URL(finalRes.headers.location, finalTarget).toString();
          const redirectHost = new URL(redirectUrl).hostname;
          if (!isAllowedHost(redirectHost)) { res.writeHead(403); res.end("Forbidden redirect host"); return; }
          proxyTo(redirectUrl, redirectCount + 1);
          return;
        }
        res.writeHead(finalRes.statusCode || 200, {
          "content-type": finalRes.headers["content-type"] || "audio/mpeg",
          "transfer-encoding": finalRes.headers["transfer-encoding"] || "chunked",
          "accept-ranges": "none"
        });
        finalRes.pipe(res);
      });
      finalReq.on("error", (err) => { res.writeHead(502); res.end("Proxy error: " + (err?.message || "unknown")); });
      finalReq.end();
    }
    proxyTo(target, 0);
    return;
  }
  sendJson(res, 404, { error: "Not found" });
}
async function serveStatic(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(root, path.join(".", path.normalize(requested)));
  if (!resolved.startsWith(root + path.sep) && resolved !== root) { res.writeHead(403); res.end("Forbidden"); return; }
  const content = await readFile(resolved);
  res.writeHead(200, { "content-type": types[path.extname(resolved)] || "application/octet-stream", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY", "content-security-policy": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*.open-meteo.com https://hn.algolia.com https://www.ozbargain.com.au https://api.allorigins.win; media-src 'self' https://stream.radioparadise.com https://stream.revma.ihrhls.com https://*.somafm.com https://icecast.radiofrance.fr https://kexp-mp3-128.streamguys1.com https://*.stream.publicradio.org https://abc.streamguys1.com https://playerservices.streamtheworld.com https://*.streamtheworld.com; img-src 'self' data: https://picsum.photos https://*.picsum.photos https://*.somafm.com; font-src https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" });
  res.end(content);
}
http.createServer(async (req, res) => {
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) { sendJson(res, 429, { error: "Rate limit exceeded. Try again later." }); return; }
  if (!checkAuth(req, res)) return;
  const url = new URL(req.url, "http://" + req.headers.host);
  try {
    if (url.pathname.startsWith("/api/")) { await handleApi(req, res, url); return; }
    await serveStatic(res, url.pathname);
  } catch (error) {
    if (url.pathname.startsWith("/api/")) { sendJson(res, 502, { error: "Service unavailable" }); return; }
    res.writeHead(404); res.end("Not found");
  }
}).listen(port, () => console.log("Awake Desk listening on " + port));
