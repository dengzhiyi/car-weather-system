/* 气象环境助手 · API stub 层
 说明：以下函数签名即未来真实接口形状，内部通过 adapters 取数、通过 domain 计算，均带模拟网络时延。
 接入后端时只需替换 adapters 的实现，保持本层入参 / 返回结构不变。
 TODO: replace adapters with real data sources.
*/
import { DB } from '../data/mock.js';
import { SITE } from '../config/site.js';
import { clockOf, minutesOfDuration } from '../core/time.js';
import { Sensor } from '../adapters/sensor.js';
import { Weather } from '../adapters/weather.js';
import { Amap } from '../adapters/amap.js';
import { rainLevelOf } from '../domain/rain.js';
import { rainAssistPlan } from '../domain/rainstorm.rules.js';
import { fishingScore } from '../domain/fishing.rules.js';
import {
  windTextOf,
  skyOfCode,
  skyOf,
  rainChanceOf,
  feelsOf,
  visibilityOf,
  pressureTrendOf
} from '../domain/weather.view.js';

/* 逐时预报取当前 + 未来 5 小时，每小时一列（首页去掉当前档展示 5 档） */
const HOURLY_OFFSETS = [0, 60, 120, 180, 240, 300];
/* 目的地到达时段逐时：到达后 0 / 1 / 2 小时 */
const ARRIVAL_OFFSETS = [0, 60, 120];

/* 首页功能卡上的评级短文案 */
const FISHING_RATING_SHORT = {
  '适宜垂钓': '适宜',
  '较为适宜': '较适宜',
  '谨慎出钓': '谨慎'
};

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/* 场景参数归一化（normal / alert），非法的值回落到常态 */
function sceneOf(mode) {
  return mode === 'alert' ? 'alert' : 'normal';
}

/* 首页功能卡：钓鱼指标由规则现算，避免快照文案与钓鱼页结论不一致；
   露营到达时间按系统时钟 + 路线时长推算 */
function featuresWithLiveMetric() {
  const spot = DB.fishing.spots[0];
  const score = fishingScore({
    pressure: spot.pressure,
    pressureTrend: spot.pressureTrend,
    windSpeed: spot.windSpeed,
    gust: spot.gust
  });
  const camp = DB.camping.destinations[0];
  const campArrival = clockOf(Date.now() + minutesOfDuration(camp.duration) * 60 * 1000);
  return DB.features.map(function (f) {
    if (f.id === 'fishing') {
      return Object.assign({}, f, {
        metric: score.score + ' 分 · ' + FISHING_RATING_SHORT[score.rating]
      });
    }
    if (f.id === 'camping') {
      return Object.assign({}, f, {
        sub: '到达 ' + campArrival + ' · ' + camp.condition + ' ' + camp.temp + '°C'
      });
    }
    return f;
  });
}

/* 在 15 分钟序列中取距目标时刻最近的一点 */
function pointAt(series, targetAt) {
  let nearest = series[0];
  for (let i = 1; i < series.length; i += 1) {
    if (Math.abs(series[i].at - targetAt) < Math.abs(nearest.at - targetAt)) nearest = series[i];
  }
  return nearest;
}

/* 实况点：接口序列首点是序列起点而非「现在」，取距当前时刻最近的一点；
   同时限制在序列时间范围内，避免落到区间外的远端预报 */
function currentPoint(series) {
  const first = series[0];
  const last = series[series.length - 1];
  return pointAt(series, Math.min(last.at, Math.max(first.at, Date.now())));
}

/* 单个数据点 → 展示要素：接口原值优先（天气码 / 云量 / 降水概率 / 体感 / 能见度），
   缺字段时（tjweather 备用通道）才退回 domain 里的经验口径 */
function skyAt(point) {
  const byCode = Number.isFinite(point.weatherCode) ? skyOfCode(point.weatherCode, point.isDay) : null;
  if (byCode) return byCode;
  if (Number.isFinite(point.cloudCover) && !(Number(point.rainRate) >= 0.1)) {
    if (point.cloudCover >= 88) return { condition: '阴', icon: 'cloud' };
    if (point.cloudCover >= 50) return { condition: '多云', icon: 'cloud-sun' };
    if (point.cloudCover >= 20) return { condition: '晴间多云', icon: 'cloud-sun' };
    return { condition: '晴', icon: point.isDay === 0 ? 'moon' : 'sun' };
  }
  return skyOf(point.rainRate, point.humidity);
}

function chanceAt(point) {
  return Number.isFinite(point.rainChance) ? Math.round(point.rainChance) : rainChanceOf(point.rainRate);
}

function feelsAt(point) {
  return Number.isFinite(point.apparentTemp)
    ? Math.round(point.apparentTemp)
    : feelsOf(point.temp, point.humidity, point.windSpeed);
}

function visibilityAt(point) {
  if (Number.isFinite(point.visibilityKm)) return Math.round(point.visibilityKm * 10) / 10;
  return visibilityOf(point.humidity, point.rainRate);
}

/* 实况点 → 看板天气对象（展示口径换算见 domain/weather.view.js） */
function describeWeather(series, site) {
  const now = currentPoint(series);
  const dayLater = pointAt(series, now.at + 24 * 60 * 60 * 1000);
  const sky = skyAt(now);
  return {
    location: site.name,
    temp: Math.round(now.temp),
    feels: feelsAt(now),
    condition: sky.condition,
    icon: sky.icon,
    rainChance: chanceAt(now),
    humidity: Math.round(now.humidity),
    visibility: visibilityAt(now),
    wind: windTextOf(now.windDeg, now.windSpeed),
    windSpeed: Math.round(now.windSpeed * 3.6),
    pressure: Math.round(now.pressure),
    pressureTrend: pressureTrendOf(now.pressure, dayLater.pressure),
    updatedAt: String(now.time).slice(11, 16)
  };
}

/* 时刻对齐到半小时整点（:00 / :30），不足半小时向上取整 */
function halfHourAt(ms) {
  const step = 30 * 60 * 1000;
  return Math.ceil(ms / step) * step;
}

/* 逐时预报的时刻一律按系统时钟推算并对齐半小时（数据点取距该时刻最近的一档），
   避免接口序列起点较早时，页面时间停在固定档位随不了系统时间 */
function describeHourly(series) {
  const nowAt = Date.now();
  return HOURLY_OFFSETS.map(function (offset) {
    const slotAt = offset === 0 ? nowAt : halfHourAt(nowAt + offset * 60 * 1000);
    const point = pointAt(series, slotAt);
    const sky = skyAt(point);
    return {
      time: clockOf(slotAt),
      label: offset === 0 ? '现在' : offset / 60 + ' 小时后',
      temp: Math.round(point.temp),
      icon: sky.icon,
      rain: chanceAt(point),
      wind: Math.round(point.windSpeed * 3.6)
    };
  });
}

/* 兜底快照没有时间戳偏移，按数组序号（每小时一档）对齐系统时钟与半小时整点 */
function withClockTimes(forecast) {
  const nowAt = Date.now();
  return forecast.map(function (f, i) {
    const offset = typeof f.offset === 'number' ? f.offset : i * 60;
    const slotAt = offset === 0 ? nowAt : halfHourAt(nowAt + offset * 60 * 1000);
    return Object.assign({}, f, { offset: offset, time: clockOf(slotAt) });
  });
}

/* 目的地到达时段天气：取距到达时刻最近的一点，逐时按到达后 0/1/2 小时 */
function arrivalWeatherOf(series, arrivalAt) {
  const point = pointAt(series, arrivalAt);
  const sky = skyAt(point);
  return {
    temp: Math.round(point.temp),
    condition: sky.condition,
    icon: sky.icon,
    rainChance: chanceAt(point),
    wind: windTextOf(point.windDeg, point.windSpeed),
    pressure: Math.round(point.pressure),
    visibility: visibilityAt(point) + ' km',
    hourly: ARRIVAL_OFFSETS.map(function (offset) {
      const p = pointAt(series, arrivalAt + offset * 60 * 1000);
      return {
        offset: offset,
        temp: Math.round(p.temp),
        icon: skyAt(p).icon,
        rain: chanceAt(p)
      };
    })
  };
}

/* GET /api/dashboard  →  { vehicle, weather, rain, forecast5h, features } */
async function getDashboard() {
  await delay(240);
  const rain = await Sensor.readVehicleRain();
  const level = rainLevelOf(rain.rate, rain.thresholds);
  let weather;
  let forecast5h;
  try {
    const series = await Weather.readSeries(SITE);
    weather = describeWeather(series, SITE);
    forecast5h = describeHourly(series);
  } catch (error) {
    /* 接口不可用（断网 / 订阅异常）时退回本地 mock，保证看板可用；时间仍跟随系统时钟 */
    weather = DB.weather;
    forecast5h = withClockTimes(DB.forecast5h);
  }
  return {
    code: 0,
    data: {
      vehicle: DB.vehicle,
      weather: weather,
      rain: Object.assign({}, rain, { level: level.name, levelIndex: level.index }),
      forecast5h: forecast5h,
      features: featuresWithLiveMetric()
    }
  };
}

/* POST /api/rain-assist  body { enabled: boolean }
   → { enabled, strategy: { speedLimit, followGap, followMeters, notice } } */
async function setRainAssist(payload) {
  await delay(460);
  const enabled = !!payload.enabled;
  const rain = await Sensor.readVehicleRain();
  const plan = rainAssistPlan({
    rate: rain.rate,
    thresholds: rain.thresholds,
    speedLimit: DB.vehicle.speedLimit,
    currentSpeed: DB.vehicle.speed,
    enabled: enabled
  });
  return {
    code: 0,
    data: {
      enabled: plan.enabled,
      strategy: {
        speedLimit: plan.targetSpeed,
        followGap: plan.followSeconds,
        followMeters: plan.followMeters,
        notice: plan.notice
      },
      source: 'rain-sensor',
      syncedAt: new Date().toISOString()
    }
  };
}

/* POST /api/camping/plan  body { query: string }
   → { destination, route: { distance, duration, arrival } } */
async function planDestination(payload) {
  await delay(680);
  const query = String((payload && payload.query) || '').trim();
  const dest = await Amap.searchDestination(query);
  if (!dest) {
    return { code: 404, message: '未找到目的地', data: null };
  }
  const route = await Amap.planRoute(dest);
  /* 到达时刻 = 当前系统时间 + 路线时长；逐时天气按该时刻向后推算 */
  const arrivalAt = Date.now() + minutesOfDuration(route.duration) * 60 * 1000;
  const brief = await Weather.readArrivalBrief(dest.id);
  let live = null;
  try {
    const series = await Weather.readSeries({
      name: dest.name,
      lon: dest.lng,
      lat: dest.lat,
      tz: 8
    });
    live = arrivalWeatherOf(series, arrivalAt);
  } catch (error) {
    /* 目的地天气接口不可用（断网 / 订阅异常）时沿用本地快照 */
  }
  return {
    code: 0,
    data: {
      /* 地图地理信息 + 到达时段天气合并为页面所需的单一目的地对象 */
      destination: Object.assign({}, dest, brief, live || {}),
      route: Object.assign({}, route, { arrival: clockOf(arrivalAt), arrivalAt: arrivalAt, synced: true })
    }
  };
}

/* GET /api/flood/status?mode=normal|alert
   → { destination, status:{ sensorRate, forecast, update }, thresholds, rainLevels, notify, history } */
async function getFloodStatus(mode) {
  await delay(420);
  const scene = sceneOf(mode);
  const gauge = await Sensor.readBasinGauge(DB.flood.destination.id, scene);
  const forecast = await Weather.readBasinForecast(scene);
  return {
    code: 0,
    data: {
      destination: DB.flood.destination,
      status: {
        sensorRate: gauge.sensorRate,
        forecast: forecast,
        update: gauge.update
      },
      thresholds: DB.flood.thresholds,
      rainLevels: DB.rain.thresholds,
      notify: DB.flood.notify,
      history: DB.flood.history
    }
  };
}

/* GET /api/fishing/window?spotId=  → { spot: { 原始气压/风速读数, windows, advice } } */
async function getFishingWindow(spotId) {
  await delay(360);
  let spot = await Weather.readFishingSpot(spotId);
  if (!spot) spot = await Weather.readFishingSpot(DB.fishing.spots[0].id);
  return { code: 0, data: { spot: spot } };
}

const Api = {
  delay: delay,
  getDashboard: getDashboard,
  setRainAssist: setRainAssist,
  planDestination: planDestination,
  getFloodStatus: getFloodStatus,
  getFishingWindow: getFishingWindow
};

export { Api };
