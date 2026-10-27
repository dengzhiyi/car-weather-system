/**
 * 构建产物自检：npm run check:dist（需先 npm run build）
 * 校验 dist 中 5 个页面的 Shell 一致性、资源有效性与 CSP 合规。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const read = (p) => readFileSync(join(DIST, p), 'utf8');
const has = (p) => existsSync(join(DIST, p));

const PAGES = [
  { file: 'index.html', page: 'home' },
  { file: 'rainstorm.html', page: 'rainstorm' },
  { file: 'camping.html', page: 'camping' },
  { file: 'flood.html', page: 'flood' },
  { file: 'fishing.html', page: 'fishing' },
];

const results = [];
const add = (name, fails) => results.push({ name, fails });

const shellOf = (html) => {
  const rail = html.match(/<aside class="rail">[\s\S]*?<\/aside>/);
  const top = html.match(/<header class="topbar">[\s\S]*?<\/header>/);
  return rail && top ? rail[0] + top[0] : null;
};

if (!has('index.html')) {
  console.log('dist 不存在，请先执行 npm run build');
  process.exit(1);
}

add('产物页面齐全', () => PAGES.filter((p) => !has(p.file)).map((p) => `缺少 ${p.file}`));

add('Shell 一致性', () => {
  const base = shellOf(read(PAGES[0].file));
  if (!base) return ['index.html 缺少 rail / topbar'];
  if (/@include/.test(base)) return ['Shell 片段未被注入（残留 @include）'];
  return PAGES.slice(1).filter((p) => shellOf(read(p.file)) !== base).map((p) => `${p.file} Shell 不一致`);
});

add('页面标识', () =>
  PAGES.filter((p) => !read(p.file).includes(`<body data-page="${p.page}">`)).map((p) => `${p.file} data-page 错误`)
);

add('资源引用有效性', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    const refs = [...html.matchAll(/(?:href|src)="([^"#:]+?\.(?:html|css|js|svg|webmanifest))"/g)].map((m) => m[1]);
    for (const r of refs) {
      const clean = r.replace(/^\.\//, '');
      if (!has(clean)) fails.push(`${p.file} 引用不存在：${r}`);
    }
  }
  return fails;
});

add('CSP 与无外部资源', () => {
  const fails = [];
  for (const p of PAGES) {
    const html = read(p.file);
    if (!/http-equiv="Content-Security-Policy"/.test(html)) fails.push(`${p.file} 缺少 CSP`);
    if (/<script(?![^>]*\bsrc=)/i.test(html)) fails.push(`${p.file} 含内联脚本`);
    for (const m of html.matchAll(/(?:href|src)="((?:https?:)?\/\/[^"]+)"/g)) {
      fails.push(`${p.file} 含外部资源：${m[1]}`);
    }
  }
  return fails;
});

add('样式与脚本产物', () => {
  const fails = [];
  const assets = './assets';
  if (!has(assets.replace('./', ''))) return ['缺少 assets 目录'];
  for (const p of PAGES) {
    const html = read(p.file);
    if (!/<link rel="stylesheet" href="\.\/assets\/[^"]+\.css">/.test(html)) fails.push(`${p.file} 未引入样式产物`);
    if (!/<script type="module" (?:crossorigin )?src="\.\/assets\/[^"]+\.js">/.test(html)) {
      fails.push(`${p.file} 未引入脚本产物`);
    }
  }
  return fails;
});

let failed = 0;
for (const { name, fails } of results) {
  if (!fails.length) console.log(`  ✓ ${name}`);
  else {
    failed += fails.length;
    console.log(`  ✗ ${name}`);
    for (const f of fails) console.log(`      - ${f}`);
  }
}

console.log('');
if (failed) {
  console.log(`产物检查未通过：${failed} 项问题`);
  process.exit(1);
}
console.log(`产物检查通过：${results.length} 组 / ${PAGES.length} 个页面`);
