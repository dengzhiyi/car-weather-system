/* 车象 WeatherOS · 单一 mock 数据源（所有页面共用，保证跨页一致） */
const DB = {
  meta: {
    appName: '车象 WeatherOS',
    version: 'DEMO v0.9',
    updatedAt: '14:32:08'
  },
  vehicle: {
    model: 'EXEED 凌云 · 智驾版',
    acc: true,
    gear: 'D',
    speed: 96,
    speedLimit: 100,
    indoorTemp: 22.5,
    outsideTemp: 24,
    location: 'G60 沪昆高速 · 嘉兴段',
    road: 'G60 沪昆高速',
    direction: '杭州方向',
    link: '5G',
    battery: 82,
    sensorsOnline: 4,
    sensorsTotal: 4
  },
  weather: {
    location: '嘉兴 · 南湖区',
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
      metric: '已规划 · 莫干山', sub: '到达 16:20 · 雷阵雨 18°C',
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
    targetSpeed: 80,
    targetGap: 3.8,
    followMeters: 62,
    followSeconds: 2.3,
    accStatus: 'ACC 已激活',
    laneStatus: '车道保持中',
    response: [
      { level: '小雨', range: '< 2.5 mm/h', speed: '限速值', gap: '2.0 s', index: 0 },
      { level: '中雨', range: '2.5 – 8 mm/h', speed: '−10 km/h', gap: '2.5 s', index: 1 },
      { level: '大雨', range: '8 – 16 mm/h', speed: '−20 km/h', gap: '3.8 s', index: 2 },
      { level: '暴雨', range: '≥ 16 mm/h', speed: '−30 km/h', gap: '4.5 s', index: 3 }
    ],
    events: [
      { time: '14:32:08', title: '雨量传感器 RS-04 采样异常波动', desc: '瞬时值 18.2 mm/h，持续 4 秒后回落', tone: 'warn' },
      { time: '14:21:40', title: '路段降水增强', desc: '雨量由 6.4 mm/h 升至 11.2 mm/h', tone: 'info' },
      { time: '14:05:12', title: '暴雨辅助自检完成', desc: '传感器 / 执行器 / 制动信号均正常', tone: 'ok' },
      { time: '13:48:03', title: '进入降雨路段', desc: 'G60 沪昆高速 K482，能见度下降至 6.2 km', tone: 'info' }
    ]
  },

  /* ---------- 露营助手 ---------- */
  camping: {
    current: {
      name: '当前位置', coord: '30.7466° N, 120.7556° E'
    },
    destinations: [
      {
        id: 'moganshan',
        name: '莫干山云起营地',
        region: '浙江 · 湖州 · 德清',
        distance: '68 km',
        duration: '1 小时 12 分',
        arrival: '16:20',
        temp: 18,
        condition: '雷阵雨',
        icon: 'cloud-lightning',
        rainChance: 80,
        wind: '东南风 15 km/h',
        pressure: 1006,
        visibility: '4.0 km',
        comfort: 58,
        comfortText: '一般 · 注意防雨',
        comfortNote: '降雨影响体感，建议延后扎营或选择有遮蔽的营位。',
        safetyTitle: '雷雨 · 阵风 5 级',
        safetyText: '避开孤立大树与溪谷低洼营位；雷暴期间停止使用金属杆帐。',
        note: '到达前 1 小时有雷阵雨，营地地面湿滑，建议延后扎营或选择有遮蔽的营位。',
        hourly: [
          { time: '14:00', temp: 22, icon: 'cloud-sun', rain: 30 },
          { time: '15:00', temp: 20, icon: 'cloud-rain', rain: 65 },
          { time: '16:20', temp: 18, icon: 'cloud-lightning', rain: 80 }
        ],
        gear: ['防雨外帐 / 天幕', '加长地钉与风绳', '营地照明与防水袋']
      },
      {
        id: 'anji',
        name: '安吉竹海营地',
        region: '浙江 · 湖州 · 安吉',
        distance: '112 km',
        duration: '1 小时 48 分',
        arrival: '16:56',
        temp: 20,
        condition: '中雨',
        icon: 'cloud-rain',
        rainChance: 70,
        wind: '东风 12 km/h',
        pressure: 1007,
        visibility: '5.0 km',
        comfort: 64,
        comfortText: '尚可 · 建议防潮',
        comfortNote: '竹林湿度偏高，建议使用防潮垫并选择排水良好的高处营位。',
        safetyTitle: '中雨 · 阵风 4 级',
        safetyText: '竹林路段湿滑，避免在陡坡下方扎营；夜间注意落枝。',
        note: '竹海路段有短时中雨，营地排水良好，建议携带防潮垫并优先选择高处营位。',
        hourly: [
          { time: '15:00', temp: 21, icon: 'cloud', rain: 45 },
          { time: '16:00', temp: 20, icon: 'cloud-rain', rain: 68 },
          { time: '17:00', temp: 19, icon: 'cloud-rain', rain: 70 }
        ],
        gear: ['防潮垫 / 铝膜地席', '轻量雨衣', '驱蚊与除湿用品']
      },
      {
        id: 'qiandao',
        name: '千岛湖姜家湾营地',
        region: '浙江 · 杭州 · 淳安',
        distance: '158 km',
        duration: '2 小时 05 分',
        arrival: '17:13',
        temp: 23,
        condition: '阴',
        icon: 'cloud',
        rainChance: 35,
        wind: '东南风 9 km/h',
        pressure: 1011,
        visibility: '8.0 km',
        comfort: 78,
        comfortText: '舒适 · 适合扎营',
        comfortNote: '湖面风力平稳、降水概率低，日落前完成扎营较为舒适。',
        safetyTitle: '阴 · 风浪平稳',
        safetyText: '水边营地注意夜间水位变化，儿童需全程看护。',
        note: '到达时降水概率较低，湖面风力平稳，适合水边营地，日落 17:24 前完成扎营。',
        hourly: [
          { time: '15:00', temp: 24, icon: 'cloud-sun', rain: 20 },
          { time: '16:00', temp: 24, icon: 'cloud', rain: 30 },
          { time: '17:10', temp: 23, icon: 'cloud', rain: 35 }
        ],
        gear: ['湖风防风绳', '夜间保暖睡袋', '驱蚊灯与垃圾袋']
      }
    ]
  },

  /* ---------- 山洪预警 ---------- */
  flood: {
    destination: {
      id: 'houwu',
      name: '莫干山 · 后坞溪谷',
      coord: '30.6338° N, 119.8682° E',
      distance: '68 km',
      terrain: '沟谷汇水区',
      elevation: '420 m',
      response: '18 min',
      camps: '3 处营地'
    },
    modes: {
      normal: {
        riskScore: 34,
        level: '低风险',
        levelEn: 'LOW RISK',
        sensorRate: 12.6,
        sensorLevel: '大雨',
        forecast: [2, 4, 7, 9],
        forecastPeak: 9,
        summary: '当前流域降水平稳，传感器与预报均未达到预警阈值。',
        update: '14:32:08',
        rules: [
          { id: 'rule1', name: '雨量传感器 > 暴雨阈值', detail: '当前 12.6 mm/h / 阈值 50 mm/h', hit: false },
          { id: 'rule2', name: '未来 2 小时暴雨预报', detail: '预计 2h 累计 9 mm / 阈值 50 mm', hit: false }
        ]
      },
      alert: {
        riskScore: 88,
        level: '高风险',
        levelEn: 'HIGH RISK',
        sensorRate: 52.4,
        sensorLevel: '暴雨',
        forecast: [18, 32, 46, 68],
        forecastPeak: 68,
        summary: '雨量传感器已超暴雨阈值，且未来 2 小时流域累计降水 68 mm，触发双规则预警。',
        update: '14:36:20',
        rules: [
          { id: 'rule1', name: '雨量传感器 > 暴雨阈值', detail: '当前 52.4 mm/h / 阈值 50 mm/h', hit: true },
          { id: 'rule2', name: '未来 2 小时暴雨预报', detail: '预计 2h 累计 68 mm / 阈值 50 mm', hit: true }
        ]
      }
    },
    notify: [
      { id: 'voice', name: '车机语音播报', desc: '预警触发时车内语音提示', on: true },
      { id: 'phone', name: '手机推送', desc: '同步至车主手机端', on: true },
      { id: 'horn', name: '鸣笛警示', desc: '紧急预警时短鸣一声', on: false }
    ],
    history: [
      { time: '10月18日 14:36', level: '橙色', name: '后坞溪谷短时强降雨', detail: '2h 累计 58 mm，已解除' },
      { time: '10月12日 16:02', level: '黄色', name: '莫干山流域降雨预警', detail: '传感器 31.2 mm/h，已解除' },
      { time: '09月27日 09:14', level: '黄色', name: '上游水库泄洪提示', detail: '溪谷水位上涨 0.6 m' }
    ]
  },

  /* ---------- 钓鱼窗口 ---------- */
  fishing: {
    spots: [
      {
        id: 'jiangjia',
        name: '姜家湾',
        region: '千岛湖 · 西南湖湾',
        score: 82,
        rating: '适宜垂钓',
        bestWindow: '17:00 – 19:00',
        pressure: 1012,
        pressureTrend: '+3.2 hPa / 24h',
        pressureState: '持续回升',
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
          { icon: 'target', title: '钓位选择', text: '优先选择西南岸浅滩回水湾，水深 1.6 – 2.4 m，避开主航道与游船码头。' },
          { icon: 'droplets', title: '饵料与钓法', text: '气压回升阶段鱼口偏活跃，建议腥香搭配，路亚可试缓沉米诺；手竿用 4.5 m 竿。' },
          { icon: 'alert-triangle', title: '安全提醒', text: '14:00 后风力增大至 5 级，湖面阵风明显，建议 15:30 前收竿或转移至背风湾。' }
        ]
      },
      {
        id: 'jieshou',
        name: '界首湾',
        region: '千岛湖 · 北岸湾区',
        score: 74,
        rating: '较为适宜',
        bestWindow: '05:00 – 07:00',
        pressure: 1009,
        pressureTrend: '+0.4 hPa / 24h',
        pressureState: '基本稳定',
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
          { icon: 'target', title: '钓位选择', text: '北岸湾内缓流区更适合守钓，建议避开东侧迎风岸线与新建栈道。' },
          { icon: 'droplets', title: '饵料与钓法', text: '阴天光照弱，鱼群偏中层，建议使用轻麸拉饵，适当延长逗钓间隔。' },
          { icon: 'alert-triangle', title: '安全提醒', text: '午后阵风可达 6 级，水面风浪明显，不建议使用高架竿与船钓。' }
        ]
      },
      {
        id: 'zitong',
        name: '梓桐溪',
        region: '千岛湖 · 上游溪流',
        score: 63,
        rating: '谨慎出钓',
        bestWindow: '06:00 – 08:00',
        pressure: 1004,
        pressureTrend: '-2.6 hPa / 24h',
        pressureState: '缓慢下降',
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
          { icon: 'target', title: '钓位选择', text: '仅在溪流下游缓水段短时作钓，远离陡岸与滚石区，勿在河道中央停留。' },
          { icon: 'droplets', title: '饵料与钓法', text: '气压持续下降鱼口偏弱，建议小钩细线、轻饵慢逗，降低抛竿频率。' },
          { icon: 'alert-triangle', title: '安全提醒', text: '流域有短时降雨，溪水存在上涨风险；如水位快速上升请立即撤离并关注山洪预警。' }
        ]
      }
    ]
  }
};

export { DB };
