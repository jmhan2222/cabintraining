# 보이스 프로 (Cabin Voice Pro) 운영 및 인수인계 매뉴얼

기내 방송 훈련 및 평가 웹 애플리케이션 **보이스 프로**의 시스템 구조와 운영·개정·음성 업데이트 가이드입니다. 담당자가 변경되거나 PC가 교체되어도 이 매뉴얼을 보고 즉시 모든 작업을 수행할 수 있습니다.

---

## 1. 시스템 구조 개요

| 구성 요소 | 사용 플랫폼 / 기술 | 역할 |
|---|---|---|
| **웹 프론트엔드** | Vanilla HTML, CSS, JavaScript | 사용자 인터페이스, 오디오 재생 및 녹음, 실시간 피드백 |
| **웹 호스팅** | Cloudflare Pages (GitHub 연동) | `git push` 시 1~2분 내 전 세계 CDN에 자동 배포 |
| **데이터베이스 / 인증** | Firebase (Firestore, Auth) | 방송문 개정본 이력, 로그인 계정(`allowedUsers`), 모델 음성 매핑(`scripts`) |
| **AI 기능** | Cloudflare Pages Function 프록시 + Gemini API | 방송 발음/유창성/정확도 평가 |

---

## 2. PC 교체 시 초기 작업 환경 세팅

새 컴퓨터에서 작업을 시작할 때 필요한 최소 설정입니다.

1. **Git 설치**: [git-scm.com](https://git-scm.com/)에서 설치
2. **Node.js 설치**: [nodejs.org](https://nodejs.org/) (LTS 버전 권장) 설치
3. **저장소 클론**:
   ```bash
   git clone https://github.com/jmhan2222/cabintraining.git
   cd cabintraining
   ```
4. **(선택) FFmpeg 설치** (WAV 파일을 MP3로 변환할 때 필요):
   - Windows 터미널에서 `winget install Gyan.FFmpeg` 실행 후 터미널 재시작

---

## 3. 27년도 대비 핵심 운영 절차 (타임라인별 가이드)

### 📌 [Phase 1] 1월: 교범 전면 개정 및 평가 문안 반영

1월에 교범 개정 후 27년도 평가 문안이 확정되면 사이트에 새 문안을 반영하고, 음성은 "준비 중" 상태로 전환합니다.

1. **평가 문안 JSON 준비 (`announcements.json`)**:
   - 형식 예시:
     ```json
     {
       "revVersion": "2027년 1월 개정본",
       "announcements": [
         {
           "id": "2-1-1",
           "section": "2.1.1",
           "chapter": 2,
           "chapterName": "2장 출발 전",
           "title": "항공기 출발 준비",
           "ko": "손님 여러분, 우리 비행기는 곧 출발하겠습니다...",
           "en": "Ladies and gentlemen, welcome aboard..."
         }
       ]
     }
     ```
2. **사이트에 방송문 업로드**:
   - 사이트 접속 후 관리자 계정 로그인 → **관리자 패널** 진입
   - **방송문 버전 관리** 섹션에서 `announcements.json` 선택 후 **[Firestore에 업로드]** 클릭
   - 승무원 화면에 "새로운 개정 방송문이 배포되었습니다" 배너가 즉시 노출됩니다.
3. **음성 연결 해제 (★필수)**:
   - 관리자 패널의 **🎙 모델 음성 관리** 섹션 이동
   - **[⛔ 음성 연결 해제 (개정 대비)]** 버튼 클릭
   - **결과**: 기존 음성과의 연결이 끊어지고, 모든 방송문 플레이어에 **"🎙 모델 음성 준비 중"**이 표출되어 승무원이 구버전 음성으로 잘못 연습하는 문제를 차단합니다.

---

### 📌 [Phase 2] 3~4월: 모델 보이스 녹음 확보 및 전면 교체

새 문안에 맞춘 전문 음성이 확보되면 원클릭 스크립트로 일괄 교체합니다.

#### 1단계. 파일명 및 폴더 정리
- 프로젝트 루트에 `_new_voices` 폴더가 자동 생성되어 있습니다. (없으면 `update-voices.cmd` 1회 실행)
- 각 언어/성별 폴더 안에 새 음성 파일(MP3 또는 WAV)을 넣습니다:
  ```text
  _new_voices/
    ├── 한국어(남)/
    │     ├── 2.1.1 항공기 출발 준비_한국어(남).mp3
    │     └── 2.1.2 보조배터리 규정_한국어(남).wav
    ├── 한국어(여)/
    ├── 영어(남)/
    └── 영어(여)/
  ```
  > 💡 **파일명 규칙 (매우 중요)**:
  > - 반드시 **`<방송문 번호><공백 또는 _>`** 로 시작해야 합니다. (예: `2.1.1 항공기...`, `[별표 3] 분실물...`)
  > - 시스템은 파일명 앞의 번호로 방송문과 자동 매핑합니다.
  > - 누락 검사를 원할 경우 `_new_voices/announcements.json`에 최신 문안 JSON을 함께 넣어두면 빠진 번호를 알려줍니다.

#### 2단계. 일괄 교체 실행
1. 프로젝트 폴더의 `update-voices.cmd` 더블클릭
2. 스크립트가 다음 작업을 자동으로 처리합니다:
   - **파일명 검사**: 번호 누락, 중복 번호, 문안 대조 검사
   - **기존 음성 자동 백업**: `_voice_backup/날짜-시간/`으로 이전 파일 전체 보관 (안전 보장)
   - **신규 음성 폴더 교체**: `cabinvoice pro/` 하위 폴더로 이동
   - **WAV/M4A → MP3 자동 변환**: 128kbps LAME 변환 및 원본 분리
   - **manifest.json 재생성**: `generate-manifest.js` 자동 실행
   - **GitHub 푸시 및 배포**: `y` 입력 시 즉시 커밋/푸시되어 Cloudflare Pages 배포 시작
3. **되돌리기(롤백)가 필요한 경우**:
   - 명령 프롬프트에서 `update-voices.cmd --restore <백업폴더명>` 실행 시 이전 음성으로 즉시 원상복구됩니다.

#### 3단계. 앱에서 음성 재매핑 활성화
1. Cloudflare Pages 배포가 완료된 후 (보통 1~2분 소요)
2. 사이트 접속 → 관리자 패널 → **🎙 모델 음성 관리**
3. **[📂 로컬 모델 음성 스캔]** 버튼 클릭
4. **결과**:
   - 매핑 완료 토스트 알림 표시
   - 상태가 🟢 **"모델 음성 연결됨"**으로 변경
   - "🎙 모델 음성 준비 중" 배너가 해제되고 승무원 화면에서 즉시 정상 재생됨

---

## 4. 디렉토리 구조 요약

```text
cabinvoicepropro/
├── index.html                  # 메인 웹 페이지 및 관리자 UI
├── main.js                     # 메인 비즈니스 로직, Firebase 연동, 오디오 재생
├── style.css                   # 전체 디자인 스타일시트
├── firebase.json               # Firebase 호스팅/캐시 설정
├── update-voices.cmd           # 모델 음성 일괄 교체 실행 스크립트 (Windows)
├── generate-manifest.js        # 음성 파일 manifest.json 생성기
│
├── cabinvoice pro/             # 실제 서비스 중인 오디오 정적 파일
│   ├── manifest.json           # 현재 배포된 오디오 목록 메타데이터
│   ├── 한국어(남)/
│   ├── 한국어(여)/
│   ├── 영어(남)/
│   └── 영어(여)/
│
├── tools/
│   └── update-voices.js        # 음성 검사/백업/변환/교체 핵심 엔진
│
├── functions/api/gemini.js     # Cloudflare Pages Functions (AI 프록시)
│
├── _new_voices/                # [작업용] 새로 투입할 음성 임시 폴더 (.gitignore 대상)
└── _voice_backup/              # [백업용] 이전 음성 백업 보관소 (.gitignore 대상)
```

---

## 5. 담당자 인수인계 체크리스트 (계정 및 권한)

후임자가 지정되면 아래 세 가지 접근 권한을 반드시 공유받거나 추가해야 합니다:

1. **GitHub 저장소 권한**:
   - 저장소: `https://github.com/jmhan2222/cabintraining`
   - Settings → Collaborators에서 후임자 GitHub 계정 추가
2. **Cloudflare Pages 대시보드 권한**:
   - `cabintraining` 프로젝트 빌드 및 배포 로그 확인, 도메인 연결 관리
   - 환경변수: `GEMINI_API_KEY` 등록 여부 확인
3. **Firebase 콘솔 권한**:
   - 프로젝트 ID: `voicepro-18888`
   - Project Settings → Users and permissions에서 후임자 Google 계정에 `Editor` 또는 `Owner` 권한 부여
   - 앱 관리자 화면 로그인용 계정(`allowedUsers` 컬렉션의 관리자 플래그) 전달
