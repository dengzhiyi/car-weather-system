/* 车象 WeatherOS · API stub 层
 说明：以下函数签名即未来真实接口形状，内部通过 adapters 取数、通过 domain 计算，均带模拟网络时延。
 接入后端时只需替换 adapters 的实现，保持本层入参 / 返回结构不变。
 TODO: replace adapters with real data sources.
*/
import { DB } from '../data/mock.js';
import { Sensor } from '../adapters/sensor.js';
import { Weather } from '../adapters/weather.js';
import { Amap } from '../adapters/amap.js';
import { rainLevelOf } from '../domain/rain.js';
import { rainAssistPlan } from '../domain/rainstorm.rules.js';
import { fishingScore } from '../domain/fishing.rules.js';

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

/* GET /api/dashboard  →  { vehicle, weather, rain, forecast2h, features } */
async function getDashboard() {
  await delay(240);
  const rain = await Sensor.readVehicleRain();
  const level = rainLevelOf(rain.rate, rain.thresholds);
  const weather = await Weather.readCurrent();
  const forecast2h = await Weather.readHourly();
  return {
    code: 0,
    data: {
      vehicle: DB.vehicle,
      weather: weather,
      rain: Object.assign({}, rain, { level: level.name, levelIndex: level.index }),
      forecast2h: forecast2h,
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
