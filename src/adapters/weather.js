/**
 * 天气服务适配层
 * 实况 / 逐时预报优先取 Open-Meteo（免费开源、15 分钟粒度），
 * 不可用时回退 tjweather 备用通道；目的地到达天气由 api 层按目的地经纬度取同一条序列计算，
 * 本层只提供运营文案（舒适度 / 装备 / 安全建议）与接口不可用时的兜底快照；
 * 流域短临预报、钓点气象仍为本地 mock，待后续接入。
 * 只做字段搬运与单位归一化，不做评分、等级、预警等业务判断（属于 domain 的职责）。
 */
import { DB } from '../data/mock.js';
import contract from '../config/model-contract.json';

/* ---------- 真实天气接口 ---------- */

/* 主通道：Open-Meteo。浏览器侧走同源代理（vite dev / preview），Native（Capacitor）直连 */
const OM_API = 'https://api.open-meteo.com/v1/forecast';
const OM_PROXY = '/api/om/v1/forecast';
const OM_TIMEZONE = 'Asia/Shanghai';
/* 决策模型所需的 16 个逐时字段由跨仓库契约给出，避免与模型侧字段漂移 */
const OM_HOURLY = contract.hourly.fields.map(function (f) { return f.name; }).join(',');
const OM_MINUTELY = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,precipitation_probability,cloud_cover,visibility,weather_code,is_day,wind_speed_10m,wind_direction_10m';
const OM_PAST_DAYS = contract.hourly.request.pastDays;
const OM_FORECAST_DAYS = contract.hourly.request.forecastDays;

/* 备用通道：tjweather（原接口保留，主通道异常时接管） */
const API_BASE = 'https://api.tjweather.com/v2';
const PROXY_BASE = '/api/tj/v2';
const KEY = 'tj_live_C83J7Y0Y7L51';
const SUBSCRIPTION_ID = 'sub_85b2c52c56454adbb7cdc9e0de61826b';
const FIELDS = 'wd10m,ws10m,t2m,rh2m,psz,tp';
const T_RES = '15min';
const FORECAST_DAYS = 10;

const TIMEOUT_MS = 8000;
/* 15 分钟粒度数据量较大，缓存 5 分钟 */
const CACHE_MS = 5 * 60 * 1000;

let cache = null;
/* 原始响应缓存：同一份 payload 同时供展示序列与决策序列使用，避免重复请求 */
let omBodyCache = null;

/* 契约里的展示时区固定为 +08:00，用于把 UTC 时间戳还原为带偏移的 ISO 字符串 */
const DISPLAY_OFFSET_MIN = (function () {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(contract.timezone.display || '+00:00');
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
})();

function isoDisplay(ms) {
  const sign = DISPLAY_OFFSET_MIN < 0 ? '-' : '+';
  const abs = Math.abs(DISPLAY_OFFSET_MIN);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return new Date(ms + DISPLAY_OFFSET_MIN * 60000).toISOString().slice(0, 16) + sign + hh + ':' + mm;
}

function isNativePlatform() {
  return !!(
    typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

/* 浏览器侧统一走同源代理；Native（Capacitor）直连服务端 */
function endpoint() {
  return isNativePlatform() ? API_BASE : PROXY_BASE;
}

function omEndpoint() {
  return isNativePlatform() ? OM_API : OM_PROXY;
}

async function fetchJson(url) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : {});
    if (!res.ok) throw new Error('weather http ' + res.status);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildOmUrl(base, site) {
  const query = [
    'latitude=' + site.lat,
    'longitude=' + site.lon,
    'hourly=' + encodeURIComponent(OM_HOURLY),
    'minutely_15=' + encodeURIComponent(OM_MINUTELY),
    'timezone=' + encodeURIComponent(OM_TIMEZONE),
    'wind_speed_unit=ms',
    'past_days=' + OM_PAST_DAYS,
    'forecast_days=' + OM_FORECAST_DAYS
  ].join('&');
  return base + '?' + query;
}

/* Open-Meteo 返回的是带时区偏移的墙钟时间（无 tz 后缀），按响应里的 utc_offset 还原时间戳 */
function atOfLocalWallClock(text, offsetMs) {
  const ms = Date.parse(text + 'Z');
  return Number.isFinite(ms) ? ms - offsetMs : NaN;
}

/* Open-Meteo 归一化：15 分钟序列为主，气压按小时对齐补齐；
   云量 / 体感 / 能见度 / 降水概率 / 天气码 / 昼夜均为接口原值，缺失时留 NaN 交给展示层兜底；
   降水为「该 15 分钟累计量」，换算成 mm/h 以与 tjweather 的 tp 口径一致 */
function num(value) {
  return value == null || value === '' ? NaN : Number(value);
}

function normalizeOm(body) {
  const m15 = body && body.minutely_15;
  const hourly = body && body.hourly;
  if (!m15 || !Array.isArray(m15.time) || !m15.time.length) {
    throw new Error('weather payload: open-meteo invalid');
  }
  const offsetMs = (Number(body.utc_offset_seconds) || 0) * 1000;
  const pressureAt = {};
  if (hourly && Array.isArray(hourly.time)) {
    hourly.time.forEach(function (t, i) {
      pressureAt[t.slice(0, 13)] = Number(hourly.pressure_msl[i]);
    });
  }
  const points = m15.time.map(function (t, i) {
    return {
      at: atOfLocalWallClock(t, offsetMs),
      time: t,
      temp: Number(m15.temperature_2m[i]),
      humidity: Number(m15.relative_humidity_2m[i]),
      pressure: pressureAt[t.slice(0, 13)],
      windDeg: Number(m15.wind_direction_10m[i]),
      windSpeed: Number(m15.wind_speed_10m[i]),
      rainRate: (Number(m15.precipitation[i]) || 0) * 4,
      apparentTemp: num(m15.apparent_temperature && m15.apparent_temperature[i]),
      cloudCover: num(m15.cloud_cover && m15.cloud_cover[i]),
      /* 接口能见度单位为米，统一换算为公里 */
      visibilityKm: num(m15.visibility && m15.visibility[i]) / 1000,
      rainChance: num(m15.precipitation_probability && m15.precipitation_probability[i]),
      weatherCode: num(m15.weather_code && m15.weather_code[i]),
      isDay: num(m15.is_day && m15.is_day[i])
    };
  }).filter(function (p) {
    return Number.isFinite(p.at) && Number.isFinite(p.temp);
  });
  /* 气压按小时对齐，个别点缺失时前后补齐，避免展示层出现 NaN */
  let last = NaN;
  points.forEach(function (p) {
    if (Number.isFinite(p.pressure)) last = p.pressure;
    else p.pressure = last;
  });
  const firstKnown = points.reduce(function (acc, p) {
    return Number.isFinite(acc) ? acc : p.pressure;
  }, NaN);
  for (let i = 0; i < points.length && !Number.isFinite(points[i].pressure); i += 1) {
    points[i].pressure = firstKnown;
  }
  if (!points.length) throw new Error('weather payload: open-meteo empty');
  return points;
}

/* 决策模型输入序列：契约字段原名、Open-Meteo 原始单位、UTC 时间戳。
   与展示序列分开，避免把 mm/15min、km 等展示口径带进模型。 */
function normalizeDecision(body) {
  const hourly = body && body.hourly;
  if (!hourly || !Array.isArray(hourly.time) || !hourly.time.length) {
    throw new Error('decision series: open-meteo hourly missing');
  }
  const names = contract.hourly.fields.map(function (f) { return f.name; });
  names.forEach(function (name) {
    if (!Array.isArray(hourly[name])) {
      throw new Error('decision series: missing ' + name);
    }
  });
  const offsetMs = (Number(body.utc_offset_seconds) || 0) * 1000;
  const points = hourly.time.map(function (t, i) {
    const at = atOfLocalWallClock(t, offsetMs);
    const point = { at: at, time: isoDisplay(at) };
    names.forEach(function (name) {
      const value = hourly[name][i];
      point[name] = value == null || value === '' ? null : Number(value);
    });
    return point;
  }).filter(function (p) {
    return Number.isFinite(p.at);
  });
  if (!points.length) throw new Error('decision series: empty');
  return { source: 'open-meteo', timezone: contract.timezone.internal, points: points };
}

async function fetchOmBody(site) {
  const key = site.lon + ',' + site.lat;
  if (omBodyCache && omBodyCache.key === key && Date.now() - omBodyCache.at < CACHE_MS) {
    return omBodyCache.body;
  }
  const body = await fetchJson(buildOmUrl(omEndpoint(), site));
  omBodyCache = { key: key, at: Date.now(), body: body };
  return body;
}

async function readOpenMeteo(site) {
  return normalizeOm(await fetchOmBody(site));
}

function buildUrl(base, site) {
  const query = [
    'fields=' + encodeURIComponent(FIELDS),
    'loc=' + site.lon + '%2C' + site.lat,
    'fcst_days=' + FORECAST_DAYS,
    'fcst_hours=0',
    'tz=' + site.tz,
    't_res=' + T_RES,
    'key=' + KEY,
    'subscriptionId=' + SUBSCRIPTION_ID
  ].join('&');
  return base + '?' + query;
}

/* 字段与单位归一化：psz(Pa)→hPa、ws10m(m/s)、tp(mm/h) */
function normalizePoint(point) {
  return {
    at: Date.parse(point.time),
    time: point.time,
    temp: Number(point.t2m),
    humidity: Number(point.rh2m),
    pressure: Number(point.psz) / 100,
    windDeg: Number(point.wd10m),
    windSpeed: Number(point.ws10m),
    rainRate: Number(point.tp)
  };
}

async function readTjweather(site) {
  const body = await fetchJson(buildUrl(endpoint(), site));
  if (!body || body.code !== 200 || !body.data || !Array.isArray(body.data.data)) {
    throw new Error('weather payload: ' + (body && body.message ? body.message : 'invalid'));
  }
  return body.data.data.map(normalizePoint).filter(function (p) {
    return Number.isFinite(p.at) && Number.isFinite(p.temp);
  });
}

/**
 * 读取某点位的逐 15 分钟预报序列（时间正序，第一条视为实况）
 * @param {object} site 站点配置 { lon, lat, tz }
 * @returns {Promise<Array<object>>}
 */
async function readSeries(site) {
  const cacheKey = site.lon + ',' + site.lat;
  if (cache && cache.key === cacheKey && Date.now() - cache.at < CACHE_MS) {
    return cache.points;
  }
  let points;
  try {
    points = await readOpenMeteo(site);
  } catch (error) {
    /* 主通道不可用时切到 tjweather 备用通道，两路都失败才交由 api 层降级到 mock */
    points = await readTjweather(site);
  }
  if (!points.length) throw new Error('weather series empty');
  cache = { key: cacheKey, at: Date.now(), points: points };
  return points;
}

/**
 * 读取决策模型所需的逐时序列（契约字段原名、原始单位、UTC 时间戳）
 * 备用通道 tjweather 不提供完整字段，因此本方法不做降级，由调用方决定如何处理。
 * @param {object} site 站点配置 { lon, lat, tz }
 * @returns {Promise<{source:string,timezone:string,points:Array<object>}>}
 */
async function readDecisionSeries(site) {
  return normalizeDecision(await fetchOmBody(site));
}

/* ---------- 本地 mock（待接入的其余天气数据） ---------- */

/* 目的地记录中由天气服务提供的字段（其余为高德地理与运营文案） */
const ARRIVAL_FIELDS = [
  'temp', 'condition', 'icon', 'rainChance', 'wind', 'pressure', 'visibility',
  'comfort', 'comfortText', 'comfortNote', 'safetyTitle', 'safetyText',
  'note', 'hourly', 'gear'
];

/**
 * 流域未来 2 小时累计降雨预报
 * @param {string} scene 已经归一化的场景键（normal / alert）
 * @returns {Promise<number[]>} 逐时段累计雨量 mm
 */
async function readBasinForecast(scene) {
  return DB.flood.modes[scene].forecast;
}

/**
 * 目的地到达时段的天气要素与出行文案
 * 天气要素为本地兜底快照；api 层会用目的地经纬度的真实序列按到达时刻覆盖，
 * 本层保留舒适度 / 装备 / 安全建议等运营文案。
 * @param {string} destId 目的地标识
 * @returns {Promise<object|null>}
 */
async function readArrivalBrief(destId) {
  const dest = DB.camping.destinations.find(function (d) {
    return d.id === destId;
  });
  if (!dest) return null;
  const brief = {};
  ARRIVAL_FIELDS.forEach(function (key) {
    brief[key] = dest[key];
  });
  return brief;
}

/**
 * 钓点气象观测（气压 / 气压历史 / 风况 / 水情）
 * @param {string} spotId 钓点标识
 * @returns {Promise<object|null>}
 */
async function readFishingSpot(spotId) {
  const spots = DB.fishing.spots;
  return spots.find(function (s) {
    return s.id === spotId;
  }) || null;
}

const Weather = {
  readSeries: readSeries,
  readDecisionSeries: readDecisionSeries,
  readBasinForecast: readBasinForecast,
  readArrivalBrief: readArrivalBrief,
  readFishingSpot: readFishingSpot
};

export { Weather };
