# 车象 WeatherOS · 车载气象监测系统

车载场景下的气象监测与出行辅助前端原型。5 个页面、零构建、零运行时依赖，双击 `index.html` 即可离线运行。

> 当前为 **UI 原型阶段**：数据来自 `assets/data/mock.js`，接口为 `assets/api/api.js` 中的 stub，未接真实后端。

## 页面

| 页面 | 入口 | 核心能力 |
|---|---|---|
| 气象看板 | `index.html` | 实时天气、雨量、环境指标，四个功能入口 |
| 高速暴雨辅助 | `rainstorm.html` | 雨量值与等级、辅助开关、按雨量自动调整车速与跟车距离 |
| 露营助手 | `camping.html` | 目的地搜索、到达时段天气、装备与安全建议 |
| 山洪预警 | `flood.html` | 传感器 + 2 小时短临预报双规则、风险评分、预警横幅 |
| 钓鱼窗口 | `fishing.html` | 气压趋势、风速、时段窗口与垂钓建议 |

导航采用「每页内联 App Shell + 纯 CSS 唯一 active 规则」，不依赖 JS 注入，无首屏闪烁；`npm run check` 会校验 5 份 Shell 逐字节一致。

## 目录结构

```text
.
├─ index.html  rainstorm.html  camping.html  flood.html  fishing.html
├─ assets/
│  ├─ css/
│  │  ├─ tokens.css        # 01 设计令牌（仅变量）
│  │  ├─ base.css          # 02 重置 / 排版 / 氛围 / 工具类
│  │  ├─ components.css    # 03 App Shell / 卡片 / 控件 / 反馈 + 响应式
│  │  └─ pages.css         # 04 页面级样式
│  ├─ js/    icons.js  app.js        # 内联 SVG 图标字典、全局引导
│  ├─ api/   api.js                  # 接口 stub（签名即未来真实接口）
│  └─ data/  mock.js                 # 单一数据源 window.DB
├─ pages/    index.js  rainstorm.js  camping.js  flood.js  fishing.js
├─ scripts/  serve.mjs  check.mjs
├─ manifest.webmanifest  icon.svg
└─ .github/workflows/ci.yml
```

## 运行

```bash
npm run serve      # 零依赖静态服务器，默认 http://127.0.0.1:4173
```

或直接双击任一 HTML 文件；也可用任意静态服务器（`python3 -m http.server`）。

## 校验

```bash
npm run check
```

检查项：App Shell 一致性、资源引用有效性、`$('#id')` 是否存在、图标名是否注册、页面与脚本映射、CSS 加载顺序、无内联脚本、无外链。

## 数据契约

- `window.DB`：所有 mock 数据的唯一来源，字段结构见 `assets/data/mock.js`
- `window.Api`：`getDashboard / setRainAssist / planDestination / getFloodStatus / getFishingWindow`，每个函数标注了预期的 HTTP method 与 path，接后端时只替换函数体
- `window.Icons`：`data-icon="name"` 挂载内联 SVG，无 CDN、无字体图标

## 兼容性

面向车载 WebView。已验证语法层面无 `?.` / `??` 等新特性，`async/await` 起步即可运行（Chrome 65+）。

已知样式层风险（仅影响老旧 WebView，Android 10+ 无此问题）：

- flex `gap`：Chrome 84+；Android 7/8 车载 WebView 可能丢失间距
- `color-mix()`：Chrome 111+；失效处为装饰性背景与阴影
- `backdrop-filter`：Chrome 76+；不支持时退化为半透明背景

## 后续规划

1. **构建型迁移**：Vite 多页 + HTML partial（消除 Shell 重复）+ ESM 模块化 + 类型契约
2. **后端接入**：替换 `assets/api/api.js` 的 stub 实现
3. **Android 打包**：Capacitor（`webDir` 指向构建产物），横屏 + 沉浸式 + keep-awake

## 许可

[MIT](LICENSE)
