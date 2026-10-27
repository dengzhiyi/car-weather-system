/**
 * 天气服务适配层
 * 归一化实况、逐时预报、流域短临预报、目的地到达天气、钓点气象观测。
 * 只做字段搬运与形状统一，不做评分、等级、预警等业务判断（属于 domain 的职责）。
 * TODO: 接入真实数据源（省市气象 API / 短临预报接口 / 车机在线天气）。
 */
import { DB } from '../data/mock.js';

/* 目的地记录中由天气服务提供的字段（其余为高德地理与运营文案） */
const ARRIVAL_FIELDS = [
  'temp', 'condition', 'icon', 'rainChance', 'wind', 'pressure', 'visibility',
  'comfort', 'comfortText', 'comfortNote', 'safetyTitle', 'safetyText',
  'note', 'hourly', 'gear'
];

/**
 * 当前位置实况
 * @returns {Promise<object>} 温度 / 体感 / 湿度 / 风 / 气压 / 能见度等原始观测
 */
async function readCurrent() {
  return DB.weather;
}

/**
 * 当前位置逐时预报（未来 2 小时）
 * @returns {Promise<Array<{time:string,label:string,temp:number,icon:string,rain:number,wind:number}>>}
 */
async function readHourly() {
  return DB.forecast2h;
}

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
  readCurrent: readCurrent,
  readHourly: readHourly,
  readBasinForecast: readBasinForecast,
  readArrivalBrief: readArrivalBrief,
  readFishingSpot: readFishingSpot
};

export { Weather };
