/**
 * Voice Pro — Gemini 채점 API 부하테스트 스크립트
 * -----------------------------------------------------------
 * 목적: 실제 배포된 Cloudflare Pages Function(/api/gemini)에
 *      N명이 "거의 동시에" 채점 버튼을 누른 상황을 재현해서,
 *      429(요청 한도 초과) / 타임아웃 / 기타 오류가 실제로
 *      발생하는지, 얼마나 자주 발생하는지 확인합니다.
 *
 * 주의: 이 스크립트는 실제 유료 Gemini API를 호출합니다.
 *      짧은 음성(수 초) × 20건이라 비용은 미미한 수준(대략
 *      몇 십 원~몇 백 원 이내)이지만, 실제 과금이 발생합니다.
 *
 * 실행 방법 (Antigravity 터미널 등, 인터넷 연결된 환경):
 *   node load-test.js
 *
 * 필요 조건: Node.js 18 이상 (내장 fetch 사용, 별도 설치 불필요)
 * -----------------------------------------------------------
 */

const TARGET_URL = 'https://jmhancabtr.pages.dev/api/gemini';
const CONCURRENT_REQUESTS = 20;   // 동시 요청 수
const CLIENT_TIMEOUT_MS = 60000;  // 실제 앱과 동일한 60초 타임아웃

// ── 1) 테스트용 음성 파일을 코드로 직접 생성 (외부 파일 불필요) ──
// 실제 사람 음성은 아니지만, Gemini가 "오디오로 인식하고 처리"하기엔
// 충분한 정상적인 WAV 파일입니다. 목적은 답변 품질이 아니라
// "서버가 몰릴 때 얼마나 버티는지"이므로 이걸로 충분합니다.
function generateTestWav(durationSec = 6, sampleRate = 16000) {
  const numSamples = durationSec * sampleRate;
  const dataSize = numSamples * 2; // 16-bit PCM
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV 헤더
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);          // PCM
  buffer.writeUInt16LE(1, 22);          // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 사람 말소리와 비슷하게 진폭이 오르내리는 톤 (무음보다 현실적인 처리 시간 유도)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.abs(Math.sin(2 * Math.PI * 0.8 * t)); // 말하는 리듬 흉내
    const tone = Math.sin(2 * Math.PI * 180 * t) * 0.5 + Math.sin(2 * Math.PI * 350 * t) * 0.3;
    const sample = Math.max(-1, Math.min(1, tone * envelope)) * 0.6;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

const testAudioBuffer = generateTestWav();
const base64Audio = testAudioBuffer.toString('base64');
console.log(`[준비] 테스트 음성 생성 완료 (${(testAudioBuffer.length / 1024).toFixed(1)}KB)`);

// ── 2) 실제 앱과 동일한 요청 형식 (main.js callGeminiScoring 1차 시도와 동일 구조) ──
function buildRequestBody(reqIndex) {
  const genericPrompt = `당신은 항공사 기내방송 평가 채점관입니다.
아래 지시에 따라 첨부된 음성을 평가하고 JSON으로만 답하세요.
1. 전체 음성을 듣고 전반적 완성도를 파악하세요.
2. 발음, 속도, 억양, 유창성을 각각 0~25점으로 채점하세요.
3. 반드시 아래 JSON 형식으로만 답하세요. 다른 텍스트는 포함하지 마세요.
{"score": 숫자, "grade": "A/B/C/미취득", "feedback": {"good": "문자열", "improve": "문자열"}}
(부하테스트용 요청 #${reqIndex} — 실제 채점 기준이 아닌 테스트 더미 프롬프트입니다.)`;

  return {
    model: 'gemini-2.5-flash',
    contents: [{
      parts: [
        { inline_data: { mime_type: 'audio/wav', data: base64Audio } },
        { text: genericPrompt }
      ]
    }]
  };
}

// ── 3) 개별 요청 실행 (실제 앱의 60초 타임아웃과 동일하게 설정) ──
async function sendOne(reqIndex) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody(reqIndex)),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    const text = await res.text();

    let errorMsg = null;
    if (!res.ok) {
      try { errorMsg = JSON.parse(text)?.error || text.slice(0, 150); }
      catch { errorMsg = text.slice(0, 150); }
    }

    return {
      reqIndex,
      status: res.status,
      ok: res.ok,
      elapsedMs: elapsed,
      errorMsg
    };
  } catch (e) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    const isTimeout = e.name === 'AbortError';
    return {
      reqIndex,
      status: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      ok: false,
      elapsedMs: elapsed,
      errorMsg: e.message
    };
  }
}

// ── 4) N개 동시 발사 + 결과 집계 ──
async function runLoadTest() {
  console.log(`[시작] ${TARGET_URL} 로 ${CONCURRENT_REQUESTS}개 동시 요청 발사...\n`);
  const startAll = Date.now();

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => sendOne(i + 1))
  );

  const totalElapsed = Date.now() - startAll;

  // 개별 결과 출력
  results
    .sort((a, b) => a.reqIndex - b.reqIndex)
    .forEach(r => {
      const mark = r.ok ? '✅' : '❌';
      console.log(
        `${mark} #${String(r.reqIndex).padStart(2, '0')} | status=${r.status} | ${r.elapsedMs}ms` +
        (r.errorMsg ? ` | ${r.errorMsg}` : '')
      );
    });

  // 요약 통계
  const success = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const rateLimited = results.filter(r => r.status === 429);
  const timedOut = results.filter(r => r.status === 'TIMEOUT');
  const serverErr = results.filter(r => typeof r.status === 'number' && r.status >= 500);
  const times = results.map(r => r.elapsedMs);

  console.log('\n' + '='.repeat(50));
  console.log('📊 결과 요약');
  console.log('='.repeat(50));
  console.log(`총 요청 수         : ${CONCURRENT_REQUESTS}`);
  console.log(`성공               : ${success.length}개`);
  console.log(`실패               : ${failed.length}개`);
  console.log(`  - 429 (요청한도) : ${rateLimited.length}개`);
  console.log(`  - 타임아웃(60초) : ${timedOut.length}개`);
  console.log(`  - 서버오류(5xx)  : ${serverErr.length}개`);
  console.log(`전체 소요 시간     : ${(totalElapsed / 1000).toFixed(1)}초`);
  console.log(`응답시간 최소/평균/최대 : ${Math.min(...times)}ms / ${Math.round(times.reduce((a,b)=>a+b,0)/times.length)}ms / ${Math.max(...times)}ms`);
  console.log('='.repeat(50));

  if (failed.length === 0) {
    console.log('\n🎉 모든 요청이 성공했습니다. 이번 개선(비트레이트/재시도)이 효과가 있는 것으로 보입니다.');
  } else {
    console.log(`\n⚠️  ${failed.length}개 실패했습니다. 위 개별 로그에서 status 값을 확인해서 Claude에게 붙여넣어 주세요.`);
  }
}

runLoadTest().catch(e => {
  console.error('[치명적 오류]', e);
  process.exit(1);
});
