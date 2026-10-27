/**
 * 天气服务适配层
 * 实况 / 逐时预报走真实天气接口（15 分钟粒度，10 天预报）；
 * 流域短临预报、目的地到达天气、钓点气象仍为本地 mock，待后续接入。
 * 只做字段搬运与单位归一化，不做评分、等级、预警等业务判断（属于 domain 的职责）。
 */
import { DB } from '../data/mock.js';

/* ---------- 真实天气接口 ---------- */

const API_BASE = 'https://api.tjweather.com/v2';
/* 浏览器侧走同源代理（vite dev / preview），避免跨域；Native（Capacitor）直连 */
const PROXY_BASE = '/api/tj/v2';
const KEY = 'tj_live_C83J7Y0Y7L51';
const SUBSCRIPTION_ID = 'sub_85b2c52c56454adbb7cdc9e0de61826b';
const FIELDS = 'wd10m,ws10m,t2m,rh2m,psz,tp';
const T_RES = '15min';
const FORECAST_DAYS = 10;

const TIMEOUT_MS = 8000;
/* 15 分钟粒度数据 10 天量级较大，缓存 5 分钟 */
const CACHE_MS = 5 * 60 * 1000;

let cache = null;

function isNativePlatform() {
  return !!(
    typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

/* 浏览器侧无 CORS 头可用，统一走同源代理；Native（Capacitor）直连服务端 */
function endpoint() {
  return isNativePlatform() ? API_BASE : PROXY_BASE;
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

async function request(url) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : {});
    if (!res.ok) throw new Error('weather http ' + res.status);
    const body = await res.json();
    if (!body || body.code !== 200 || !body.data || !Array.isArray(body.data.data)) {
      throw new Error('weather payload: ' + (body && body.message ? body.message : 'invalid'));
    }
    return body.data.data;
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  const raw = await request(buildUrl(endpoint(), site));
  const points = raw.map(normalizePoint).filter(function (p) {
    return Number.isFinite(p.at) && Number.isFinite(p.temp);
  });
  if (!points.length) throw new Error('weather series empty');
  cache = { key: cacheKey, at: Date.now(), points: points };
  return points;
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
 * 目的地到达时段天气 + 出行建议
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
  readBasinForecast: readBasinForecast,
  readArrivalBrief: readArrivalBrief,
  readFishingSpot: readFishingSpot
};

export { Weather };
