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
let _geminiModel = null;
function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    return true;
  } catch { return false; }
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
  await _db.collection('cabinManual').collection('history').doc(data.revVersion).set(data);
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
let _mvAudioUrl = null; // revocable object URL for current playback
function base64ToBlob(base64) {
  const parts = base64.split(',');
  const mime = (parts[0].match(/:(.*?);/)||['','audio/mpeg'])[1];
  const bin = atob(parts[1]||parts[0]);
  const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime});
}
function loadModelVoice(scriptId) {
  return localStorage.getItem(`cabinvoice_voice_${scriptId}`) || null;
}
function saveModelVoice(scriptId, base64) {
  localStorage.setItem(`cabinvoice_voice_${scriptId}`, base64);
}
function deleteModelVoice(scriptId) {
  localStorage.removeItem(`cabinvoice_voice_${scriptId}`);
}
function getModelVoiceKey() {
  // During edit: use existing id. During add: use pending key resolved at save time.
  return _modalState.mode === 'edit' ? `cabinvoice_voice_${_modalState.editId}` : 'cabinvoice_voice__pending';
}
function _refreshMvUI() {
  const key = getModelVoiceKey();
  const stored = localStorage.getItem(key);
  const hasMv = !!stored;
  $('mv-current').classList.toggle('hidden', !hasMv);
  $('mv-name').textContent = hasMv ? (localStorage.getItem(key + '_name') || '모델 음성 등록됨') : '';
}

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
  const sttMap = { ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN' };
  const wpmMap = { ko:130, en:140, ja:110, zh:118 };
  const checkpoints = cpStr ? cpStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
  return {
    sttLang: sttMap[langCode] || 'ko-KR',
    idealWPM: wpmMap[langCode] || 130,
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
    langs: {
      ...(a.ko ? { ko: buildCustomLang(a.ko, (a.checkpoints||[]).join(','), 'ko') } : {}),
      ...(a.en ? { en: buildCustomLang(a.en, '', 'en') } : {}),
      ...(a.ja ? { ja: buildCustomLang(a.ja, '', 'ja') } : {}),
    }
  })).filter(s => s.langs.ko || s.langs.en);
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
  const langDots = ['ko','en','ja','zh'].filter(l => s.langs?.[l]?.text)
    .map(l => `<span class="lang-dot lang-dot-${l}"></span>`).join('');
  return `<div class="sidebar-item${_selectedScriptId===s.id?' selected':''}" data-id="${s.id}">
    <span class="sidebar-item-section">${s._section||''}</span>
    <span class="sidebar-item-title">${escHtml(s.title)}</span>
    <span class="sidebar-item-langs">${langDots}</span>
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
  const tabs = $('detail-lang-tabs');
  tabs.querySelectorAll('.detail-lang-tab').forEach(tab => {
    const hasLang = s.langs[tab.dataset.lang]?.text;
    tab.style.opacity = hasLang ? '' : '0.35';
    tab.style.pointerEvents = hasLang ? '' : 'none';
    tab.classList.toggle('active', tab.dataset.lang === _detailLang);
  });
}

function _renderDetailContent(s, lang) {
  const langData = s.langs[lang];
  if (!langData) return;

  // 변수 하이라이트 ([목적지] 등)
  const highlightedText = (langData.text||'').replace(/\[([^\]]+)\]/g,
    '<span class="script-var">[$1]</span>');
  $('detail-script-box').innerHTML = `<div class="script-text-rendered">${highlightedText.replace(/\n/g,'<br>')}</div>`;

  // 체크포인트
  const cpEl = $('detail-checkpoints');
  if (langData.checkpoints?.length) {
    cpEl.classList.remove('hidden');
    cpEl.innerHTML = `<div class="checkpoints-label">✅ 핵심 체크포인트</div>
      <div class="checkpoints-list">${langData.checkpoints.map(c=>`<span class="checkpoint-item">✓ ${c}</span>`).join('')}</div>`;
  } else {
    cpEl.classList.add('hidden');
  }

  // 모델 음성
  const voiceBtn = $('detail-voice-btn');
  const hasVoice = !!loadModelVoice(s.id);
  voiceBtn.classList.toggle('hidden', !hasVoice);

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

  // 언어 탭: 해당 언어 데이터가 없으면 탭 비활성화
  $('lang-tabs').querySelectorAll('.lang-tab').forEach(tab => {
    const hasLang = s.langs[tab.dataset.lang] && s.langs[tab.dataset.lang].text;
    tab.style.opacity = hasLang ? '' : '0.35';
    tab.style.pointerEvents = hasLang ? '' : 'none';
  });
  // 선택된 언어가 없으면 첫 번째 available 언어로 fallback
  if (!s.langs[state.selectedLang] || !s.langs[state.selectedLang].text) {
    state.selectedLang = Object.keys(s.langs).find(l => s.langs[l].text) || 'ko';
    $('lang-tabs').querySelectorAll('.lang-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.lang === state.selectedLang);
    });
  }

  const lang = s.langs[state.selectedLang];

  if ($('prep-title-bar')) $('prep-title-bar').textContent = s.title;
  $('prep-text').innerHTML = renderScriptText(lang.text);
  // 모델 음성 바
  const hasVoice = !!loadModelVoice(s.id);
  $('model-voice-bar').classList.toggle('hidden', !hasVoice);

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

  $('record-title').textContent = `${state.currentScript.title} · ${{ ko:'한국어', en:'English', ja:'日本語', zh:'中文' }[state.selectedLang]}`;
  $('record-timer').textContent = '00:00';
  $('live-text').textContent = '말씀해 주세요...';
  $('script-peek-text').innerHTML = renderScriptText(lang.text);
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

  state.mediaRecorder = new MediaRecorder(state.stream);
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
  if (state.mediaRecorder?.state !== 'inactive') state.mediaRecorder.stop();
  state.stream?.getTracks().forEach(t => t.stop());
  if (state.audioContext) { state.audioContext.close(); state.audioContext = null; }

  const duration = (Date.now() - state.recordingStart) / 1000;
  $('loading-overlay').classList.remove('hidden');
  setTimeout(() => analyzeAndShow(duration), 1800);
}

// ===== 엄격한 3단계 배점 =====
// ratio=0 → 0점, 이하 선형 증가, 기준: 부족<0.40, 보통<0.78, 우수≥0.78
function tierScore(ratio, maxPt) {
  if (!ratio || ratio <= 0) return 0;
  ratio = Math.min(1, Math.max(0, ratio));
  if (ratio >= 0.82) return maxPt;
  if (ratio >= 0.55) {
    // 보통 구간: 10pt→6~9, 5pt→3~4
    if (maxPt === 10) return Math.round(6 + (ratio - 0.55) / 0.27 * 3);
    if (maxPt === 5)  return Math.round(3 + (ratio - 0.55) / 0.27);
  }
  if (ratio >= 0.30) {
    // 부족 구간: 10pt→2~6, 5pt→1~3
    if (maxPt === 10) return Math.round(2 + (ratio - 0.30) / 0.25 * 4);
    if (maxPt === 5)  return Math.round(1 + (ratio - 0.30) / 0.25 * 2);
  }
  // 매우 부족: 최소 0~2
  if (maxPt === 10) return Math.round(ratio / 0.30 * 2);
  if (maxPt === 5)  return Math.round(ratio / 0.30);
  return 0;
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
  // 15% 미만이면 신호가 아닌 노이즈로 간주 → 음성 기반 지표 전부 0
  const cG = contentQuality >= 0.15 ? contentQuality : 0;
  // ─────────────────────────────────────────────────────────────────────────

  // --- 음성 신호 측정 ---
  const wpm        = hasSpeech && duration > 3 ? (transcript.split(' ').filter(Boolean).length / duration) * 60 : 0;
  const wpmRatio   = wpm > 0 ? Math.max(0, 1 - Math.abs(wpm - lang.idealWPM) / 70) : 0;
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
  const gAmpPeaks    = ampPeaks    * cG;   // 강조: 내용 없이 진폭 피크만으론 안 됨
  const gAmpStab     = ampStab     * (0.4 + 0.6 * cG); // 발성: 기본 40%는 신호 반영
  const gPitchWarmth = pitchWarmth * cG;   // 목소리 톤: 내용 없이 판단 불가
  const gIntonCV     = intonationCV * cG;  // 억양 CV: 내용 없이 판단 불가
  const gPitchRange  = pitchRange  * cG;   // 억양 범위: 내용 없이 판단 불가
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
    total, pass: total >= 85,
    wpm: Math.round(wpm), duration,
    wordMatch, completeness, contentQuality,
    categories: {
      fluency:       { score: fluencyItems.reduce((a,b)=>a+b,0),       max: 30, items: fluencyItems },
      voice:         { score: voiceItems.reduce((a,b)=>a+b,0),         max: 25, items: voiceItems },
      intonation:    { score: intonationItems.reduce((a,b)=>a+b,0),    max: 25, items: intonationItems },
      pronunciation: { score: pronunciationItems.reduce((a,b)=>a+b,0), max: 20, items: pronunciationItems }
    }
  };

  $('loading-overlay').classList.add('hidden');
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
function showResults(result, transcript) {
  showScreen('screen-result');
  const lang = state.currentScript.langs[state.selectedLang];

  $('total-score-value').textContent = result.total;
  const gradeEl = $('total-grade');
  gradeEl.textContent = result.pass ? 'PASS ✓' : 'FAIL ✗';
  gradeEl.className   = `total-grade ${result.pass ? 'grade-A' : 'grade-D'}`;

  renderRadar(result);

  const barsEl = $('score-bars');
  barsEl.innerHTML = Object.entries(CHECKLIST).map(([key, cat]) => {
    const cr = result.categories[key];
    const pct = Math.round(cr.score / cat.max * 100);
    const itemsHTML = cat.items.map((item, i) => {
      const got = cr.items[i];
      const tier = got >= item.max ? '우수' : got >= (item.max === 10 ? 6 : 3) ? '보통' : '부족';
      const tc   = got >= item.max ? 'tier-good' : got >= (item.max === 10 ? 6 : 3) ? 'tier-mid' : 'tier-low';
      return `<div class="sub-item">
        <div class="sub-item-name">${item.label}</div>
        <div class="sub-item-right">
          <span class="sub-tier ${tc}">${tier}</span>
          <span class="sub-score">${got}<span class="sub-max">/${item.max}</span></span>
        </div>
      </div>`;
    }).join('');
    return `<div class="score-cat-block">
      <div class="score-bar-header">
        <div class="score-bar-name">${cat.icon} ${cat.label}</div>
        <div class="score-bar-val" style="color:${cat.color}">${cr.score}<span style="font-size:12px;color:#94a3b8">/${cat.max}</span></div>
      </div>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:0%;background:${cat.color}" data-target="${pct}"></div>
      </div>
      <div class="sub-items">${itemsHTML}</div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => {
    barsEl.querySelectorAll('.score-bar-fill').forEach(el => { el.style.width = el.dataset.target + '%'; });
  });

  renderFeedback(result, transcript, lang);
  renderTranscriptCompare(transcript, lang);

  // AI 채점 섹션 초기화
  const aiSec = $('ai-result-section');
  if (aiSec) {
    aiSec.classList.add('hidden');
    $('diff-words-box').innerHTML = '';
    $('improvement-box').classList.add('hidden');
    $('encouragement-box').classList.add('hidden');
  }

  // AI 채점 (Firebase 초기화된 경우 자동 실행)
  if (firebase.apps.length && transcript && transcript.length > 10) {
    callGeminiScoring(lang.text, transcript, state.selectedLang).then(aiResult => {
      if (aiResult) renderAiResult(aiResult);
    }).catch(() => {});
  }
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
          label: 'PASS 기준(85%)',
          data: [85,85,85,85],
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

function renderFeedback(result, transcript, lang) {
  const cats = result.categories;

  /* ── 카테고리별 개선 팁 정의 ──
     cq = content quality (0~1). 음성·억양 기반 팁은 방송 내용이 충분히 인식됐을 때만 유효.
     cq < 0.3 이면 행동 관련 팁 대신 "내용 인식 부족" 안내를 표시한다. */
  const cq = result.contentQuality ?? 0;
  const cqOk  = cq >= 0.30;  // 음성 분석 팁이 의미 있는 최소 임계값
  const cqFull= cq >= 0.50;  // 연출·억양 팁이 신뢰도 높은 임계값

  const CAT_TIPS = {
    fluency: [
      // 끊어 읽기 — 내용이 어느 정도 인식된 경우에만
      (v) => (v < 4 && cqOk) ? '의미 단위로 자연스럽게 끊어 읽는 연습을 하세요.' : null,
      // 속도 연출
      (v) => (v < 4 && cqOk) ? (result.wpm > 0
        ? `현재 ${result.wpm} WPM — 적정 ${lang.idealWPM} WPM. ${result.wpm > lang.idealWPM ? '조금 더 천천히' : '조금 더 빠르게'} 말해보세요.`
        : '125–140 WPM의 적절한 속도로 연습하세요.') : null,
      // 강조 표현
      (v) => (v < 3 && cqFull) ? '목적지·편명·시간 등 핵심 정보에서 적절한 강세를 넣어 보세요.' : null,
      // 문안 숙지 — contentQuality 자체가 낮으면 직접 내용 부족 언급
      (v) => v < 3 ? (cqOk
        ? '버벅거림이 감지됐습니다. 방송문을 완전히 숙지한 후 다시 시도하세요.'
        : '방송문 내용이 충분히 인식되지 않았습니다. 방송문 전체를 또렷하게 읽어 보세요.') : null,
      // 말하는 듯한 연출 — 충분한 내용이 있어야 억양·강세 패턴을 판단할 수 있음
      (v) => (v < 7 && cqFull) ? '억양 변화와 강세 패턴이 단조롭습니다. 특정 단어에 강세를 주고 문장 끝 처리를 다양하게 연습하세요.' : null,
    ],
    voice: [
      // 안정적인 발성 — 충분한 발화 없이는 판단 불가
      (v) => (v < 6 && cqOk) ? '복식호흡 후 안정적인 발성으로 시작하세요.' : null,
      (v) => (v < 4 && cqOk) ? '자신의 목소리에 어울리는 자연스러운 톤을 찾아보세요.' : null,
      (v) => (v < 6 && cqFull) ? '미소를 지으며 방송하면 목소리에서 따뜻함이 자연스럽게 전달됩니다.' : null,
    ],
    intonation: [
      // 억양은 충분한 발화가 있어야 의미 있음
      (v) => (v < 3 && cqOk) ? '"~습니다", "~주시기 바랍니다" 등 문장 끝을 흐리지 않고 명확하게 마무리하세요.' : null,
      (v) => (v < 6 && cqFull) ? '피치 변화 폭이 좁습니다. 문장마다 자연스러운 굴곡을 넣어 생동감 있게 말하세요.' : null,
      (v) => (v < 6 && cqFull) ? '억양 기복이 고르지 않습니다. 전체적으로 일정한 흐름을 유지하세요.' : null,
    ],
    pronunciation: [
      (v) => v < 5 ? `핵심 단어(${lang.keyPhrases.slice(0,4).join(', ')})를 입을 크게 벌려 또렷하게 발음하세요.` : null,
      (v) => v < 5 ? '받침·어미가 흐려지는 경향이 있습니다. 각 음절을 끝까지 분명하게 발음하세요.' : null,
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
    ? '합격 기준(85점) 통과. 아래 개선사항으로 완성도를 더 높여보세요.'
    : `합격까지 ${85 - result.total}점 부족. 아래 카테고리를 집중 연습하세요.`;

  const noSpeech = (!transcript || transcript.length < 5)
    ? `<div class="fb-no-speech">⚠️ 음성이 인식되지 않았습니다 — Chrome 브라우저 + 마이크 허용 필요. 발음·완성도 점수가 0점 처리됩니다.</div>`
    : (cq < 0.20 && transcript && transcript.length >= 5)
    ? `<div class="fb-no-speech fb-low-content">⚠️ 방송문 내용 일치율이 낮아(${Math.round(cq*100)}%) 음성·억양 분석의 신뢰도가 제한됩니다. 방송문 전체를 또렷하게 읽은 후 다시 시도하세요.</div>`
    : '';

  const overviewHTML = `
  <div class="fb-overview ${overviewCls}">
    <div class="fb-ov-left">
      <div class="fb-ov-score">${result.total}</div>
      <div class="fb-ov-badge">${overviewIcon} ${overviewLabel}</div>
    </div>
    <div class="fb-ov-right">
      <div class="fb-ov-msg">${overviewMsg}</div>
      <div class="fb-ov-stats">
        <span class="fb-stat">⏱ ${Math.round(result.duration)}초</span>
        <span class="fb-stat">💬 ${result.wpm} WPM</span>
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
    const gradeLabel = pct >= 87 ? '우수' : pct >= 60 ? '보통' : '부족';
    const tips = CAT_TIPS[key];

    const subRows = cat.items.map((item, i) => {
      const got   = cr.items[i];
      const ratio = got / item.max;
      const iGood = ratio >= 0.87;
      const iMid  = ratio >= 0.60;
      const rowCls = iGood ? 'sr-good' : iMid ? 'sr-mid' : 'sr-low';
      const tagCls = iGood ? 'tag-good' : iMid ? 'tag-mid' : 'tag-low';
      const icon   = iGood ? '✓' : iMid ? '△' : '✕';
      const label  = iGood ? '우수' : iMid ? '보통' : '부족';
      const tip    = tips[i]?.(got);

      return `
      <div class="fb-sub-row ${rowCls}">
        <div class="fb-sub-main">
          <span class="fb-sub-icon">${icon}</span>
          <span class="fb-sub-name">${item.label}</span>
          <span class="fb-sub-score">${got}<span class="fb-sub-max">/${item.max}</span></span>
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
          <span class="fb-gh-score">${cr.score}<span class="fb-gh-max">/${cat.max}</span></span>
          <span class="fb-gh-badge badge-${grade}">${gradeLabel}</span>
        </div>
      </div>
      <div class="fb-group-body">${subRows}</div>
    </div>`;
  }).join('');

  $('feedback-cards').innerHTML = overviewHTML + groupsHTML;
}

function renderTranscriptCompare(transcript, lang) {
  const preview = lang.text.split('\n').slice(0,3).join(' ') + (lang.text.split('\n').length > 3 ? '…' : '');
  $('transcript-compare').innerHTML = `
    <div class="tc-row"><div class="tc-label">방송 원문</div><div class="tc-text">${preview}</div></div>
    <div class="tc-row"><div class="tc-label">인식 결과</div><div class="tc-text recognized">${transcript || '(인식 없음 — Chrome + 마이크 허용 필요)'}</div></div>`;
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
  ['ko','en','ja','zh'].forEach(l => {
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
  // model voice
  $('mv-current').classList.add('hidden');
  $('mv-name').textContent = '';
  document.getElementById('mv-file-input').value = '';
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

  ['ko','en','ja','zh'].forEach(l => {
    const ta = document.getElementById(`custom-text-${l}`);
    if (ta && script.langs[l]) ta.value = script.langs[l].text || '';
  });
  const koLang = script.langs.ko;
  if (koLang?.checkpoints) {
    document.getElementById('custom-checkpoints-ko').value = koLang.checkpoints.join(', ');
  }
  // model voice
  const voiceStored = loadModelVoice(id);
  if (voiceStored) {
    $('mv-current').classList.remove('hidden');
    $('mv-name').textContent = localStorage.getItem(`cabinvoice_voice_${id}_name`) || '모델 음성 등록됨';
  }
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
    ['ko','en','ja','zh'].forEach(l => {
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
    ['en','ja','zh'].forEach(l => {
      const text = document.getElementById(`custom-text-${l}`)?.value.trim();
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    arr[idx] = { ...arr[idx], title, icon, difficulty, difficultyClass, langs };
    saveCustomScripts(arr);

  } else {
    // 새 방송문 추가
    const langs = {};
    langs.ko = buildCustomLang(koText, cpStr, 'ko');
    ['en','ja','zh'].forEach(l => {
      const text = document.getElementById(`custom-text-${l}`)?.value.trim();
      if (text) langs[l] = buildCustomLang(text, '', l);
    });
    const id = 'custom_' + Date.now();
    // pending 모델 음성 → 실제 id로 이동
    const pendingVoice = localStorage.getItem('cabinvoice_voice__pending');
    const pendingName  = localStorage.getItem('cabinvoice_voice__pending_name');
    if (pendingVoice) {
      localStorage.setItem(`cabinvoice_voice_${id}`, pendingVoice);
      localStorage.setItem(`cabinvoice_voice_${id}_name`, pendingName || '모델 음성');
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
- 언어 코드: ko(한국어), en(영어), ja(일본어), zh(중국어)
- 일본어: 히라가나/가타카나 원문만 추출, 한글 발음 표기는 제외
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
      scriptMap.set(r.num, { num: r.num, title: r.title || r.num, ko: '', en: '', ja: '', zh: '' });
      order.push(r.num);
    }
    const s = scriptMap.get(r.num);
    if (r.title && !s.title) s.title = r.title;

    const lang = r.lang;
    if (['ko','en','ja','zh'].includes(lang)) {
      if (r.variants && r.variants.length >= 2) {
        s[lang] = r.variants.map(v => `[${v.label}]\n${v.text.trim()}`).join('\n\n');
      } else {
        s[lang] = (r.text || '').trim();
      }
    }
  }

  return order.map(k => scriptMap.get(k)).filter(s => s.ko || s.en || s.ja || s.zh);
}

function renderPdfPreview(scripts) {
  _pdfParsedScripts = scripts;
  _showPdfStep('preview');
  $('pdf-preview-info').textContent =
    `${scripts.length}개 방송문안 인식됨 — 가져올 항목을 선택·편집하세요`;
  $('pdf-import-btn').classList.remove('hidden');

  const LANG_LABELS = { ko: '🇰🇷 한국어', en: '🇺🇸 영어', ja: '🇯🇵 일본어', zh: '🇨🇳 중국어' };

  const rows = scripts.map((s, i) => {
    const activeLang = ['ko','en','ja','zh'].find(l => s[l]) || 'ko';
    const langTabs = ['ko','en','ja','zh'].map(l =>
      `<button class="pdf-lang-tab${l === activeLang ? ' active' : ''}" data-lang="${l}"${!s[l] ? ' style="opacity:.4"' : ''}>${LANG_LABELS[l]}</button>`
    ).join('');
    const langPanels = ['ko','en','ja','zh'].map(l =>
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
    ['ko','en','ja','zh'].forEach(l => {
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
async function callGeminiScoring(script, transcript, langCode) {
  const model = await getGeminiModel();
  const langName = { ko:'한국어', en:'영어', ja:'일본어', zh:'중국어' }[langCode] || '한국어';
  const prompt = `당신은 항공사 기내방송 전문 평가관입니다.
원문(script)과 훈련생 발화(transcript)를 비교하여 아래 JSON 형식으로만 반환하세요 (설명 없이).

{
  "totalScore": 0-100,
  "categories": {
    "completeness": { "score": 0-100, "feedback": "...", "missed": [] },
    "honorifics":   { "score": 0-100, "feedback": "..." },
    "fluency":      { "score": 0-100, "feedback": "..." },
    "clarity":      { "score": 0-100, "feedback": "..." }
  },
  "diffWords": [
    { "word": "단어", "status": "correct" }
  ],
  "improvementExample": "이렇게 말씀해 보세요...",
  "encouragement": "응원 메시지"
}

평가 기준:
- 안전 관련 단어 누락은 completeness에서 크게 감점
- '손님 여러분'/'Ladies and gentlemen' 등 호칭 누락 시 honorifics 감점
- [목적지] [편명] 같은 변수 자리는 어떤 단어든 정답 처리
- 언어: ${langName}

원문:
${script}

발화:
${transcript}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function renderAiResult(ai) {
  const sec = $('ai-result-section');
  if (!sec) return;
  sec.classList.remove('hidden');

  // diff words
  if (ai.diffWords?.length) {
    $('diff-words-box').innerHTML = `<div class="diff-words-label">📝 단어 분석</div>
      <div class="diff-words">${ai.diffWords.map(w => {
        const cls = w.status==='correct'?'dw-correct':w.status==='missed'?'dw-missed':'dw-added';
        return `<span class="diff-word ${cls}">${escHtml(w.word)}</span>`;
      }).join(' ')}</div>`;
  }

  // improvement
  if (ai.improvementExample) {
    $('improvement-box').classList.remove('hidden');
    $('improvement-text').textContent = ai.improvementExample;
  }

  // encouragement
  if (ai.encouragement) {
    $('encouragement-box').classList.remove('hidden');
    $('encouragement-text').textContent = ai.encouragement;
  }
}

// ===== ADMIN =====
let _adminParsedScripts = [];

function openAdminScreen() {
  requireEditAuth(() => {
    initFirebase();
    _refreshAdminVersion();
    _refreshAdminVersionList();
    showScreen('screen-admin');
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
- 일본어: 히라가나/가타카나만 추출, 한글 발음 표기 제외
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

  // ===== MODEL VOICE 이벤트 =====
  document.getElementById('mv-file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해 주세요.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result;
      const key = getModelVoiceKey();
      localStorage.setItem(key, base64);
      localStorage.setItem(key + '_name', file.name);
      $('mv-current').classList.remove('hidden');
      $('mv-name').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });
  $('mv-play').addEventListener('click', () => {
    const key = getModelVoiceKey();
    const base64 = localStorage.getItem(key);
    if (!base64) return;
    if (_mvAudioUrl) URL.revokeObjectURL(_mvAudioUrl);
    const audio = new Audio(base64);
    audio.play();
  });
  $('mv-del').addEventListener('click', () => {
    const key = getModelVoiceKey();
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_name');
    $('mv-current').classList.add('hidden');
    $('mv-name').textContent = '';
    document.getElementById('mv-file-input').value = '';
  });

  // ===== 모델 음성 듣기 버튼 (prep screen) =====
  $('btn-model-voice').addEventListener('click', () => {
    const s = state.currentScript;
    if (!s) return;
    const base64 = loadModelVoice(s.id);
    if (!base64) return;
    const audio = new Audio(base64);
    audio.play();
    $('btn-model-voice').textContent = '🔊 재생 중...';
    audio.onended = () => { $('btn-model-voice').textContent = '🎙 모델 음성 듣기'; };
    audio.onerror = () => { $('btn-model-voice').textContent = '🎙 모델 음성 듣기'; alert('음성 파일을 재생할 수 없습니다.'); };
  });

  // ===== 관리자 패널 =====
  $('btn-open-admin').addEventListener('click', openAdminScreen);
  $('btn-admin-back').addEventListener('click', () => { showScreen('screen-home'); loadAndRenderHome(); });
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
  $('detail-voice-btn').addEventListener('click', () => {
    if (!_selectedScriptId) return;
    const s = _allScripts.find(x => x.id === _selectedScriptId);
    if (!s) return;
    const base64 = loadModelVoice(s.id);
    if (!base64) return;
    if (_mvAudioUrl) { URL.revokeObjectURL(_mvAudioUrl); _mvAudioUrl = null; }
    const blob = base64ToBlob(base64);
    _mvAudioUrl = URL.createObjectURL(blob);
    new Audio(_mvAudioUrl).play().catch(()=>{});
  });
  $('detail-edit-btn').addEventListener('click', () => {
    if (!_selectedScriptId) return;
    const btn = $('detail-edit-btn');
    requireEditAuth(() => openEditModal(btn.dataset.id, btn.dataset.source));
  });

  // 결과 화면 버튼
  document.getElementById('btn-result-select')?.addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('btn-result-retry-2')?.addEventListener('click', () => { if (state.currentScript) startPrep(state.currentScript); });
});
