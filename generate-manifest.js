#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'cabinvoice pro');
const OUT_FILE = path.join(BASE_DIR, 'manifest.json');
const AUDIO_EXT = /\.(wav|mp3|m4a)$/i;

// 대상 폴더 (순서 고정)
const FOLDERS = [
  '한국어(남)', '한국어(여)',
  '영어(남)',   '영어(여)',
  '일본어(남)', '일본어(여)',
  '중국어(남)', '중국어(여)',
];

const manifest = {};

for (const folder of FOLDERS) {
  const dir = path.join(BASE_DIR, folder);
  if (!fs.existsSync(dir)) {
    console.warn(`[skip] 폴더 없음: ${folder}`);
    continue;
  }
  const files = fs.readdirSync(dir)
    .filter(f => AUDIO_EXT.test(f))
    .sort();
  manifest[folder] = files;
  console.log(`[ok] ${folder}: ${files.length}개`);
}

fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n완료: ${OUT_FILE}`);
