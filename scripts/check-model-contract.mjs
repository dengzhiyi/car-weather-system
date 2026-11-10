#!/usr/bin/env node
/**
 * 校验前端镜像的模型契约是否与模型仓库生成物一致。
 *
 *   npm run check:contract
 *   MODEL_CONTRACT=/path/to/contract.json npm run check:contract
 *
 * 模型仓库未检出到同级目录时跳过（退出码 0），便于独立构建。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localPath = resolve(root, 'src/config/model-contract.json');
const modelPath = process.env.MODEL_CONTRACT
  || resolve(root, '../car_weather_model/contract.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce(function (out, key) {
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}

if (!existsSync(modelPath)) {
  console.log('[contract] skip: model contract not found at ' + modelPath);
  process.exit(0);
}

const local = stable(readJson(localPath));
const model = stable(readJson(modelPath));
if (JSON.stringify(local) !== JSON.stringify(model)) {
  console.error('[contract] drift detected: ' + localPath + ' != ' + modelPath);
  Array.from(new Set(Object.keys(local).concat(Object.keys(model)))).forEach(function (key) {
    if (JSON.stringify(local[key]) !== JSON.stringify(model[key])) {
      console.error('  - ' + key);
    }
  });
  process.exit(1);
}

console.log('[contract] ok: ' + local.schemaVersion);
