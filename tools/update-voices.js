#!/usr/bin/env node
/**
 * 모델 음성 일괄 교체 도구
 *
 * 사용법 (프로젝트 루트에서):
 *   update-voices.cmd                 → 교체 실행 (검사 → 백업 → 교체 → MP3 변환 → manifest 갱신 → 배포 선택)
 *   update-voices.cmd --check         → 검사만 (파일은 건드리지 않음)
 *   update-voices.cmd --restore <백업폴더명>  → 백업본으로 되돌리기 (예: --restore 20270315-101500)
 *   옵션: --yes (모든 확인 자동 승인), --no-push (배포 단계 건너뜀)
 *
 * 흐름:
 *   _new_voices/<언어(성별)>/ 에 새 음성 넣기 → 실행 → 앱 관리자 화면 "로컬 모델 음성 스캔"
 *
 * 파일명 규칙: "<방송문 번호><공백 또는 _>..." 로 시작
 *   예) 2.1.1 항공기 출발 준비_한국어(남).mp3 / [별표 3] 분실물 Paging_한국어(여).wav
 *   앱은 파일명 앞 번호로 방송문과 연결한다 (main.js _doScanLocalModelVoices).
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LIVE_DIR = path.join(ROOT, 'cabinvoice pro');
const STAGE_DIR = path.join(ROOT, '_new_voices');
const BACKUP_ROOT = path.join(ROOT, '_voice_backup');
const ANNOUNCEMENTS_FILE = path.join(STAGE_DIR, 'announcements.json');

// generate-manifest.js 와 동일한 폴더 목록
const FOLDERS = [
  '한국어(남)', '한국어(여)',
  '영어(남)', '영어(여)',
  '일본어(남)', '일본어(여)',
  '중국어(남)', '중국어(여)',
];
// 앱에서 실제로 재생하는 폴더 (main.js _MV_LOCAL_FOLDERS / _MV_LOCAL_FOLDERS_F)
const APP_FOLDERS = ['한국어(남)', '한국어(여)', '영어(남)', '영어(여)'];
const FOLDER_LANG = { '한국어(남)': 'ko', '한국어(여)': 'ko', '영어(남)': 'en', '영어(여)': 'en' };

const AUDIO_EXT = /\.(wav|mp3|m4a)$/i;
const NEEDS_CONVERT = /\.(wav|m4a)$/i;
const NUM_RE = /^(\d+(?:\.\d+)*|\[별표[^\]]*\])(?=[ _])/;

const args = process.argv.slice(2);
const OPT = {
  check: args.includes('--check'),
  yes: args.includes('--yes'),
  noPush: args.includes('--no-push'),
  restore: (() => { const i = args.indexOf('--restore'); return i >= 0 ? (args[i + 1] || '') : null; })(),
};

// ---------- 공통 유틸 ----------
const C = { red: s => `\x1b[31m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m`, green: s => `\x1b[32m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m` };
const line = () => console.log('='.repeat(60));

function ask(question, autoAnswer = true) {
  if (OPT.yes) { console.log(`${question} ${autoAnswer ? 'y' : 'n'} (--yes)`); return Promise.resolve(autoAnswer); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(`${question} (y/N) `, a => { rl.close(); resolve(/^y(es)?$/i.test(a.trim())); }));
}
function listAudio(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => AUDIO_EXT.test(f) && fs.statSync(path.join(dir, f)).isFile()).sort();
}
function timestamp() {
  const d = new Date(); const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function moveDir(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(src, dst);
}
function run(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: false, ...opts });
}
function hasCommand(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
  return r.status === 0;
}
// main.js _extractScriptNum 과 동일한 규칙으로 방송문 번호 추출
function scriptNum(a) {
  const id = String(a.id || a.section || '');
  const hy = id.match(/^(\d+(?:-\d+)+)/); if (hy) return hy[1].replace(/-/g, '.');
  const num = id.match(/^(\d+(?:\.\d+)*)/); if (num) return num[1];
  const by = id.match(/^(\[별표[^\]]*\])/); if (by) return by[1];
  const t = String(a.title || '').match(/^(\d+(?:\.\d+)*)/); if (t) return t[1];
  return null;
}

function regenerateManifest() {
  console.log('\n[manifest] manifest.json 갱신');
  const r = run(process.execPath, [path.join(ROOT, 'generate-manifest.js')]);
  if (r.status !== 0) throw new Error('generate-manifest.js 실행 실패');
}

async function offerDeploy(message) {
  if (OPT.noPush) { console.log(C.yellow('\n[배포] --no-push: 배포를 건너뜁니다. 나중에 git commit/push 하세요.')); return false; }
  if (!hasCommand('git')) { console.log(C.yellow('\n[배포] git이 없어 배포를 건너뜁니다.')); return false; }
  console.log('\n변경 내용 (cabinvoice pro/):');
  run('git', ['status', '--short', '--', 'cabinvoice pro']);
  if (!await ask('\nGitHub에 커밋·푸시하여 배포할까요? (Cloudflare Pages가 1~2분 내 자동 배포)')) {
    console.log(C.yellow('배포하지 않았습니다. 확인 후 직접 git commit / git push 하세요.'));
    return false;
  }
  let r = run('git', ['add', '-A', '--', 'cabinvoice pro']);
  if (r.status !== 0) throw new Error('git add 실패');
  r = run('git', ['commit', '-m', message, '--', 'cabinvoice pro']);
  if (r.status !== 0) { console.log(C.yellow('커밋할 변경이 없거나 커밋에 실패했습니다.')); return false; }
  r = run('git', ['push']);
  if (r.status !== 0) throw new Error('git push 실패 — 네트워크/권한 확인 후 직접 git push 하세요.');
  console.log(C.green('푸시 완료.'));
  return true;
}

function printNextSteps(pushed) {
  line();
  console.log(C.bold('다음 단계'));
  if (!pushed) console.log(' 0. git commit / git push 로 배포');
  console.log(' 1. Cloudflare Pages 배포 완료 대기 (보통 1~2분)');
  console.log(' 2. 앱 → 관리자 화면 → 🎙 모델 음성 관리 → "📂 로컬 모델 음성 스캔"');
  console.log('    ("모델 음성 준비 중" 상태였다면 확인 창에서 "확인")');
  console.log(' 3. 상태 표시가 🟢 "모델 음성 연결됨" 인지, 방송문 몇 개를 직접 재생해 확인');
  line();
}

// ---------- 되돌리기 ----------
async function restore(name) {
  const src = path.join(BACKUP_ROOT, name);
  if (!name || !fs.existsSync(src)) {
    const list = fs.existsSync(BACKUP_ROOT) ? fs.readdirSync(BACKUP_ROOT).sort().reverse() : [];
    console.log(C.red(`백업 폴더를 찾을 수 없습니다: ${name || '(미지정)'}`));
    console.log('사용 가능한 백업:', list.length ? '\n  ' + list.join('\n  ') : '(없음)');
    process.exit(1);
  }
  const folders = FOLDERS.filter(f => fs.existsSync(path.join(src, f)));
  if (!folders.length) { console.log(C.red('백업에 복원할 음성 폴더가 없습니다.')); process.exit(1); }
  line();
  console.log(`복원 대상: ${name}`);
  folders.forEach(f => console.log(`  ${f}: ${listAudio(path.join(src, f)).length}개`));
  line();
  if (!await ask('현재 음성을 새 백업으로 옮기고 위 백업본으로 되돌릴까요?')) { console.log('취소했습니다.'); return; }

  const ts = timestamp();
  for (const f of folders) {
    const live = path.join(LIVE_DIR, f);
    if (fs.existsSync(live)) moveDir(live, path.join(BACKUP_ROOT, `${ts}-before-restore`, f));
    moveDir(path.join(src, f), live);
    console.log(C.green(`[복원] ${f}`));
  }
  regenerateManifest();
  const pushed = await offerDeploy(`voice: 모델 음성 복원 (${name})`);
  printNextSteps(pushed);
}

// ---------- 교체 ----------
async function replace() {
  // 0. 준비 폴더가 없으면 만들고 안내
  if (!fs.existsSync(STAGE_DIR)) {
    FOLDERS.forEach(f => fs.mkdirSync(path.join(STAGE_DIR, f), { recursive: true }));
    console.log(C.green(`준비 폴더를 만들었습니다: ${STAGE_DIR}`));
    console.log('새 음성 파일을 언어(성별) 폴더에 넣은 뒤 다시 실행하세요. (README.md 참고)');
    return;
  }

  // 1. 준비 폴더 수집
  const staged = {};
  for (const f of FOLDERS) {
    const files = listAudio(path.join(STAGE_DIR, f));
    if (files.length) staged[f] = files;
  }
  const targets = Object.keys(staged);
  if (!targets.length) {
    console.log(C.yellow('_new_voices/ 에 음성 파일이 없습니다. 언어(성별) 폴더에 파일을 넣은 뒤 다시 실행하세요.'));
    return;
  }

  const errors = [];
  const warnings = [];

  // 2. 파일명 검사
  const stagedNums = {}; // folder → Set(num)
  for (const f of targets) {
    const byNum = new Map(); // num → Set(base name)
    for (const file of staged[f]) {
      const base = file.replace(AUDIO_EXT, '');
      const m = file.match(NUM_RE);
      if (!m) { errors.push(`[${f}] 방송문 번호로 시작하지 않음: ${file}`); continue; }
      if (!base.endsWith(`_${f}`)) warnings.push(`[${f}] 파일명 끝이 "_${f}"가 아님 (폴더를 잘못 넣었는지 확인): ${file}`);
      if (!byNum.has(m[1])) byNum.set(m[1], new Set());
      byNum.get(m[1]).add(base);
    }
    for (const [num, bases] of byNum) {
      if (bases.size > 1) errors.push(`[${f}] 번호 ${num} 파일이 ${bases.size}개 (하나만 남기세요): ${[...bases].join(' / ')}`);
    }
    // 같은 이름의 mp3 + wav 동시 존재 → mp3 사용
    const bases = staged[f].map(x => x.replace(AUDIO_EXT, ''));
    const dupExt = [...new Set(bases.filter((b, i) => bases.indexOf(b) !== i))];
    dupExt.forEach(b => warnings.push(`[${f}] 같은 이름의 파일이 여러 형식으로 있음 → MP3 사용: ${b}`));
    stagedNums[f] = new Set(byNum.keys());
  }

  // 3. 부분 교체 경고: 앱 사용 폴더 중 준비되지 않은 폴더
  const untouchedApp = APP_FOLDERS.filter(f => !staged[f] && listAudio(path.join(LIVE_DIR, f)).length);

  // 4. 방송문 목록과 대조 (선택: _new_voices/announcements.json)
  if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8'));
      const list = Array.isArray(data) ? data : data.announcements;
      if (!Array.isArray(list)) throw new Error('announcements 배열 없음');
      console.log(`[대조] announcements.json ${data.revVersion ? `(${data.revVersion}) ` : ''}${list.length}개 방송문과 비교`);
      for (const f of targets.filter(t => FOLDER_LANG[t])) {
        const lang = FOLDER_LANG[f];
        const expected = new Set(list.filter(a => a[lang]).map(scriptNum).filter(Boolean));
        const missing = [...expected].filter(n => !stagedNums[f].has(n));
        const orphan = [...stagedNums[f]].filter(n => !expected.has(n));
        if (missing.length) warnings.push(`[${f}] 음성이 없는 방송문 ${missing.length}개: ${missing.join(', ')}`);
        if (orphan.length) warnings.push(`[${f}] 방송문 목록에 없는 번호 ${orphan.length}개 (연결되지 않음): ${orphan.join(', ')}`);
      }
    } catch (e) {
      warnings.push(`announcements.json 대조 실패: ${e.message}`);
    }
  } else {
    warnings.push('announcements.json 이 없어 방송문 목록 대조를 건너뜀 (_new_voices/ 에 업로드용 JSON을 넣으면 누락 검사)');
  }

  // 5. 변환 도구 확인
  const needConvert = targets.some(f => staged[f].some(x => NEEDS_CONVERT.test(x)));
  if (needConvert && !hasCommand('ffmpeg')) {
    errors.push('WAV/M4A 변환에 ffmpeg가 필요합니다. 설치: winget install Gyan.FFmpeg (설치 후 창을 새로 열기)');
  }

  // 결과 출력
  line();
  console.log(C.bold('모델 음성 교체 검사 결과'));
  line();
  for (const f of targets) {
    const cur = listAudio(path.join(LIVE_DIR, f)).length;
    console.log(`  ${f}: 새 파일 ${staged[f].length}개  (현재 ${cur}개 → 백업 후 전면 교체)`);
  }
  if (untouchedApp.length) {
    console.log(C.yellow(`\n  ⚠ 준비되지 않은 폴더: ${untouchedApp.join(', ')}`));
    console.log(C.yellow('    이 폴더의 기존 음성은 그대로 남아, 스캔하면 다시 연결됩니다.'));
  }
  if (warnings.length) { console.log(C.yellow(`\n경고 ${warnings.length}건`)); warnings.forEach(w => console.log(C.yellow('  - ' + w))); }
  if (errors.length) {
    console.log(C.red(`\n오류 ${errors.length}건 — 수정 후 다시 실행하세요. (아무 파일도 변경하지 않았습니다)`));
    errors.forEach(e => console.log(C.red('  - ' + e)));
    process.exitCode = 1;
    return;
  }
  console.log(C.green('\n오류 없음.'));
  if (OPT.check) { console.log('(--check: 검사만 수행했습니다)'); return; }

  // 6. 확인
  let alsoClear = [];
  if (untouchedApp.length && await ask(`\n준비되지 않은 폴더(${untouchedApp.join(', ')})의 기존 음성도 백업으로 옮겨 비울까요?`, false)) {
    alsoClear = untouchedApp;
  }
  if (!await ask('\n위 내용대로 교체를 진행할까요?')) { console.log('취소했습니다.'); return; }

  // 7. 백업 → 교체
  const ts = timestamp();
  const backupDir = path.join(BACKUP_ROOT, ts);
  for (const f of [...targets, ...alsoClear]) {
    const live = path.join(LIVE_DIR, f);
    if (fs.existsSync(live)) { moveDir(live, path.join(backupDir, f)); console.log(`[백업] ${f} → _voice_backup/${ts}/${f}`); }
    fs.mkdirSync(live, { recursive: true });
  }
  for (const f of targets) {
    for (const file of staged[f]) fs.renameSync(path.join(STAGE_DIR, f, file), path.join(LIVE_DIR, f, file));
    console.log(C.green(`[교체] ${f}: ${staged[f].length}개`));
  }

  // 8. WAV/M4A → MP3 변환, 원본은 백업 폴더로
  let converted = 0, failed = 0;
  for (const f of targets) {
    const dir = path.join(LIVE_DIR, f);
    for (const file of listAudio(dir).filter(x => NEEDS_CONVERT.test(x))) {
      const src = path.join(dir, file);
      const dst = path.join(dir, file.replace(AUDIO_EXT, '.mp3'));
      if (!fs.existsSync(dst)) {
        process.stdout.write(`[변환] ${f}/${file} ... `);
        const r = spawnSync('ffmpeg', ['-i', src, '-codec:a', 'libmp3lame', '-b:a', '128k', '-y', dst, '-loglevel', 'error'], { stdio: ['ignore', 'ignore', 'pipe'] });
        if (r.status === 0) { converted++; console.log('OK'); }
        else { failed++; console.log(C.red('실패')); console.log(C.red(String(r.stderr || '').trim())); continue; }
      }
      const orig = path.join(backupDir, 'originals', f, file);
      fs.mkdirSync(path.dirname(orig), { recursive: true });
      fs.renameSync(src, orig);
    }
  }
  if (converted || failed) console.log(`[변환] 완료 ${converted}개 / 실패 ${failed}개 (원본은 _voice_backup/${ts}/originals/)`);
  if (failed) console.log(C.red('변환 실패 파일은 서비스되지 않습니다. 원본을 확인 후 다시 넣어 실행하세요.'));

  // 9. manifest 갱신
  regenerateManifest();

  // 10. 배포
  const pushed = await offerDeploy(`voice: 모델 음성 교체 (${targets.join(', ')}) ${ts}`);
  console.log(`\n되돌리기가 필요하면: update-voices.cmd --restore ${ts}`);
  printNextSteps(pushed);
}

(async () => {
  try {
    if (OPT.restore !== null) await restore(OPT.restore);
    else await replace();
  } catch (e) {
    console.error(C.red(`\n[오류] ${e.message}`));
    process.exitCode = 1;
  }
})();
