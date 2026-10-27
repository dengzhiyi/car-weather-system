/* 气象环境助手 · API stub 层
 说明：以下函数签名即未来真实接口形状，内部通过 adapters 取数、通过 domain 计算，均带模拟网络时延。
 接入后端时只需替换 adapters 的实现，保持本层入参 / 返回结构不变。
 TODO: replace adapters with real data sources.
*/
import { DB } from '../data/mock.js';
import { SITE } from '../config/site.js';
import { Sensor } from '../adapters/sensor.js';
import { Weather } from '../adapters/weather.js';
import { Amap } from '../adapters/amap.js';
import { rainLevelOf } from '../domain/rain.js';
import { rainAssistPlan } from '../domain/rainstorm.rules.js';
import { fishingScore } from '../domain/fishing.rules.js';
import {
  windTextOf,
  skyOf,
  rainChanceOf,
  feelsOf,
  visibilityOf,
  pressureTrendOf
} from '../domain/weather.view.js';

/* 逐时预报取当前 + 未来 4 小时，每小时一列 */
const HOURLY_OFFSETS = [0, 60, 120, 180, 240];

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

/* 首页功能卡：钓鱼指标由规则现算，避免快照文案与钓鱼页结论不一致 */
function featuresWithLiveMetric() {
  const spot = DB.fishing.spots[0];
  const score = fishingScore({
    pressure: spot.pressure,
    pressureTrend: spot.pressureTrend,
    windSpeed: spot.windSpeed,
    gust: spot.gust
  });
  return DB.features.map(function (f) {
    if (f.id !== 'fishing') return f;
    return Object.assign({}, f, {
      metric: score.score + ' 分 · ' + FISHING_RATING_SHORT[score.rating]
    });
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

/* 实况点 → 看板天气对象（展示口径换算见 domain/weather.view.js） */
function describeWeather(series, site) {
  const now = series[0];
  const dayLater = pointAt(series, now.at + 24 * 60 * 60 * 1000);
  const sky = skyOf(now.rainRate, now.humidity);
  return {
    location: site.name,
    temp: Math.round(now.temp),
    feels: feelsOf(now.temp, now.humidity, now.windSpeed),
    condition: sky.condition,
    icon: sky.icon,
    rainChance: rainChanceOf(now.rainRate),
    humidity: Math.round(now.humidity),
    visibility: visibilityOf(now.humidity, now.rainRate),
    wind: windTextOf(now.windDeg, now.windSpeed),
    windSpeed: Math.round(now.windSpeed * 3.6),
    pressure: Math.round(now.pressure),
    pressureTrend: pressureTrendOf(now.pressure, dayLater.pressure),
    updatedAt: String(now.time).slice(11, 16)
  };
}

function describeHourly(series) {
  return HOURLY_OFFSETS.map(function (offset) {
    const point = pointAt(series, series[0].at + offset * 60 * 1000);
    const sky = skyOf(point.rainRate, point.humidity);
    return {
      time: String(point.time).slice(11, 16),
      label: offset === 0 ? '现在' : offset / 60 + ' 小时后',
      temp: Math.round(point.temp),
      icon: sky.icon,
      rain: rainChanceOf(point.rainRate),
      wind: Math.round(point.windSpeed * 3.6)
    };
  });
}

/* GET /api/dashboard  →  { vehicle, weather, rain, forecast4h, features } */
async function getDashboard() {
  await delay(240);
  const rain = await Sensor.readVehicleRain();
  const level = rainLevelOf(rain.rate, rain.thresholds);
  let weather;
  let forecast4h;
  try {
    const series = await Weather.readSeries(SITE);
    weather = describeWeather(series, SITE);
    forecast4h = describeHourly(series);
  } catch (error) {
    /* 接口不可用（断网 / 订阅异常）时退回本地 mock，保证看板可用 */
    weather = DB.weather;
    forecast4h = DB.forecast4h;
  }
  return {
    code: 0,
    data: {
      vehicle: DB.vehicle,
      weather: weather,
      rain: Object.assign({}, rain, { level: level.name, levelIndex: level.index }),
      forecast4h: forecast4h,
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
      source: 'rain-sensor ' + rain.sensorId,
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
  const brief = await Weather.readArrivalBrief(dest.id);
  return {
    code: 0,
    data: {
      /* 地图地理信息 + 到达时段天气合并为页面所需的单一目的地对象 */
      destination: Object.assign({}, dest, brief),
      route: Object.assign({}, route, { synced: true })
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
