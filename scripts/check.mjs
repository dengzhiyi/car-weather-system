/**
 * 静态自检：npm run check
 * 只读源码，不启动浏览器。任一项失败则退出码为 1。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const has = (p) => existsSync(join(ROOT, p));

const PAGES = [
  { file: 'index.html', page: 'home', script: 'pages/index.js' },
  { file: 'rainstorm.html', page: 'rainstorm', script: 'pages/rainstorm.js' },
  { file: 'camping.html', page: 'camping', script: 'pages/camping.js' },
  { file: 'flood.html', page: 'flood', script: 'pages/flood.js' },
  { file: 'fishing.html', page: 'fishing', script: 'pages/fishing.js' },
];

const CSS_ORDER = [
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/components.css',
  'assets/css/pages.css',
];

/* 由 app.js 运行时创建，不存在于 HTML 中 */
const DYNAMIC_IDS = new Set(['toast-root']);
const NAV_KEYS = ['home', 'rainstorm', 'camping', 'flood', 'fishing'];

const results = [];
const add = (name, fails) => results.push({ name, fails });

const shellOf = (html) => {
  const rail = html.match(/<aside class="rail">[\s\S]*?<\/aside>/);
  const top = html.match(/<header class="topbar">[\s\S]*?<\/header>/);
  return rail && top ? rail[0] + top[0] : null;
};

/* 1. App Shell 逐字节一致 */
add('App Shell 一致性', () => {
  const base = shellOf(read(PAGES[0].file));
  if (!base) return ['index.html 未找到 rail / topbar 结构'];
  return PAGES.slice(1)
    .filter((p) => shellOf(read(p.file)) !== base)
    .map((p) => `${p.file} 的 Shell 与 index.html 不一致`);
});

/* 2. 文档头元信息 + CSS 顺序 */
add('文档头与 CSS 顺序', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    const required = [
      ['字符集', /<meta charset="UTF-8">/],
      ['视口', /name="viewport"/],
      ['主题色', /name="theme-color"/],
      ['CSP', /Content-Security-Policy/],
      ['图标', /rel="icon" href="icon\.svg"/],
      ['清单', /rel="manifest" href="manifest\.webmanifest"/],
      ['无脚本提示', /<noscript>/],
    ];
    for (const [label, re] of required) {
      if (!re.test(html)) fails.push(`${p.file} 缺少${label}`);
    }
    let last = -1;
    for (const css of CSS_ORDER) {
      const at = html.indexOf(`href="${css}"`);
      if (at === -1) fails.push(`${p.file} 未引入 ${css}`);
      else if (at < last) fails.push(`${p.file} 的 CSS 加载顺序错误（${css}）`);
      else last = at;
    }
  }
  return fails;
});

/* 3. body 页面标识 + 导航项 */
add('页面标识与导航', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    if (!html.includes(`<body data-page="${p.page}">`)) {
      fails.push(`${p.file} 的 body data-page 应为 "${p.page}"`);
    }
    const navs = [...html.matchAll(/data-nav="([\w-]+)"/g)].map((m) => m[1]);
    if (navs.length !== NAV_KEYS.length) {
      fails.push(`${p.file} 导航项数量为 ${navs.length}，应为 ${NAV_KEYS.length}`);
    }
    if (!navs.includes(p.page)) {
      fails.push(`${p.file} 导航中缺少当前页 ${p.page}`);
    }
  }
  return fails;
});

/* 4. 资源引用有效 */
add('资源引用有效性', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    const refs = [...html.matchAll(/(?:href|src)="([^"#:]+?\.(?:html|css|js|svg|webmanifest))"/g)]
      .map((m) => m[1]);
    for (const r of refs) if (!has(r)) fails.push(`${p.file} 引用了不存在的文件：${r}`);
  }
  return fails;
});

/* 5. 脚本加载顺序 */
add('脚本加载顺序', () => {
  const fails = [];
  const order = [
    'assets/js/icons.js',
    'assets/data/mock.js',
    'assets/api/api.js',
    'assets/js/app.js',
  ];
  for (const p of PAGES) {
    const html = read(p.file);
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
    const expected = [...order, p.script];
    if (scripts.join('|') !== expected.join('|')) {
      fails.push(`${p.file} 脚本顺序应为 ${expected.join(' → ')}，实际为 ${scripts.join(' → ')}`);
    }
    if (!has(p.script)) fails.push(`${p.file} 对应的脚本不存在：${p.script}`);
  }
  return fails;
});

/* 6. 脚本引用的 DOM id 必须存在 */
add('DOM id 引用', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    const sources = [read('assets/js/app.js'), read(p.script)];
    const ids = new Set();
    for (const src of sources) {
      for (const m of src.matchAll(/\$\('#([\w-]+)'\)/g)) ids.add(m[1]);
    }
    for (const id of ids) {
      if (DYNAMIC_IDS.has(id)) continue;
      if (!html.includes(`id="${id}"`)) fails.push(`${p.file} 缺少脚本引用的 #${id}`);
    }
  }
  return fails;
});

/* 7. 图标名均已注册 */
add('图标注册', () => {
  const src = read('assets/js/icons.js');
  const registered = new Set([...src.matchAll(/'?([a-z0-9-]+)'?:\s*'/g)].map((m) => m[1]));
  const used = new Set();
  const files = [...PAGES.map((p) => p.file), 'assets/js/app.js', ...PAGES.map((p) => p.script)];
  for (const f of files) {
    const text = read(f);
    for (const m of text.matchAll(/data-icon="([a-z0-9-]+)"/g)) used.add(m[1]);
  }
  return [...used].filter((n) => !registered.has(n)).map((n) => `图标未注册：${n}`);
});

/* 8. CSP 前置条件：无内联脚本、无外部资源 */
add('CSP 前置条件', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    if (/<script(?![^>]*\bsrc=)/i.test(html)) fails.push(`${p.file} 含内联脚本，违反 CSP`);
    for (const m of html.matchAll(/(?:href|src)="((?:https?:)?\/\/[^"]+)"/g)) {
      fails.push(`${p.file} 含外部资源：${m[1]}`);
    }
  }
  return fails;
});

/* 9. Web App Manifest */
add('Web App Manifest', () => {
  const fails = [];
  if (!has('manifest.webmanifest')) return ['缺少 manifest.webmanifest'];
  let m;
  try {
    m = JSON.parse(read('manifest.webmanifest'));
  } catch {
    return ['manifest.webmanifest 不是合法 JSON'];
  }
  for (const key of ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons']) {
    if (!m[key]) fails.push(`manifest 缺少字段：${key}`);
  }
  for (const icon of m.icons || []) {
    if (!has(icon.src)) fails.push(`manifest 引用的图标不存在：${icon.src}`);
  }
  return fails;
});

/* ---------- 输出 ---------- */
let failed = 0;
for (const { name, fails } of results) {
  if (fails.length === 0) {
    console.log(`  ✓ ${name}`);
  } else {
    failed += fails.length;
    console.log(`  ✗ ${name}`);
    for (const f of fails) console.log(`      - ${f}`);
  }
}

console.log('');
if (failed) {
  console.log(`检查未通过：${failed} 项问题`);
  process.exit(1);
}
console.log(`检查通过：${results.length} 组 / ${PAGES.length} 个页面`);
