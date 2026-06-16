---
name: job-searcher
description: 'Search Korean job postings and company information using the Work24 API. ALWAYS use this skill when the user mentions 채용, 취업, 공채, 이직, 구직, 인턴, 공고, 직무 찾기, 기업 정보 조회, 대기업/공기업/공공기관 지원, or any job-seeking intent in Korean — even when phrased indirectly like 어디 지원하면 좋을까, 취준 중인데, 삼성 들어가고 싶어. Also triggers for explicit keywords: 진행중인 공고, 채용 공고, 공채속보, 기업 정보, Work24 listings, 대기업 공채, 공공기관 채용, or role keywords like 데이터 사이언스 직무 찾아줘.'
---

# Job Searcher

Work24 API를 사용하여 한국 채용 공고 및 기업 정보를 검색하는 스킬입니다. 검색 및 선별 단계이며, 자동 지원 단계가 아닙니다.

---

## 절대 금지

- 자동 지원, 사이트 로그인, CAPTCHA 우회
- 이메일 발송 또는 개인정보 전송
- API 실패 시 검색 결과 임의로 생성 (반드시 오류 메시지 그대로 안내)
- 공고 결과를 요약하거나 재작성하여 사실 여부가 불확실한 내용 제공

---

## Dependencies

아래 항목이 모두 갖춰져 있어야 스킬이 작동합니다. 하나라도 없으면 실행 전에 사용자에게 안내하세요.

| 항목 | 확인 방법 |
|---|---|
| Node.js >= 18 | `node --version` |
| `tools/fetch-jobs.mjs` | 아래 "도구 경로 확인" 절차로 파일 존재 여부 확인 |
| `WORK24_AUTH_KEY` | 환경변수 또는 `.env` 파일 내 키 존재 여부 확인 |

`WORK24_RECRUIT_API_URL` 및 `WORK24_COMPANY_API_URL`은 도구 내부에 기본값이 설정되어 있으므로 별도 설정 불필요합니다.

---

## Inputs

사용자의 자연어에서 아래 검색 조건을 추출하세요.

**직무/키워드** — 예: `데이터 사이언스`, `백엔드`, `기획`, `영업`

**기업구분** (`--param.coClcd`)

| 자연어 | 코드 |
|---|---|
| 대기업 | 10 |
| 공기업 | 20 |
| 공공기관 | 30 |
| 중견기업 | 40 |
| 외국계 | 50 |

**경력구분** (`--param.empWantedCareerCd`)

| 자연어 | 코드 |
|---|---|
| 경력무관 | 10 |
| 경력 | 20 |
| 신입 | 30 |
| 인턴 | 40 |

**고용형태** (`--param.empWantedTypeCd`)

| 자연어 | 코드 |
|---|---|
| 정규직 | 10 |
| 정규직전환 | 20 |
| 비정규직 | 30 |
| 기간제 | 40 |
| 시간선택제 | 50 |
| 기타 | 60 |

**학력** (`--param.empWantedEduCd`)

| 자연어 | 코드 |
|---|---|
| 고졸 | 10 |
| 대졸 2-3년 | 20 |
| 대졸 | 30 |
| 석사 | 40 |
| 박사 | 50 |
| 학력무관 | 99 |

**기타**
- 결과 수: 명시하지 않으면 기본값 `10`
- 공고 상태: `현재`, `진행중`, `마감 전` 또는 명시 없으면 활성 공고만 표시 (`--active-only`). 사용자가 명시적으로 전체 조회를 요청한 경우에만 해제
- 의도 모호 시: 기업소개, 홈페이지, 로고, 사업자번호, 기업 정보 등을 명시적으로 요청하지 않는 한 채용공고 검색 우선

---

## Workflow

### Step 1: 환경 확인

#### 도구 경로 확인

먼저 현재 작업 디렉터리의 `tools/fetch-jobs.mjs`를 확인합니다. 없으면 설치된 support bundle에서 찾습니다.

설치 support bundle 기본 위치:

| 대상 | user scope | project scope |
|---|---|---|
| Codex | `~/.codex/give-me-job/tools/fetch-jobs.mjs` | `.codex/give-me-job/tools/fetch-jobs.mjs` |
| OpenCode | `~/.config/opencode/give-me-job/tools/fetch-jobs.mjs` | `.opencode/give-me-job/tools/fetch-jobs.mjs` |
| Claude Code | `~/.claude/give-me-job/tools/fetch-jobs.mjs` | `.claude/give-me-job/tools/fetch-jobs.mjs` |

도구가 여러 위치에 있으면 현재 프로젝트 루트의 파일을 우선 사용하고, 그다음 현재 에이전트 대상의 project scope, user scope 순서로 사용합니다.

어느 위치에서도 `fetch-jobs.mjs`를 찾을 수 없으면 `give-me-job install --target <target>` 실행이 필요하다고 안내하고 중단합니다.

### Step 2: Dry-run 검색 실행

아래 예시는 저장소 루트에서 실행할 때의 명령입니다. 설치된 support bundle을 사용하는 경우 `node tools/fetch-jobs.mjs` 대신 확인한 절대 경로를 사용하세요.

기본 명령어:

```bash
node tools/fetch-jobs.mjs --source work24 --dry-run --active-only --param.display 10
```

사용자 요청에 따라 아래 필터를 추가합니다:

```bash
# 직무/제목 키워드
--param.empWantedTitle "<keyword>"

# 기업구분
--param.coClcd <code>

# 경력구분
--param.empWantedCareerCd <code>

# 고용형태
--param.empWantedTypeCd <code>

# 학력
--param.empWantedEduCd <code>

# 직종 코드 (사용자가 명시한 경우에만)
--param.jobsCd <code>
```

### Step 3: 기업 정보 검색 (해당 시)

사용자가 특정 기업 정보를 요청한 경우:

```bash
node tools/fetch-jobs.mjs --source work24 --mode company --dry-run --param.display 10 --param.coNm "<company>"
```

### Step 4: 결과 출력

검색에 사용된 조건을 먼저 명시한 뒤 아래 테이블 형식으로 결과를 출력합니다.

**채용공고 테이블:**

| 회사명 | 공고명 | 고용형태 | 기업구분 | 시작일 | 마감일 | URL |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

**기업정보 테이블:**

| 회사명 | 기업소개 | 기업구분 | 홈페이지 | URL |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

**누락 필드 표기 규칙:**
- 값이 없는 필드: `-` 로 표시
- 마감일 없음: `상시채용` 으로 표기
- 기업구분 없음: `-` 로 표시

결과가 0건이면 사용된 필터를 정확히 나열하고, 경력/학력 필터 제거 등 구체적인 재시도 방법 한 가지를 제안합니다.

### Step 5: 저장 여부 확인 (채용공고 검색만 해당)

```txt
이 결과를 data/jobs에 저장할까요?
```

- **저장 시**: `--dry-run` 없이 동일 명령어 재실행
- **저장 안 함**: 결과를 대화에서만 참조하고 다음 단계(JD 분석, 지원서 작성 등)로 진행
- **기업 정보(`--mode company`) 검색 결과는 저장하지 않음** — 참고용으로만 활용하며, JD 분석이나 지원서 패키지 작성 시 맥락 데이터로 사용

---

## Fallback

**`WORK24_AUTH_KEY` 미설정 시:**
환경변수 또는 `.env` 파일에 `WORK24_AUTH_KEY`를 설정해달라고 안내합니다. API URL은 별도 설정 불필요합니다.

**Work24 API 인증 오류 시:**
API 응답 메시지를 그대로 사용자에게 전달하고, 결과를 임의로 생성하지 않습니다.

**요청 의도를 Work24 코드로 매핑할 수 없을 때:**
- 직무 관련 표현이면 `--param.empWantedTitle`에 키워드로 전달
- 의도를 추론할 수 없으면 질문 하나만 합니다 (예: "어떤 직무를 찾고 계신가요?")
