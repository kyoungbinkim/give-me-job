# give-me-job 한국어 문서

![give-me-job banner](assets/give-me-job-banner.jpg)

`give-me-job`은 한국 채용 시장 전용 취업 지원 패키지 생성기입니다. Codex CLI, Claude Code, OpenCode 같은 코딩 에이전트가 `resume.md`와 채용공고(JD)를 읽고 회사별 지원 패키지를 만들 수 있도록 설계되었습니다.

이 프로젝트는 자동 지원이나 자동 제출 도구가 아닙니다. 결과물은 사용자가 직접 검토하고 제출하는 문서 패키지입니다.

검색 키워드: 자기소개서, 취업준비, 한국 취업, 취업 에이전트, 개발자 취업준비, 개발자 자기소개서.

## 왜 만들었나

AI로 자소서를 쓰면 문장은 잘 나옵니다. 문제는 그다음입니다.

- 내 이력서에 없는 성과가 들어가 있다
- "30% 개선"의 30%가 어디서 나온 숫자인지 모른다
- 앞에 지원했던 회사 이름이 문장에 그대로 남아 있다

제출은 됩니다. 하지만 면접관은 자소서에서 가장 인상적인 문장을 골라 꼬리질문을 합니다.
`give-me-job`은 자소서를 빨리 쓰는 도구가 아니라, **면접에서 방어할 수 있는 자소서**를 만드는 도구입니다.
모든 강한 주장은 `resume.md`의 근거로 역추적되고, 근거가 없으면 문장을 지어내는 대신 멈추고 물어봅니다.

지원 회사 하나당 폴더 하나가 만들어지며, 그중 세 파일이 이 도구의 존재 이유입니다.

- `evidence-map.md` — 자소서 핵심 주장이 이력서 어느 근거에서 나왔는지 매핑
- `hr-review.md` — 과장, 근거 없는 주장, 다른 회사명 잔여, 잘못된 직무 타겟팅, 제출 블로커 검수
- `interview-prep.md` — 같은 근거로 만든 예상 꼬리질문과 답변 포인트

**설치 전에 결과물부터 보실 수 있습니다.** 데모 지원 패키지가 저장소에 커밋되어 있습니다:
[`examples/demo-new-grad-backend/applications/demo-cloud-backend/`](../examples/demo-new-grad-backend/applications/demo-cloud-backend/)

## 이런 분께 맞습니다

**맞는 경우**

- 한국 기업에 지원하면서 이미 코딩 에이전트(Claude Code, Codex, OpenCode)를 쓰고 계신 분
- 이력서나 포트폴리오는 있는데, 그걸 방어 가능한 자소서 문장으로 옮기는 데서 막히신 분
- 자소서를 더 빨리가 아니라, 제출 전에 검수하고 싶으신 분

**아직 맞지 않는 경우**

- 터미널을 쓰지 않으시는 분 — 현재는 Node.js `18.17` 이상과 코딩 에이전트가 필요합니다. 데스크톱 앱은 계획 중이며 아직 출시되지 않았습니다
- 자동 대량 지원을 원하시는 분 — 이 도구는 설계상 제출, 로그인, 이메일 발송, CAPTCHA 우회를 하지 않습니다
- 부족한 경험을 채워주길 원하시는 분 — 지어내지 않고 멈춰서 물어봅니다

## 문서 바로가기

| 문서 | 내용 |
| --- | --- |
| [루트 README](../README.md) | 프로젝트 전체 소개, 설치, 빠른 시작 |
| [Quickstart](quickstart.md) | 하나의 지원 패키지를 만드는 최소 흐름 |
| [npm Install](npm-install.md) | npm으로 Skill과 Agent를 설치하는 방법 |
| [Platform Support](platform-support.md) | 지원 운영체제와 Node.js 요구사항 |
| [Safety Policy](safety.md) | 허용 작업, 금지 작업, blocker 예시 |
| [Release Checklist](release-checklist.md) | 릴리스 전 검증 항목 |
| [Competitive v1 Roadmap](competitive-v1-roadmap.md) | 한국 채용 시장 전용 제품 로드맵 |
| [Job Source Integrations](integrations/job-sources.md) | 공개 공고 URL 수집 지원과 자동 검색 상태 |

## 설치 전 준비

Node.js `18.17` 이상이 필요합니다.

```bash
node --version
npm --version
```

지원 환경:

- Windows PowerShell
- Ubuntu/Linux shell
- macOS shell

저장소를 직접 사용할 경우:

```bash
git clone https://github.com/kyoungbinkim/give-me-job.git
cd give-me-job
npm test
```

## npm 설치

가장 간단한 방법:

```bash
npx give-me-job install
```

전역 CLI 설치:

```bash
npm i -g give-me-job
give-me-job install
```

Claude Code는 npm 없이 플러그인으로 설치할 수도 있습니다.

```txt
/plugin marketplace add kyoungbinkim/give-me-job
/plugin install give-me-job
```

단, 플러그인 경로는 도메인 Skill만 설치합니다. 오케스트레이터 Agent, 워크플로
도구 Skill, support bundle(`agent.md`, `tools/`, `templates/`, fixture)은
포함되지 않으므로 전체 워크플로를 쓰려면 `npx give-me-job install`을 사용하세요.

전체 대상 설치:

```bash
give-me-job install --target all
```

특정 대상 설치:

```bash
give-me-job install --target codex
give-me-job install --target opencode
give-me-job install --target claude-code
```

프로젝트 범위 설치:

```bash
give-me-job install --scope project --target all
```

변경 예정 파일만 확인:

```bash
give-me-job install --dry-run
```

기존 파일을 백업 후 덮어쓰기:

```bash
give-me-job install --target codex --force
```

설치 상태 확인:

```bash
give-me-job doctor
```

설치 제거:

```bash
give-me-job uninstall --target all
```

## 설치되는 내용

설치기는 여덟 개의 도메인 Skill과 `give-me-job` 오케스트레이터 Agent를 설치합니다.

- `resume-intake`
- `jd-analyzer`
- `company-values-analyzer`
- `cover-letter-writer`
- `hr-reviewer`
- `interview-prep`
- `application-packager`
- `job-searcher`

support bundle에는 다음이 포함됩니다.

- `agent.md`
- `tools/`
- `templates/`
- 검증 fixture

사용자 범위 설치 경로:

```txt
Codex:       ~/.agents/skills/<skill>/SKILL.md
Codex:       ~/.codex/agents/give-me-job.toml
Codex:       ~/.codex/give-me-job/

OpenCode:    ~/.config/opencode/skills/<domain-skill>/SKILL.md
OpenCode:    ~/.config/opencode/agents/give-me-job.md
OpenCode:    ~/.config/opencode/tools/give_me_job_<tool>.js
OpenCode:    ~/.config/opencode/give-me-job/

Claude Code: ~/.claude/skills/<domain-skill>/SKILL.md
Claude Code: ~/.claude/skills/give-me-job-<tool>/SKILL.md
Claude Code: ~/.claude/agents/give-me-job.md
Claude Code: ~/.claude/give-me-job/
```

프로젝트 범위 설치 경로:

```txt
Codex:       .agents/skills/<skill>/SKILL.md
Codex:       .codex/agents/give-me-job.toml
OpenCode:    .opencode/skills/<domain-skill>/SKILL.md
OpenCode:    .opencode/agents/give-me-job.md
OpenCode:    .opencode/tools/give_me_job_<tool>.js
Claude Code: .claude/skills/<domain-skill>/SKILL.md
Claude Code: .claude/skills/give-me-job-<tool>/SKILL.md
Claude Code: .claude/agents/give-me-job.md
```

설치기는 다른 내용으로 수정된 기존 파일을 기본적으로 덮어쓰지 않습니다. `--force`를 사용하면 `.bak-*` 백업을 만든 뒤 교체합니다.

## 빠른 시작

1. 저장소를 검증합니다.

```bash
npm test
```

2. 회사별 지원 패키지 폴더를 만듭니다.

```bash
node tools/init-application.mjs --company kakao --role backend
```

3. 코딩 에이전트에게 다음처럼 요청합니다.

```txt
agent.md를 읽고, resume.md와 이 JD를 사용해서 applications/kakao-backend 지원 패키지를 완성해줘.
```

4. 결과 패키지를 검증합니다.

```bash
node support/validate/validate-application.mjs applications/kakao-backend
```

5. 최종 제출은 사용자가 직접 합니다.

## 전체 워크플로우

`agent.md`는 다음 순서로 지원 패키지 작성 Skill을 사용합니다.

```txt
resume-intake
      |
      v
jd-analyzer
      |
      v
company-values-analyzer (optional)
      |
      v
cover-letter-writer
      |
      v
hr-reviewer
      |
      v
interview-prep
      |
      v
application-packager
```

생성되는 패키지 구조:

```txt
applications/
`-- <company-role>/
    |-- workflow.md
    |-- jd-analysis.md
    |-- company-values.md
    |-- cover-letter-draft.md
    |-- hr-review.md
    |-- cover-letter-final.md
    |-- evidence-map.md
    |-- interview-prep.md
    `-- submission-checklist.md
```

`applications/`는 개인정보와 지원 자료가 들어갈 수 있으므로 Git에 커밋하지 않습니다.

## 경력 유형별 작성

신입과 경력직은 채용 담당자가 보는 기준이 다르므로, 자소서 작성과 HR 검토를
각각 다른 플레이북으로 진행합니다. 작성 전에 경력 유형을 먼저 확정하며,
모호하면 임의로 정하지 않고 사용자에게 확인합니다.

- **신입**: 결과의 규모보다 문제를 정의한 방식, 선택한 접근, 그 이후 바꾼 점을
  중심으로 작성합니다. 학교 프로젝트를 실무 성과처럼 부풀리지 않습니다.
- **경력직**: 담당 업무 나열이 아니라 성과와 그 성과를 만든 방법을 씁니다.
  이직 사유는 앞으로 하고 싶은 일 중심으로 쓰고, 이전 직장·상사·동료에 대한
  비판은 넣지 않습니다. 짧은 근속이나 공백은 숨기지도, 없는 사유를 지어내지도
  않고 사실을 확인해 정리합니다.

세부 직무(예: 백엔드 중 결제정산, 마케팅 중 퍼포먼스)도 함께 확인해서, 직군만
보고 쓴 답변이 되지 않도록 합니다.

## 채용공고 연동

채용 공고 자동 검색(job-source 연동)은 아직 준비 중(TODO)입니다.
다만 사용자가 직접 제공한 잡코리아, 링커리어, SK Careers, LG Careers의
공개 상세 URL은 자격증명 없이 정규화할 수 있습니다.

```bash
node tools/fetch-jobs.mjs --source url --url "https://careers.lg.com/apply/detail?id=1002029"
```

결과는 `data/jobs/YYYY-MM-DD/`에 저장됩니다. 통합 공채처럼 직무가 여러
개이거나 자소서 문항·글자 수가 공개되지 않은 경우에는 임의로 추정하지 않고
해당 정보만 사용자에게 확인합니다. 첨부 PDF나 이미지에만 상세 JD가 있으면
관련 파일 또는 본문이 추가로 필요할 수 있습니다.

이 프로젝트는 API 키, 액세스 토큰 등 별도로 발급받아야 하는 인증 정보를
전혀 사용하지 않습니다. 앞으로 추가될 job-source 어댑터도 인증 정보 없이
동작해야 합니다.

정규화된 공고가 `data/jobs/`에 있을 때 마감 일정과 적합도 랭킹:

```bash
node tools/schedule-jobs.mjs --week --jobs data/jobs
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
```

자세한 내용은 [Job Source Integrations](integrations/job-sources.md)를 참고하세요.

## 안전 원칙

- 사용자가 제공하지 않은 경력, 성과, 수치, 회사명은 만들지 않습니다.
- 자기소개서의 강한 주장은 `resume.md` 근거와 연결합니다.
- HR review에서 blocker가 있으면 최종 문구로 확정하지 않습니다.
- 최종 제출, 로그인, CAPTCHA 우회, 이메일 발송, 개인정보 전송은 자동화하지 않습니다.

자세한 기준은 [Safety Policy](safety.md)를 참고하세요.
