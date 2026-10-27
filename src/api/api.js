/* 车象 WeatherOS · API stub 层
 说明：以下函数签名即未来真实接口形状，内部返回本地 mock，均带模拟网络时延。
 接入后端时只需替换函数体，保持入参 / 返回结构不变。
 TODO: replace each body with real fetch calls.
*/
import { DB } from '../data/mock.js';
import { rainAssistPlan } from '../domain/rainstorm.rules.js';

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/* GET /api/dashboard  →  { vehicle, weather, rain, forecast2h, features } */
async function getDashboard() {
  await delay(240);
  return {
    code: 0,
    data: {
      vehicle: DB.vehicle,
      weather: DB.weather,
      rain: DB.rain,
      forecast2h: DB.forecast2h,
      features: DB.features
    }
  };
}

/* POST /api/rain-assist  body { enabled: boolean }
   → { enabled, strategy: { speedLimit, followGap, notice } } */
async function setRainAssist(payload) {
  await delay(460);
  const enabled = !!payload.enabled;
  const plan = rainAssistPlan({
    rate: DB.rain.rate,
    thresholds: DB.rain.thresholds,
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
      source: 'rain-sensor ' + DB.rain.sensorId,
      syncedAt: new Date().toISOString()
    }
  };
}

/* POST /api/camping/plan  body { query: string }
   → { destination, route: { distance, duration, arrival } } */
async function planDestination(payload) {
  await delay(680);
  const query = String((payload && payload.query) || '').trim().toLowerCase();
  const list = DB.camping.destinations;
  let dest = list.find(function (d) {
    return !query || d.name.toLowerCase().indexOf(query) > -1 || d.region.toLowerCase().indexOf(query) > -1;
  });
  if (!dest && query) {
    // 未命中预设营地时，返回最近的一个演示结果（真实接口应返回候选列表）
    dest = list[0];
  }
  if (!dest) {
    return { code: 404, message: '未找到目的地', data: null };
  }
  return {
    code: 0,
    data: {
      destination: dest,
      route: {
        distance: dest.distance,
        duration: dest.duration,
        arrival: dest.arrival,
        provider: '高德地图',
        synced: true
      }
    }
  };
}

/* GET /api/flood/status?mode=normal|alert
   → { destination, status:{ sensorRate, forecast, update }, thresholds, rainLevels, notify, history } */
async function getFloodStatus(mode) {
  await delay(420);
  const key = mode === 'alert' ? 'alert' : 'normal';
  return {
    code: 0,
    data: {
      destination: DB.flood.destination,
      status: DB.flood.modes[key],
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
  const spots = DB.fishing.spots;
  const spot = spots.find(function (s) { return s.id === spotId; }) || spots[0];
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
