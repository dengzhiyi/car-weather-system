/* 气象环境助手 · 单一 mock 数据源（所有页面共用，保证跨页一致）
   默认地点为深圳坪山比亚迪总部，其余目的地均以其为参考。 */
const DB = {
  meta: {
    appName: '气象环境助手',
    version: 'v1.0',
    updatedAt: '14:32:08'
  },
  vehicle: {
    model: '比亚迪 汉 EV · 智驾版',
    acc: true,
    gear: 'D',
    speed: 96,
    speedLimit: 100,
    indoorTemp: 22.5,
    outsideTemp: 24,
    location: '深圳 · 坪山 · 比亚迪总部',
    road: '坪山大道',
    direction: '总部方向',
    link: '5G',
    battery: 82,
    sensorsOnline: 4,
    sensorsTotal: 4
  },
  weather: {
    location: '深圳 · 坪山',
    temp: 24,
    feels: 26,
    high: 29,
    low: 21,
    condition: '多云转雷阵雨',
    icon: 'cloud-lightning',
    rainChance: 78,
    humidity: 78,
    visibility: 6.2,
    wind: '东南风 3 级',
    windSpeed: 12,
    pressure: 1008,
    pressureTrend: -1.8,
    sunrise: '06:12',
    sunset: '17:24'
  },
  rain: {
    sensorId: 'RS-04',
    rate: 12.6,
    level: '大雨',
    levelIndex: 2,
    cumulative: 18.4,
    delta10m: 3.2,
    sampleRate: '1 Hz',
    status: '在线',
    thresholds: [
      { name: '小雨', min: 0, max: 2.5 },
      { name: '中雨', min: 2.5, max: 8 },
      { name: '大雨', min: 8, max: 16 },
      { name: '暴雨', min: 16, max: null }
    ],
    /* 近 30 分钟，每 75 秒一个采样 */
    history30m: [2.1, 2.4, 2.2, 2.8, 3.1, 3.4, 3.9, 4.2, 4.8, 5.1, 5.6, 6.2,
      6.8, 7.1, 7.6, 8.4, 9.1, 9.8, 10.4, 11.1, 11.8, 12.2, 12.5, 12.6],
    /* 近 60 分钟，每 5 分钟一个采样 */
    history60m: [0.4, 0.8, 1.2, 1.9, 2.6, 3.4, 4.1, 5.3, 6.4, 7.8, 9.6, 11.2, 12.6]
  },
  forecast2h: [
    { time: '14:30', label: '现在', temp: 24, icon: 'cloud-sun', rain: 30, wind: 12 },
    { time: '15:00', label: '30 分钟后', temp: 24, icon: 'cloud', rain: 55, wind: 15 },
    { time: '15:30', label: '1 小时后', temp: 23, icon: 'cloud-rain', rain: 78, wind: 19 },
    { time: '16:00', label: '1.5 小时后', temp: 22, icon: 'cloud-lightning', rain: 90, wind: 26 }
  ],
  features: [
    {
      id: 'rainstorm', no: '01', name: '高速暴雨辅助', href: 'rainstorm.html',
      metric: '待命 · 未开启', sub: '雨量 12.6 mm/h · 未触发辅助',
      status: '准备就绪', tone: 'info', icon: 'cloud-rain'
    },
    {
      id: 'camping', no: '02', name: '露营助手', href: 'camping.html',
      metric: '已规划 · 大鹏半岛', sub: '到达 16:15 · 雷阵雨 24°C',
      status: '高德已同步', tone: 'ok', icon: 'tent'
    },
    {
      id: 'flood', no: '03', name: '山洪预警', href: 'flood.html',
      metric: '低风险', sub: '目的地 2h 降水 9 mm',
      status: '持续监测', tone: 'ok', icon: 'mountain'
    },
    {
      id: 'fishing', no: '04', name: '钓鱼窗口', href: 'fishing.html',
      metric: '82 分 · 适宜', sub: '气压回升 · 东南风 3 级',
      status: '窗口 17:00', tone: 'warn', icon: 'fish'
    }
  ],

  /* ---------- 高速暴雨辅助 ---------- */
  rainstorm: {
    accStatus: 'ACC 已激活',
    laneStatus: '车道保持中',
    events: [
      { time: '14:32:08', title: '雨量传感器 RS-04 采样异常波动', desc: '瞬时值 18.2 mm/h，持续 4 秒后回落', tone: 'warn' },
      { time: '14:21:40', title: '路段降水增强', desc: '雨量由 6.4 mm/h 升至 11.2 mm/h', tone: 'info' },
      { time: '14:05:12', title: '暴雨辅助自检完成', desc: '传感器 / 执行器 / 制动信号均正常', tone: 'ok' },
      { time: '13:48:03', title: '进入降雨路段', desc: '深汕高速 K18，能见度下降至 6.2 km', tone: 'info' }
    ]
  },

  /* ---------- 露营助手 ---------- */
  camping: {
    current: {
      name: '当前位置', coord: '22.6808° N, 114.3558° E'
    },
    destinations: [
      {
        id: 'xichong',
        name: '大鹏半岛西涌营地',
        region: '深圳 · 大鹏新区',
        distance: '58 km',
        duration: '1 小时 05 分',
        arrival: '16:15',
        temp: 24,
        condition: '雷阵雨',
        icon: 'cloud-lightning',
        rainChance: 78,
        wind: '东南风 18 km/h',
        pressure: 1011,
        visibility: '4.5 km',
        comfort: 60,
        comfortText: '一般 · 注意防雨',
        comfortNote: '降雨影响体感，建议延后扎营或选择有遮蔽的营位。',
        safetyTitle: '雷雨 · 阵风 5 级',
        safetyText: '海滨营地避开沙滩低洼处与孤立大树；雷暴期间停止使用金属杆帐。',
        note: '到达前 1 小时有雷阵雨，营地地面湿滑，建议延后扎营或选择有遮蔽的营位。',
        hourly: [
          { time: '15:00', temp: 26, icon: 'cloud-sun', rain: 30 },
          { time: '16:00', temp: 25, icon: 'cloud-rain', rain: 62 },
          { time: '16:15', temp: 24, icon: 'cloud-lightning', rain: 78 }
        ],
        gear: ['防雨外帐 / 天幕', '加长地钉与风绳', '营地照明与防水袋']
      },
      {
        id: 'malun',
        name: '马峦山溪谷营地',
        region: '深圳 · 坪山区',
        distance: '18 km',
        duration: '32 分',
        arrival: '15:42',
        temp: 25,
        condition: '中雨',
        icon: 'cloud-rain',
        rainChance: 65,
        wind: '东风 12 km/h',
        pressure: 1011,
        visibility: '5.5 km',
        comfort: 66,
        comfortText: '尚可 · 建议防潮',
        comfortNote: '溪谷湿度偏高，建议使用防潮垫并选择排水良好的高处营位。',
        safetyTitle: '中雨 · 阵风 4 级',
        safetyText: '溪谷路段湿滑，避免在陡坡下方与河床扎营；夜间注意落石。',
        note: '溪谷路段有短时中雨，营地排水良好，建议携带防潮垫并优先选择高处营位。',
        hourly: [
          { time: '15:00', temp: 26, icon: 'cloud', rain: 45 },
          { time: '15:40', temp: 25, icon: 'cloud-rain', rain: 62 },
          { time: '16:30', temp: 25, icon: 'cloud-rain', rain: 65 }
        ],
        gear: ['防潮垫 / 铝膜地席', '轻量雨衣', '驱蚊与除湿用品']
      },
      {
        id: 'xianhu',
        name: '梧桐山仙湖营地',
        region: '深圳 · 罗湖区',
        distance: '26 km',
        duration: '44 分',
        arrival: '15:54',
        temp: 26,
        condition: '阴',
        icon: 'cloud',
        rainChance: 35,
        wind: '东南风 9 km/h',
        pressure: 1012,
        visibility: '8.0 km',
        comfort: 80,
        comfortText: '舒适 · 适合扎营',
        comfortNote: '山脚风力平稳、降水概率低，日落前完成扎营较为舒适。',
        safetyTitle: '阴 · 风浪平稳',
        safetyText: '山脚营地注意夜间湿气，遵守园区用火与露营规定。',
        note: '到达时降水概率较低，风力平稳，适合营地扎营，日落 17:24 前完成扎营。',
        hourly: [
          { time: '15:00', temp: 27, icon: 'cloud-sun', rain: 20 },
          { time: '16:00', temp: 26, icon: 'cloud', rain: 30 },
          { time: '17:00', temp: 26, icon: 'cloud', rain: 35 }
        ],
        gear: ['防潮地席', '夜间保暖睡袋', '驱蚊与照明']
      }
    ]
  },

  /* ---------- 山洪预警 ---------- */
  flood: {
    destination: {
      id: 'qiniang',
      name: '深圳 · 七娘山溪谷',
      coord: '22.5388° N, 114.5286° E',
      distance: '34 km',
      terrain: '沟谷汇水区',
      elevation: '620 m',
      response: '14 min',
      camps: '2 处营地'
    },
    /* 流域阈值：瞬时面雨量 / 2h 累计雨量（mm），与高速雨量等级阈值不同口径 */
    thresholds: { stormRate: 50, forecastMm: 50 },
    modes: {
      normal: {
        sensorRate: 12.6,
        forecast: [2, 4, 7, 9],
        update: '14:32:08'
      },
      alert: {
        sensorRate: 52.4,
        forecast: [18, 32, 46, 68],
        update: '14:36:20'
      }
    },
    notify: [
      { id: 'voice', name: '车机语音播报', desc: '预警触发时车内语音提示', on: true },
      { id: 'phone', name: '手机推送', desc: '同步至车主手机端', on: true },
      { id: 'horn', name: '鸣笛警示', desc: '紧急预警时短鸣一声', on: false }
    ],
    history: [
      { time: '10月18日 14:36', level: '橙色', name: '七娘山溪谷短时强降雨', detail: '2h 累计 58 mm，已解除' },
      { time: '10月12日 16:02', level: '黄色', name: '七娘山流域降雨预警', detail: '传感器 31.2 mm/h，已解除' },
      { time: '09月27日 09:14', level: '黄色', name: '上游水库泄洪提示', detail: '溪谷水位上涨 0.6 m' }
    ]
  },

  /* ---------- 钓鱼窗口 ---------- */
  fishing: {
    spots: [
      {
        id: 'jiangjia',
        name: '坝光湾',
        region: '深圳 · 大鹏新区 · 海域',
        bestWindow: '17:00 – 19:00',
        pressure: 1012,
        pressureTrend: 3.2,
        pressureHistory: [1005, 1006, 1006, 1007, 1008, 1009, 1009, 1010, 1011, 1011, 1012, 1012],
        windSpeed: 3.2,
        windDir: '东南风',
        windLevel: '3 级',
        gust: 5.4,
        temp: 22,
        waterTemp: '19°C',
        cloud: '多云',
        windows: [
          { time: '05:00 – 07:00', rating: '优', score: 88, note: '晨间气压稳定' },
          { time: '07:00 – 10:00', rating: '良', score: 74, note: '浅滩回水湾' },
          { time: '11:00 – 14:00', rating: '一般', score: 52, note: '光照增强' },
          { time: '14:00 – 16:00', rating: '较差', score: 34, note: '风力升至 5 级' },
          { time: '17:00 – 19:00', rating: '优', score: 91, note: '日落前鱼口活跃' },
          { time: '19:00 – 21:00', rating: '良', score: 70, note: '夜钓需注意安全' }
        ],
        advice: [
          { icon: 'target', title: '钓位选择', text: '优先选择坝光湾内湾浅滩回水区，水深 2 – 4 m，避开主航道与养殖区。' },
          { icon: 'droplets', title: '饵料与钓法', text: '气压回升阶段鱼口偏活跃，建议腥香搭配，路亚可试缓沉米诺；矶钓用 4.5 m 竿。' },
          { icon: 'alert-triangle', title: '安全提醒', text: '14:00 后风力增大至 5 级，海面阵风明显，建议 15:30 前收竿或转移至背风湾。' }
        ]
      },
      {
        id: 'jieshou',
        name: '深圳湾',
        region: '深圳 · 南山 · 湾区',
        bestWindow: '05:00 – 07:00',
        pressure: 1009,
        pressureTrend: 0.4,
        pressureHistory: [1008, 1008, 1009, 1009, 1008, 1009, 1009, 1010, 1009, 1009, 1009, 1009],
        windSpeed: 4.1,
        windDir: '偏东风',
        windLevel: '3 级',
        gust: 6.2,
        temp: 21,
        waterTemp: '18°C',
        cloud: '阴',
        windows: [
          { time: '05:00 – 07:00', rating: '优', score: 86, note: '晨间无风' },
          { time: '07:00 – 10:00', rating: '良', score: 72, note: '缓流区适合作钓' },
          { time: '11:00 – 14:00', rating: '一般', score: 55, note: '风向多变' },
          { time: '14:00 – 16:00', rating: '较差', score: 38, note: '阵风 6 级' },
          { time: '17:00 – 19:00', rating: '良', score: 68, note: '傍晚窗口一般' },
          { time: '19:00 – 21:00', rating: '一般', score: 50, note: '夜钓风浪偏大' }
        ],
        advice: [
          { icon: 'target', title: '钓位选择', text: '湾区西侧缓流区更适合守钓，建议避开东侧迎风岸线与航道标。' },
          { icon: 'droplets', title: '饵料与钓法', text: '阴天光照弱，鱼群偏中层，建议使用轻麸拉饵，适当延长逗钓间隔。' },
          { icon: 'alert-triangle', title: '安全提醒', text: '午后阵风可达 6 级，水面风浪明显，不建议使用高架竿与船钓。' }
        ]
      },
      {
        id: 'zitong',
        name: '茅洲河',
        region: '深圳 · 宝安 · 下游河段',
        bestWindow: '06:00 – 08:00',
        pressure: 1004,
        pressureTrend: -2.6,
        pressureHistory: [1011, 1010, 1010, 1009, 1008, 1008, 1007, 1006, 1006, 1005, 1005, 1004],
        windSpeed: 2.1,
        windDir: '偏北风',
        windLevel: '2 级',
        gust: 3.4,
        temp: 20,
        waterTemp: '17°C',
        cloud: '小雨',
        windows: [
          { time: '05:00 – 07:00', rating: '良', score: 72, note: '小雨前窗口' },
          { time: '07:00 – 10:00', rating: '一般', score: 58, note: '气压走低' },
          { time: '11:00 – 14:00', rating: '较差', score: 42, note: '鱼口转弱' },
          { time: '14:00 – 16:00', rating: '较差', score: 36, note: '溪水上涨' },
          { time: '17:00 – 19:00', rating: '一般', score: 48, note: '小雨持续' },
          { time: '19:00 – 21:00', rating: '不建议', score: 28, note: '夜间水位上涨' }
        ],
        advice: [
          { icon: 'target', title: '钓位选择', text: '仅在下游缓水段短时作钓，远离陡岸与闸口，勿在河道中央停留。' },
          { icon: 'droplets', title: '饵料与钓法', text: '气压持续下降鱼口偏弱，建议小钩细线、轻饵慢逗，降低抛竿频率。' },
          { icon: 'alert-triangle', title: '安全提醒', text: '流域有短时降雨，溪水存在上涨风险；如水位快速上升请立即撤离并关注山洪预警。' }
        ]
      }
    ]
  }
};

export { DB };
