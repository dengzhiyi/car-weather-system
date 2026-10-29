/**
 * 高德地图适配层
 * 归一化目的地检索与路线规划，只返回地理信息（名称 / 坐标 / 距离 / 时长 / 预计到达）。
 * 不包含天气、舒适度、露营建议等非地图数据（由 weather 适配层提供）。
 * TODO: 接入高德 Web 服务 API（place/text + direction/driving）或车机端 SDK。
 */
import { DB } from '../data/mock.js';

/**
 * 目的地检索
 * @param {string} query 用户输入的关键词（空串返回首个候选）
 * @returns {Promise<{id:string,name:string,region:string,coord:string,lat:number,lng:number}|null>}
 */
async function searchDestination(query) {
  const q = String(query || '').trim().toLowerCase();
  const dest = DB.camping.destinations.find(function (d) {
    return !q || d.name.toLowerCase().indexOf(q) > -1 || d.region.toLowerCase().indexOf(q) > -1;
  });
  if (!dest) return null;
  return {
    id: dest.id,
    name: dest.name,
    region: dest.region,
    coord: dest.coord || null,
    /* WGS-84 原始坐标，上图前由 maps/geo.js 转 GCJ-02 */
    lat: dest.lat,
    lng: dest.lng
  };
}

/**
 * 驾车路线规划
 * @param {object} dest searchDestination 的返回值
 * @returns {Promise<{distance:string,duration:string,arrival:string,provider:string}>}
 */
async function planRoute(dest) {
  const record = DB.camping.destinations.find(function (d) {
    return d.id === dest.id;
  });
  if (!record) return null;
  return {
    distance: record.distance,
    duration: record.duration,
    arrival: record.arrival,
    provider: '高德地图'
  };
}

const Amap = {
  searchDestination: searchDestination,
  planRoute: planRoute
};

export { Amap };
