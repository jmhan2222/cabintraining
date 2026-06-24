// ===== FIREBASE =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA2rfs2oY80xb374uyYdc5dVlMgac08OWo",
  authDomain: "voicepro-18888.firebaseapp.com",
  projectId: "voicepro-18888",
  storageBucket: "voicepro-18888.firebasestorage.app",
  messagingSenderId: "991357763010",
  appId: "1:991357763010:web:ec0a5d7ee55752b5a1aa5b"
};

let _db = null;
let _storage = null;
let _geminiModel = null;
let auth = null;
const _mvUrlCache = {}; // { "scriptId_lang": url }

function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    _storage = firebase.storage();
    auth = firebase.auth();
    auth.onAuthStateChanged(user => {
      console.log('[Auth 상태변경]', user ? user.email : '미로그인');
      const el = $('admin-auth-status');
      if (!el) return;
      el.textContent = user
        ? `✅ 관리자: ${user.email || '익명 (' + user.uid.slice(0, 8) + ')'}`
        : '❌ 로그인 필요';
      el.style.color = user ? 'var(--color-success, #16a34a)' : 'var(--color-error, #dc2626)';
    });
    return true;
  } catch { return false; }
}

// 언어 코드 → 로컬 정적 폴더명
const _MV_LOCAL_FOLDERS = {
  ko: '한국어(남)', en: '영어(남)', ja: '일본어(남)', ca: '중국어(남)',
};
const _MV_LOCAL_FOLDERS_F = {
  ko: '한국어(여)', en: '영어(여)', ja: '일본어(여)', ca: '중국어(여)',
};

// [DISABLED] 언어 코드 → Firebase Storage 폴더명 (남성 우선, 없으면 여성)
// const _MV_FOLDERS = {
//   ko: ['한국어(남)', '한국어(여)'],
//   en: ['영어(남)',   '영어(여)'],
//   ja: ['일본어(남)', '일본어(여)'],
//   ca: ['중국어(남)', '중국어(여)'],
// };

// 현재 선택된 성별 ('M' | 'F')
let _currentGender = 'M';

// 로컬 정적 파일 URL 생성 (한글/공백 encodeURIComponent 처리)
function _buildLocalModelVoiceUrl(fileName, lang, gender = 'M') {
  const folderMap = gender === 'F' ? _MV_LOCAL_FOLDERS_F : _MV_LOCAL_FOLDERS;
  const folder = folderMap[lang];
  if (!folder || !fileName) return null;
  return './' +
    encodeURIComponent('cabinvoice pro') + '/' +
    encodeURIComponent(folder) + '/' +
    encodeURIComponent(fileName);
}

// 방송문 ID에서 섹션 번호 추출 → 점(.) 구분 형식으로 반환 (예: "2.1.1")
// Firestore ID는 하이픈 형식("2-1-1")이므로 점 형식으로 변환
function _extractScriptNum(script) {
  const id = script.id || '';
  // 하이픈 형식 Firestore ID (예: "2-1-1" → "2.1.1")
  const hyphenMatch = id.match(/^(\d+(?:-\d+)+)/);
  if (hyphenMatch) return hyphenMatch[1].replace(/-/g, '.');
  // 점 형식 (예: "2.1.1")
  const numMatch = id.match(/^(\d+(?:\.\d+)*)/);
  if (numMatch) return numMatch[1];
  // [별표 N] 패턴
  const byeolMatch = id.match(/^(\[별표[^\]]*\])/);
  if (byeolMatch) return byeolMatch[1];
  // 제목에서 추출 시도
  const titleNum = (script.title || '').match(/^(\d+(?:\.\d+)*)/);
  if (titleNum) return titleNum[1];
  return null;
}

// ===== COMMON MODEL VOICE PLAYER =====
// containerId: 렌더링할 컨테이너 DOM ID
// opts.onAvailable(bool): 음성 가용 여부 콜백 (드릴 버튼 활성화 등)
// 반환: { stop() } 컨트롤 객체
function createModelVoicePlayer(containerId, opts = {}) {
  const container = $(containerId);
  if (!container) return { stop: () => {} };
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  container.innerHTML = `<div class="mvp-wrap" id="${containerId}-mvp">
    <button class="mvp-play-btn" id="${containerId}-play" disabled>▶ 재생</button>
    <div class="mvp-scrub-wrap">
      <input type="range" class="mvp-scrub" id="${containerId}-scrub" min="0" max="100" value="0" step="0.1" disabled>
      <span class="mvp-time" id="${containerId}-time">0:00 / 0:00</span>
    </div>
    ${!opts.noGender ? `<div class="mvp-gender-wrap">
      <button class="mvp-gender-btn${_currentGender === 'M' ? ' active' : ''}" data-g="M">남</button>
      <button class="mvp-gender-btn${_currentGender === 'F' ? ' active' : ''}" data-g="F">여</button>
    </div>` : ''}
  </div>`;

  const playBtn  = $(`${containerId}-play`);
  const scrub    = $(`${containerId}-scrub`);
  const timeEl   = $(`${containerId}-time`);
  let _playerAudio = null;

  const setAvailable = (ok) => {
    playBtn.disabled = !ok;
    scrub.disabled = !ok;
    if (!ok) { playBtn.textContent = '모델 음성 미등록'; scrub.value = 0; timeEl.textContent = '0:00 / 0:00'; }
    else if (playBtn.textContent === '모델 음성 미등록') playBtn.textContent = '▶ 재생';
    if (opts.onAvailable) opts.onAvailable(ok);
  };

  const stopPlayer = () => {
    if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio.currentTime = 0; }
    _currentModelAudio = null;
    _playerAudio = null;
    playBtn.textContent = '▶ 재생';
    scrub.value = 0;
    timeEl.textContent = '0:00 / 0:00';
  };

  const attachHandlers = () => {
    _currentModelAudio.ontimeupdate = () => {
      if (!_currentModelAudio) return;
      const dur = _currentModelAudio.duration || 0;
      const cur = _currentModelAudio.currentTime || 0;
      if (dur > 0) { scrub.max = dur; scrub.value = cur; }
      timeEl.textContent = `${fmt(cur)} / ${fmt(dur)}`;
    };
    const onEnd = () => {
      playBtn.textContent = '▶ 재생';
      scrub.value = 0;
      timeEl.textContent = '0:00 / 0:00';
      _playerAudio = null;
    };
    _currentModelAudio.onended = onEnd;
    _currentModelAudio.onerror = onEnd;
  };

  const doPlay = async () => {
    const s = state.currentScript;
    if (!s) return;
    // 토글: 이 플레이어가 재생 중이면 일시정지
    if (_playerAudio && _playerAudio === _currentModelAudio && !_currentModelAudio.paused) {
      _currentModelAudio.pause();
      playBtn.textContent = '▶ 재생';
      return;
    }
    // 일시정지 상태면 현재 위치에서 재개 (Bug 2: currentTime 유지)
    if (_playerAudio && _playerAudio === _currentModelAudio && _currentModelAudio.paused) {
      _currentModelAudio.play().catch(() => {});
      playBtn.textContent = '⏸ 일시정지';
      return;
    }
    // _currentModelAudio가 이미 있으면 재사용 (Bug 2: 새 Audio 생성 안 함)
    if (_currentModelAudio && _currentModelAudio.src) {
      _playerAudio = _currentModelAudio;
      attachHandlers();
      _currentModelAudio.play().catch(() => {});
      playBtn.textContent = '⏸ 일시정지';
      return;
    }
    // 없는 경우에만 새로 생성
    const url = await _resolveModelVoiceUrl(s.id, state.selectedLang);
    if (!url) { setAvailable(false); return; }
    _currentModelAudio = new Audio(url);
    _currentModelAudio.setAttribute('playsinline', '');
    window._modelAudioKeepAlive = _currentModelAudio; // 모바일 GC 방지
    _playerAudio = _currentModelAudio;
    attachHandlers();
    _currentModelAudio.play().catch(() => {});
    playBtn.textContent = '⏸ 일시정지';
  };

  playBtn.addEventListener('click', doPlay);

  scrub.addEventListener('input', () => {
    if (_playerAudio && _playerAudio === _currentModelAudio) {
      _currentModelAudio.currentTime = parseFloat(scrub.value);
    }
  });

  // 성별 토글
  container.querySelectorAll('.mvp-gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.g;
      if (!g || _currentGender === g) return;
      _currentGender = g;
      container.querySelectorAll('.mvp-gender-btn').forEach(b => b.classList.toggle('active', b.dataset.g === g));
      stopPlayer();
      initState();
    });
  });

  // 가용성 초기 확인 (기존 _currentModelAudio 있으면 현재 상태 즉시 반영)
  const initState = () => {
    if (_currentModelAudio && _currentModelAudio.src) {
      setAvailable(true);
      const dur = _currentModelAudio.duration || 0;
      const cur = _currentModelAudio.currentTime || 0;
      if (dur > 0) { scrub.max = dur; scrub.value = cur; }
      if (cur > 0 || dur > 0) timeEl.textContent = `${fmt(cur)} / ${fmt(dur)}`;
      playBtn.textContent = _currentModelAudio.paused ? '▶ 재생' : '⏸ 일시정지';
      _playerAudio = _currentModelAudio;
      attachHandlers(); // 화면 전환 후 새 DOM에 이벤트 재등록 (모바일 scrubbar 유지)
      return;
    }
    const s = state.currentScript;
    if (!s) { setAvailable(false); return; }
    const cached = _getCachedModelVoiceUrl(s.id, state.selectedLang);
    const local  = loadModelVoice(s.id, state.selectedLang);
    if (cached || local) { setAvailable(true); return; }
    _resolveModelVoiceUrl(s.id, state.selectedLang).then(url => setAvailable(!!url));
  };
  initState();

  console.log('[완료] 모델 음성 플레이어 생성:', containerId);
  return { stop: stopPlayer };
}

// ===== MODEL VOICE SCAN =====
// 핵심 스캔 로직 (버튼 관리 없이 순수 매핑만 처리)
async function _doScanLocalModelVoices() {
  const res = await fetch('./cabinvoice%20pro/manifest.json');
  if (!res.ok) throw new Error(`manifest.json 로드 실패 (${res.status})`);
  const manifest = await res.json();
  if (!_db) throw new Error('Firebase 연결이 필요합니다');

  let matched = 0;
  const batch = _db.batch();

  for (const script of _allScripts) {
    const num = _extractScriptNum(script);
    if (!num) continue;

    const firestoreId = num.replace(/\./g, '-');
    const modelFiles = {};

    for (const [lang, folder] of Object.entries(_MV_LOCAL_FOLDERS)) {
      const files = manifest[folder] || [];
      const file = files.find(f => f.startsWith(num + ' ') || f.startsWith(num + '_'));
      if (file) modelFiles[lang] = file;
    }
    for (const [lang, folder] of Object.entries(_MV_LOCAL_FOLDERS_F)) {
      const files = manifest[folder] || [];
      const file = files.find(f => f.startsWith(num + ' ') || f.startsWith(num + '_'));
      if (file) modelFiles[`${lang}_F`] = file;
    }

    console.log('[스캔]', num, '→', {
      ko: modelFiles.ko || null, en: modelFiles.en || null,
      ja: modelFiles.ja || null, ca: modelFiles.ca || null
    });

    if (Object.keys(modelFiles).length > 0) {
      batch.set(_db.collection('scripts').doc(firestoreId), { modelFiles }, { merge: true });
      matched++;
    }
  }

  await batch.commit();
  Object.keys(_mvUrlCache).forEach(k => delete _mvUrlCache[k]);
  return matched;
}

// 로컬 정적 파일 → 모델 음성 URL 조회
// 우선순위: 1) localStorage base64  2) 메모리 캐시  3) Firestore modelFiles → 로컬 URL
// gender: 'M'(남) | 'F'(여) — 기본값은 현재 선택 성별
async function _resolveModelVoiceUrl(scriptId, lang, gender = _currentGender) {
  // 1. 직접 업로드된 base64 (localStorage, gender 무관)
  const local = loadModelVoice(scriptId, lang);
  if (local) return local;

  // 2. 메모리 캐시 (gender 포함 키)
  const cacheKey = `${scriptId}_${lang}_${gender}`;
  if (_mvUrlCache[cacheKey]) return _mvUrlCache[cacheKey];

  // 3. Firestore scripts/{num}.modelFiles — M: lang, F: lang_F
  if (_db) {
    try {
      const numMatch = scriptId.match(/^(\d+(?:[.\-]\d+)*)/);
      const num = numMatch ? numMatch[1] : scriptId;
      const firestoreId = num.replace(/\./g, '-');
      console.log('[모델음성] num:', num, 'firestoreId:', firestoreId);
      const doc = await _db.collection('scripts').doc(firestoreId).get();
      if (!doc.exists) {
        console.warn('[모델음성] 문서 없음:', firestoreId);
        return null;
      }
      const fsKey = gender === 'F' ? `${lang}_F` : lang;
      const fileName = doc.data().modelFiles?.[fsKey];
      console.log('[모델음성] num:', num, '파일:', fileName);
      if (fileName) {
        const url = _buildLocalModelVoiceUrl(fileName, lang, gender);
        if (url) {
          _mvUrlCache[cacheKey] = url;
          return url;
        }
      }
    } catch {}
  }

  /*
  // [DISABLED] Firebase Storage listAll 방식 (필요 시 주석 해제)
  if (!_db || !_storage) return null;
  // Firestore modelVoices 캐시 확인
  try {
    const doc = await _db.collection('modelVoices').doc(scriptId).get();
    if (doc.exists) {
      const url = doc.data()[lang];
      if (url) { _mvUrlCache[cacheKey] = url; return url; }
    }
  } catch {}
  // Firebase Storage 폴더 탐색 (남 → 여 순서)
  const folders = _MV_FOLDERS[lang];
  if (!folders) return null;
  for (const folder of folders) {
    try {
      const listResult = await _storage.ref(`cabinvoice pro/${folder}`).listAll();
      const match = listResult.items.find(item =>
        item.name.startsWith(scriptId) && /\.(wav|mp3)$/i.test(item.name)
      );
      if (match) {
        const url = await match.getDownloadURL();
        _mvUrlCache[cacheKey] = url;
        try {
          await _db.collection('modelVoices').doc(scriptId).set({ [lang]: url }, { merge: true });
        } catch {}
        console.log(`[모델음성] ${scriptId} ${lang} → Storage 연결 완료 (${folder}/${match.name})`);
        return url;
      }
    } catch {}
  }
  */

  return null;
}

function _getCachedModelVoiceUrl(scriptId, lang, gender = _currentGender) {
  return loadModelVoice(scriptId, lang) || _mvUrlCache[`${scriptId}_${lang}_${gender}`] || null;
}

// ===== GEMINI (Cloudflare Pages Function 프록시 경유) =====
function _showRetryToast(msg) {
  let el = document.getElementById('_gemini-retry-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_gemini-retry-toast';
    el.style.cssText = [
      'position:fixed', 'bottom:28px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1e293b', 'color:#fff', 'padding:12px 22px', 'border-radius:12px',
      'font-size:14px', 'z-index:9999', 'pointer-events:none',
      'transition:opacity .25s', 'white-space:nowrap'
    ].join(';');
    document.body.appendChild(el);
  }
  if (msg) {
    el.textContent = msg;
    el.style.opacity = '1';
  } else {
    el.style.opacity = '0';
  }
}

function _isRetryable(status, errorMsg) {
  if (status === 429) return true;
  return /high.demand|overload|quota|rate.limit|503|resource.exhaust/i.test(errorMsg || '');
}

async function getGeminiModel() {
  if (_geminiModel) return _geminiModel;
  _geminiModel = {
    async generateContent(input) {
      let contents;
      if (typeof input === 'string') {
        contents = [{ parts: [{ text: input }] }];
      } else if (Array.isArray(input)) {
        const parts = input.map(p => typeof p === 'string' ? { text: p } : p);
        contents = [{ parts }];
      } else {
        contents = [input];
      }

      const MAX_RETRIES = 3;
      let lastErr;
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gemini-2.5-flash', contents })
          });
          const data = await res.json();
          if (!res.ok) {
            const err = new Error(data.error || `Gemini 오류 (HTTP ${res.status})`);
            err.status = res.status;
            throw err;
          }
          _showRetryToast(null);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          return { response: { text: () => text } };
        } catch(e) {
          lastErr = e;
          if (i < MAX_RETRIES - 1 && _isRetryable(e.status, e.message)) {
            _showRetryToast(`⏳ 잠시 후 재시도 중... (${i + 2}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, 3000 * (i + 1)));
          } else {
            _showRetryToast(null);
            if (i === MAX_RETRIES - 1 && _isRetryable(e.status, e.message)) {
              throw new Error('잠시 후 다시 시도해주세요. (서버 과부하)');
            }
            throw e;
          }
        }
      }
      _showRetryToast(null);
      throw lastErr;
    }
  };
  return _geminiModel;
}

async function firestoreLoadLatest() {
  if (!_db) return null;
  try {
    const snap = await _db.collection('cabinManual').doc('latest').get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}
async function firestoreSaveLatest(data) {
  if (!_db) throw new Error('Firebase 미설정');
  await _db.collection('cabinManual').doc('latest').set(data);
  await _db.collection('cabinManual').doc('history').collection('versions').doc(data.revVersion).set(data);
}
async function firestoreLoadHistory() {
  if (!_db) return [];
  try {
    const snap = await _db.collection('cabinManual').doc('history').collection('versions')
      .orderBy('updatedAt','desc').limit(5).get();
    return snap.docs.map(d => d.data());
  } catch { return []; }
}
async function firestoreRollback(revVersion) {
  if (!_db) throw new Error('Firebase 미설정');
  const snap = await _db.collection('cabinManual').doc('history').collection('versions').doc(revVersion).get();
  if (!snap.exists) throw new Error('버전을 찾을 수 없습니다');
  await _db.collection('cabinManual').doc('latest').set(snap.data());
}

// ===== 실제 체크리스트 정의 =====
const CHECKLIST = {
  fluency: {
    label: '유창성', max: 30, color: '#10b981', icon: '💨',
    items: [
      { label: '끊어 읽기',       max: 5,  desc: '의미상 자연스러운 곳에서 적절한 끊어 읽기' },
      { label: '속도 연출',       max: 5,  desc: '전체/어절 간 적절한 속도 연출' },
      { label: '강조 표현',       max: 5,  desc: '의미전달력을 높이기 위한 강조 표현 사용' },
      { label: '문안 숙지',       max: 5,  desc: '문안 숙지 상태 (버벅거림 없음)' },
      { label: '말하는 듯한 연출', max: 10, desc: '읽는 것이 아닌 말하는 듯한 방송 연출' }
    ]
  },
  voice: {
    label: '분위기/목소리', max: 25, color: '#f59e0b', icon: '🎙',
    items: [
      { label: '안정적인 발성', max: 10, desc: '안정적인 발성 유지' },
      { label: '자연스러운 톤', max: 5,  desc: '음성에 어울리는 자연스러운 톤 연출' },
      { label: '친근한 분위기', max: 10, desc: '친근한 분위기 연출' }
    ]
  },
  intonation: {
    label: '억양', max: 25, color: '#8b5cf6', icon: '〰️',
    items: [
      { label: '조사/어미 처리', max: 5,  desc: '(조사/어미)의 자연스러운 처리' },
      { label: '전반적인 억양',  max: 10, desc: '전반적인 자연스러운 억양 구사' },
      { label: '고른 억양',      max: 10, desc: '고른 억양 사용 (단조·과장 없음)' }
    ]
  },
  pronunciation: {
    label: '발음', max: 20, color: '#3b82f6', icon: '🗣',
    items: [
      { label: '정확성', max: 10, desc: '정확성 (자음·모음·받침 등)' },
      { label: '명확성', max: 10, desc: '명확성 (생략·뭉개짐·어미 흐려짐 없음)' }
    ]
  }
};

// ===== STATE =====
let state = {
  currentScript: null,
  selectedLang: 'ko',
  mediaRecorder: null,
  audioContext: null,
  analyser: null,
  sourceNode: null,
  stream: null,
  pitchSamples: [],
  amplitudeSamples: [],
  pauseSamples: [],
  recordingStart: null,
  recordTimerInterval: null,
  prepTimerInterval: null,
  prepTimeLeft: 30,
  transcript: '',
  recognition: null,
  animFrameId: null,
  radarChartInstance: null,
  audioChunks: [],
  audioBlob: null,
  _sampleInterval: null
};

// ===== DOM =====
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  $(id).scrollTop = 0;
}

// ===== BUILTIN OVERRIDES (localStorage) =====
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem('cabinvoice_overrides') || '{}'); }
  catch { return {}; }
}
function saveOverrides(obj) { localStorage.setItem('cabinvoice_overrides', JSON.stringify(obj)); }
function getEffectiveScript(id) {
  const overrides = loadOverrides();
  const base = _allScripts.find(s => s.id === id);
  if (!base) return null;
  return overrides[id] ? { ...base, ...overrides[id], langs: { ...base.langs, ...overrides[id].langs } } : base;
}
function restoreBuiltIn(id) {
  const overrides = loadOverrides();
  delete overrides[id];
  saveOverrides(overrides);
  renderHome();
}

// ===== MODAL STATE =====
const _modalState = { mode: 'add', editId: null, editSource: null };

// ===== AUTH =====
const EDIT_PW = 'jmhan2222';
function isEditUnlocked() { return sessionStorage.getItem('cvp_edit_unlocked') === '1'; }
function unlockEdit() { sessionStorage.setItem('cvp_edit_unlocked', '1'); }
let _authCallback = null;
function requireEditAuth(cb) {
  if (isEditUnlocked()) { cb(); return; }
  _authCallback = cb;
  $('auth-pw-input').value = '';
  $('auth-error').classList.add('hidden');
  $('auth-modal').classList.remove('hidden');
  setTimeout(() => $('auth-pw-input').focus(), 60);
}
function _confirmAuth() {
  if ($('auth-pw-input').value === EDIT_PW) {
    unlockEdit();
    $('auth-modal').classList.add('hidden');
    if (_authCallback) { _authCallback(); _authCallback = null; }
  } else {
    $('auth-error').classList.remove('hidden');
    $('auth-pw-input').value = '';
    $('auth-pw-input').focus();
  }
}

// ===== MODEL VOICE (localStorage) =====
let _mvAudioUrl = null;
let _modalMvLang = 'ko'; // 모달에서 현재 선택된 언어 탭

function base64ToBlob(base64) {
  const parts = base64.split(',');
  const mime = (parts[0].match(/:(.*?);/)||['','audio/mpeg'])[1];
  const bin = atob(parts[1]||parts[0]);
  const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime});
}

// 언어별 로드: lang 지정 시 lang 키 우선, 없으면 레거시 단일 키 폴백
function loadModelVoice(scriptId, lang) {
  if (lang) {
    const v = localStorage.getItem(`cabinvoice_voice_${scriptId}_${lang}`);
    if (v) return v;
  }
  return localStorage.getItem(`cabinvoice_voice_${scriptId}`) || null;
}
function saveModelVoiceLang(scriptId, lang, base64, name) {
  localStorage.setItem(`cabinvoice_voice_${scriptId}_${lang}`, base64);
  if (name) localStorage.setItem(`cabinvoice_voice_${scriptId}_${lang}_name`, name);
}
function deleteModelVoiceLang(scriptId, lang) {
  localStorage.removeItem(`cabinvoice_voice_${scriptId}_${lang}`);
  localStorage.removeItem(`cabinvoice_voice_${scriptId}_${lang}_name`);
}
function getModelVoiceKey(lang) {
  const id = _modalState.mode === 'edit' ? _modalState.editId : '_pending';
  return `cabinvoice_voice_${id}_${lang}`;
}
function _refreshMvUI() {
  ['ko','en','ja','ca'].forEach(lang => {
    const key = getModelVoiceKey(lang);
    const stored = localStorage.getItem(key);
    const el = document.getElementById(`mv-current-${lang}`);
    const nameEl = document.getElementById(`mv-name-${lang}`);
    if (el) el.classList.toggle('hidden', !stored);
    if (nameEl) nameEl.textContent = stored ? (localStorage.getItem(key + '_name') || '등록됨') : '';
  });
}

// ===== PRACTICE COUNT =====
function getPracticeCount(scriptId) {
  return parseInt(localStorage.getItem(`practiceCount_${scriptId}`) || '0', 10);
}
function incPracticeCount(scriptId) {
  const count = getPracticeCount(scriptId) + 1;
  localStorage.setItem(`practiceCount_${scriptId}`, count);
  localStorage.setItem(`practiceLastDate_${scriptId}`, new Date().toISOString().slice(0, 10));
  console.log(`[연습카운터] ${scriptId} → ${count}회`);
  return count;
}
function getLastPracticeLabel(scriptId) {
  const stored = localStorage.getItem(`practiceLastDate_${scriptId}`);
  if (!stored) return null;
  const diffDays = Math.floor((Date.now() - new Date(stored).getTime()) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return `${diffDays}일 전`;
}

// ===== TOAST =====
let _toastTimer = null;
function showToast(msg, duration = 2200) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), duration);
}

// ===== SENTENCE SPLIT & CLICKABLE RENDER =====
function splitSentences(text) {
  return text
    .split(/(?<=\.)\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

function renderClickableScript(text, langCode) {
  // 테이블 포함 스크립트는 기존 방식 유지
  if (text.includes('|')) return renderBilingualScript(text, langCode);
  const sentences = splitSentences(text);
  if (!sentences.length) return renderBilingualScript(text, langCode);
  return sentences.map((s, i) => {
    const inner = (langCode === 'ja' || langCode === 'ca')
      ? renderBilingualScript(s, langCode)
      : escHtml(s);
    return `<span class="script-sentence" data-idx="${i}">${inner}</span>`;
  }).join(' ');
}

console.log('[완료] 문구 클릭 기능 제거');

// ===== HTML ESCAPING & SCRIPT TEXT RENDERING =====
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderScriptText(text) {
  const lines = text.split('\n');
  let html = '';
  let tableRows = [];
  const flushTable = () => {
    if (!tableRows.length) return;
    let t = '<table class="script-table"><thead><tr>';
    t += tableRows[0].map(c=>`<th>${escHtml(c)}</th>`).join('');
    t += '</tr></thead><tbody>';
    for (let i = 1; i < tableRows.length; i++) {
      t += '<tr>' + tableRows[i].map(c=>`<td>${escHtml(c)}</td>`).join('') + '</tr>';
    }
    t += '</tbody></table>';
    html += t;
    tableRows = [];
  };
  for (const line of lines) {
    const tr = line.trim();
    if (/^\|.+\|$/.test(tr)) {
      if (/^\|[\s\-|:]+\|$/.test(tr)) continue; // markdown separator
      tableRows.push(tr.slice(1,-1).split('|').map(c=>c.trim()));
    } else {
      flushTable();
      html += escHtml(line) + '\n';
    }
  }
  flushTable();
  return `<div class="script-text-rendered">${html}</div>`;
}

// ja·ca 독음(한글) + 원문 쌍 렌더링
function renderBilingualScript(text, langCode) {
  if (langCode !== 'ja' && langCode !== 'ca') return renderScriptText(text);

  // 중국어: 독음은 _autoLoadChineseReadings가 처리 → 여기선 원문만 표시
  if (langCode === 'ca') {
    const hv = s => escHtml(s).replace(/\[([^\]]+)\]/g, '<span class="script-var">[$1]</span>');
    const html = text.split('\n').map(rawLine => {
      const line = rawLine.trim();
      if (!line) return '<div class="bilingual-sep"></div>';
      return `<div class="bilingual-pair"><div class="bilingual-original">${hv(line)}</div></div>`;
    }).join('');
    console.log('[완료] 중국어 원문 초기 렌더 (독음은 별도 로드)');
    return `<div class="script-text-rendered">${html}</div>`;
  }

  console.log('[이중언어] 입력 텍스트 첫 200자:', text?.substring(0, 200));
  console.log('[이중언어] 총 줄 수:', text?.split('\n').length);
  console.log('[이중언어] 각 줄 판단:', text?.split('\n').map(l => ({
    line: l.substring(0, 30),
    hasKorean: /[가-힣]/.test(l),
    hasJapanese: /[぀-ヿ一-鿿]/.test(l)
  })));

  // 히라가나+가타카나만 (한자 제외) — 한자는 한중일 공통이라 제외
  const hasJapanese  = s => /[぀-ヿ]/.test(s);
  // 완성형 한글(AC00-D7A3) + 자모(3131-318E) 포함 여부
  const hasKorean    = s => /[가-힣ㄱ-ㆎ]/.test(s);
  const hasChinese   = s => /[一-鿿]/.test(s);
  const isSectionHeader = s => /^\[[^\]]+\]$/.test(s.trim()) && !hasJapanese(s);
  const hv = s => escHtml(s).replace(/\[([^\]]+)\]/g, '<span class="script-var">[$1]</span>');

  const lines = text.split('\n');
  // 줄별 판단 로그
  lines.forEach((line, i) => {
    const korean = hasKorean(line);
    const japanese = hasJapanese(line);
    console.log(`[줄${i}]`, JSON.stringify(line.substring(0, 20)), 'Korean:', korean, 'Japanese:', japanese);
  });
  let html = '';

  if (langCode === 'ja') {
    // 각 줄을 독립적으로 판단: 한글 포함 → 독음, 히라가나/한자 포함 → 원문
    // 독음 줄 버퍼: 바로 다음에 오는 원문 줄과 짝을 이루도록
    let pendingReading = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        if (pendingReading !== null) {
          // 독음만 있고 원문 없이 빈 줄 → 독음 단독 출력
          html += `<div class="bilingual-pair"><div class="bilingual-reading">${hv(pendingReading)}</div></div>`;
          pendingReading = null;
        }
        html += '<div class="bilingual-sep"></div>';
        continue;
      }

      if (isSectionHeader(line)) {
        if (pendingReading !== null) {
          html += `<div class="bilingual-pair"><div class="bilingual-reading">${hv(pendingReading)}</div></div>`;
          pendingReading = null;
        }
        html += `<div class="bilingual-header">${hv(line)}</div>`;
        continue;
      }

      if (hasKorean(line) && !hasJapanese(line)) {
        // 한글 독음 줄
        if (pendingReading !== null) {
          // 독음 연속 시 이전 것 단독 출력
          html += `<div class="bilingual-pair"><div class="bilingual-reading">${hv(pendingReading)}</div></div>`;
        }
        pendingReading = line;
      } else if (hasJapanese(line)) {
        // 일본어 원문 줄
        if (pendingReading !== null) {
          html += `<div class="bilingual-pair">
            <div class="bilingual-reading">${hv(pendingReading)}</div>
            <div class="bilingual-original">${hv(line)}</div>
          </div>`;
          pendingReading = null;
        } else {
          html += `<div class="bilingual-pair"><div class="bilingual-original">${hv(line)}</div></div>`;
        }
      } else {
        // 기타 (섹션 태그 등)
        if (pendingReading !== null) {
          html += `<div class="bilingual-pair"><div class="bilingual-reading">${hv(pendingReading)}</div></div>`;
          pendingReading = null;
        }
        html += `<div class="bilingual-pair"><div class="bilingual-original">${hv(line)}</div></div>`;
      }
    }

    if (pendingReading !== null) {
      html += `<div class="bilingual-pair"><div class="bilingual-reading">${hv(pendingReading)}</div></div>`;
    }

  } else {
    // ca(중국어): 한자 포함 → 원문, 한글 포함 → 독음
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) { html += '<div class="bilingual-sep"></div>'; continue; }
      if (isSectionHeader(line)) { html += `<div class="bilingual-header">${hv(line)}</div>`; continue; }
      if (hasChinese(line)) {
        html += `<div class="bilingual-pair"><div class="bilingual-original">${hv(line)}</div></div>`;
      } else if (hasKorean(line)) {
        html += `<div class="bilingual-pair"><div class="bilingual-reading">${hv(line)}</div></div>`;
      } else {
        html += `<div class="bilingual-pair"><div class="bilingual-original">${hv(line)}</div></div>`;
      }
    }
  }

  console.log('[완료] 이중언어 방송문 렌더링 (자동 판단 방식)');
  return `<div class="script-text-rendered">${html}</div>`;
}

// ===== CUSTOM SCRIPTS (localStorage) =====
function loadCustomScripts() {
  try { return JSON.parse(localStorage.getItem('cabinvoice_custom_scripts') || '[]'); }
  catch { return []; }
}
function saveCustomScripts(arr) {
  localStorage.setItem('cabinvoice_custom_scripts', JSON.stringify(arr));
}
function deleteCustomScript(id) {
  const arr = loadCustomScripts().filter(s => s.id !== id);
  saveCustomScripts(arr);
  renderHome();
}
function extractKeyPhrases(text, lang) {
  const stopKo = new Set(['그리고','하지만','또한','이제','잠시','이후','때까지','위해','대해','것을','있는','있습니다','합니다','주시기','바랍니다','하여','되었습니다','드리겠습니다','주세요','감사합니다','안녕하십니까','승객여러분','저희','현재','대한']);
  const words = text.replace(/[.,!?。、·\n]/g,' ').split(/\s+/).filter(w => w.length >= (lang==='ko'?2:4) && !stopKo.has(w));
  const result = [];
  const step = Math.max(1, Math.floor(words.length / 6));
  for (let i = 0; i < words.length && result.length < 6; i += step) result.push(words[i]);
  return result.length ? result : ['방송'];
}
function buildCustomLang(text, cpStr, langCode) {
  const sttMap = { ko:'ko-KR', en:'en-US', ja:'ja-JP', ca:'zh-CN' };
  // en은 WPM, 나머지는 음절/분
  const speedMap      = { ko:350, en:115, ja:325, ca:240 };
  const speedUnitMap  = { ko:'음절/분', en:'WPM', ja:'음절/분', ca:'음절/분' };
  const speedTolMap   = { ko:100, en:90, ja:75, ca:80 };
  const checkpoints = cpStr ? cpStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
  return {
    sttLang:       sttMap[langCode] || 'ko-KR',
    idealSpeed:    speedMap[langCode] || 115,
    speedUnit:     speedUnitMap[langCode] || 'WPM',
    speedTolerance: speedTolMap[langCode] || 90,
    text: text.trim(),
    checkpoints: checkpoints.length ? checkpoints : ['방송 내용'],
    keyPhrases: extractKeyPhrases(text, langCode),
    tips: ['실제 방송문으로 연습합니다', '밝고 명확한 목소리로', '방송문을 충분히 숙지한 후 시작하세요']
  };
}

// ===== HOME / SIDEBAR =====
async function loadAndRenderHome() {
  _renderSidebarLoading();

  let firestoreScripts = [];
  const cached = (() => { try { return JSON.parse(localStorage.getItem('cabinvoice_scripts_cache')||'null'); } catch { return null; } })();
  if (cached && cached.announcements && (Date.now()-cached.ts < 3600000)) {
    firestoreScripts = _mapAnnouncementsToScripts(cached.announcements);
    if ($('rev-badge')) $('rev-badge').textContent = cached.rev || 'OPIc 방식';
  } else if (initFirebase()) {
    try {
      const latest = await firestoreLoadLatest();
      if (latest && latest.announcements) {
        firestoreScripts = _mapAnnouncementsToScripts(latest.announcements);
        localStorage.setItem('cabinvoice_scripts_cache', JSON.stringify({
          rev: latest.revVersion, announcements: latest.announcements, ts: Date.now()
        }));
        if ($('rev-badge')) $('rev-badge').textContent = latest.revVersion || 'OPIc 방식';
      }
    } catch {}
  }

  const customScripts = loadCustomScripts();
  _allScripts = [...firestoreScripts, ...customScripts];

  renderSidebar(_allScripts);
}

function _renderSidebarLoading() {
  const tree = $('sidebar-tree');
  if (tree) tree.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--gray-400);font-size:14px">방송문 로딩 중...</div>';
}

function _mapAnnouncementsToScripts(announcements) {
  return announcements.map(a => ({
    id: a.id || a.section,
    icon: a.icon || '✈️',
    colorClass: 'c-blue',
    difficulty: '기본', difficultyClass: '',
    title: `${a.section || a.id} ${a.title}`,
    _chapter: a.chapterName || `${a.chapter}장`,
    _section: a.section || a.id,
    _chapterNum: a.chapter || 0,
    _evalLang: a.evalLang || ['ko'],
    langs: {
      ...(a.ko ? { ko: buildCustomLang(a.ko, (a.checkpoints||[]).join(','), 'ko') } : {}),
      ...(a.en ? { en: buildCustomLang(a.en, '', 'en') } : {}),
      ...(a.ja ? { ja: buildCustomLang(a.ja, '', 'ja') } : {}),
      ...(a.ca ? { ca: buildCustomLang(a.ca, '', 'ca') } : {}),
    }
  })).filter(s => s.langs.ko || s.langs.en || s.langs.ja || s.langs.ca);
}

function renderSidebar(scripts) {
  const tree = $('sidebar-tree');
  if (!tree) return;

  if (!scripts.length) {
    tree.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--gray-400);font-size:13px">방송문 데이터가 없습니다.<br>관리자 패널에서 JSON을 업로드해 주세요.</div>';
    return;
  }

  // 챕터별 그룹핑
  const chapters = new Map();
  const customGroup = [];

  for (const s of scripts) {
    if (s._custom) {
      customGroup.push(s);
    } else {
      const chKey = s._chapter || '기타';
      if (!chapters.has(chKey)) chapters.set(chKey, []);
      chapters.get(chKey).push(s);
    }
  }

  let html = '';

  // 챕터 아코디언
  for (const [chapterName, items] of chapters) {
    html += `
    <div class="sidebar-chapter">
      <button class="sidebar-chapter-btn" data-chapter="${escHtml(chapterName)}">
        <span class="sidebar-chapter-name">${escHtml(chapterName)}</span>
        <span class="sidebar-chapter-count">${items.length}</span>
        <span class="sidebar-chapter-arrow">▾</span>
      </button>
      <div class="sidebar-chapter-items">
        ${items.map(s => _sidebarItemHtml(s)).join('')}
      </div>
    </div>`;
  }

  // 내 방송문
  if (customGroup.length) {
    html += `
    <div class="sidebar-chapter">
      <button class="sidebar-chapter-btn" data-chapter="__custom">
        <span class="sidebar-chapter-name">📋 내 방송문</span>
        <span class="sidebar-chapter-count">${customGroup.length}</span>
        <span class="sidebar-chapter-arrow">▾</span>
      </button>
      <div class="sidebar-chapter-items">
        ${customGroup.map(s => _sidebarItemHtml(s)).join('')}
      </div>
    </div>`;
  }

  tree.innerHTML = html;

  // 아코디언 토글
  tree.querySelectorAll('.sidebar-chapter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = btn.closest('.sidebar-chapter');
      ch.classList.toggle('open');
    });
  });
  // 첫 챕터 자동 열기
  const first = tree.querySelector('.sidebar-chapter');
  if (first) first.classList.add('open');

  // 항목 클릭
  tree.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectScript(id);
    });
  });
}

function _sidebarItemHtml(s) {
  const evalLangs = s._evalLang || ['ko','en','ja','ca'];
  const langDots = evalLangs.filter(l => s.langs?.[l]?.text)
    .map(l => `<span class="lang-dot lang-dot-${l}"></span>`).join('');
  const cnt = getPracticeCount(s.id);
  const badge = cnt >= 20
    ? `<span class="practice-badge pb-gold">👑 ${cnt}회</span>`
    : cnt >= 10
      ? `<span class="practice-badge pb-hot">⭐ ${cnt}회</span>`
      : cnt >= 5
        ? `<span class="practice-badge pb-blue">🔥 ${cnt}회</span>`
        : cnt >= 1
          ? `<span class="practice-badge pb-gray">🌱 ${cnt}회</span>`
          : '';
  return `<div class="sidebar-item${_selectedScriptId===s.id?' selected':''}" data-id="${s.id}">
    <span class="sidebar-item-section">${s._section||''}</span>
    <span class="sidebar-item-title">${escHtml(s.title)}</span>
    <span class="sidebar-item-langs">${langDots}${badge}</span>
  </div>`;
}

function selectScript(id) {
  _selectedScriptId = id;
  const s = _allScripts.find(x => x.id === id);
  if (!s) return;

  // 사이드바 선택 표시
  document.querySelectorAll('.sidebar-item').forEach(el =>
    el.classList.toggle('selected', el.dataset.id === id));

  $('detail-empty').classList.add('hidden');
  $('detail-content').classList.remove('hidden');

  // 챕터 배지
  const badge = $('detail-chapter-badge');
  badge.textContent = s._chapter || '';
  badge.style.display = s._chapter ? '' : 'none';

  $('detail-section-num').textContent = s._section || '';
  $('detail-title').textContent = s.title;

  // 편집 버튼 (인증된 경우)
  const editBtn = $('detail-edit-btn');
  editBtn.classList.remove('hidden');
  editBtn.dataset.id = id;
  editBtn.dataset.source = s._custom ? 'custom' : 'builtin';

  // 언어 탭 표시
  _detailLang = Object.keys(s.langs).find(l => s.langs[l]?.text) || 'ko';
  _renderDetailLangTabs(s);
  _renderDetailContent(s, _detailLang);

  // 모바일: 사이드바 닫기
  if (window.innerWidth <= 768) closeSidebar();
}

function _renderDetailLangTabs(s) {
  const evalLangs = s._evalLang || ['ko','en','ja','ca'];
  const tabs = $('detail-lang-tabs');
  tabs.querySelectorAll('.detail-lang-tab').forEach(tab => {
    const lang = tab.dataset.lang;
    const inEval = evalLangs.includes(lang);
    const hasLang = s.langs[lang]?.text;
    tab.style.display = (inEval && hasLang) ? '' : 'none';
    tab.classList.toggle('active', lang === _detailLang);
  });
}

function _renderDetailContent(s, lang) {
  const langData = s.langs[lang];
  if (!langData) return;

  $('detail-script-box').innerHTML = renderBilingualScript(langData.text || '', lang);

  // 체크포인트
  const cpEl = $('detail-checkpoints');
  if (langData.checkpoints?.length) {
    cpEl.classList.remove('hidden');
    cpEl.innerHTML = `<div class="checkpoints-label">✅ 핵심 체크포인트</div>
      <div class="checkpoints-list">${langData.checkpoints.map(c=>`<span class="checkpoint-item">✓ ${c}</span>`).join('')}</div>`;
  } else {
    cpEl.classList.add('hidden');
  }

  // detail-voice-btn 제거됨

  // 연습 횟수 + 마지막 날짜
  const practiceEl = $('detail-practice-info');
  if (practiceEl) {
    const cnt = getPracticeCount(s.id);
    const lastLabel = getLastPracticeLabel(s.id);
    const emoji = cnt >= 20 ? '👑' : cnt >= 10 ? '⭐' : cnt >= 5 ? '🔥' : cnt >= 1 ? '🌱' : '';
    practiceEl.innerHTML = cnt > 0
      ? `<span class="practice-count-info">${emoji} <strong>${cnt}회</strong> 연습 · 마지막: ${lastLabel} <span class="practice-count-device">(이 기기)</span></span>`
      : '';
  }

  // 연습 시작 버튼
  $('detail-start-btn').dataset.id = s.id;
  $('detail-start-btn').dataset.lang = lang;
}

function renderHome() {
  loadAndRenderHome();
}

function openSidebar() {
  $('nav-sidebar').classList.add('open');
  $('sidebar-overlay').classList.remove('hidden');
}
function closeSidebar() {
  $('nav-sidebar').classList.remove('open');
  $('sidebar-overlay').classList.add('hidden');
}

function _setupSidebarSearch() {
  const input = $('sidebar-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const title = item.querySelector('.sidebar-item-title')?.textContent.toLowerCase()||'';
      const sec = item.querySelector('.sidebar-item-section')?.textContent.toLowerCase()||'';
      const match = !q || title.includes(q) || sec.includes(q);
      item.style.display = match ? '' : 'none';
    });
    if (q) {
      document.querySelectorAll('.sidebar-chapter').forEach(ch => {
        const visible = [...ch.querySelectorAll('.sidebar-item')].some(i => i.style.display !== 'none');
        ch.classList.toggle('open', visible);
      });
    }
  });
}

// ===== PREP =====
function startPrep(script, lang) {
  state.currentScript = script;
  if (lang) state.selectedLang = lang;
  clearInterval(state.prepTimerInterval);
  updatePrepContent();
  showScreen('screen-prep');
  // 타이머 없음
}

function updatePrepContent() {
  const s = state.currentScript;
  const evalLangs = s._evalLang || ['ko','en','ja','ca'];

  // 언어 탭: evalLang에 포함되고 데이터 있는 탭만 표시
  $('lang-tabs').querySelectorAll('.lang-tab').forEach(tab => {
    const lang = tab.dataset.lang;
    const inEval = evalLangs.includes(lang);
    const hasLang = s.langs[lang]?.text;
    tab.style.display = (inEval && hasLang) ? '' : 'none';
  });
  // 선택된 언어가 evalLang에 없거나 데이터 없으면 fallback
  if (!evalLangs.includes(state.selectedLang) || !s.langs[state.selectedLang]?.text) {
    state.selectedLang = evalLangs.find(l => s.langs[l]?.text) || 'ko';
    $('lang-tabs').querySelectorAll('.lang-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.lang === state.selectedLang);
    });
  }

  const lang = s.langs[state.selectedLang];

  if ($('prep-title-bar')) $('prep-title-bar').textContent = s.title;
  $('prep-text').innerHTML = renderClickableScript(lang.text, state.selectedLang);

  // 준비 화면 — 모델 음성 플레이어 제거됨, 드릴/학습은 각 화면에서 관리

  $('prep-checkpoints').innerHTML = lang.checkpoints.map(c =>
    `<span class="checkpoint-item">✓ ${c}</span>`).join('');

  $('tips-box').innerHTML = `
    <div class="tips-box-label">💡 연습 팁</div>
    ${lang.tips.map(t => `<div class="tip-item">${t}</div>`).join('')}`;
}

function startPrepTimer() { /* 타이머 제거됨 */ }

// ===== RECORDING =====
async function startRecording() {
  clearInterval(state.prepTimerInterval);
  // 녹음 시작 시 모델 음성 즉시 중지
  if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio.currentTime = 0; _currentModelAudio = null; }

  // 3-2-1 카운트다운
  await new Promise(resolve => {
    const overlay = $('countdown-overlay');
    const numEl = $('countdown-number');
    overlay.classList.remove('hidden');
    let count = 3;
    numEl.textContent = count;
    const iv = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(iv);
        overlay.classList.add('hidden');
        resolve();
      } else {
        numEl.textContent = count;
      }
    }, 800);
  });

  const lang = state.currentScript.langs[state.selectedLang];

  state.transcript = '';
  state.pitchSamples = [];
  state.amplitudeSamples = [];
  state.pauseSamples = [];
  state.audioChunks = [];
  state.recordingStart = Date.now();

  $('record-title').textContent = `${state.currentScript.title} · ${{ ko:'한국어', en:'English', ja:'日本語', ca:'中文' }[state.selectedLang]}`;
  $('record-timer').textContent = '00:00';
  $('live-text').textContent = '말씀해 주세요...';
  $('script-peek-text').innerHTML = renderBilingualScript(lang.text, state.selectedLang);
  $('script-peek-text').classList.add('hidden');
  showScreen('screen-record');

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 44100, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    alert('마이크 접근 권한이 필요합니다.');
    showScreen('screen-prep');
    return;
  }

  const AudioCtx = /** @type {any} */ (window).AudioContext || /** @type {any} */ (window).webkitAudioContext;
  state.audioContext = new AudioCtx();
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 4096;
  state.analyser.smoothingTimeConstant = 0.6;
  state.sourceNode = state.audioContext.createMediaStreamSource(state.stream);
  state.sourceNode.connect(state.analyser);

  const _recOpts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? { mimeType: 'audio/webm;codecs=opus' } : {};
  state.mediaRecorder = new MediaRecorder(state.stream, _recOpts);
  state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.audioChunks.push(e.data); };
  state.mediaRecorder.start(100);

  drawWaveform();
  startAudioSampling();

  state.recordTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.recordingStart) / 1000);
    $('record-timer').textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
  }, 500);

  setupSpeechRecognition(lang.sttLang);
}

function drawWaveform() {
  const canvas = $('waveform-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 800;
  const H = canvas.height = 140;
  const bufLen = state.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufLen);

  function draw() {
    state.animFrameId = requestAnimationFrame(draw);
    state.analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(59,130,246,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#3b82f6'); grad.addColorStop(0.5, '#8b5cf6'); grad.addColorStop(1, '#3b82f6');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8; ctx.shadowColor = '#3b82f6';
    ctx.beginPath();
    const sliceW = W / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const y = ((dataArray[i] / 128.0) - 1) * H * 0.42 + H / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  draw();
}

function startAudioSampling() {
  const floatBuf = new Float32Array(state.analyser.fftSize);
  const freqBuf  = new Uint8Array(state.analyser.frequencyBinCount);
  const SILENCE_THRESH = 0.015;

  state._sampleInterval = setInterval(() => {
    if (!state.mediaRecorder || state.mediaRecorder.state !== 'recording') return;

    state.analyser.getFloatTimeDomainData(floatBuf);
    state.analyser.getByteFrequencyData(freqBuf);

    // RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < floatBuf.length; i++) sumSq += floatBuf[i] * floatBuf[i];
    const rms = Math.sqrt(sumSq / floatBuf.length);
    state.amplitudeSamples.push(rms);

    // Silence flag for pause detection
    state.pauseSamples.push(rms < SILENCE_THRESH ? 0 : 1);

    // Pitch: autocorrelation on float data
    if (rms > SILENCE_THRESH) {
      const pitch = autoCorrelationPitch(floatBuf, state.audioContext.sampleRate);
      if (pitch > 75 && pitch < 520) state.pitchSamples.push(pitch);
    }
  }, 100);
}

// 자기상관 피치 검출 (FFT 피크보다 정밀)
function autoCorrelationPitch(buf, sampleRate) {
  const n = 1024; // 분석 구간 (성능 최적화)
  const minP = Math.floor(sampleRate / 520);
  const maxP = Math.floor(sampleRate / 75);
  let bestCorr = -1, bestPeriod = 0;

  for (let p = minP; p <= maxP; p++) {
    let corr = 0;
    for (let i = 0; i < n - p; i++) corr += buf[i] * buf[i + p];
    corr /= (n - p);
    if (corr > bestCorr) { bestCorr = corr; bestPeriod = p; }
  }
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

function setupSpeechRecognition(langCode) {
  const SR = /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
  if (!SR) { $('live-text').textContent = '⚠️ Chrome 브라우저에서만 음성 인식이 지원됩니다.'; return; }

  const recog = new SR();
  recog.lang = langCode;
  recog.continuous = true;
  recog.interimResults = true;

  recog.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (state.transcript += t + ' ') : (interim = t);
    }
    $('live-text').textContent = (state.transcript + interim).trim() || '말씀해 주세요...';
  };
  recog.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('STT:', e.error); };
  recog.onend = () => { if (state.mediaRecorder?.state === 'recording') { try { recog.start(); } catch(e){} } };
  try { recog.start(); } catch(e){}
  state.recognition = recog;
}

function stopRecording() {
  clearInterval(state.recordTimerInterval);
  clearInterval(state._sampleInterval);
  cancelAnimationFrame(state.animFrameId);
  try { state.recognition?.abort(); } catch(e){}
  state.recognition = null;

  // 연습 횟수 카운터 + 축하 토스트
  if (state.currentScript?.id) {
    const count = incPracticeCount(state.currentScript.id);
    renderSidebar(_allScripts);
    if      (count === 1)  showToast('첫 번째 연습 완료! 🌱', 3000);
    else if (count === 5)  showToast('5회 달성! 🔥 꾸준히 하고 있어요', 3000);
    else if (count === 10) showToast('10회 달성! ⭐ 정말 열심히 하시네요', 3000);
    else if (count === 20) showToast('20회 달성! 👑 당신은 방송 마스터', 3000);
    else                   showToast(`${count}회째 연습 완료! 잘하고 있어요 ✈`, 2500);
  }

  const duration = (Date.now() - state.recordingStart) / 1000;
  $('loading-overlay').classList.remove('hidden');
  _startOverlayTimers();

  const finish = () => {
    const mimeType = state.mediaRecorder?.mimeType || 'audio/webm';
    state.audioBlob = new Blob(state.audioChunks, { type: mimeType });
    _lastRecordingBlob = state.audioBlob;
    _aiAnalysisRetryCount = 0;
    if (_lastRecordingUrl) { URL.revokeObjectURL(_lastRecordingUrl); }
    _lastRecordingUrl = URL.createObjectURL(_lastRecordingBlob);
    if (_lastRecordingBlob.size > 500 * 1024) {
      showToast('음성 파일이 큽니다. 분석에 시간이 걸릴 수 있어요.', 3500);
    }
    analyzeAndShow(duration);
  };

  if (state.mediaRecorder?.state !== 'inactive') {
    state.mediaRecorder.onstop = finish;
    state.mediaRecorder.stop();
  } else {
    finish();
  }

  state.stream?.getTracks().forEach(t => t.stop());
  if (state.audioContext) { state.audioContext.close(); state.audioContext = null; }
}

// ===== 3단계 배점 (연습 도구 기준) =====
// ratio=0 → 0점, ratio≥0.72 → 만점 (학습 동기 유지를 위해 관대하게)
function tierScore(ratio, maxPt) {
  if (!ratio || ratio <= 0) return 0;
  ratio = Math.min(1, Math.max(0, ratio));
  if (ratio >= 0.72) return maxPt;
  if (ratio >= 0.42) {
    if (maxPt === 10) return Math.round(6 + (ratio - 0.42) / 0.30 * 4);
    if (maxPt === 5)  return Math.round(3 + (ratio - 0.42) / 0.30 * 2);
  }
  if (ratio >= 0.20) {
    if (maxPt === 10) return Math.round(2 + (ratio - 0.20) / 0.22 * 4);
    if (maxPt === 5)  return Math.round(1 + (ratio - 0.20) / 0.22 * 2);
  }
  if (maxPt === 10) return Math.round(ratio / 0.20 * 2);
  if (maxPt === 5)  return Math.round(ratio / 0.20);
  return 0;
}

// ===== STUDY MODE =====
const _studyGuideCache = {};   // key: `${scriptId}_${lang}`
const _readingsCache   = {};   // key: `${scriptId}_ca_readings`

// ─── 학습 화면 방송문 텍스트 렌더 ─────────────────────────────────────────
// ja/ca: renderBilingualScript 활용 | ko/en: 빈 줄 압축 + 줄 단위 div 렌더
function _renderStudyScriptText(text, langCode) {
  const el = $('study-script-text');
  if (!el) return;

  const lines = String(text || '').split('\n');
  const firstValid = lines.find(l => l.trim())?.substring(0, 60) || '(없음)';
  console.log('[방송문] 총 라인 수:', lines.length, '첫 줄:', firstValid);

  if (langCode === 'ja' || langCode === 'ca') {
    el.innerHTML = renderBilingualScript(text, langCode);
  } else {
    // 연속 빈 줄은 하나로 압축, 첫 줄은 무조건 보존
    const out = [];
    let prevBlank = false;
    for (const line of lines) {
      if (!line.trim()) {
        if (!prevBlank) out.push('');
        prevBlank = true;
      } else {
        out.push(line);
        prevBlank = false;
      }
    }
    el.innerHTML = out.map(l => l
      ? `<div class="study-script-line">${escHtml(l)}</div>`
      : '<div class="study-script-sep"></div>'
    ).join('');
  }
  console.log('[완료] 방송문 첫 줄 보존 렌더링');
}

// ─── 중국어 방송문 한글 독음 덮어쓰기 ────────────────────────────────────
function _renderChineseScriptWithReadings(text, chineseReadings) {
  const el = $('study-script-text');
  if (!el || !chineseReadings?.length) return;
  const hasCJK = s => /[一-鿿]/.test(s);
  const isSectionHeader = s => /^\[[^\]]+\]$/.test(s.trim()) && !hasCJK(s);

  const readingMap = new Map();
  chineseReadings.forEach(r => {
    if (r.original && r.reading) readingMap.set(r.original.trim(), r.reading.trim());
  });

  let html = '';
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) { html += '<div class="bilingual-sep"></div>'; continue; }
    if (isSectionHeader(t)) { html += `<div class="bilingual-header">${escHtml(t)}</div>`; continue; }
    if (hasCJK(t)) {
      const reading = readingMap.get(t);
      html += `<div class="bilingual-pair">
        ${reading ? `<div class="bilingual-reading">${escHtml(reading)}</div>` : ''}
        <div class="bilingual-original">${escHtml(t)}</div>
      </div>`;
    } else {
      html += `<div class="bilingual-pair"><div class="bilingual-original">${escHtml(t)}</div></div>`;
    }
  }
  el.innerHTML = `<div class="script-text-rendered">${html}</div>`;
  console.log('[완료] 중국어 한글 독음 표시');
}

// ─── 중국어 독음 독립 API (가이드 생성과 독립적으로 즉시 호출) ──────────────
async function generateChineseReadings(scriptText, scriptId) {
  const cacheKey = `${scriptId}_ca_readings`;
  if (_readingsCache[cacheKey]) return _readingsCache[cacheKey];

  // Firestore에 저장된 readings 우선 확인
  if (_db) {
    try {
      const snap = await _db.collection('scripts').doc(scriptId).get();
      console.log('[중국어독음] Firestore 조회:', snap.exists, snap.data()?.chineseReadings?.length);
      const saved = snap.exists ? snap.data()?.chineseReadings : null;
      if (saved?.length) {
        _readingsCache[cacheKey] = saved;
        return saved;
      }
    } catch (e) { console.warn('[중국어독음] generateChineseReadings Firestore 오류:', e.message); }
  }

  const prompt = `아래 중국어 방송문의 각 문장(줄)에 한글 발음 독음을 달아줘.

규칙:
- 성조 번호 없이 한국어 화자가 읽기 쉬운 한국어 발음으로만 표기
- 각 단어 사이 띄어쓰기 유지
- 한자가 포함된 줄만 독음 처리 (빈 줄, 섹션 태그 제외)
- 원문과 독음을 쌍으로 JSON 배열 반환

반환 형식 (JSON 배열만, 설명 없이):
[
  {"original": "各位旅客，", "reading": "거웨이 뤼커,"},
  {"original": "飞机遇有不稳定气流，", "reading": "페이지 위요우 부원딩 치리우,"}
]

중국어 방송문:
${scriptText}`;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60000);
  let readings = null;
  try {
    const res = await fetch('/api/gemini', {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemini-2.5-flash', contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    console.log('[중국어독음] API raw:', raw?.substring(0, 300));
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) readings = JSON.parse(m[0]);
  } catch (e) {
    console.warn('[중국어 독음] API 오류:', e.message);
    return null;
  } finally { clearTimeout(tid); }

  if (readings?.length) {
    _readingsCache[cacheKey] = readings;
    // Firestore 캐싱 (실패 무시)
    if (_db) {
      _db.collection('scripts').doc(scriptId)
        .set({ chineseReadings: readings }, { merge: true })
        .catch(e => console.warn('[중국어 독음 저장 실패]', e.message));
    }
    console.log('[완료] 중국어 독음 생성 및 캐싱');
  }
  return readings;
}

// 중국어 독음 로딩 상태 표시 + 생성 후 렌더 적용
async function _autoLoadChineseReadings(scriptText, scriptId) {
  console.log('[중국어독음] 1. 함수 진입, scriptId:', scriptId);

  const el = $('study-script-text');
  if (!el) { console.error('[중국어독음] study-script-text 엘리먼트 없음'); return; }

  const cacheKey = `${scriptId}_ca_readings`;
  console.log('[중국어독음] 2. 캐시 확인:', cacheKey, '캐시 히트:', !!_readingsCache[cacheKey]);

  // 로딩 인디케이터 (방송문 위에 작은 텍스트)
  const indicator = document.createElement('div');
  indicator.id = 'cn-reading-indicator';
  indicator.className = 'cn-reading-loading';
  indicator.textContent = '중국어 독음을 생성하고 있습니다... 🔄';
  el.parentNode?.insertBefore(indicator, el);

  console.log('[중국어독음] 3. Firestore 조회 시작, _db 존재:', !!_db);
  if (_db) {
    try {
      const doc = await _db.collection('scripts').doc(scriptId).get();
      console.log('[중국어독음] 4. Firestore 결과:', doc.exists, doc.data()?.chineseReadings);
    } catch (e) {
      console.error('[중국어독음] Firestore 오류:', e);
    }
  }

  console.log('[중국어독음] 5. API 호출 시작 (generateChineseReadings)');
  try {
    const readings = await generateChineseReadings(scriptText, scriptId);
    console.log('[중국어독음] 6. API 결과:', readings);
    const ind = document.getElementById('cn-reading-indicator');
    if (ind) ind.remove();
    if (readings?.length) {
      console.log('[중국어독음] 렌더링 시작, readings 수:', readings.length);
      _renderChineseScriptWithReadings(scriptText, readings);
    } else {
      console.warn('[중국어독음] readings 없음 또는 빈 배열');
    }
  } catch (e) {
    const ind = document.getElementById('cn-reading-indicator');
    if (ind) ind.remove();
    console.error('[중국어독음] API 오류:', e);
  }
}

async function startStudyMode() {
  const s = state.currentScript;
  if (!s) return;
  const lang = s.langs[state.selectedLang];
  if (!lang) return;

  $('study-title-bar').textContent = s.title;
  _renderStudyScriptText(lang.text, state.selectedLang);

  console.log('[study진입] langCode:', state.selectedLang, 'ca여부:', state.selectedLang === 'ca');

  // 중국어: 가이드 생성과 무관하게 즉시 독음 자동 로드
  if (state.selectedLang === 'ca') {
    console.log('[중국어독음] 자동 로드 시작');
    _autoLoadChineseReadings(lang.text, s.id);
  }

  ['M', 'F'].forEach(g => {
    const btn = $(`study-gender-${g.toLowerCase()}`);
    if (btn) btn.classList.toggle('active', g === _currentGender);
  });
  createModelVoicePlayer('study-model-player', { noGender: true });

  // 가이드 초기화
  $('study-guide-result').classList.add('hidden');
  $('study-guide-result').innerHTML = '';
  $('study-guide-status').classList.add('hidden');
  $('btn-gen-guide').disabled = false;
  $('btn-gen-guide').textContent = '가이드 생성하기';

  showScreen('screen-study');

  // 캐시 → Firestore 순으로 가이드 조회
  const cacheKey = `${s.id}_${state.selectedLang}`;
  if (_studyGuideCache[cacheKey]) {
    const cached = _studyGuideCache[cacheKey];
    _renderStudyGuide(cached);
    if (state.selectedLang === 'ca' && cached.chineseReadings?.length) {
      _renderChineseScriptWithReadings(lang.text, cached.chineseReadings);
    }
    $('btn-gen-guide').textContent = '✅ 가이드 완성';
  } else {
    const statusEl = $('study-guide-status');
    statusEl.textContent = '저장된 가이드 확인 중...';
    statusEl.className = 'study-guide-loading';
    statusEl.classList.remove('hidden');
    try {
      const saved = await _loadGuideFromFirestore(s.id, state.selectedLang);
      statusEl.classList.add('hidden');
      if (saved) {
        _studyGuideCache[cacheKey] = saved;
        _renderStudyGuide(saved);
        if (state.selectedLang === 'ca' && saved.chineseReadings?.length) {
          _renderChineseScriptWithReadings(lang.text, saved.chineseReadings);
        }
        $('btn-gen-guide').textContent = '✅ 가이드 완성';
        console.log('[완료] Firestore 저장 가이드 로드');
      }
    } catch (e) {
      statusEl.classList.add('hidden');
    }
  }
  console.log('[완료] 학습 모드 화면 진입');
}

async function _retryGuideWithSimplePrompt(scriptText) {
  const simplePrompt = `아래 방송문의 핵심 포인트를 한국어로 설명해줘.
방송문 텍스트에 한글 독음이나 특수 기호가 포함되어 있어도 무시하고 분석해줘.
반드시 아래 JSON 형식으로만 반환:
{"summary":"...","tips":["팁1","팁2","팁3"]}
JSON 외 어떤 텍스트도 포함하지 말 것.
방송문: ${scriptText}`;

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: simplePrompt }] }]
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('단순화 재시도 JSON 파싱 실패');
  return JSON.parse(m[0]);
}

async function callGeminiGuide(scriptText, langCode) {
  const langName = { ko: '한국어', en: '영어', ja: '일본어', ca: '중국어' }[langCode] || '한국어';

  const langSpecific = {
    en: `영어 억양 가이드 필수 포함:
- 강세 음절에 대문자 표시 예) 'faSTen your SEAT belt'
- 내용어(content word) vs 기능어(function word) 구분
- 문장 끝 억양 방향 표시
- 연음(linking) 포인트 표시 예) 'seat_belt'`,
    ja: `일본어 억양 가이드 필수 포함:
- 고저 악센트 패턴 (高低로 표시) 예) 'ご搭乗 高低低低'
- 장음 위치 강조 (ー 충분히)
- 한국어 억양 개입 주의사항
- ん/촉음 처리 포인트`,
    ca: `중국어 억양 가이드 필수 포함:
- 각 단어 성조 표시 예) '女士(3성4성) 先生(1성1성)'
- 성조 변조 규칙 표시 (不/一)
- 리듬감 있는 연결 방법
- 스타카토 지양 포인트
- 방송문 각 문장(줄)에 한글 발음 독음 추가 (성조 제외, 한국어 화자가 읽기 쉽게 표기)
  예) "女士们、先生们，" → "뉘스먼 셴셩먼"`,
    ko: `한국어 억양 가이드 필수 포함:
- 문장 끝 어미 처리(~니다↘, ~세요↘) 반드시 포함
- 강조 단어 위치의 음높이 변화`
  };

  const prompt = `당신은 항공사 기내방송 전문 교관입니다.
아래 방송문을 분석해서 JSON만 반환하세요 (설명·주석 없이).

방송문 텍스트에 한글 독음이나 특수 기호가 포함되어 있어도 무시하고 분석해줘.
반드시 유효한 JSON만 반환해야 해. JSON 외 어떤 텍스트도 포함하지 말 것.

방송문 (${langName}):
${scriptText}

중요: 방송문이 영어/일본어/중국어이더라도 학습 가이드(summary, breakPoints 설명, speedGuide, intonationGuide, tips)는 반드시 한국어로 작성하세요. 단, emphasisWords와 intonationDetails의 phrase, breakPoints의 실제 방송문 구간은 원어 그대로 표시하고 설명만 한국어로 작성하세요.

끊어읽기 표시 규칙:
breakPoints 배열에서 각 문장의 끊어읽기를 아래 기호로 표시하세요:
- ,(반박자): 살짝 쉬는 곳 (쉼표 정도의 짧은 끊김)
- |(한박자): 충분히 쉬는 곳 (숨 한 번 쉬는 긴 끊김)
예시: '손님 여러분,| 보조배터리,(반박자) 전자담배,(반박자) 라이터는| 선반에 보관할 수 없으며,'

${langSpecific[langCode] || langSpecific.ko}

반환 형식:
{
  "summary": "이 방송문의 핵심 특징 1-2문장 (한국어)",
  "breakPoints": ["방송문 구간에 , | 기호 표시 후 한국어 설명", "..."],
  "emphasisWords": ["강조할 단어/구1 (원어)", "..."],
  "speedGuide": "속도 가이드 (한국어)",
  "intonationGuide": "전체 억양 개요 (한국어)",
  "intonationDetails": [
    { "phrase": "실제 방송문 구간 (원어)", "direction": "up 또는 down 또는 flat", "symbol": "↗ 또는 ↘ 또는 →", "guide": "구체적 연출 방법 (한국어)" }
  ],
  "tips": ["실전 팁 1 (한국어)", "..."],
  "chineseReadings": [{"original":"중국어 원문 줄","reading":"한글 독음"}]
}
중국어(ca)인 경우에만 chineseReadings 필드를 채워줘. 다른 언어는 chineseReadings 생략.`;

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  if (res.status === 501) throw new Error('로컬 환경에서는 배포 후 사용 가능합니다.');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

  // 1차: 직접 파싱
  try {
    return JSON.parse(raw);
  } catch (e) {
    // 2차: JSON 블록 추출 후 파싱
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (e2) {
        // 3차: 단순화된 프롬프트로 재시도
        console.warn('[가이드] JSON 파싱 2회 실패 → 단순 프롬프트 재시도');
        return await _retryGuideWithSimplePrompt(scriptText);
      }
    }
    // JSON 블록 자체가 없으면 바로 단순 재시도
    console.warn('[가이드] JSON 블록 없음 → 단순 프롬프트 재시도');
    return await _retryGuideWithSimplePrompt(scriptText);
  }
}

console.log('[완료] 학습 가이드 JSON 파싱 재시도 로직');

// ─── Firestore studyGuide 저장/로드 ───────────────────────────────────────
async function _saveGuideToFirestore(scriptId, langCode, guide) {
  if (!_db) return;
  try {
    await _db.collection('scripts').doc(scriptId).collection('studyGuide').doc(langCode).set(guide);
  } catch (e) { console.warn('[가이드 저장 실패]', e.message); }
}

async function _loadGuideFromFirestore(scriptId, langCode) {
  if (!_db) return null;
  try {
    const snap = await _db.collection('scripts').doc(scriptId).collection('studyGuide').doc(langCode).get();
    return snap.exists ? snap.data() : null;
  } catch (e) { console.warn('[가이드 로드 실패]', e.message); return null; }
}

// ─── 끊어읽기 텍스트 기호 변환 ────────────────────────────────────────────
// ,(반박자) → ∙(가운데점)  |(한박자) → /(굵은 사선) — 둘 다 진한 주황
function _colorizeBreakText(text) {
  return escHtml(String(text || '')).replace(/,\(반박자\)|\|\(한박자\)|,|\|/g, m => {
    if (m === ',(반박자)') return '<span class="sg-bp-short">∙<small>(반박자)</small></span>';
    if (m === '|(한박자)') return '<span class="sg-bp-long">/<small>(한박자)</small></span>';
    if (m === ',')         return '<span class="sg-bp-short">∙</span>';
    if (m === '|')         return '<span class="sg-bp-long">/</span>';
    return m;
  });
}

// ─── 끊어읽기 항목 렌더: 방송문 줄 / 가이드 줄 분리 ─────────────────────
// 데이터 형식: "방송문(기호 포함) — 한국어 설명" 또는 줄바꿈 구분
function _renderBreakItem(b) {
  const text = String(b || '');
  let scriptPart = text;
  let guidePart  = '';
  const sepIdx = text.indexOf(' — ');
  if (sepIdx !== -1) {
    scriptPart = text.slice(0, sepIdx).trim();
    guidePart  = text.slice(sepIdx + 3).trim();
  } else if (text.includes('\n')) {
    const parts = text.split('\n');
    scriptPart = parts[0].trim();
    guidePart  = parts.slice(1).join(' ').trim();
  }
  const scriptHtml = _colorizeBreakText(scriptPart);
  return guidePart
    ? `<div class="break-script-line">${scriptHtml}</div><div class="break-guide-line">💬 ${escHtml(guidePart)}</div>`
    : `<div class="break-script-line">${scriptHtml}</div>`;
}

console.log('[완료] 끊어읽기 기호 변환 및 레이아웃 분리');

// ─── 편집 모드 저장 처리 ───────────────────────────────────────────────────
async function _saveEditedGuide() {
  const s = state.currentScript;
  if (!s) return;
  const lang = state.selectedLang;
  const cacheKey = `${s.id}_${lang}`;
  const guide = _studyGuideCache[cacheKey];
  if (!guide) return;

  // summary
  const sumEl = document.querySelector('.sg-edit-summary');
  if (sumEl) guide.summary = sumEl.value.trim();
  // breakPoints
  const bpEls = document.querySelectorAll('.sg-edit-bp');
  if (bpEls.length) guide.breakPoints = Array.from(bpEls).map(t => t.value.trim()).filter(Boolean);
  // emphasisWords
  const ewEl = document.querySelector('.sg-edit-ew');
  if (ewEl) guide.emphasisWords = ewEl.value.split(',').map(w => w.trim()).filter(Boolean);
  // speedGuide
  const sgEl = document.querySelector('.sg-edit-speed');
  if (sgEl) guide.speedGuide = sgEl.value.trim();
  // intonationGuide
  const igEl = document.querySelector('.sg-edit-inton');
  if (igEl) guide.intonationGuide = igEl.value.trim();
  // intonationDetails
  document.querySelectorAll('.sg-edit-id-guide').forEach((el, i) => {
    if (guide.intonationDetails?.[i]) guide.intonationDetails[i].guide = el.value.trim();
  });
  // tips
  const tipEls = document.querySelectorAll('.sg-edit-tip');
  if (tipEls.length) guide.tips = Array.from(tipEls).map(t => t.value.trim()).filter(Boolean);

  _studyGuideCache[cacheKey] = guide;
  await _saveGuideToFirestore(s.id, lang, guide);
  _renderStudyGuide(guide);
  showToast('저장 완료');
}

// ─── 가이드 렌더링 ─────────────────────────────────────────────────────────
function _renderStudyGuide(guide) {
  const el = $('study-guide-result');
  const esc = s => escHtml(String(s || ''));
  const admin = isEditUnlocked();

  const editBtn = (sectionId) => admin
    ? `<button class="sg-edit-btn" data-section="${sectionId}" onclick="_sgToggleEdit('${sectionId}')">✏️</button>`
    : '';

  // [2] 끊어읽기 — , | 색상 구분 + 범례
  const breakPointsHtml = (guide.breakPoints?.length)
    ? `<div class="sg-section" id="sg-sec-break">
        <div class="sg-section-header">
          <span class="sg-section-title">끊어읽기 포인트</span>${editBtn('break')}
        </div>
        <div class="sg-bp-legend"><span class="sg-bp-short">∙(반박자)</span> 짧게 쉬기&nbsp;&nbsp;<span class="sg-bp-long">/(한박자)</span> 충분히 쉬기</div>
        <div id="sg-body-break">
          ${guide.breakPoints.map(b => `<div class="sg-break-item">${_renderBreakItem(b)}</div>`).join('')}
        </div>
       </div>` : '';

  const emphasisHtml = (guide.emphasisWords?.length)
    ? `<div class="sg-section" id="sg-sec-emphasis">
        <div class="sg-section-header">
          <span class="sg-section-title">강조 단어</span>${editBtn('emphasis')}
        </div>
        <div id="sg-body-emphasis" class="sg-emphasis-wrap">${guide.emphasisWords.map(w => `<span class="sg-emphasis-badge">${esc(w)}</span>`).join('')}</div>
       </div>` : '';

  // [3] 억양 — intonationDetails 표시 (기호 색상 + 2행 레이아웃)
  const _dirSymbol = { up: '↗', down: '↘', flat: '→' };
  const intonDetailHtml = (guide.intonationDetails?.length)
    ? guide.intonationDetails.map((d) => {
        const dir = d.direction || 'flat';
        const sym = d.symbol || _dirSymbol[dir] || '→';
        return `<div class="sg-inton-detail">
          <div class="sg-inton-detail-top">
            <span class="sg-inton-symbol sg-inton-${dir}">${esc(sym)}</span>
            <span class="sg-inton-phrase">${esc(d.phrase)}</span>
          </div>
          <span class="sg-inton-guide">${esc(d.guide)}</span>
        </div>`;
      }).join('') : '';
  console.log('[완료] 억양 표시 색상 및 레이아웃 강화');

  const speedIntonHtml = (guide.speedGuide || guide.intonationGuide || guide.intonationDetails?.length)
    ? `<div class="sg-section" id="sg-sec-inton">
        <div class="sg-section-header">
          <span class="sg-section-title">속도 & 억양</span>${editBtn('inton')}
        </div>
        <div id="sg-body-inton">
          ${guide.speedGuide ? `<div class="sg-speed-row">🐢 속도: ${esc(guide.speedGuide)}</div>` : ''}
          ${guide.intonationGuide ? `<div class="sg-intonation-row">↗↘ 억양 개요: ${esc(guide.intonationGuide)}</div>` : ''}
          ${intonDetailHtml ? `<div class="sg-inton-details">${intonDetailHtml}</div>` : ''}
        </div>
       </div>` : '';

  const tipsHtml = (guide.tips?.length)
    ? `<div class="sg-section" id="sg-sec-tips">
        <div class="sg-section-header">
          <span class="sg-section-title">실전 팁</span>${editBtn('tips')}
        </div>
        <div id="sg-body-tips">
          ${guide.tips.map(t => `<div class="sg-tip-item">💡 ${esc(t)}</div>`).join('')}
        </div>
       </div>` : '';

  const saveBtn = admin
    ? `<button class="btn-primary sg-save-btn hidden" id="sg-save-btn" onclick="_saveEditedGuide()">💾 저장</button>` : '';

  el.innerHTML = `
    ${guide.summary ? `<div class="sg-summary-card" id="sg-sec-summary">
      <div class="sg-section-header" style="margin-bottom:4px">
        <span></span>${editBtn('summary')}
      </div>
      <div id="sg-body-summary">${esc(guide.summary)}</div>
    </div>` : ''}
    ${breakPointsHtml}
    ${emphasisHtml}
    ${speedIntonHtml}
    ${tipsHtml}
    ${saveBtn}
  `;
  el.classList.remove('hidden');
}

// ─── 관리자 인라인 편집 토글 ──────────────────────────────────────────────
function _sgToggleEdit(section) {
  const cacheKey = `${state.currentScript?.id}_${state.selectedLang}`;
  const guide = _studyGuideCache[cacheKey];
  if (!guide) return;
  const esc = s => escHtml(String(s || ''));
  const body = $(`sg-body-${section}`);
  if (!body) return;

  if (body.querySelector('textarea, input')) {
    // 이미 편집 중 → 보기 모드로 되돌리기
    _renderStudyGuide(guide);
    return;
  }

  let html = '';
  if (section === 'break') {
    html = (guide.breakPoints || []).map(b =>
      `<textarea class="sg-edit-bp sg-edit-area">${esc(b)}</textarea>`).join('');
  } else if (section === 'emphasis') {
    html = `<input class="sg-edit-ew sg-edit-input" value="${esc((guide.emphasisWords || []).join(', '))}">
            <div class="sg-edit-hint">쉼표(,)로 구분</div>`;
  } else if (section === 'inton') {
    html = `${guide.speedGuide !== undefined ? `<div class="sg-edit-label">속도</div><textarea class="sg-edit-speed sg-edit-area">${esc(guide.speedGuide)}</textarea>` : ''}
            ${guide.intonationGuide !== undefined ? `<div class="sg-edit-label">억양 개요</div><textarea class="sg-edit-inton sg-edit-area">${esc(guide.intonationGuide)}</textarea>` : ''}
            ${(guide.intonationDetails || []).map((d, i) =>
              `<div class="sg-edit-label">${esc(d.symbol)} ${esc(d.phrase)}</div>
               <textarea class="sg-edit-id-guide sg-edit-area" data-idx="${i}">${esc(d.guide)}</textarea>`
            ).join('')}`;
  } else if (section === 'tips') {
    html = (guide.tips || []).map(t =>
      `<textarea class="sg-edit-tip sg-edit-area">${esc(t)}</textarea>`).join('');
  } else if (section === 'summary') {
    html = `<textarea class="sg-edit-summary sg-edit-area">${esc(guide.summary)}</textarea>`;
  }

  body.innerHTML = html;
  const saveBtn = $('sg-save-btn');
  if (saveBtn) saveBtn.classList.remove('hidden');
}

// ===== DRILL MODE =====
// _prepSetMvState 제거됨 — 공통 플레이어(createModelVoicePlayer)가 상태 관리
let _currentModelAudio = null;
let _drill = { sentences: [], idx: 0, myBlob: null, myAudioUrl: null, modelAudio: null, mr: null, stream: null, chunks: [], recording: false };

async function startDrillMode() {
  const s = state.currentScript;
  const lang = s?.langs[state.selectedLang];
  if (!lang) return;
  const url = await _resolveModelVoiceUrl(s.id, state.selectedLang);
  if (!url) { showToast('모델 음성이 없습니다. 학습 모드를 먼저 확인해주세요.', 3000); return; }
  const sentences = splitSentences(lang.text).filter(s => s.length > 2);
  if (!sentences.length) { showToast('방송문이 없습니다'); return; }
  _drill = { sentences, idx: 0, myBlob: null, myAudioUrl: null, modelAudio: null, mr: null, stream: null, chunks: [], recording: false };
  showScreen('screen-drill');
  _drillRender();
}

function _drillRender() {
  const { sentences, idx } = _drill;
  $('drill-progress-text').textContent = `${idx + 1} / ${sentences.length}`;
  $('drill-progress-fill').style.width = `${((idx + 1) / sentences.length) * 100}%`;
  $('drill-sentence-box').textContent = sentences[idx];
  $('drill-actions').classList.remove('hidden');
  $('drill-compare').classList.add('hidden');
  $('drill-complete').classList.add('hidden');
  const recBtn = $('btn-drill-record');
  recBtn.textContent = '🎤 따라읽기 시작';
  recBtn.onclick = _drillStartRec;
  // [2] 같은 방송문 내 문장 전환 시 audio 객체 유지 — URL 동일하므로 재사용
  // (새 URL이면 doPlay 첫 호출 시 createModelVoicePlayer 내부에서 자동 교체됨)
  if (_currentModelAudio) { _currentModelAudio.pause(); }
  createModelVoicePlayer('drill-model-player');
  console.log(`[드릴모드] 문장 ${idx + 1}/${sentences.length} 시작`);
}

async function _drillStartRec() {
  // 따라읽기 시작 시 모델 음성 일시정지만 (currentTime·객체 유지 — 비교 화면에서 이어듣기 위해)
  if (_currentModelAudio) { _currentModelAudio.pause(); }
  const mvpPlay = $('drill-model-player-play');
  if (mvpPlay) { mvpPlay.textContent = '▶ 재생'; }

  try {
    _drill.chunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _drill.stream = stream;
    const _drillRecOpts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' } : {};
    const mr = new MediaRecorder(stream, _drillRecOpts);
    _drill.mr = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) _drill.chunks.push(e.data); };
    mr.onstop = () => {
      _drill.myBlob = new Blob(_drill.chunks, { type: mr.mimeType || 'audio/webm' });
      if (_drill.myAudioUrl) URL.revokeObjectURL(_drill.myAudioUrl);
      _drill.myAudioUrl = URL.createObjectURL(_drill.myBlob);
      // [1] 비교 화면은 0:00부터 새로 듣기 — currentTime만 초기화, 객체·src 유지
      if (_currentModelAudio) { _currentModelAudio.currentTime = 0; }
      $('drill-actions').classList.add('hidden');
      $('drill-compare').classList.remove('hidden');
      createModelVoicePlayer('drill-compare-player', { noGender: true });
      console.log(`[드릴모드] 문장 ${_drill.idx + 1} 녹음 완료`);
    };
    mr.start();
    _drill.recording = true;
    const btn = $('btn-drill-record');
    btn.textContent = '⏹ 녹음 중지';
    btn.onclick = _drillStopRec;
  } catch (e) { alert('마이크 접근이 필요합니다: ' + e.message); }
}

function _drillStopRec() {
  _drill.stream?.getTracks().forEach(t => t.stop());
  if (_drill.mr?.state !== 'inactive') _drill.mr.stop();
  _drill.recording = false;
}

function _drillNext() {
  if (_drill.myAudioUrl) { URL.revokeObjectURL(_drill.myAudioUrl); _drill.myAudioUrl = null; }
  _drill.myBlob = null;
  _drill.idx++;
  if (_drill.idx >= _drill.sentences.length) {
    $('drill-actions').classList.add('hidden');
    $('drill-compare').classList.add('hidden');
    $('drill-complete').classList.remove('hidden');
    console.log('[드릴모드] 드릴 완료!');
  } else {
    _drillRender();
  }
}

// ===== LOADING OVERLAY =====
const _LOADING_STEPS = [
  { from: 0,  msg: '🎤 음성을 업로드하고 있습니다...' },
  { from: 3,  msg: '🔍 발음과 억양을 분석하고 있습니다...' },
  { from: 6,  msg: '📊 채점 기준에 맞게 평가하고 있습니다...' },
  { from: 10, msg: '📝 맞춤 피드백을 작성하고 있습니다...' },
];
const _LOADING_TIPS = [
  '끊어읽기는 승객의 이해도를 높이는 핵심 기술입니다',
  '미소 띤 목소리는 승객에게 편안함을 줍니다',
  '문장 끝을 내려읽으면 더 안정적으로 들립니다',
  '강조할 단어 앞에서 살짝 멈춰보세요',
  '천천히 읽는 것이 빠르게 읽는 것보다 전달력이 높습니다',
];
let _overlayTimers = [];
let _overlayTipIdx = 0;
let _overlayStepStart = 0;

function _startOverlayTimers() {
  _overlayTimers.forEach(clearTimeout);
  _overlayTimers = [];
  _overlayTipIdx = 0;
  _overlayStepStart = Date.now();

  // 단계별 메시지
  _LOADING_STEPS.forEach(step => {
    const t = setTimeout(() => {
      const el = $('loading-step-msg');
      if (el) el.textContent = step.msg;
    }, step.from * 1000);
    _overlayTimers.push(t);
  });

  // 팁 순환 (3.8초마다)
  const cycleTip = () => {
    const el = $('loading-tip-text');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => {
      _overlayTipIdx = (_overlayTipIdx + 1) % _LOADING_TIPS.length;
      el.textContent = _LOADING_TIPS[_overlayTipIdx];
      el.style.opacity = '1';
    }, 300);
    _overlayTimers.push(setTimeout(cycleTip, 3800));
  };
  _overlayTimers.push(setTimeout(cycleTip, 3800));

  // 진행바 애니메이션 재시작
  const bar = $('loading-progress-bar');
  if (bar) {
    bar.style.transition = 'none';
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      bar.style.transition = 'width 12s ease-out';
      bar.style.width = '85%';
    });
  }
}

function _completeOverlay() {
  _overlayTimers.forEach(clearTimeout);
  _overlayTimers = [];
  const bar = $('loading-progress-bar');
  if (bar) { bar.style.transition = 'width 0.3s ease'; bar.style.width = '100%'; }
  setTimeout(() => {
    const overlay = $('loading-overlay');
    if (!overlay) return;
    overlay.style.transition = 'opacity 0.35s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.opacity = '';
      overlay.style.transition = '';
    }, 350);
  }, 300);
  console.log('[완료] 분석 오버레이 종료');
}

// ===== RESULT MODEL VOICE COMPARISON =====
let _lastRecordingBlob = null;
let _lastRecordingUrl  = null;
let _aiAnalysisRetryCount = 0;  // 재분석 시도 횟수 (최대 2회)
let _cmp = { active: false, audio: null, timeout: null, myUrl: null };
let _rvcModelAudio = null;   // 결과 화면 모델 음성 Audio 객체
let _rvcMyAudio    = null;   // 결과 화면 내 녹음 Audio 객체

function _rvcFmt(s) { const m = Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

function _rvcAttachScrub(audio, scrubId, timeId, btnId) {
  const scrub = $(scrubId), timeEl = $(timeId), btn = $(btnId);
  if (!scrub || !timeEl || !btn) return;
  scrub.disabled = false;
  audio.ontimeupdate = () => {
    const dur = audio.duration || 0, cur = audio.currentTime || 0;
    if (dur > 0) { scrub.max = dur; scrub.value = cur; }
    timeEl.textContent = `${_rvcFmt(cur)} / ${_rvcFmt(dur)}`;
  };
  audio.onended = () => {
    btn.textContent = '▶ 재생';
    scrub.value = 0; timeEl.textContent = `0:00 / ${_rvcFmt(audio.duration || 0)}`;
  };
  scrub.oninput = () => { if (!audio.paused || audio.readyState >= 2) audio.currentTime = parseFloat(scrub.value); };
}

function _cmpStop() {
  _cmp.active = false;
  _cmp.audio?.pause(); _cmp.audio = null;
  clearTimeout(_cmp.timeout); _cmp.timeout = null;
  if (_cmp.myUrl) { URL.revokeObjectURL(_cmp.myUrl); _cmp.myUrl = null; }
  const statusEl = $('compare-status-text');
  if (statusEl) { statusEl.classList.add('hidden'); statusEl.textContent = ''; }
  $('btn-compare-stop')?.classList.add('hidden');
  $('btn-compare-voice')?.classList.remove('hidden');
}

function stopModelComparison() { _cmpStop(); }

async function playModelVoice() {
  _cmpStop();
  const btn = $('btn-play-model');
  // 토글
  if (_rvcModelAudio && !_rvcModelAudio.paused) {
    _rvcModelAudio.pause(); if (btn) btn.textContent = '▶ 재생'; return;
  }
  if (_rvcModelAudio && _rvcModelAudio.paused) {
    _rvcModelAudio.play().catch(()=>{}); if (btn) btn.textContent = '⏸ 일시정지'; return;
  }
  const s = state.currentScript;
  if (!s) return;
  const url = await _resolveModelVoiceUrl(s.id, state.selectedLang);
  if (!url) { showToast('모델 음성 없음'); return; }
  if (_rvcModelAudio) { _rvcModelAudio.pause(); }
  _rvcModelAudio = new Audio(url);
  _rvcModelAudio.setAttribute('playsinline', '');
  if (btn) btn.textContent = '⏸ 일시정지';
  _rvcAttachScrub(_rvcModelAudio, 'rvc-model-scrub', 'rvc-model-time', 'btn-play-model');
  _rvcModelAudio.play().catch(()=>{});
  console.log('[완료] 모델 음성 재생');
}

function playMyRecording() {
  _cmpStop();
  const btn = $('btn-play-my');
  // 토글
  if (_rvcMyAudio && !_rvcMyAudio.paused) {
    _rvcMyAudio.pause(); if (btn) btn.textContent = '▶ 재생'; return;
  }
  if (_rvcMyAudio && _rvcMyAudio.paused) {
    _rvcMyAudio.play().catch(()=>{}); if (btn) btn.textContent = '⏸ 일시정지'; return;
  }
  if (!_lastRecordingUrl) { showToast('녹음 파일 없음'); return; }
  _rvcMyAudio = new Audio(_lastRecordingUrl);
  _rvcMyAudio.setAttribute('playsinline', '');
  if (btn) btn.textContent = '⏸ 일시정지';
  _rvcAttachScrub(_rvcMyAudio, 'rvc-my-scrub', 'rvc-my-time', 'btn-play-my');
  _rvcMyAudio.onended = () => { if (btn) btn.textContent = '▶ 재생'; };
  _rvcMyAudio.play().catch(e => {
    console.error('[내음성] 재생 오류:', e);
    showToast('재생 실패. 브라우저 설정을 확인해주세요.', 'error');
  });
  console.log('[완료] 내 녹음 재생');
}

async function startModelComparison() {
  const s = state.currentScript;
  if (!s) return;
  const url = await _resolveModelVoiceUrl(s.id, state.selectedLang);
  if (!url) { showToast('모델 음성 없음'); return; }
  if (!_lastRecordingBlob) { showToast('내 녹음이 없습니다'); return; }
  _cmpStop();
  _cmp.active = true;
  $('compare-status-text').classList.remove('hidden');
  $('btn-compare-stop').classList.remove('hidden');
  $('btn-compare-voice').classList.add('hidden');
  console.log('[비교모드] 모델 vs 내 음성 비교 시작');
  _cmpCycle();
}

function _cmpCycle() {
  if (!_cmp.active) return;
  const url = _getCachedModelVoiceUrl(state.currentScript.id, state.selectedLang)
    || _mvUrlCache[`${state.currentScript.id}_${state.selectedLang}_${_currentGender}`];
  $('compare-status-text').textContent = '🎵 모델 음성 재생 중...';
  const a = new Audio(url);
  _cmp.audio = a;
  a.play().catch(() => {});
  a.onended = () => {
    if (!_cmp.active) return;
    _cmp.timeout = setTimeout(() => {
      if (!_cmp.active) return;
      $('compare-status-text').textContent = '🎤 내 녹음 재생 중...';
      const b = new Audio(_lastRecordingUrl);
      b.setAttribute('playsinline', '');
      _cmp.audio = b;
      b.play().catch(() => {});
      b.onended = () => {
        if (!_cmp.active) return;
        _cmp.timeout = setTimeout(_cmpCycle, 1000);
      };
    }, 1000);
  };
}

// ===== ANALYSIS =====
function analyzeAndShow(duration) {
  const s = state.currentScript;
  const lang = s.langs[state.selectedLang];
  const transcript = state.transcript.trim();
  const hasSpeech = transcript.length > 5;
  const hasAudio  = state.pitchSamples.length >= 8 && state.amplitudeSamples.length >= 10;

  // --- 내용 측정 (문안 일치) ---
  const wordMatch    = hasSpeech ? measureWordMatch(transcript, lang.text) : 0;
  const completeness = hasSpeech ? measureCompleteness(transcript, lang.keyPhrases) : 0;

  // ── 내용 일치율 게이트 (cG) ──────────────────────────────────────────────
  // 방송문과 얼마나 일치했는지를 0~1로 나타낸 값.
  // 이 값이 낮으면 음성 신호 기반 점수(강조·억양·발성 등)도 비례해서 낮아짐.
  // → "아~" 한 마디처럼 내용이 전혀 없을 때 음성 품질만으로 좋은 점수가 나오는
  //   오류를 방지한다.
  const contentQuality = Math.min(1, wordMatch * 0.55 + completeness * 0.45);
  const cGRaw = contentQuality >= 0.10 ? contentQuality : 0;
  // 목소리·억양 신호는 STT와 독립적으로 평가 → 최소 0.60 보장
  // (STT 부정확 → 목소리·억양 전체 0점 되는 연쇄 패널티 방지)
  const cG = hasAudio && cGRaw > 0 ? Math.max(0.60, cGRaw) : cGRaw;
  // ─────────────────────────────────────────────────────────────────────────

  // --- 음성 신호 측정 ---
  // 영어는 단어 수(WPM), 한·일·중은 음절 수(음절/분)
  const speedRaw = hasSpeech && duration > 3
    ? (state.selectedLang === 'en'
        ? transcript.split(' ').filter(Boolean).length
        : transcript.replace(/\s/g, '').length)
      / duration * 60
    : 0;
  const wpmRatio = speedRaw > 0
    ? Math.max(0, 1 - Math.abs(speedRaw - lang.idealSpeed) / lang.speedTolerance)
    : 0;
  const pitchCV    = hasAudio ? measurePitchCV(state.pitchSamples) : 0;
  const pitchRange = hasAudio ? measurePitchRange(state.pitchSamples) : 0;
  const ampStab    = hasAudio ? measureAmpStability(state.amplitudeSamples) : 0;
  const ampPeaks   = hasAudio ? measureAmpPeaks(state.amplitudeSamples) : 0;
  const meanPitch  = hasAudio ? state.pitchSamples.reduce((a,b)=>a+b,0)/state.pitchSamples.length : 0;
  const pauseRatio = state.pauseSamples.length > 0 ? state.pauseSamples.filter(v=>v===0).length / state.pauseSamples.length : 0;
  const naturalPause = pauseRatio >= 0.05 && pauseRatio <= 0.35 ? 1 - Math.abs(pauseRatio - 0.20) / 0.20 : 0;

  // 피치 대역 (150-300 Hz 여성, 100-200 Hz 남성)
  const pitchWarmth = meanPitch > 0
    ? (meanPitch >= 130 && meanPitch <= 320 ? Math.max(0, 1 - Math.abs(meanPitch - 225) / 95) : 0.1)
    : 0;

  // 억양 CV 정규화 (이상 CV: 0.05~0.20)
  const intonationCV = pitchCV > 0
    ? (pitchCV >= 0.05 && pitchCV <= 0.20
        ? 0.65 + (pitchCV - 0.05) / 0.15 * 0.35
        : pitchCV < 0.05 ? pitchCV / 0.05 * 0.65
        : Math.max(0.1, 1 - (pitchCV - 0.20) * 2.5))
    : 0;

  // ── cG 적용: 내용 일치율이 낮으면 음성 신호 지표도 낮아짐 ──────────────
  const gAmpPeaks    = ampPeaks    * cG;
  const gAmpStab     = ampStab     * (0.55 + 0.45 * cG); // 발성 안정성: 기본 55% 신호 반영
  const gPitchWarmth = pitchWarmth * cG;
  const gIntonCV     = intonationCV * cG;
  const gPitchRange  = pitchRange  * cG;
  // ─────────────────────────────────────────────────────────────────────────

  // ---- 유창성 (30점) ----
  const fluencyItems = [
    tierScore(Math.min(1, naturalPause * 0.5 + completeness * 0.5), 5),                        // 끊어읽기
    tierScore(wpmRatio * (cG >= 0.3 ? 1 : cG / 0.3), 5),                                      // 속도
    tierScore(gAmpPeaks, 5),                                                                    // 강조
    tierScore(completeness * 0.7 + wordMatch * 0.3, 5),                                        // 문안 숙지
    tierScore(Math.min(1, wpmRatio * 0.3 + gIntonCV * 0.4 + gAmpStab * 0.3), 10)             // 말하는 듯한 연출
  ];

  // ---- 분위기/목소리 (25점) ----
  const voiceItems = [
    tierScore(gAmpStab, 10),                                                                    // 안정적인 발성
    tierScore(Math.min(1, gPitchWarmth * 0.5 + gAmpStab * 0.5), 5),                           // 자연스러운 톤
    tierScore(Math.min(1, gPitchWarmth * 0.55 + gIntonCV * 0.25 + gAmpStab * 0.20), 10)      // 친근한 분위기
  ];

  // ---- 억양 (25점) ----
  const intonationItems = [
    tierScore(Math.min(1, gIntonCV * 0.6 + wpmRatio * 0.4), 5),                               // 조사/어미 처리
    tierScore(gPitchRange, 10),                                                                  // 전반적인 억양
    tierScore(gIntonCV, 10)                                                                      // 고른 억양
  ];

  // ---- 발음 (20점) ----
  const pronunciationItems = [
    tierScore(wordMatch, 10),                                                                    // 정확성
    tierScore(Math.min(1, wordMatch * 0.55 + completeness * 0.45), 10)                         // 명확성
  ];

  const total =
    fluencyItems.reduce((a,b)=>a+b,0) +
    voiceItems.reduce((a,b)=>a+b,0) +
    intonationItems.reduce((a,b)=>a+b,0) +
    pronunciationItems.reduce((a,b)=>a+b,0);

  const result = {
    total, pass: total >= 75,
    wpm: Math.round(speedRaw), speedUnit: lang.speedUnit, duration,
    wordMatch, completeness, contentQuality,
    categories: {
      fluency:       { score: fluencyItems.reduce((a,b)=>a+b,0),       max: 30, items: fluencyItems },
      voice:         { score: voiceItems.reduce((a,b)=>a+b,0),         max: 25, items: voiceItems },
      intonation:    { score: intonationItems.reduce((a,b)=>a+b,0),    max: 25, items: intonationItems },
      pronunciation: { score: pronunciationItems.reduce((a,b)=>a+b,0), max: 20, items: pronunciationItems }
    }
  };

  // 오버레이는 Gemini 완료 후 _completeOverlay()에서 제거
  showResults(result, transcript);
}

// ===== 측정 함수 (엄격) =====
function measureWordMatch(transcript, script) {
  const tW = normalize(transcript).split(' ').filter(Boolean);
  const sW = normalize(script).split(' ').filter(Boolean);
  if (!tW.length || !sW.length) return 0;
  let matches = 0; const used = new Set();
  for (const tw of tW) {
    for (let i = 0; i < sW.length; i++) {
      if (!used.has(i) && similarity(tw, sW[i]) > 0.72) { matches++; used.add(i); break; }
    }
  }
  const prec = matches / tW.length, rec = matches / sW.length;
  return prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
}

function measureCompleteness(transcript, keyPhrases) {
  const norm = normalize(transcript);
  let found = 0;
  for (const phrase of keyPhrases) {
    const np = normalize(phrase);
    if (norm.includes(np)) { found++; continue; }
    if (np.split(' ').some(w => w.length > 1 && norm.includes(w))) found += 0.6;
  }
  return Math.min(1, found / keyPhrases.length);
}

function measurePitchCV(samples) {
  if (samples.length < 8) return 0;
  const mean = samples.reduce((a,b)=>a+b,0) / samples.length;
  const variance = samples.reduce((a,b)=>a+(b-mean)**2,0) / samples.length;
  return mean > 0 ? Math.sqrt(variance) / mean : 0;
}

function measurePitchRange(samples) {
  if (samples.length < 8) return 0;
  const sorted = [...samples].sort((a,b)=>a-b);
  const p10 = sorted[Math.floor(samples.length*0.10)];
  const p90 = sorted[Math.floor(samples.length*0.90)];
  if (p10 === 0) return 0;
  const range = (p90 - p10) / p10;
  if (range >= 0.20 && range <= 0.80) return 0.65 + (range - 0.20) / 0.60 * 0.35;
  if (range < 0.20) return range / 0.20 * 0.65;
  return Math.max(0.1, 1 - (range - 0.80) * 0.6);
}

function measureAmpStability(samples) {
  if (samples.length < 10) return 0;
  const speaking = samples.filter(v => v > 0.018);
  if (speaking.length < 5) return 0;
  const mean = speaking.reduce((a,b)=>a+b,0) / speaking.length;
  if (mean === 0) return 0;
  const cv = Math.sqrt(speaking.reduce((a,b)=>a+(b-mean)**2,0)/speaking.length) / mean;
  return Math.max(0, Math.min(1, 1 - cv * 1.4));
}

function measureAmpPeaks(samples) {
  if (samples.length < 15) return 0;
  const mean = samples.reduce((a,b)=>a+b,0) / samples.length;
  if (mean < 0.005) return 0;
  const thresh = mean * 1.55;
  let peaks = 0;
  for (let i = 1; i < samples.length-1; i++) {
    if (samples[i] > thresh && samples[i] >= samples[i-1] && samples[i] >= samples[i+1]) peaks++;
  }
  const rate = peaks / (samples.length / 10);
  if (rate >= 0.4 && rate <= 2.2) return 0.65 + (rate / 2.2) * 0.35;
  if (rate < 0.4) return rate / 0.4 * 0.65;
  return Math.max(0.1, 1 - (rate - 2.2) * 0.2);
}

// ===== RESULTS =====
// eslint-disable-next-line no-unused-vars
function showResults(result, transcript) {
  showScreen('screen-result');
  stopModelComparison();
  // 결과 화면 진입 시 음성 객체 초기화
  if (_rvcModelAudio) { _rvcModelAudio.pause(); _rvcModelAudio = null; }
  if (_rvcMyAudio)    { _rvcMyAudio.pause();    _rvcMyAudio    = null; }
  const modelBtn = $('btn-play-model'); if (modelBtn) modelBtn.textContent = '▶ 재생';
  const myBtn    = $('btn-play-my');    if (myBtn)    myBtn.textContent    = '▶ 재생';
  const mScrub   = $('rvc-model-scrub'); if (mScrub) { mScrub.value = 0; mScrub.disabled = true; }
  const yScrub   = $('rvc-my-scrub');   if (yScrub)  { yScrub.value = 0; yScrub.disabled = true; }
  const mTime    = $('rvc-model-time'); if (mTime)  mTime.textContent  = '0:00 / 0:00';
  const yTime    = $('rvc-my-time');    if (yTime)  yTime.textContent   = '0:00 / 0:00';

  const lang    = state.currentScript.langs[state.selectedLang];
  const isAdmin = isEditUnlocked();

  // 내 녹음 없으면 scrub 영역 메시지
  if (!_lastRecordingBlob) {
    const yTime2 = $('rvc-my-time'); if (yTime2) yTime2.textContent = '녹음 파일 없음';
  }

  renderTranscriptCompare(transcript, lang);

  // AI 상세 분석 섹션 — 스켈레톤 4개 표시
  const aiSec = $('ai-result-section');
  if (aiSec) {
    const skeletonCard = () => `
      <div class="ai-ske-card">
        <div class="ai-ske-header">
          <div class="skeleton-line" style="width:30%"></div>
          <div class="skeleton-line" style="width:18%"></div>
        </div>
        <div class="skeleton-line" style="width:90%"></div>
        <div class="skeleton-line" style="width:75%"></div>
        <div class="skeleton-line" style="width:85%"></div>
      </div>`;
    aiSec.innerHTML = skeletonCard() + skeletonCard() + skeletonCard() + skeletonCard();
  }
  console.log('[완료] 결과 화면 표시 (스켈레톤)');

  // AI 채점 — 완료 시 오버레이 종료 + 스켈레톤 교체
  if (firebase.apps.length && state.audioBlob) {
    callGeminiScoring(lang.text, state.audioBlob, state.selectedLang, lang.checkpoints).then(aiResult => {
      _completeOverlay();
      if (aiResult) {
        renderAiResult(aiResult, isAdmin);
        if (aiResult.transcript) renderTranscriptCompare(aiResult.transcript, lang);
      } else {
        if (aiSec) _showAiErrorWithRetry(aiSec);
      }
    }).catch(() => {
      _completeOverlay();
      if (aiSec) _showAiErrorWithRetry(aiSec);
    });
  } else {
    // Firebase 없는 경우 즉시 오버레이 종료
    _completeOverlay();
    if (aiSec) aiSec.innerHTML = '<div class="ai-ske-error">AI 분석은 배포 환경에서 사용 가능합니다.</div>';
  }
}

function _showAiErrorWithRetry(aiSec) {
  const hasBlob = !!_lastRecordingBlob;
  const retryBtnHtml = hasBlob
    ? `<button class="ai-error-btn ai-error-btn-retry" onclick="_retryAiAnalysis()">🔄 다시 분석하기</button>
       <button class="ai-error-btn ai-error-btn-rerecord" onclick="_goRerecord()">🎤 다시 녹음하기</button>`
    : `<button class="ai-error-btn ai-error-btn-rerecord" onclick="_goRerecord()">🎤 다시 녹음하기</button>`;

  aiSec.innerHTML = `
    <div class="ai-error-card">
      <div class="ai-error-icon">⚠️</div>
      <div class="ai-error-title">분석 중 오류가 발생했습니다</div>
      ${hasBlob ? '<div class="ai-error-sub">녹음 파일은 보존되어 있습니다.<br>다시 분석을 시도해보세요.</div>' : ''}
      <div class="ai-error-actions">${retryBtnHtml}</div>
      <div class="ai-error-hint">💡 오류가 반복되면:<br>네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.</div>
    </div>`;
  console.log('[완료] AI 오류 화면 표시 (재시도 버튼 포함)');
}

async function _retryAiAnalysis() {
  if (!_lastRecordingBlob) {
    showToast('녹음 파일이 없습니다. 다시 녹음해주세요.', 3000);
    return;
  }

  _aiAnalysisRetryCount++;
  if (_aiAnalysisRetryCount > 2) {
    const aiSec = $('ai-result-section');
    if (aiSec) aiSec.innerHTML = `
      <div class="ai-error-card">
        <div class="ai-error-icon">⚠️</div>
        <div class="ai-error-title">네트워크 오류로 분석이 어렵습니다</div>
        <div class="ai-error-sub">다시 녹음 후 시도해주세요.</div>
        <div class="ai-error-actions">
          <button class="ai-error-btn ai-error-btn-rerecord" onclick="_goRerecord()">🎤 다시 녹음하기</button>
        </div>
      </div>`;
    return;
  }

  const aiSec = $('ai-result-section');
  const skeletonCard = () => `
    <div class="ai-ske-card">
      <div class="ai-ske-header">
        <div class="skeleton-line" style="width:30%"></div>
        <div class="skeleton-line" style="width:18%"></div>
      </div>
      <div class="skeleton-line" style="width:90%"></div>
      <div class="skeleton-line" style="width:75%"></div>
      <div class="skeleton-line" style="width:85%"></div>
    </div>`;
  if (aiSec) aiSec.innerHTML = skeletonCard() + skeletonCard() + skeletonCard() + skeletonCard();

  $('loading-overlay').classList.remove('hidden');
  _startOverlayTimers();

  const s = state.currentScript;
  const lang = s?.langs[state.selectedLang];
  const isAdmin = isEditUnlocked();

  try {
    const aiResult = await callGeminiScoring(lang.text, _lastRecordingBlob, state.selectedLang, lang.checkpoints);
    _completeOverlay();
    if (aiResult) {
      renderAiResult(aiResult, isAdmin);
      if (aiResult.transcript) renderTranscriptCompare(aiResult.transcript, lang);
    } else {
      if (aiSec) _showAiErrorWithRetry(aiSec);
    }
  } catch {
    _completeOverlay();
    if (aiSec) _showAiErrorWithRetry(aiSec);
  }
  console.log(`[완료] AI 재분석 시도 ${_aiAnalysisRetryCount}회`);
}

function _goRerecord() {
  _lastRecordingBlob = null;
  if (_lastRecordingUrl) { URL.revokeObjectURL(_lastRecordingUrl); _lastRecordingUrl = null; }
  if (state.currentScript) startPrep(state.currentScript, state.selectedLang);
  console.log('[완료] 다시 녹음하기 → 준비 화면 복귀');
}

function renderRadar(result) {
  if (state.radarChartInstance) { state.radarChartInstance.destroy(); state.radarChartInstance = null; }
  const cats = Object.entries(CHECKLIST);
  const myData = cats.map(([k,c]) => Math.round(result.categories[k].score / c.max * 100));
  const ctx = $('radar-chart').getContext('2d');
  state.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: cats.map(([,c]) => `${c.label}(${c.max}점)`),
      datasets: [
        {
          label: '내 점수(%)',
          data: myData,
          backgroundColor: result.pass ? 'rgba(59,130,246,.18)' : 'rgba(239,68,68,.15)',
          borderColor: result.pass ? '#3b82f6' : '#ef4444',
          borderWidth: 2.5, pointBackgroundColor: result.pass ? '#3b82f6' : '#ef4444', pointRadius: 4
        },
        {
          label: 'PASS 기준(75%)',
          data: [75,75,75,75],
          backgroundColor: 'rgba(16,185,129,.05)',
          borderColor: 'rgba(16,185,129,.55)',
          borderWidth: 1.5, borderDash: [5,4],
          pointRadius: 2, pointBackgroundColor: '#10b981'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true, min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: 'rgba(0,0,0,.07)' },
          pointLabels: { font: { size: 10, weight: '600' }, color: '#475569' }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } }
      }
    }
  });
}

function renderFeedback(result, transcript, lang, isAdmin) {
  const cats = result.categories;

  /* ── 카테고리별 개선 팁 정의 ──
     cq = content quality (0~1). 음성·억양 기반 팁은 방송 내용이 충분히 인식됐을 때만 유효.
     cq < 0.3 이면 행동 관련 팁 대신 "내용 인식 부족" 안내를 표시한다. */
  const cq = result.contentQuality ?? 0;
  const cqOk  = cq >= 0.30;  // 음성 분석 팁이 의미 있는 최소 임계값
  const cqFull= cq >= 0.50;  // 연출·억양 팁이 신뢰도 높은 임계값

  const CAT_TIPS = {
    fluency: [
      // 끊어 읽기
      (v) => (v < 4 && cqOk) ? '쉼표( , )와 의미 단위에서 0.5~1초 멈추는 연습을 해보세요. 방송문을 슬래시(/)로 끊어 표시하고 5번 반복하면 효과적입니다.' : null,
      // 속도 연출
      (v) => (v < 4 && cqOk) ? (result.wpm > 0
        ? `현재 약 ${result.wpm} ${result.speedUnit} — 적정 ${lang.idealSpeed} ${lang.speedUnit}. ${result.wpm > lang.idealSpeed ? '핵심 단어 앞에서 의도적으로 속도를 줄여보세요.' : '조금 더 자신감 있게 속도를 높여보세요.'}`
        : '방송문을 먼저 눈으로 3회 읽고 속도를 몸에 익힌 뒤 녹음하세요.') : null,
      // 강조 표현
      (v) => (v < 3 && cqFull) ? '목적지·편명·시간 같은 핵심 정보 직전에 살짝 속도를 늦추고 또렷하게 읽으면 자연스러운 강조가 됩니다.' : null,
      // 문안 숙지
      (v) => v < 3 ? (cqOk
        ? '방송문을 보지 않고 첫 문장부터 외워서 말하는 연습을 먼저 해보세요. 숙지도가 올라가면 자연스러운 연출이 따라옵니다.'
        : '방송문 전체를 큰 소리로 또렷하게 읽어 보세요. 내용 인식률이 낮으면 다른 항목 점수가 정확하지 않습니다.') : null,
      // 말하는 듯한 연출
      (v) => (v < 7 && cqFull) ? '방송문을 "읽는다"고 생각하지 말고 "승객에게 직접 말한다"고 상상하세요. 중요 단어에서 눈을 들고 말하는 듯 처리하면 크게 달라집니다.' : null,
    ],
    voice: [
      // 안정적인 발성
      (v) => (v < 6 && cqOk) ? '녹음 전 복식호흡을 2~3회 하고 목을 풀어주세요. 발성이 흔들리면 전체 인상이 흐려집니다.' : null,
      (v) => (v < 4 && cqOk) ? '지금보다 약간 낮은 톤에서 말하는 연습을 해보세요. 낮고 차분한 톤이 방송에서 더 신뢰감 있게 들립니다.' : null,
      (v) => (v < 6 && cqFull) ? '입꼬리를 살짝 올린 채로 방송하면 따뜻한 분위기가 목소리에 자연스럽게 실립니다. 거울 앞에서 연습해보세요.' : null,
    ],
    intonation: [
      // 조사/어미 처리
      (v) => (v < 3 && cqOk) ? '"~습니다", "~바랍니다" 같은 문장 끝 어미를 흐리지 말고 끝까지 또렷하게 내려 마무리하세요.' : null,
      // 전반적인 억양
      (v) => (v < 6 && cqFull) ? '문장 중간에 가장 중요한 단어를 살짝 높게 말하고 끝에서 내려오는 패턴을 연습하세요. 이 흐름만 익혀도 억양이 자연스러워집니다.' : null,
      // 고른 억양
      (v) => (v < 6 && cqFull) ? '전반부는 에너지 있게, 후반부는 차분하게 일정한 흐름을 유지하세요. 억양이 갑자기 오르내리면 방송이 불안정해 보입니다.' : null,
    ],
    pronunciation: [
      (v) => v < 5 ? `핵심 단어(${lang.keyPhrases.slice(0,4).join(', ')})를 한 단어씩 천천히 발음하며 녹음해 들어보세요. 어떤 소리가 뭉개지는지 스스로 확인하는 것이 가장 빠른 교정 방법입니다.` : null,
      (v) => v < 5 ? '받침과 어미 끝까지 또렷하게 발음하는 연습을 하세요. 특히 문장 끝 "~다", "~요", "~세요"가 흐려지지 않도록 집중하세요.' : null,
    ],
  };

  /* ── 1. 종합 판정 배너 ── */
  const isExcellent = result.total >= 95;
  const overviewCls = isExcellent ? 'ov-excellent' : result.pass ? 'ov-pass' : 'ov-fail';
  const overviewIcon = isExcellent ? '🏆' : result.pass ? '✅' : '❌';
  const overviewLabel = isExcellent ? '최우수' : result.pass ? 'PASS' : 'FAIL';
  const overviewMsg = isExcellent
    ? '모든 항목 탁월 — 이 실력을 실전에서도 유지하세요!'
    : result.pass
    ? 'PASS 기준(75점) 통과. 아래 AI 분석으로 완성도를 더 높여보세요.'
    : `PASS까지 ${75 - result.total}점 부족. 아래 카테고리를 집중 연습하세요.`;

  const noSpeech = (!transcript || transcript.length < 5)
    ? `<div class="fb-no-speech">⚠️ 음성이 인식되지 않았습니다 — Chrome 브라우저 + 마이크 허용 필요. 발음·완성도 점수가 0점 처리됩니다.</div>`
    : (cq < 0.20 && transcript && transcript.length >= 5)
    ? `<div class="fb-no-speech fb-low-content">⚠️ 방송문 내용 일치율이 낮아(${Math.round(cq*100)}%) 음성·억양 분석의 신뢰도가 제한됩니다. 방송문 전체를 또렷하게 읽은 후 다시 시도하세요.</div>`
    : '';

  const overviewHTML = `
  <div class="fb-overview ${overviewCls}">
    <div class="fb-ov-left">
      ${isAdmin ? `<div class="fb-ov-score">${result.total}</div>` : ''}
      <div class="fb-ov-badge">${overviewIcon} ${overviewLabel}</div>
    </div>
    <div class="fb-ov-right">
      <div class="fb-ov-msg">${overviewMsg}</div>
      <div class="fb-ov-stats">
        <span class="fb-stat">⏱ ${Math.round(result.duration)}초</span>
        <span class="fb-stat">💬 ${result.wpm} ${result.speedUnit}</span>
        <span class="fb-stat">🔑 키워드 ${Math.round(result.completeness * 100)}%</span>
        <span class="fb-stat">📝 단어일치 ${Math.round(result.wordMatch * 100)}%</span>
      </div>
    </div>
  </div>${noSpeech}`;

  /* ── 2. 카테고리별 섹션 ── */
  const groupsHTML = ['fluency','voice','intonation','pronunciation'].map(key => {
    const cat  = CHECKLIST[key];
    const cr   = cats[key];
    const pct  = Math.round(cr.score / cat.max * 100);
    const grade = pct >= 87 ? 'good' : pct >= 60 ? 'mid' : 'low';
    const gradeLabel = pct >= 87 ? '우수' : pct >= 60 ? '보통' : '노력필요';
    const tips = CAT_TIPS[key];

    const subRows = cat.items.map((item, i) => {
      const got   = cr.items[i];
      const ratio = got / item.max;
      const iGood = ratio >= 0.87;
      const iMid  = ratio >= 0.60;
      const rowCls = iGood ? 'sr-good' : iMid ? 'sr-mid' : 'sr-low';
      const tagCls = iGood ? 'tag-good' : iMid ? 'tag-mid' : 'tag-low';
      const icon   = iGood ? '✓' : iMid ? '△' : '✕';
      const label  = iGood ? '우수' : iMid ? '보통' : '노력필요';
      const tip    = tips[i]?.(got);

      return `
      <div class="fb-sub-row ${rowCls}">
        <div class="fb-sub-main">
          <span class="fb-sub-icon">${icon}</span>
          <span class="fb-sub-name">${item.label}</span>
          ${isAdmin ? `<span class="fb-sub-score">${got}<span class="fb-sub-max">/${item.max}</span></span>` : ''}
          <span class="fb-sub-tag ${tagCls}">${label}</span>
        </div>
        ${tip ? `<div class="fb-tip ${iMid ? 'tip-mid' : 'tip-low'}"><span class="fb-tip-arrow">↳</span>${tip}</div>` : ''}
      </div>`;
    }).join('');

    return `
    <div class="fb-group">
      <div class="fb-group-hd grade-bg-${grade}">
        <div class="fb-gh-left">
          <span class="fb-gh-icon">${cat.icon}</span>
          <span class="fb-gh-name">${cat.label}</span>
        </div>
        <div class="fb-gh-right">
          <div class="fb-gh-bar-wrap">
            <div class="fb-gh-bar" style="width:${pct}%;background:${cat.color}"></div>
          </div>
          ${isAdmin ? `<span class="fb-gh-score">${cr.score}<span class="fb-gh-max">/${cat.max}</span></span>` : ''}
          <span class="fb-gh-badge badge-${grade}">${gradeLabel}</span>
        </div>
      </div>
      <div class="fb-group-body">${subRows}</div>
    </div>`;
  }).join('');

  $('feedback-cards').innerHTML = overviewHTML + groupsHTML;
}

function renderTranscriptCompare(transcript, lang) {
  let preview;
  if (state.selectedLang === 'ja' || state.selectedLang === 'ca') {
    // ja/ca: 원문(히라가나/한자) 줄만 추출해 미리보기
    const origLines = lang.text.split('\n').filter(l => /[぀-ヿ一-鿿]/.test(l));
    preview = origLines.slice(0, 2).join(' ') + (origLines.length > 2 ? '…' : '');
  } else {
    preview = lang.text.split('\n').slice(0, 3).join(' ') + (lang.text.split('\n').length > 3 ? '…' : '');
  }
  $('transcript-compare').innerHTML = `
    <div class="tc-row"><div class="tc-label">방송 원문</div><div class="tc-text">${escHtml(preview)}</div></div>
    <div class="tc-row"><div class="tc-label">AI 인식</div><div class="tc-text recognized">${transcript ? escHtml(transcript) : '(AI 채점 결과 대기 중...)'}</div></div>`;
}

// ===== TEXT HELPERS =====
function normalize(text) { return text.replace(/[.,!?。、·]/g,'').toLowerCase().trim(); }
function similarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b, shorter = a.length > b.length ? b : a;
  if (!longer.length) return 1;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
}
function levenshtein(s, t) {
  const m = s.length, n = t.length;
  const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i===0 ? j : j===0 ? i : 0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = s[i-1]===t[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ===== SCRIPT MODAL (추가 & 편집 공용) =====
function _resetModal() {
  document.getElementById('custom-title').value = '';
  document.getElementById('custom-icon').value = '📋';
  document.getElementById('custom-difficulty').value = '기본';
  ['ko','en','ja','ca'].forEach(l => {
    const ta = document.getElementById(`custom-text-${l}`);
    if (ta) ta.value = '';
  });
  document.getElementById('custom-checkpoints-ko').value = '';
  document.querySelectorAll('.modal-lang-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-lang-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.modal-lang-tab[data-lang="ko"]').classList.add('active');
  document.getElementById('modal-lang-ko').classList.add('active');
  // table builder
  $('table-builder').classList.add('hidden');
  $('btn-table-toggle').classList.remove('active');
  // model voice (언어별 초기화)
  ['ko','en','ja','ca'].forEach(lang => {
    const el = document.getElementById(`mv-current-${lang}`);
    const nameEl = document.getElementById(`mv-name-${lang}`);
    const fileEl = document.getElementById(`mv-file-${lang}`);
    if (el) el.classList.add('hidden');
    if (nameEl) nameEl.textContent = '';
    if (fileEl) fileEl.value = '';
  });
  // MV 탭 초기화
  document.querySelectorAll('#mv-lang-tabs .mv-lang-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('#mv-lang-tabs .mv-lang-tab[data-lang="ko"]')?.classList.add('active');
  document.querySelectorAll('.mv-lang-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('mv-panel-ko')?.classList.add('active');
  _modalMvLang = 'ko';
}

function openAddModal() {
  _modalState.mode = 'add'; _modalState.editId = null; _modalState.editSource = null;
  _resetModal();
  $('modal-title-text').textContent = '✏️ 나만의 방송문 추가';
  $('modal-save').textContent = '저장하기';
  $('modal-restore').classList.add('hidden');
  $('custom-modal').classList.remove('hidden');
}
// 하위 호환성 alias
const openCustomModal = openAddModal;

function openEditModal(id, source) {
  _modalState.mode = 'edit'; _modalState.editId = id; _modalState.editSource = source;
  _resetModal();

  let script;
  if (source === 'builtin') {
    script = getEffectiveScript(id);
    $('modal-title-text').textContent = '✏️ 기본 방송문 편집';
    // 원본과 다를 경우 복원 버튼 표시
    const isModified = !!loadOverrides()[id];
    $('modal-restore').classList.toggle('hidden', !isModified);
  } else {
    script = loadCustomScripts().find(s => s.id === id);
    $('modal-title-text').textContent = '✏️ 내 방송문 편집';
    $('modal-restore').classList.add('hidden');
  }
  if (!script) return;

  document.getElementById('custom-title').value = script.title;
  document.getElementById('custom-icon').value = script.icon || '📋';
  document.getElementById('custom-difficulty').value = script.difficulty || '기본';

  ['ko','en','ja','ca'].forEach(l => {
    const ta = document.getElementById(`custom-text-${l}`);
    if (ta && script.langs[l]) ta.value = script.langs[l].text || '';
  });
  const koLang = script.langs.ko;
  if (koLang?.checkpoints) {
    document.getElementById('custom-checkpoints-ko').value = koLang.checkpoints.join(', ');
  }
  // model voice (언어별)
  ['ko','en','ja','ca'].forEach(lang => {
    const stored = localStorage.getItem(`cabinvoice_voice_${id}_${lang}`);
    if (stored) {
      const el = document.getElementById(`mv-current-${lang}`);
      const nameEl = document.getElementById(`mv-name-${lang}`);
      if (el) el.classList.remove('hidden');
      if (nameEl) nameEl.textContent = localStorage.getItem(`cabinvoice_voice_${id}_${lang}_name`) || '등록됨';
    }
  });
  $('modal-save').textContent = '수정 저장';
  $('custom-modal').classList.remove('hidden');
}

function closeCustomModal() { $('custom-modal').classList.add('hidden'); }

function saveScriptFromModal() {
  const title = document.getElementById('custom-title').value.trim();
  if (!title) { alert('방송 제목을 입력해 주세요.'); document.getElementById('custom-title').focus(); return; }
  const koText = document.getElementById('custom-text-ko').value.trim();
  if (!koText) { alert('한국어 방송 원문은 필수 입력입니다.'); document.getElementById('custom-text-ko').focus(); return; }

  const icon = document.getElementById('custom-icon').value.trim() || '📋';
  const difficulty = document.getElementById('custom-difficulty').value;
  const difficultyClass = { '기본':'', '중급':'medium', '고급':'hard' }[difficulty] || '';
  const cpStr = document.getElementById('custom-checkpoints-ko').value;

  if (_modalState.mode === 'edit' && _modalState.editSource === 'builtin') {
    // 기본 방송문 편집 → override에 저장
    const base = _allScripts.find(s => s.id === _modalState.editId);
    const overrides = loadOverrides();
    const newLangs = {};
    ['ko','en','ja','ca'].forEach(l => {
      const ta = document.getElementById(`custom-text-${l}`);
      const text = ta?.value.trim();
      if (text) {
        const existing = base?.langs[l] || {};
        newLangs[l] = {
          ...existing,
          text,
          checkpoints: (l === 'ko' && cpStr) ? cpStr.split(',').map(s=>s.trim()).filter(Boolean) : (existing.checkpoints || []),
          keyPhrases: extractKeyPhrases(text, l)
        };
      }
    });
    overrides[_modalState.editId] = { title, icon, difficulty, difficultyClass, langs: newLangs };
    saveOverrides(overrides);

  } else if (_modalState.mode === 'edit' && _modalState.editSource === 'custom') {
    // 커스텀 방송문 편집 → 배열 내 수정
    const arr = loadCustomScripts();
    const idx = arr.findIndex(s => s.id === _modalState.editId);
    if (idx === -1) { closeCustomModal(); return; }
    const langs = {};
    langs.ko = buildCustomLang(koText, cpStr, 'ko');
    ['en','ja','ca'].forEach(l => {
      const text = document.getElementById(`custom-text-${l}`)?.value.trim();
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    arr[idx] = { ...arr[idx], title, icon, difficulty, difficultyClass, langs };
    saveCustomScripts(arr);

  } else {
    // 새 방송문 추가
    const langs = {};
    langs.ko = buildCustomLang(koText, cpStr, 'ko');
    ['en','ja','ca'].forEach(l => {
      const text = document.getElementById(`custom-text-${l}`)?.value.trim();
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    const id = 'custom_' + Date.now();
    // pending 모델 음성 → 실제 id로 이동 (언어별)
    ['ko','en','ja','ca'].forEach(lang => {
      const pv = localStorage.getItem(`cabinvoice_voice__pending_${lang}`);
      const pn = localStorage.getItem(`cabinvoice_voice__pending_${lang}_name`);
      if (pv) {
        localStorage.setItem(`cabinvoice_voice_${id}_${lang}`, pv);
        localStorage.setItem(`cabinvoice_voice_${id}_${lang}_name`, pn || '모델 음성');
        localStorage.removeItem(`cabinvoice_voice__pending_${lang}`);
        localStorage.removeItem(`cabinvoice_voice__pending_${lang}_name`);
      }
    });
    // 레거시 단일 pending 폴백
    const pendingVoice = localStorage.getItem('cabinvoice_voice__pending');
    if (pendingVoice) {
      localStorage.setItem(`cabinvoice_voice_${id}_ko`, pendingVoice);
      localStorage.setItem(`cabinvoice_voice_${id}_ko_name`, localStorage.getItem('cabinvoice_voice__pending_name') || '모델 음성');
      localStorage.removeItem('cabinvoice_voice__pending');
      localStorage.removeItem('cabinvoice_voice__pending_name');
    }
    const arr = loadCustomScripts();
    arr.unshift({ id, icon, colorClass:'c-blue', difficulty, difficultyClass, title, langs, _custom: true });
    saveCustomScripts(arr);
  }

  closeCustomModal();
  renderHome();
}

// PDF 파싱 결과 임시 저장 (import 시 활용)
let _pdfParsedScripts = [];

let _allScripts = [];  // 전체 방송문 (Firestore + 빌트인 + custom)
let _selectedScriptId = null;
let _detailLang = 'ko';

// ===== PDF IMPORT =====
function openPdfModal() {
  _showPdfStep('upload');
  $('pdf-import-btn').classList.add('hidden');
  $('pdf-modal').classList.remove('hidden');
}
function closePdfModal() { $('pdf-modal').classList.add('hidden'); }

function _showPdfStep(step) {
  ['upload','parsing','preview','error'].forEach(s => {
    $(`pdf-step-${s}`).classList.toggle('hidden', s !== step);
  });
}

async function handlePdfFile(file) {
  if (!file || file.type !== 'application/pdf') {
    _showPdfError('PDF 파일만 지원합니다. (.pdf 확장자 파일을 선택해 주세요)');
    return;
  }

  _showPdfStep('parsing');
  $('pdf-parsing-msg').textContent = 'PDF 이미지 변환 중...';
  $('pdf-parsing-sub').textContent = file.name;

  try {
    if (!window.pdfjsLib) throw new Error('PDF.js 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    $('pdf-parsing-msg').textContent = `Gemini AI로 ${totalPages}페이지 분석 중...`;

    const CHUNK_SIZE = 10;
    const USER_PROMPT = `항공사 방송교범 PDF 페이지들입니다. 각 페이지를 순서대로 분석하여 JSON 배열로만 반환하세요.

규칙:
- 언어 코드: ko(한국어), en(영어), ja(일본어), ca(중국어)
- 일본어: 한글 독음(읽는 법)이 있으면 반드시 포함. 형식: 한글독음 줄 바로 다음에 히라가나/가타카나 원문 줄 (쌍으로 구성). 예) "미나사마\nみなさま"
- 헤더(챕터명), 푸터(페이지번호, REV.XX) 제외
- 조건부 문안(표 구조, General/수하물 과다 반입 등): variants 배열로 추출

각 페이지에 대해:
방송문 있음: {"lang":"ko","num":"2.1.1","title":"방송 제목","text":"방송 내용"}
복수 문안: {"lang":"ko","num":"2.1.1","title":"방송 제목","variants":[{"label":"General","text":"..."}]}
방송문 없는 페이지: {"skip":true}

반환: JSON 배열만 (예: [{"skip":true},{"lang":"ko",...}]) — 설명 없이`;

    const pageResults = [];
    for (let start = 1; start <= totalPages; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, totalPages);
      $('pdf-parsing-sub').textContent = `${start} – ${end} / ${totalPages} 페이지 분석 중...`;

      const images = await _renderPdfPages(pdf, start, end);
      const results = await callGeminiVisionChunk(images, USER_PROMPT);
      pageResults.push(...results);

      if (end < totalPages) await new Promise(r => setTimeout(r, 2000));
    }

    const scripts = groupPagesByScript(pageResults);
    if (!scripts.length) {
      _showPdfError('방송문안을 인식하지 못했습니다.\n\nAI가 방송문 구조를 찾지 못했습니다.\n방송교범 PDF인지 확인하거나 다시 시도해 주세요.');
      return;
    }
    renderPdfPreview(scripts);
  } catch (e) {
    _showPdfError(`오류가 발생했습니다:\n${e.message}`);
  }
}

// PDF 페이지 렌더링 헬퍼 — start~end 페이지를 JPEG base64 배열로 반환
async function _renderPdfPages(pdf, start, end) {
  const images = [];
  for (let p = start; p <= end; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
  }
  return images;
}

// 청크 단위 Gemini Vision 호출 — 이미지 배열 + 프롬프트 → 파싱 결과 배열 반환
async function callGeminiVisionChunk(images, prompt) {
  const model = await getGeminiModel();
  const parts = [
    ...images.map(b64 => ({ inlineData: { data: b64, mimeType: 'image/jpeg' } })),
    { text: prompt }
  ];
  const result = await model.generateContent(parts);
  const raw = result.response.text().trim();

  // JSON 배열 우선, 없으면 개별 JSON 객체 여러 개 파싱
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      return Array.isArray(arr) ? arr.filter(r => r && !r.skip) : [];
    } catch {}
  }
  // 배열 파싱 실패 시 개별 {...} 객체들 추출
  const results = [];
  const objRe = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
  let m;
  while ((m = objRe.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(m[0]);
      if (parsed && !parsed.skip && parsed.num) results.push(parsed);
    } catch {}
  }
  return results;
}

function groupPagesByScript(pageResults) {
  const scriptMap = new Map();
  const order = [];

  for (const r of pageResults) {
    if (!r.num) continue;
    if (!scriptMap.has(r.num)) {
      scriptMap.set(r.num, { num: r.num, title: r.title || r.num, ko: '', en: '', ja: '', ca: '' });
      order.push(r.num);
    }
    const s = scriptMap.get(r.num);
    if (r.title && !s.title) s.title = r.title;

    const lang = r.lang;
    if (['ko','en','ja','ca'].includes(lang)) {
      if (r.variants && r.variants.length >= 2) {
        s[lang] = r.variants.map(v => `[${v.label}]\n${v.text.trim()}`).join('\n\n');
      } else {
        s[lang] = (r.text || '').trim();
      }
    }
  }

  return order.map(k => scriptMap.get(k)).filter(s => s.ko || s.en || s.ja || s.ca);
}

function renderPdfPreview(scripts) {
  _pdfParsedScripts = scripts;
  _showPdfStep('preview');
  $('pdf-preview-info').textContent =
    `${scripts.length}개 방송문안 인식됨 — 가져올 항목을 선택·편집하세요`;
  $('pdf-import-btn').classList.remove('hidden');

  const LANG_LABELS = { ko: '🇰🇷 한국어', en: '🇺🇸 영어', ja: '🇯🇵 일본어', ca: '🇨🇳 중국어' };

  const rows = scripts.map((s, i) => {
    const activeLang = ['ko','en','ja','ca'].find(l => s[l]) || 'ko';
    const langTabs = ['ko','en','ja','ca'].map(l =>
      `<button class="pdf-lang-tab${l === activeLang ? ' active' : ''}" data-lang="${l}"${!s[l] ? ' style="opacity:.4"' : ''}>${LANG_LABELS[l]}</button>`
    ).join('');
    const langPanels = ['ko','en','ja','ca'].map(l =>
      `<textarea class="pdf-field-textarea${l !== activeLang ? ' hidden' : ''}" data-field="${l}" rows="4">${(s[l] || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>`
    ).join('');

    return `
    <div class="pdf-script-item selected" data-idx="${i}">
      <input type="checkbox" class="pdf-script-check" checked>
      <div class="pdf-script-fields">
        <div class="pdf-script-num-title">
          <span class="pdf-script-num">${s.num}</span>
          <input class="pdf-field-input" placeholder="방송 제목"
            value="${(s.title || '').replace(/"/g,'&quot;')}" data-field="title">
        </div>
        <div class="pdf-lang-tabs">${langTabs}</div>
        ${langPanels}
      </div>
    </div>`;
  }).join('');

  $('pdf-script-list').innerHTML = rows;

  $('pdf-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
    cb.addEventListener('change', () =>
      cb.closest('.pdf-script-item').classList.toggle('selected', cb.checked));
  });

  $('pdf-script-list').querySelectorAll('.pdf-lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const item = tab.closest('.pdf-script-item');
      item.querySelectorAll('.pdf-lang-tab').forEach(t => t.classList.remove('active'));
      item.querySelectorAll('.pdf-field-textarea').forEach(ta => ta.classList.add('hidden'));
      tab.classList.add('active');
      item.querySelector(`[data-field="${tab.dataset.lang}"]`).classList.remove('hidden');
    });
  });
}

function _showPdfError(msg) {
  _showPdfStep('error');
  $('pdf-error-msg').textContent = msg;
  $('pdf-import-btn').classList.add('hidden');
}

function importSelectedPdfScripts() {
  const items = $('pdf-script-list').querySelectorAll('.pdf-script-item');
  const toAdd = [];
  items.forEach(item => {
    const cb = item.querySelector('.pdf-script-check');
    if (!cb.checked) return;
    const idx   = parseInt(item.dataset.idx);
    const meta  = _pdfParsedScripts[idx] || {};
    const title = item.querySelector('[data-field="title"]').value.trim() || '방송문';
    const langs = {};
    ['ko','en','ja','ca'].forEach(l => {
      const ta = item.querySelector(`[data-field="${l}"]`);
      const text = ta ? ta.value.trim() : '';
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    if (!Object.keys(langs).length) return;
    const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    toAdd.push({
      id,
      icon: '📋',
      colorClass: 'c-blue',
      difficulty: '기본', difficultyClass: '',
      title: `${meta.num ? meta.num + ' ' : ''}${title}`,
      langs,
      _custom: true
    });
  });
  if (!toAdd.length) { alert('선택된 방송문이 없습니다.'); return; }
  const arr = loadCustomScripts();
  arr.unshift(...[...toAdd].reverse());
  saveCustomScripts(arr);
  closePdfModal();
  renderHome();
  alert(`${toAdd.length}개 방송문안을 가져왔습니다.`);
}

// ===== GEMINI AI SCORING =====
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function callGeminiScoring(script, audioBlob, langCode, checkpoints) {
  console.log('audioBlob size:', audioBlob?.size, 'type:', audioBlob?.type);
  const model = await getGeminiModel();
  const langName = { ko:'한국어', en:'영어', ja:'일본어', ca:'중국어' }[langCode] || '한국어';
  const cpText = checkpoints?.length
    ? `\n핵심 체크포인트 (누락 여부 반드시 확인):\n${checkpoints.map(c=>`- ${c}`).join('\n')}\n`
    : '';

  const isKoEn = langCode === 'ko' || langCode === 'en';
  const isJaCa = langCode === 'ja' || langCode === 'ca';
  const maxFluency = isJaCa ? 25 : 30;
  const maxPron    = isJaCa ? 25 : 20;
  const gradeRule = isKoEn
    ? 'score 90이상→grade"A", 75이상→"B", 60이상→"C", 59이하→"미취득"'
    : 'score 85이상→grade"PASS", 84이하→"FAIL"';

  const criteriaMap = {
    ko: `[한국어 채점 기준 - 100점]

유창성 ${maxFluency}점 (음성을 직접 듣고 판단):
  끊어읽기(5):
    - 의미 단위(주어부/서술부/부사구)에서 자연스럽게 끊는가
    - 문법 구조 중간에 끊거나, 끊김이 너무 잦거나 없으면 감점
    - 예) "손님 여러분 / 저희 비행기는" O, "손님 / 여러분 저희" X
  속도(5):
    [속도 채점 기준 — 반드시 준수]
    기내방송의 가장 흔한 문제는 '너무 빠름'. 승무원들은 대부분 빠르게 읽는 경향이 있음.
    - 빠르게 읽어서 단어가 뭉개지면 → 반드시 감점
    - 빠르게 읽어서 끊어읽기가 없으면 → 반드시 감점
    - 천천히 명확하게 읽으면 → 우수 평가 (5점)
    - 적당한 속도면 → 보통 평가 (3~4점)
    금지 표현: '더 빠르게', '속도를 높여', '빠릿하게', '템포를 올려'
    권장 표현: '천천히 명확하게', '여유 있게', '충분히 끊어서', '승객이 이해할 수 있는 속도로'
    속도가 느린 경우에만 '조금 더 자연스럽게'라고 표현. '더 빠르게 읽으라'는 피드백은 절대 금지.
  강조 표현(5):
    - 편명·목적지·안전 관련 핵심 단어에서 강조(살짝 느리게 또는 음량 높임)가 들어가는가
    - 전체가 동일한 강도로 읽히면 감점
  문안 숙지(5):
    - 버벅거림, 중간 반복, 갑작스러운 멈춤이 있으면 감점
    - 자연스럽게 이어지는지 확인
  말하는 듯한 연출(10):
    - 또박또박 읽는 느낌(낭독체)인가 vs 자연스럽게 말하는 느낌인가
    - 문장 끝이 매번 동일한 패턴으로 단조롭게 처리되면 감점
    - 전체 방송에 생동감이 있는가

분위기·목소리 25점 (음성을 직접 듣고 판단 — 반드시 0점 이상 부여):
  발성(10):
    - 목소리가 떨리거나 불안정하게 흔들리지 않는가
    - 음량이 처음부터 끝까지 균일하게 유지되는가
    - 마이크 거리 문제(너무 작거나 크거나 바람소리)가 없는가
    - 기본 발성만 해도 최소 6점 이상 부여할 것
  톤(10):
    - 기내방송에 어울리는 부드럽고 차분한 톤인가
    - 너무 딱딱하거나(군대식·아나운서식) 너무 가볍거나 들뜨지 않는가
    - 미소가 느껴지는 목소리인가 (입꼬리 올린 상태의 밝고 따뜻한 톤)
    - 무표정한 톤도 방송은 가능하므로 최소 5점 이상 부여할 것
  친근함(5):
    - 승객에게 직접 말하는 느낌인가, 원고를 읽는 느낌인가
    - 기계적이지 않고 사람이 말하는 온기와 배려가 느껴지는가
    - 방송을 수행했다면 최소 2점 이상 부여할 것

억양 25점:
  조사·어미 처리(10):
    - 문장 끝 어미가 올라가는 패턴이 반복되면 감점 (상향 반복)
    - 조사(은/는/이/가/을/를)가 앞 단어와 자연스럽게 이어지는가
    - 어미를 흐리거나 끊어먹으면 감점
  전반적 억양(10):
    - 전체 방송의 억양 흐름이 자연스러운가
    - 단조로운 평탄 억양(모노톤)이나 과장된 억양 모두 감점
  고른 억양(5):
    - 특정 구간만 억양이 과하거나 약하지 않은가
    - 전체적으로 균일한 억양 수준 유지

발음 ${maxPron}점 (정밀 분석):
  정확성(10):
    - 비행기→비ː행기 장음 처리 확인
    - 있습니다→있씁니다 연음 처리 확인
    - 모음(ㅢ, ㅚ, ㅐ/ㅔ 구분) 정확성 확인
    - 받침 탈락(합니다→하니다) 없는지 확인
  명확성(10):
    - 핵심 단어가 또렷하게 들리는가
    - 어물거림, 뭉개짐, 어미 흐려짐 없는가`,

    en: `[영어 채점 기준 - 100점]

유창성 ${maxFluency}점:
  끊어읽기(5): 의미 단위(구·절) 경계에서 자연스럽게 끊는가. 단어 중간에 끊으면 감점
  속도(5):
    [속도 채점 기준 — 반드시 준수]
    기내방송의 가장 흔한 문제는 '너무 빠름'. 단어가 뭉개질 정도로 빠르면 반드시 감점.
    - 천천히 명확하게 읽으면 → 우수 평가 (5점)
    금지 표현: '더 빠르게', '속도를 높여', 'faster', 'speed up'
    권장 표현: '천천히 명확하게', '여유 있게', '승객이 이해할 수 있는 속도로'
  강조(5): 주요 단어(flight number, destination, safety-related)에 강세 강조가 들어가는가
  문안 숙지(5): 버벅거림, 반복, 갑작스러운 멈춤 없는가
  말하는 듯한 연출(10):
    - 한국식 낭독체(모든 단어 동일 강도)가 아닌 영어 리듬으로 말하는가
    - 내용어(content word) 강조, 기능어(function word) 약화가 자연스러운가

분위기·목소리 25점 (반드시 0점 이상 부여):
  발성(10): 안정적 성량, 균일한 음량, 마이크 노이즈 없는가. 최소 6점 이상
  톤(10): 영어 기내방송에 어울리는 warm하고 professional한 톤인가. 최소 5점 이상
  친근함(5): 승객에게 직접 말하는 느낌인가. 최소 2점 이상

억양 25점:
  강세 패턴(10): 영어 단어 강세 위치가 정확한가 (fasten→FAS-ten, emergency→e-MER-gen-cy)
  전반적 억양(10): 문장 단위 억양 흐름이 영어답게 자연스러운가
  문장 끝 처리(5): 평서문 끝이 자연스럽게 내려가는가. 모두 올라가면 감점

발음 ${maxPron}점:
  정확성(10):
    - fasten→파슨O/패스튼X
    - oxygen→옥시전O/악시전X
    - passengers→패신저스O
    - lavatory→래버토리O
    - emergency→이머전씨O
  명확성(10): th발음, 끝자음 처리, 연음 자연스러운가`,

    ja: `[일본어 채점 기준 - 100점]

유창성 ${maxFluency}점:
  끊어읽기(5): 일본어 문절 단위로 자연스럽게 끊는가
  문안 숙지(5): 버벅거림, 반복 없는가
  속도(5):
    [속도 채점 기준 — 반드시 준수]
    너무 빠르면 장음(ー)이 뭉개지고 발음이 부정확해짐 → 반드시 감점.
    - 천천히 명확하게 읽으면 → 우수 평가 (5점)
    금지 표현: '더 빠르게', '속도를 높여', '빠릿하게'
    권장 표현: '천천히 명확하게', '여유 있게', '장음을 충분히 늘여서'
  자연스러운 연출(10): 일본어로 말하는 듯한 자연스러운 리듬인가, 한국어 억양이 섞이지 않는가

분위기·목소리 25점 (반드시 0점 이상 부여):
  톤(8): 일본 항공사 방송 특유의 부드럽고 정중한 톤인가. 최소 4점 이상
  발성(7): 안정적 발성, 균일한 음량. 최소 4점 이상
  친절함(5): 따뜻하고 배려 있는 느낌인가. 최소 2점 이상
  과장 지양(5): 과도하게 높은 피치나 작위적인 연출 없는가

억양 25점:
  일본어 특성 억양(10): 일본어 고저 악센트가 자연스러운가. 한국어식 강세 억양 개입 없는가
  고른 억양(5): 특정 구간만 억양이 튀지 않는가
  장음 처리(5): コース·ございます 등 장음이 충분히 늘어나는가
  어미 처리(5): ます·です 어미가 자연스럽게 처리되는가. 끊어먹거나 올라가면 감점

발음 ${maxPron}점:
  장음 처리(7): 장음 기호(ー) 위치에서 확실하게 늘어나는가
  고유 발음(6): ざ/ず/ぜ/ぞ, じゃ/じゅ/じょ 정확한가
  ん·촉음(6): ん이 뒤 음에 따라 변화하는가 / 촉음(っ) 앞 짧은 정지 있는가
  모음 정확성(6): 5모음 정확히 / 으 개입 방지 (です→데스O/데으스X)`,

    ca: `[중국어 채점 기준 - 100점]

유창성 ${maxFluency}점:
  끊어읽기(5): 중국어 의미 단위로 자연스럽게 끊는가
  말하는 듯한 연출(10): 스타카토식(단어 단위로 끊어 읽는 방식) 지양. 자연스럽게 이어지는가
  강조(5): 중요 단어에서 강조가 들어가는가
  속도(5):
    [속도 채점 기준 — 반드시 준수]
    너무 빠르면 성조가 뭉개짐 → 반드시 감점.
    - 천천히 명확하게 읽으면 → 우수 평가 (5점)
    금지 표현: '더 빠르게', '속도를 높여', '빠릿하게'
    권장 표현: '천천히 명확하게', '여유 있게', '성조를 살려서 읽기'
  문안 숙지(5): 버벅거림, 반복 없는가

분위기·목소리 25점 (반드시 0점 이상 부여):
  친근함(10): 승객에게 직접 말하는 따뜻한 느낌인가. 최소 5점 이상
  발성(5): 적절한 음량, 안정적 발성. 최소 3점 이상
  톤(10): 중국어 기내방송에 어울리는 부드럽고 자연스러운 톤인가. 최소 5점 이상

성조·억양 25점:
  1성·4성(5): 1성(高平) 충분히 높게 유지, 4성(下降) 확실하게 내려가는가
  2성·3성(5): 2성(上扬) 올라가는 흐름, 3성(曲折) 내렸다 올라가는 흐름 확인
  성조 변화 규칙(5): 변조 규칙(不·一 등) 준수하는가
  중국어 특성 억양(10): 전체 문장 리듬이 중국어답게 자연스러운가

발음 ${maxPron}점:
  권설음(5): zh·ch·sh·r과 z·c·s 구별되는가
  단운모(5): ü·e·o 정확한가
  복운모(5): ian·uan·üan 등 정확한가
  오발음(5): 빈번한 오류 단어 체크`
  };
  const criteria = criteriaMap[langCode] || criteriaMap.ko;

  const base64Audio = await blobToBase64(audioBlob);

  const sharedRules = `언어: ${langName} | ${gradeRule}

[채점 원칙 — 반드시 준수]
당신은 실제 항공사 기내방송 평가 교관입니다.
훈련 목적으로 정직하고 정교하게 채점합니다.

점수 기준:
90점↑: 실제 기내방송으로 즉시 사용 가능한 수준
80~89: 전반적으로 좋으나 1-2가지 개선 필요
70~79: 기본기는 있으나 여러 부분 보완 필요
60~69: 상당한 연습이 필요한 수준
60미만: 방송문 숙지부터 다시 시작 필요

절대 금지:
- 실제로 잘하지 않았는데 칭찬하는 것
- 문안 미완주인데 높은 점수 부여
- 발음/억양 문제가 있는데 우수 판정
- 모호하거나 일반적인 피드백
- 속도 피드백에서 '더 빠르게', '속도를 높여', '빠릿하게', '템포를 올려' 사용
  (기내방송의 흔한 문제는 너무 빠름. 속도 개선 피드백은 항상 '여유 있게' 방향으로)

[문안 완주 체크 — 최우선 적용]
채점 전 반드시:
1. 원문 핵심 문장 수 vs AI 인식 문장 수 비교
2. 완주율 계산:
   - 90%↑: 정상 채점
   - 70~89%: 유창성 문안숙지 -3점, 전체 -5점
   - 50~69%: 유창성 문안숙지 -5점, 전체 60점 상한
   - 50%미만: 전체 50점 상한,
     유창성 feedback에 '방송문을 끝까지 완주하지 못했습니다' 명시
3. 원문에 없는 내용 인식 시:
   발음 feedback에 명시, missedKeywords에 '방송문과 다른 내용이 녹음되었습니다' 포함

[카테고리 good 필드 작성 규칙]
각 카테고리의 good 필드는 이 음성에서 실제로 확인된 경우에만 구체적으로 작성.
아래 경우 반드시 "" 반환:
- 발화량이 너무 적어 평가 불가
- 억양이 단조로워 칭찬할 내용 없음
- 발음 오류가 많음
- 분위기/목소리가 기내방송 수준 미달
절대 금지: '발화된 부분이 짧아 평가하기 어려웠습니다' 같은 내용을 good에 넣는 것

[카테고리별 피드백 작성 기준]
유창성:
- 끊어읽기: 실제로 자연스러운 위치에서 끊었는지
- 속도: 체감되는 빠름/느림 구체적으로
- 문안숙지: 버벅임, 반복, 멈춤 횟수 언급
- 말하는 듯한 연출: 낭독체 vs 대화체 구분

분위기/목소리:
- 발성이 실제로 안정적인지
- 톤이 기내방송에 어울리는지
- 미소 느낌이 실제로 있었는지
- 평가 불가한 경우 good = "" 반환

억양:
- 문장 끝 어미 실제 처리 방식 명시 ('~니다'가 올라갔는지 내려갔는지)
- 상향 반복 패턴 있으면 반드시 지적
- 단조로운 경우 good = "" 반환

발음:
- STT에서 감지된 실제 오류만 지적
- 오류가 없으면 good에 구체적으로 언급
- '모든 단어를 정확히' 같은 막연한 칭찬 금지

[허용 예외 사항]
• [목적지][편명][공항] 등 변수 자리 단어 대체
• 선택 문안 중 하나만 말한 경우
• 같은 의미를 살짝 다르게 표현한 경우 (단, 완주율 70% 이상 시)

${criteria}
${cpText}
원문:
${script}`;

  const sharedJson = `아래 JSON만 반환하세요 (설명·주석 없이):
{
  "transcript": "음성에서 실제 발화된 내용 (직접 청취해 전사)",
  "language": "${langCode}",
  "score": 0-100 정수,
  "grade": ${isKoEn ? '"A" 또는 "B" 또는 "C" 또는 "미취득"' : '"PASS" 또는 "FAIL"'},
  "categories": {
    "fluency": {
      "score": 0-${maxFluency} 정수,
      "level": "우수" 또는 "보통" 또는 "노력필요",
      "good": "이 음성에서 실제로 확인된 잘된 점 (없으면 빈 문자열 \\"\\")",
      "feedback": "개선이 필요한 부분 구체적으로 (2문장, 어느 구간에서 어떤 문제인지 명시)",
      "practiceTip": "다음 연습에서 바로 해볼 수 있는 구체적 방법 1가지 (예: '○○ 구간을 읽을 때 의도적으로 0.5초 멈춰보세요')"
    },
    "atmosphere": {
      "score": 1-25 정수 (음성이 존재하는 한 반드시 1 이상),
      "level": "우수" 또는 "보통" 또는 "노력필요",
      "good": "이 음성에서 실제로 확인된 잘된 점 (없으면 빈 문자열 \\"\\")",
      "feedback": "개선이 필요한 목소리·톤·분위기 관찰 (2문장)",
      "practiceTip": "구체적 연습 방법 1가지"
    },
    "intonation": {
      "score": 0-25 정수,
      "level": "우수" 또는 "보통" 또는 "노력필요",
      "good": "이 음성에서 실제로 확인된 잘된 점 (없으면 빈 문자열 \\"\\")",
      "feedback": "억양 개선이 필요한 부분 (문장 끝 처리 방식·단조로움 등 구체적으로, 2문장)",
      "practiceTip": "구체적 연습 방법 1가지 (예: '문장 끝 단어를 약간 낮춰 읽는 연습을 5번 반복하세요')"
    },
    "pronunciation": {
      "score": 0-${maxPron} 정수,
      "level": "우수" 또는 "보통" 또는 "노력필요",
      "good": "이 음성에서 실제로 확인된 잘된 점 (없으면 빈 문자열 \\"\\")",
      "feedback": "발음 개선이 필요한 부분 구체적으로 (2문장)",
      "practiceTip": "구체적 발음 연습 방법 1가지",
      "details": ["실제 오류 예시만: '○○'를 '△△'처럼 발음했는데, '□□'로 연습하세요 (오류 없으면 빈 배열)"]
    }
  },
  "goodPoints": ["이 음성에서 실제로 잘된 점 1 (구체적으로)", "잘된 점 2 (있으면)"],
  "missedKeywords": ["누락된 핵심 키워드 (실제 누락만)"],
  "nextFocus": "이번 연습에서 가장 먼저 개선할 1가지와 그 이유 (예: '억양 — 문장 끝이 단조롭게 올라가서 승객에게 어색하게 들립니다')",
  "practiceMethod": "nextFocus를 개선하기 위한 단계별 연습 방법 (3줄 이내, 내일 당장 따라할 수 있도록 구체적으로)",
  "encouragement": "이 연습 수준에 맞는 구체적이고 따뜻한 응원 메시지 1문장 (막연한 격려 말고, 이 연습에서 보인 노력을 언급)"
}

중요: atmosphere(분위기·목소리) score는 반드시 1 이상의 정수를 반환하세요.
음성이 존재하는 한 0점은 절대 불가합니다.
발성·톤·친근함 각 항목에 최소 점수 기준을 적용하세요.

[6] 발음 채점 추가 기준:
STT 인식 결과에서 아래 유형은 실제 발음 오류로 판단하고 감점:
- 초성 오류: 손→스, 비→피 등 자음 혼동
- 모음 오류: 여→야, 이→에 등
- 받침 탈락: 있습니다→이습니다
감점 기준:
- 오류 1~2개: 최대 2점 감점
- 오류 3개 이상: 최대 5점 감점
- 단순 STT 인식 실패(조사 변형 등)는 제외
- 전반적으로 기내방송 수준이면 높은 점수 유지`;

  // ── 1차 시도: /api/gemini 프록시 경유로 audio inlineData 전달 ──
  const audioPrompt = `피드백 필수 규칙:
1. 반드시 이 음성에서 실제로 들린 것만 언급
2. 구체적인 단어나 구간 지목 필수
   (예: '~바랍니다 어미가 올라갔습니다')
   (예: '첫 문장 속도가 빠르다가 중반 안정됨')
3. 매번 다른 표현 사용, 패턴 반복 금지
4. 긍정 관찰 먼저, 개선점 나중에
5. 전문 용어 대신 쉬운 말 사용
6. '발음을 연습하세요' 같은 일반론 절대 금지

이 음성에서 실제로 들은 구체적인 특징을 피드백에 반드시 포함하세요.
- 어느 구간에서 어떤 문제가 발생했는지
- 어떤 단어/문장에서 특히 두드러졌는지
- 이 사람만의 특징적인 패턴이 무엇인지

당신은 항공사 기내방송 전문 교관입니다.
첨부된 음성 파일을 반드시 직접 들으세요. STT 텍스트 변환 없이 실제 음성을 기반으로 평가합니다.
채점 전 아래 순서로 음성을 분석하세요:
1. 전체 음성을 한 번 들으며 전반적인 분위기와 완성도 파악
2. 구간별로 끊어읽기·속도·강조 위치 확인
3. 각 항목 기준에 따라 점수 결정

점수를 줄 때는 반드시 "이 음성에서 들은 구체적 근거"를 피드백에 포함하세요.
"전반적으로 좋습니다" 같은 막연한 피드백은 절대 금지입니다.
${sharedRules}

${sharedJson}`;

  try {
    const _audioController = new AbortController();
    const _audioTimeoutId = setTimeout(() => _audioController.abort(), 60000);
    let res;
    try {
      res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: _audioController.signal,
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: [{
            parts: [
              { inline_data: { mime_type: audioBlob.type || 'audio/webm', data: base64Audio } },
              { text: audioPrompt }
            ]
          }]
        })
      });
    } finally {
      clearTimeout(_audioTimeoutId);
    }
    if (res.status === 501) {
      console.warn('로컬 환경: 배포 후 테스트 필요');
      return null;
    }
    console.log('Gemini audio 응답 status:', res.status);
    const text = await res.text();
    console.log('Gemini audio 응답 앞 200자:', text.slice(0, 200));
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    const data = JSON.parse(text);
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('응답 JSON 파싱 실패');
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('audio 채점 타임아웃(60초), STT 방식으로 전환');
    } else {
      console.error('audio 채점 실패, STT 텍스트 방식으로 전환:', e);
    }
  }

  // ── 2차 fallback: Web Speech API STT 텍스트로 채점 ──
  const transcript = state.transcript?.trim() || '';
  if (!transcript) return null;

  const textPrompt = `당신은 항공사 기내방송 전문 교관입니다.
아래 STT 인식 텍스트를 기반으로 채점하세요 (음성 파일 전달 실패로 텍스트 방식 전환).
막연한 평가 대신 어떤 부분을 어떻게 연습하면 나아지는지 구체적으로 알려주세요.
${sharedRules}

발화 (STT 인식 결과 — 인식 오류 포함될 수 있음):
${transcript}

${sharedJson}`;

  const _textController = new AbortController();
  const _textTimeoutId = setTimeout(() => _textController.abort(), 60000);
  try {
    const result = await model.generateContent(textPrompt);
    const raw = result.response.text().trim();
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  } finally {
    clearTimeout(_textTimeoutId);
  }
}

function renderAiResult(ai, isAdmin) {
  const sec = $('ai-result-section');
  if (!sec) return;

  const lang    = ai.language || state.selectedLang;
  const isKoEn  = lang === 'ko' || lang === 'en';
  const isJaCa  = lang === 'ja' || lang === 'ca';
  const score   = typeof ai.score === 'number' ? ai.score : 0;
  const grade   = ai.grade || (isKoEn ? '미취득' : 'FAIL');

  const gradeColor = isKoEn
    ? (grade === 'A' ? '#16a34a' : grade === 'B' ? '#2563eb' : grade === 'C' ? '#d97706' : '#dc2626')
    : (grade === 'PASS' ? '#16a34a' : '#dc2626');
  const emojiGrade = score >= 85 ? '✨ 잘하셨어요!' : score >= 70 ? '👍 계속 연습해요' : '💪 더 연습이 필요해요';

  const maxScores = isJaCa
    ? { fluency: 25, atmosphere: 25, intonation: 25, pronunciation: 25 }
    : { fluency: 30, atmosphere: 25, intonation: 25, pronunciation: 20 };

  const catMeta = {
    fluency:       { name: '유창성',       icon: '💨', max: maxScores.fluency },
    atmosphere:    { name: '분위기/목소리', icon: '🎙',  max: maxScores.atmosphere },
    intonation:    { name: '억양',         icon: '〰️', max: maxScores.intonation },
    pronunciation: { name: '발음',         icon: '🗣',  max: maxScores.pronunciation }
  };

  // 등급 헤더
  const gradeHeaderHtml = `
    <div class="ai-grade-header">
      <span class="ai-grade-badge-new" style="background:${gradeColor}">${emojiGrade}</span>
      ${isAdmin ? `<span class="ai-score-chip">${score}점</span>` : ''}
    </div>`;

  // 잘한 점 박스 — 70점 미만 미완주 시 숨김
  const goodPointsHtml = (ai.goodPoints?.length && score >= 70)
    ? `<div class="ai-good-points-box">
        <div class="ai-good-points-label">👏 잘하셨어요!</div>
        ${ai.goodPoints.map(p => `<div class="ai-good-point-item">✓ ${escHtml(p)}</div>`).join('')}
      </div>` : '';

  // 카테고리 카드
  const catCardsHtml = Object.entries(ai.categories || {}).map(([key, cat]) => {
    const m = catMeta[key];
    if (!m) return '';
    const pct   = Math.round((Math.min(cat.score, m.max) / m.max) * 100);
    const level = cat.level || (pct >= 87 ? '우수' : pct >= 60 ? '보통' : '노력필요');
    const bgCls = level === '우수' ? 'ai-card-good' : level === '보통' ? 'ai-card-mid' : 'ai-card-low';
    const lvlCls = level === '우수' ? 'lvl-good' : level === '보통' ? 'lvl-mid' : 'lvl-low';
    const lvlEmoji = level === '우수' ? '🔥' : level === '보통' ? '✅' : '⚠️';

    // good 필드 우선, 없으면 feedback 첫 문장 fallback (레거시 호환)
    const goodText  = (cat.good && cat.good.trim()) ? cat.good.trim() : null;
    const fbImproveText = cat.feedback?.trim() || null;
    const fbGood    = goodText
      ? `<div class="ai-card-fb-row ai-card-fb-good"><span class="ai-card-fb-icon">✅</span><div><strong>잘된 점</strong><br>${escHtml(goodText)}</div></div>` : '';
    const fbImprove = fbImproveText
      ? `<div class="ai-card-fb-row ai-card-fb-improve"><span class="ai-card-fb-icon">📌</span><div><strong>개선 포인트</strong><br>${escHtml(fbImproveText)}</div></div>` : '';
    const fbTip     = cat.practiceTip
      ? `<div class="ai-card-fb-row ai-card-fb-tip"><span class="ai-card-fb-icon">🎯</span><div><strong>다음 연습 목표</strong><br>${escHtml(cat.practiceTip)}</div></div>` : '';
    const pronDetails = (key === 'pronunciation' && cat.details?.length)
      ? cat.details.map(d => `<div class="ai-pron-detail-item">💬 ${escHtml(d)}</div>`).join('') : '';

    return `<div class="ai-cat-card ${bgCls}">
      <div class="ai-cat-card-header">
        <span class="ai-cat-card-icon">${m.icon}</span>
        <span class="ai-cat-card-name">${m.name}</span>
        <span class="ai-cat-level-badge ${lvlCls}">${lvlEmoji} ${level}</span>
        ${isAdmin ? `<span class="ai-cat-score-chip">${cat.score}/${m.max}</span>` : ''}
      </div>
      ${fbGood}${fbImprove}${fbTip}
      ${pronDetails}
    </div>`;
  }).join('');

  // 누락 키워드
  const missedHtml = ai.missedKeywords?.length
    ? `<div class="ai-missed-box">
        <div class="ai-missed-label">⚠️ 누락된 핵심 내용</div>
        <div class="ai-missed-subtitle">아래 내용이 방송에 포함되지 않았습니다</div>
        <div class="ai-missed-list">${ai.missedKeywords.map(k => `<span class="ai-missed-item">${escHtml(k)}</span>`).join('')}</div>
      </div>` : '';

  // 핵심 목표 카드
  const nextFocusHtml = (ai.nextFocus || ai.improvementTip)
    ? `<div class="ai-focus-card">
        <div class="ai-focus-title">🎯 이번 핵심 개선 목표</div>
        <div class="ai-focus-content">${escHtml(ai.nextFocus || ai.improvementTip)}</div>
        ${ai.practiceMethod
          ? `<div class="ai-focus-method"><span class="ai-pm-label">💡 단계별 연습 방법</span> ${escHtml(ai.practiceMethod)}</div>` : ''}
      </div>` : '';

  // 응원 카드 — 점수별 색상 및 추가 메시지
  let encourageHtml = '';
  if (ai.encouragement) {
    const encCls  = score >= 85 ? 'ai-encourage-green' : score >= 70 ? 'ai-encourage-blue' : 'ai-encourage-orange';
    const encIcon = score >= 85 ? '✨' : score >= 70 ? '👍' : '💪';
    const encExtra = score < 70
      ? `<div class="ai-encourage-extra">노력하는 과정이 실력이 됩니다.<br>체크리스트를 다시 확인하고 연습해보세요!</div>` : '';
    encourageHtml = `<div class="ai-encourage-card ${encCls}">${encIcon} ${escHtml(ai.encouragement)}${encExtra}</div>`;
  }

  sec.innerHTML = `
    <div class="ai-result-heading">🤖 AI 상세 분석</div>
    ${gradeHeaderHtml}
    ${goodPointsHtml}
    ${catCardsHtml}
    ${missedHtml}
    ${nextFocusHtml}
    ${encourageHtml}
  `;
  console.log('[완료] AI 상세 분석 렌더링');
}

// ===== ADMIN =====
let _adminParsedScripts = [];

function openAdminScreen() {
  requireEditAuth(() => {
    initFirebase();
    _refreshAdminVersion();
    _refreshAdminVersionList();
    _setupAdminMvSection();
    showScreen('screen-admin');
  });
}

// ===== ADMIN MODEL VOICE MANAGEMENT =====
let _adminMvLang = 'ko';

function _setupAdminMvSection() {
  const select = $('admin-mv-script');
  if (!select) return;
  select.innerHTML = '<option value="">-- 방송문 선택 --</option>' +
    _allScripts.map(s => `<option value="${escHtml(s.id)}">${escHtml(s.title)}</option>`).join('');
  select.onchange = () => {
    const id = select.value;
    $('admin-mv-panel').classList.toggle('hidden', !id);
    if (id) _renderAdminMvBody(id, _adminMvLang);
  };
  document.querySelectorAll('#admin-mv-lang-tabs .mv-lang-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#admin-mv-lang-tabs .mv-lang-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _adminMvLang = tab.dataset.lang;
      const id = $('admin-mv-script').value;
      if (id) _renderAdminMvBody(id, _adminMvLang);
    };
  });
}

// 로컬 모델 음성 자동 스캔 → Firestore scripts/{id}.modelFiles 저장
async function _scanLocalModelVoices() {
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('[스캔] 현재 사용자:', auth?.currentUser?.email);
  const btn = $('btn-admin-scan-mv');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 스캔 중...'; }
  try {
    const matched = await _doScanLocalModelVoices();
    showToast(`✅ ${matched}개 방송문 매핑 완료`);
    console.log(`[스캔] ${matched}개 방송문 modelFiles 저장 완료`);
  } catch (e) {
    showToast(`스캔 실패: ${e.message}`);
    console.error('[스캔] 오류:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📂 로컬 모델 음성 스캔'; }
  }
}

async function _resetAndRescanModelVoices() {
  if (!confirm('scripts 컬렉션의 modelFiles 필드를 전부 삭제하고 재스캔합니다.\n계속하시겠습니까?')) return;

  const btn = $('btn-admin-reset-scan-mv');
  const scanBtn = $('btn-admin-scan-mv');
  [btn, scanBtn].forEach(b => { if (b) b.disabled = true; });
  if (btn) btn.textContent = '⏳ 초기화 중...';

  try {
    if (!_db) throw new Error('Firebase 연결이 필요합니다');

    const snap = await _db.collection('scripts').get();
    if (snap.docs.length > 0) {
      const batch = _db.batch();
      snap.docs.forEach(doc => {
        batch.update(doc.ref, { modelFiles: firebase.firestore.FieldValue.delete() });
      });
      await batch.commit();
    }
    Object.keys(_mvUrlCache).forEach(k => delete _mvUrlCache[k]);

    if (btn) btn.textContent = '⏳ 재스캔 중...';
    const matched = await _doScanLocalModelVoices();
    showToast(`✅ ${matched}개 방송문 재매핑 완료`);
  } catch (e) {
    showToast(`초기화/재스캔 실패: ${e.message}`);
    console.error('[초기화]', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🗑️ 전체 초기화 후 재스캔'; }
    if (scanBtn) scanBtn.disabled = false;
  }
}

function _renderAdminMvBody(scriptId, lang) {
  const body = $('admin-mv-body');
  if (!body) return;
  const stored = localStorage.getItem(`cabinvoice_voice_${scriptId}_${lang}`);
  const name = localStorage.getItem(`cabinvoice_voice_${scriptId}_${lang}_name`) || '등록됨';
  body.innerHTML = (stored
    ? `<div class="mv-current" style="margin-bottom:10px">
        <span class="mv-icon">🎵</span>
        <span class="mv-name" style="flex:1">${escHtml(name)}</span>
        <button type="button" class="btn-icon sm" id="admin-mv-play">▶ 재생</button>
        <button type="button" class="btn-icon sm mv-del-btn" id="admin-mv-del">✕ 삭제</button>
       </div>` : '')
    + `<label class="mv-upload-btn">📁 음성 파일 업로드 (MP3/WAV)
        <input type="file" id="admin-mv-file" accept="audio/*" style="display:none">
       </label>`;
  document.getElementById('admin-mv-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      saveModelVoiceLang(scriptId, lang, ev.target.result, file.name);
      _renderAdminMvBody(scriptId, lang);
      console.log(`[어드민] ${scriptId}/${lang} 모델 음성 저장: ${file.name}`);
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('admin-mv-play')?.addEventListener('click', () => {
    const b = loadModelVoice(scriptId, lang);
    if (b) new Audio(b).play();
  });
  document.getElementById('admin-mv-del')?.addEventListener('click', () => {
    deleteModelVoiceLang(scriptId, lang);
    _renderAdminMvBody(scriptId, lang);
    console.log(`[어드민] ${scriptId}/${lang} 모델 음성 삭제`);
  });
}

function _refreshAdminVersion() {
  const el = $('admin-deployed-badge');
  if (!_db) { initFirebase(); }
  if (!_db) { el.textContent = 'Firebase 미연결'; el.style.background='#fee2e2'; return; }
  firestoreLoadLatest().then(data => {
    if (data) {
      el.textContent = `${data.revVersion} · ${new Date(data.updatedAt?.seconds*1000||Date.now()).toLocaleDateString('ko')} 배포`;
      el.style.background='#dcfce7';
    } else {
      el.textContent = '배포된 버전 없음';
      el.style.background='#fef9c3';
    }
  });
}

function _refreshAdminVersionList() {
  const el = $('admin-version-list');
  if (!_db) return;
  firestoreLoadHistory().then(list => {
    if (!list.length) {
      el.innerHTML = '<div style="color:var(--gray-400);font-size:13px">버전 이력이 없습니다.</div>';
      return;
    }
    el.innerHTML = list.map(v => `
      <div class="admin-version-item">
        <div class="admin-version-info">
          <strong>${v.revVersion}</strong>
          <span class="admin-version-date">${new Date(v.updatedAt?.seconds*1000||Date.now()).toLocaleString('ko')}</span>
          <span class="admin-version-count">${v.announcements?.length||0}개</span>
        </div>
        <button class="btn-icon sm" data-rev="${v.revVersion}" id="rollback-${v.revVersion.replace(/\./g,'-')}">롤백</button>
      </div>`).join('');
    el.querySelectorAll('[data-rev]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`${btn.dataset.rev} 버전으로 롤백하시겠습니까?`)) return;
        try {
          await firestoreRollback(btn.dataset.rev);
          alert('롤백 완료. 앱을 새로고침하면 적용됩니다.');
          _refreshAdminVersion();
        } catch(e) { alert(`롤백 실패: ${e.message}`); }
      });
    });
  });
}

async function handleAdminPdf(file) {
  if (!file || file.type !== 'application/pdf') { _showAdminError('PDF 파일만 지원합니다.'); return; }

  $('admin-pdf-drop-zone').classList.add('hidden');
  $('admin-pdf-error').classList.add('hidden');
  $('admin-pdf-preview').classList.add('hidden');
  $('admin-pdf-parsing').classList.remove('hidden');
  $('admin-parsing-msg').textContent = 'PDF 이미지 변환 중...';
  $('admin-parsing-sub').textContent = file.name;

  try {
    if (!window.pdfjsLib) throw new Error('PDF.js 라이브러리를 불러오지 못했습니다.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const total = pdf.numPages;
    $('admin-parsing-msg').textContent = `Gemini AI로 ${total}페이지 분석 중...`;

    const ADMIN_PROMPT = `항공사 기내방송 교범 PDF 페이지들입니다. 각 페이지를 순서대로 분석하여 JSON 배열로만 반환하세요.

각 페이지에 대해:
방송문 없는 페이지(표지·목차·빈 페이지): {"skip":true}
방송문 있음: {"lang":"ko","num":"2.1.1","title":"방송 제목","text":"방송 본문"}

규칙:
- 언어 코드: ko(한국어), en(영어), ja(일본어)
- 일본어: 한글 독음(읽는 법)이 있으면 반드시 포함. 형식: 한글독음 줄 바로 다음에 히라가나/가타카나 원문 줄 (쌍). 예) "미나사마\nみなさま"
- 헤더(객실승무원 방송교범, 제N장...), 푸터(제정일자, REV.XX, 페이지번호) 제외
- [목적지] [편명] 같은 변수 그대로 유지
- 조건부 문안(General/수하물 과다 반입 등 표 구조)은 본문에 포함

반환: JSON 배열만 (예: [{"skip":true},{"lang":"ko",...}]) — 설명 없이`;

    const CHUNK_SIZE = 10;
    const pageResults = [];
    for (let start = 1; start <= total; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, total);
      $('admin-parsing-sub').textContent = `${start} – ${end} / ${total} 페이지...`;

      const images = await _renderPdfPages(pdf, start, end);
      const results = await callGeminiVisionChunk(images, ADMIN_PROMPT);
      pageResults.push(...results);

      if (end < total) await new Promise(r => setTimeout(r, 2000));
    }

    // 페이지 결과를 방송문별로 묶기
    const scriptMap = new Map();
    const order = [];
    for (const r of pageResults) {
      if (!r.num) continue;
      if (!scriptMap.has(r.num)) {
        scriptMap.set(r.num, { num: r.num, title: r.title||r.num, ko:'', en:'', ja:'' });
        order.push(r.num);
      }
      const s = scriptMap.get(r.num);
      if (r.title && !s.title) s.title = r.title;
      if (['ko','en','ja'].includes(r.lang)) s[r.lang] = (r.text||'').trim();
    }
    _adminParsedScripts = order.map(k => scriptMap.get(k)).filter(s => s.ko||s.en||s.ja);

    if (!_adminParsedScripts.length) { _showAdminError('방송문을 인식하지 못했습니다.'); return; }

    $('admin-pdf-parsing').classList.add('hidden');
    $('admin-pdf-preview').classList.remove('hidden');
    $('admin-preview-info').textContent = `${_adminParsedScripts.length}개 방송문 인식됨`;

    const LANG_LABELS = { ko:'🇰🇷 KO', en:'🇺🇸 EN', ja:'🇯🇵 JA' };
    $('admin-script-list').innerHTML = _adminParsedScripts.map((s, i) => {
      const activeLang = ['ko','en','ja'].find(l=>s[l])||'ko';
      const tabs = ['ko','en','ja'].map(l =>
        `<button class="pdf-lang-tab${l===activeLang?' active':''}" data-lang="${l}"${!s[l]?' style="opacity:.4"':''}>${LANG_LABELS[l]}</button>`
      ).join('');
      const panels = ['ko','en','ja'].map(l =>
        `<textarea class="pdf-field-textarea${l!==activeLang?' hidden':''}" data-field="${l}" rows="3">${(s[l]||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>`
      ).join('');
      return `
      <div class="pdf-script-item selected" data-idx="${i}">
        <input type="checkbox" class="pdf-script-check" checked>
        <div class="pdf-script-fields">
          <div class="pdf-script-num-title">
            <span class="pdf-script-num">${s.num}</span>
            <input class="pdf-field-input" data-field="title" value="${(s.title||'').replace(/"/g,'&quot;')}" placeholder="방송 제목">
          </div>
          <div class="pdf-lang-tabs">${tabs}</div>
          ${panels}
        </div>
      </div>`;
    }).join('');

    $('admin-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
      cb.addEventListener('change', () => cb.closest('.pdf-script-item').classList.toggle('selected', cb.checked));
    });
    $('admin-script-list').querySelectorAll('.pdf-lang-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const item = tab.closest('.pdf-script-item');
        item.querySelectorAll('.pdf-lang-tab').forEach(t=>t.classList.remove('active'));
        item.querySelectorAll('.pdf-field-textarea').forEach(ta=>ta.classList.add('hidden'));
        tab.classList.add('active');
        item.querySelector(`[data-field="${tab.dataset.lang}"]`).classList.remove('hidden');
      });
    });
  } catch(e) {
    $('admin-pdf-parsing').classList.add('hidden');
    _showAdminError(`오류: ${e.message}`);
  }
}

function _showAdminError(msg) {
  $('admin-pdf-drop-zone').classList.remove('hidden');
  $('admin-pdf-parsing').classList.add('hidden');
  $('admin-pdf-preview').classList.add('hidden');
  $('admin-pdf-error').classList.remove('hidden');
  $('admin-error-msg').textContent = msg;
}

async function deployToFirestore() {
  const rev = $('admin-rev-version').value.trim();
  if (!rev) { alert('개정번호를 입력해주세요 (예: Rev.23)'); return; }

  const items = $('admin-script-list').querySelectorAll('.pdf-script-item');
  const announcements = [];
  items.forEach(item => {
    const cb = item.querySelector('.pdf-script-check');
    if (!cb.checked) return;
    const idx = parseInt(item.dataset.idx);
    const meta = _adminParsedScripts[idx]||{};
    const title = item.querySelector('[data-field="title"]').value.trim()||'방송문';
    const langs = {};
    ['ko','en','ja'].forEach(l => {
      const ta = item.querySelector(`[data-field="${l}"]`);
      const text = ta?ta.value.trim():'';
      if (text) langs[l] = text;
    });
    if (!Object.keys(langs).length) return;

    // num을 파싱해서 chapter 추출
    const numParts = (meta.num||'').split('.');
    const chapter = parseInt(numParts[0])||0;
    announcements.push({
      id: meta.num||`item-${idx}`,
      chapter,
      chapterName: '',
      section: meta.num||'',
      title,
      ko: langs.ko||'',
      en: langs.en||'',
      ja: langs.ja||'',
      checkpoints: [],
      icon: '✈'
    });
  });

  if (!announcements.length) { alert('배포할 항목이 없습니다.'); return; }
  if (!confirm(`${announcements.length}개 방송문을 ${rev}로 Firestore에 배포하시겠습니까?`)) return;

  const btn = $('btn-admin-deploy');
  btn.disabled = true; btn.textContent = '배포 중...';
  try {
    if (!_db) { initFirebase(); }
    if (!_db) throw new Error('Firebase 연결에 실패했습니다.');
    await firestoreSaveLatest({
      revVersion: rev,
      updatedAt: firebase.firestore.Timestamp.now(),
      announcements
    });
    alert(`${rev} 배포 완료! (${announcements.length}개 방송문)`);
    _refreshAdminVersion();
    _refreshAdminVersionList();
    // 캐시 갱신
    localStorage.setItem('cabinvoice_scripts_cache', JSON.stringify({ rev, announcements, ts: Date.now() }));
  } catch(e) {
    alert(`배포 실패: ${e.message}`);
  } finally {
    btn.disabled = false; btn.textContent = '🚀 Firestore에 배포하기';
  }
}

async function deployJsonToFirestore() {
  const fileInput = $('admin-json-input');
  const file = fileInput?.files?.[0];
  if (!file) { alert('announcements.json 파일을 선택해주세요.'); return; }

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch { alert('JSON 파싱 오류: 올바른 JSON 파일인지 확인해주세요.'); return; }

  if (!data.announcements || !Array.isArray(data.announcements) || !data.revVersion) {
    alert('올바른 announcements.json 형식이 아닙니다.\n(revVersion, announcements 필드 필요)');
    return;
  }

  if (!confirm(`${data.announcements.length}개 방송문을 ${data.revVersion}으로 Firestore에 업로드하시겠습니까?`)) return;

  const btn = $('btn-admin-json-deploy');
  btn.disabled = true; btn.textContent = '업로드 중...';
  try {
    if (!_db) { initFirebase(); }
    if (!_db) throw new Error('Firebase 연결에 실패했습니다.');
    await firestoreSaveLatest({
      revVersion: data.revVersion,
      updatedAt: firebase.firestore.Timestamp.now(),
      announcements: data.announcements
    });
    localStorage.setItem('cabinvoice_scripts_cache', JSON.stringify({
      rev: data.revVersion, announcements: data.announcements, ts: Date.now()
    }));
    alert(`${data.revVersion} 업로드 완료! (${data.announcements.length}개 방송문)\n앱을 새로고침하면 반영됩니다.`);
    _refreshAdminVersion();
    _refreshAdminVersionList();
  } catch(e) {
    alert(`업로드 실패: ${e.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Firestore에 업로드';
  }
}

// ===== EVENTS =====
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  renderHome();
  showScreen('screen-home');

  // 언어 탭
  $('lang-tabs').querySelectorAll('.lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $('lang-tabs').querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedLang = tab.dataset.lang;
      if (state.currentScript) updatePrepContent();
    });
  });

  $('btn-back-prep').addEventListener('click', () => { clearInterval(state.prepTimerInterval); showScreen('screen-home'); });
  $('btn-start-record').addEventListener('click', startRecording);
  $('btn-peek').addEventListener('click', () => $('script-peek-text').classList.toggle('hidden'));
  $('btn-stop-record').addEventListener('click', stopRecording);
  $('btn-home').addEventListener('click', () => showScreen('screen-home'));
  $('btn-retry').addEventListener('click', () => { if (state.currentScript) startPrep(state.currentScript); });

  // 스크립트 편집/추가 모달 이벤트
  $('modal-close').addEventListener('click', closeCustomModal);
  $('modal-cancel').addEventListener('click', closeCustomModal);
  $('modal-save').addEventListener('click', saveScriptFromModal);
  $('modal-restore').addEventListener('click', () => {
    if (confirm('원본 방송문으로 복원하시겠습니까? 수정 내용이 삭제됩니다.')) {
      restoreBuiltIn(_modalState.editId);
      closeCustomModal();
    }
  });
  $('custom-modal').addEventListener('click', e => { if (e.target === $('custom-modal')) closeCustomModal(); });

  // 스크립트 모달 언어 탭
  document.querySelectorAll('.modal-lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-lang-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.modal-lang-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`modal-lang-${tab.dataset.lang}`).classList.add('active');
    });
  });

  // PDF 모달 이벤트
  $('pdf-modal-close').addEventListener('click', closePdfModal);
  $('pdf-modal-cancel').addEventListener('click', closePdfModal);
  $('pdf-modal').addEventListener('click', e => { if (e.target === $('pdf-modal')) closePdfModal(); });
  $('pdf-import-btn').addEventListener('click', importSelectedPdfScripts);
  $('pdf-retry-btn').addEventListener('click', () => _showPdfStep('upload'));

  // PDF 전체 선택/해제
  $('pdf-select-all').addEventListener('click', () => {
    $('pdf-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
      cb.checked = true; cb.closest('.pdf-script-item').classList.add('selected');
    });
  });
  $('pdf-deselect-all').addEventListener('click', () => {
    $('pdf-script-list').querySelectorAll('.pdf-script-check').forEach(cb => {
      cb.checked = false; cb.closest('.pdf-script-item').classList.remove('selected');
    });
  });

  // PDF 파일 선택
  $('pdf-file-input').addEventListener('change', e => {
    if (e.target.files[0]) handlePdfFile(e.target.files[0]);
  });

  // PDF 드래그 앤 드롭
  const dropZone = $('pdf-drop-zone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  });

  // ===== AUTH MODAL 이벤트 =====
  $('auth-confirm').addEventListener('click', _confirmAuth);
  $('auth-cancel').addEventListener('click', () => {
    $('auth-modal').classList.add('hidden');
    _authCallback = null;
  });
  $('auth-pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') _confirmAuth(); });
  $('auth-modal').addEventListener('click', e => {
    if (e.target === $('auth-modal')) { $('auth-modal').classList.add('hidden'); _authCallback = null; }
  });

  // ===== TABLE INSERT 이벤트 =====
  $('btn-table-toggle').addEventListener('click', () => {
    const builder = $('table-builder');
    const isOpen = !builder.classList.contains('hidden');
    builder.classList.toggle('hidden', isOpen);
    $('btn-table-toggle').classList.toggle('active', !isOpen);
  });
  $('tb-insert-btn').addEventListener('click', () => {
    const cols = parseInt($('tb-cols').value, 10);
    const rows = parseInt($('tb-rows').value, 10);
    const ta = document.getElementById('custom-text-ko');
    const header = '|' + Array.from({length:cols}, (_,i)=>`열${i+1}`).join('|') + '|';
    const sep    = '|' + Array(cols).fill('---').join('|') + '|';
    const dataRow= '|' + Array(cols).fill('내용').join('|') + '|';
    const tableStr = [header, sep, ...Array(rows).fill(dataRow)].join('\n');
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const after  = ta.value.substring(pos);
    ta.value = before + (before && !before.endsWith('\n') ? '\n' : '') + tableStr + '\n' + after;
    $('table-builder').classList.add('hidden');
    $('btn-table-toggle').classList.remove('active');
    ta.focus();
  });

  // ===== MODEL VOICE 이벤트 (언어별) =====
  ['ko','en','ja','ca'].forEach(lang => {
    document.getElementById(`mv-file-${lang}`)?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { alert('파일 크기 10MB 초과'); e.target.value = ''; return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const key = getModelVoiceKey(lang);
        localStorage.setItem(key, ev.target.result);
        localStorage.setItem(key + '_name', file.name);
        const el = document.getElementById(`mv-current-${lang}`);
        const nameEl = document.getElementById(`mv-name-${lang}`);
        if (el) el.classList.remove('hidden');
        if (nameEl) nameEl.textContent = file.name;
        console.log(`[모달] ${lang} 모델 음성 저장: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
    document.getElementById(`mv-play-${lang}`)?.addEventListener('click', () => {
      const base64 = localStorage.getItem(getModelVoiceKey(lang));
      if (base64) new Audio(base64).play();
    });
    document.getElementById(`mv-del-${lang}`)?.addEventListener('click', () => {
      const key = getModelVoiceKey(lang);
      localStorage.removeItem(key); localStorage.removeItem(key + '_name');
      const el = document.getElementById(`mv-current-${lang}`);
      if (el) el.classList.add('hidden');
      const nameEl = document.getElementById(`mv-name-${lang}`);
      if (nameEl) nameEl.textContent = '';
      const fileEl = document.getElementById(`mv-file-${lang}`);
      if (fileEl) fileEl.value = '';
    });
  });
  // MV 모달 언어 탭 전환
  document.querySelectorAll('#mv-lang-tabs .mv-lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#mv-lang-tabs .mv-lang-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.mv-lang-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`mv-panel-${tab.dataset.lang}`)?.classList.add('active');
      _modalMvLang = tab.dataset.lang;
    });
  });

  // ===== 학습 모드 =====
  $('btn-study-mode').addEventListener('click', startStudyMode);
  $('btn-back-study').addEventListener('click', () => {
    if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio = null; }
    if (state.currentScript) showScreen('screen-prep');
    else showScreen('screen-home');
  });
  // 학습 화면 성별 버튼
  ['m', 'f'].forEach(g => {
    $(`study-gender-${g}`)?.addEventListener('click', () => {
      const G = g.toUpperCase();
      if (_currentGender === G) return;
      _currentGender = G;
      ['m', 'f'].forEach(x => $(`study-gender-${x}`)?.classList.toggle('active', x === g));
      if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio = null; }
      createModelVoicePlayer('study-model-player', { noGender: true });
    });
  });
  // 가이드 생성
  $('btn-gen-guide').addEventListener('click', async () => {
    const s = state.currentScript;
    if (!s) return;
    const lang = state.selectedLang;
    const cacheKey = `${s.id}_${lang}`;
    if (_studyGuideCache[cacheKey]) {
      const cached = _studyGuideCache[cacheKey];
      _renderStudyGuide(cached);
      if (lang === 'ca' && cached.chineseReadings?.length) {
        _renderChineseScriptWithReadings(s.langs[lang].text, cached.chineseReadings);
      }
      return;
    }
    const guideBtn = $('btn-gen-guide');
    const statusEl = $('study-guide-status');
    guideBtn.disabled = true;
    guideBtn.textContent = '⏳ 분석 중...';
    statusEl.textContent = 'AI가 분석 중입니다...';
    statusEl.className = 'study-guide-loading';
    statusEl.classList.remove('hidden');
    $('study-guide-result').classList.add('hidden');
    try {
      const guide = await callGeminiGuide(s.langs[lang].text, lang);
      _studyGuideCache[cacheKey] = guide;
      statusEl.classList.add('hidden');
      _renderStudyGuide(guide);
      if (lang === 'ca' && guide.chineseReadings?.length) {
        _renderChineseScriptWithReadings(s.langs[lang].text, guide.chineseReadings);
      }
      guideBtn.textContent = '✅ 가이드 완성';
      // Firestore 자동 저장 (실패해도 무시)
      _saveGuideToFirestore(s.id, lang, guide);
      console.log('[완료] AI 학습 가이드 생성 및 저장');
    } catch (e) {
      statusEl.textContent = '가이드 생성에 실패했습니다. 다시 시도해주세요.';
      statusEl.className = 'study-guide-error';
      guideBtn.disabled = false;
      guideBtn.textContent = '가이드 생성하기';
      console.error('[가이드 생성 실패]', e.message);
    }
  });
  // 학습 화면 하단 버튼
  $('btn-study-to-drill').addEventListener('click', () => {
    if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio = null; }
    startDrillMode();
  });
  $('btn-study-to-record').addEventListener('click', () => {
    if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio = null; }
    showScreen('screen-prep');
    // prep에서 즉시 녹음 시작 트리거
    $('btn-start-record').click();
  });

  // ===== 드릴 모드 =====
  $('btn-drill-mode').addEventListener('click', startDrillMode);
  $('btn-back-drill').addEventListener('click', () => {
    _drill.stream?.getTracks().forEach(t => t.stop());
    if (_currentModelAudio) { _currentModelAudio.pause(); _currentModelAudio = null; }
    if (state.currentScript) showScreen('screen-prep');
    else showScreen('screen-home');
  });
  $('btn-drill-record').addEventListener('click', _drillStartRec);
  $('btn-drill-play-my').addEventListener('click', () => {
    if (!_drill.myAudioUrl) return;
    const a = new Audio(_drill.myAudioUrl);
    a.setAttribute('playsinline', '');
    a.play().catch(e => { console.error('[드릴] 내음성 재생 오류:', e); showToast('음성 재생에 실패했습니다.', 'error'); });
  });
  $('btn-drill-redo').addEventListener('click', () => {
    if (_drill.myAudioUrl) { URL.revokeObjectURL(_drill.myAudioUrl); _drill.myAudioUrl = null; }
    _drill.myBlob = null;
    _drillRender();
  });
  $('btn-drill-next').addEventListener('click', _drillNext);
  $('btn-drill-done').addEventListener('click', () => {
    if (state.currentScript) startPrep(state.currentScript);
    else showScreen('screen-home');
  });

  // ===== 결과 화면 모델 음성 비교 =====
  $('btn-play-model').addEventListener('click', playModelVoice);
  $('btn-play-my').addEventListener('click', playMyRecording);
  $('btn-compare-voice').addEventListener('click', startModelComparison);
  $('btn-compare-stop').addEventListener('click', stopModelComparison);

  // ===== 관리자 패널 =====
  $('btn-open-admin').addEventListener('click', openAdminScreen);
  $('btn-admin-back').addEventListener('click', () => { showScreen('screen-home'); loadAndRenderHome(); });
  if ($('btn-admin-scan-mv')) $('btn-admin-scan-mv').addEventListener('click', _scanLocalModelVoices);
  if ($('btn-admin-reset-scan-mv')) $('btn-admin-reset-scan-mv').addEventListener('click', _resetAndRescanModelVoices);
  if ($('btn-save-firebase-cfg')) $('btn-save-firebase-cfg').addEventListener('click', () => {
    const ok = initFirebase();
    const el = $('admin-firebase-status');
    if (el) el.textContent = ok ? '✅ Firebase 연결됨' : '❌ 연결 실패';
    if (ok) { _refreshAdminVersion(); _refreshAdminVersionList(); }
  });
  $('admin-pdf-input').addEventListener('change', e => { if (e.target.files[0]) handleAdminPdf(e.target.files[0]); });
  const adminDropZone = $('admin-pdf-drop-zone');
  adminDropZone.addEventListener('dragover', e => { e.preventDefault(); adminDropZone.classList.add('drag-over'); });
  adminDropZone.addEventListener('dragleave', () => adminDropZone.classList.remove('drag-over'));
  adminDropZone.addEventListener('drop', e => { e.preventDefault(); adminDropZone.classList.remove('drag-over'); const f=e.dataTransfer.files[0]; if(f) handleAdminPdf(f); });
  $('btn-admin-deploy').addEventListener('click', deployToFirestore);
  $('btn-admin-json-deploy').addEventListener('click', deployJsonToFirestore);
  $('admin-select-all').addEventListener('click', () => $('admin-script-list').querySelectorAll('.pdf-script-check').forEach(cb=>{cb.checked=true;cb.closest('.pdf-script-item').classList.add('selected');}));
  $('admin-deselect-all').addEventListener('click', () => $('admin-script-list').querySelectorAll('.pdf-script-check').forEach(cb=>{cb.checked=false;cb.closest('.pdf-script-item').classList.remove('selected');}));
  $('admin-retry-btn').addEventListener('click', () => { $('admin-pdf-error').classList.add('hidden'); $('admin-pdf-drop-zone').classList.remove('hidden'); });

  // ===== 사이드바 =====
  $('btn-toggle-sidebar').addEventListener('click', openSidebar);
  $('sidebar-overlay').addEventListener('click', closeSidebar);
  $('btn-sidebar-add').addEventListener('click', () => requireEditAuth(openAddModal));
  $('btn-sidebar-pdf').addEventListener('click', () => requireEditAuth(openPdfModal));
  _setupSidebarSearch();

  // 상세 패널 언어 탭
  $('detail-lang-tabs').querySelectorAll('.detail-lang-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (!_selectedScriptId) return;
      const s = _allScripts.find(x => x.id === _selectedScriptId);
      if (!s || !s.langs[tab.dataset.lang]?.text) return;
      _detailLang = tab.dataset.lang;
      $('detail-lang-tabs').querySelectorAll('.detail-lang-tab').forEach(t => t.classList.toggle('active', t.dataset.lang===_detailLang));
      _renderDetailContent(s, _detailLang);
    });
  });

  // 상세 패널 버튼들
  $('detail-start-btn').addEventListener('click', () => {
    if (!_selectedScriptId) return;
    const s = _allScripts.find(x => x.id === _selectedScriptId);
    if (s) { state.selectedLang = _detailLang; startPrep(s, _detailLang); }
  });
  // detail-voice-btn 제거됨 — 모델 음성은 학습 화면(screen-study)에서 재생
  $('detail-edit-btn').addEventListener('click', () => {
    if (!_selectedScriptId) return;
    const btn = $('detail-edit-btn');
    requireEditAuth(() => openEditModal(btn.dataset.id, btn.dataset.source));
  });

  // 결과 화면 버튼
  document.getElementById('btn-result-select')?.addEventListener('click', () => { stopModelComparison(); showScreen('screen-home'); });
  document.getElementById('btn-result-retry-2')?.addEventListener('click', () => { stopModelComparison(); if (state.currentScript) startPrep(state.currentScript); });
  $('btn-retry')?.addEventListener('click', () => { stopModelComparison(); if (state.currentScript) startPrep(state.currentScript); });
});
