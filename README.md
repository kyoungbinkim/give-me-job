# give-me-job

![give-me-job banner](docs/assets/give-me-job-banner.jpg)

`give-me-job`은 한국 채용 시장 전용 취업 지원 패키지 생성기입니다. Codex CLI, Claude Code, OpenCode 같은 코딩 에이전트가 `resume.md`와 채용공고(JD)를 바탕으로 회사별 지원 패키지를 만들 수 있도록 여섯 개의 도메인 Skill과 검증 도구를 제공합니다.

이 저장소는 자동 지원 봇이 아닙니다. 자기소개서, 근거 맵, HR 리뷰, 제출 체크리스트를 파일로 준비하는 데 집중하며, 최종 제출, 로그인, CAPTCHA 우회, 이메일 발송, 개인정보 전송은 사용자가 직접 판단하고 수행해야 합니다.

전체 워크플로우를 실행할 때는 [`agent.md`](agent.md)를 오케스트레이터로 사용합니다. 저장소 수준 에이전트 지침은 [`AGENTS.md`](AGENTS.md)에 있습니다.

## 주요 기능

- 한국어 이력 근거 정리: 사용자 경험을 `resume.md` 중심의 재사용 가능한 증거로 구조화합니다.
- 채용공고 분석: JD에서 요구 역량, 평가 기준, 키워드, 리스크를 추출합니다.
- 회사 가치 분석: 선택 입력인 인재상, 문화, 미션 자료를 자기소개서 포지셔닝에 반영합니다.
- 자기소개서 작성: `resume.md` 근거에 기반한 한국어 문항별 초안을 작성합니다.
- HR 관점 리뷰: 과장, 근거 부족, 회사명 잔재, 제출 전 blocker를 점검합니다.
- 지원 패키지 생성: 회사별 `applications/<company-role>/` 폴더와 제출 체크리스트를 만듭니다.
- 한국 채용공고 도구: Saramin, Work24, JobKorea 연동 어댑터와 일정/적합도 랭킹 도구를 제공합니다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [한국어 README](docs/README-ko.md) | 한국어 상세 안내와 문서 허브 |
| [Quickstart](docs/quickstart.md) | 로컬 지원 패키지 생성 흐름 |
| [npm Install](docs/npm-install.md) | npm 기반 Skill/Agent 설치 방법 |
| [Platform Support](docs/platform-support.md) | Windows PowerShell, Ubuntu/Linux, macOS 지원 범위 |
| [Safety Policy](docs/safety.md) | 허용/금지 작업과 blocker 기준 |
| [Release Checklist](docs/release-checklist.md) | 릴리스 전 검증 체크리스트 |
| [Competitive v1 Roadmap](docs/competitive-v1-roadmap.md) | 한국 시장 전용 제품 로드맵 |
| [Job Source Integrations](docs/integrations/job-sources.md) | Saramin, Work24, JobKorea 연동 설정 |

## 설치 전 준비

필수 런타임은 Node.js `18.17` 이상입니다.

```bash
node --version
npm --version
```

Windows, Ubuntu/Linux, macOS에서 사용할 수 있습니다. Windows에서는 PowerShell을 기준으로 안내합니다.

이 저장소를 직접 받아서 개발하거나 검증하려면 다음처럼 클론합니다.

```bash
git clone https://github.com/kyoungbinkim/give-me-job.git
cd give-me-job
npm test
```

## 설치 방법

가장 간단한 설치는 `npx`를 사용하는 방식입니다.

```bash
npx give-me-job install
```

이 명령은 지원되는 에이전트(Codex, OpenCode, Claude Code)에 여섯 개의 도메인 Skill과 `give-me-job` 오케스트레이터 Agent를 사용자 범위로 설치합니다. 함께 설치되는 support bundle에는 `agent.md`, `tools/`, `templates/`, 검증 fixture가 포함됩니다.

CLI를 전역으로 설치해 반복 사용하려면 다음을 사용합니다.

```bash
npm i -g give-me-job
give-me-job install
```

특정 에이전트에만 설치할 수도 있습니다.

```bash
give-me-job install --target codex
give-me-job install --target opencode
give-me-job install --target claude-code
```

모든 대상에 명시적으로 설치하려면 다음을 사용합니다.

```bash
give-me-job install --target all
```

프로젝트 폴더 안에만 설치하려면 project scope를 사용합니다.

```bash
give-me-job install --scope project --target all
```

설치 전에 변경될 파일을 미리 보려면 dry run을 사용합니다.

```bash
give-me-job install --dry-run
```

기존 파일이 패키지 버전과 다르면 설치기는 덮어쓰기를 거부합니다. 의도적으로 교체하려면 `--force`를 사용합니다. 이 경우 기존 파일은 timestamp가 붙은 `.bak-*` 파일로 백업됩니다.

```bash
give-me-job install --target codex --force
```

설치 상태를 확인하려면 다음을 실행합니다.

```bash
give-me-job doctor
```

설치된 파일을 제거하려면 다음을 실행합니다.

```bash
give-me-job uninstall --target all
```

`uninstall`은 `~/.give-me-job/install-manifest.json`에 기록된 파일만 제거하며, 설치 당시 hash와 일치하는 파일만 삭제합니다.

## 설치 경로

사용자 범위 설치 경로입니다.

```txt
Codex:       ~/.agents/skills/<skill>/SKILL.md
Codex:       ~/.codex/agents/give-me-job.toml
Codex:       ~/.codex/give-me-job/

OpenCode:    ~/.config/opencode/skills/<domain-skill>/SKILL.md
OpenCode:    ~/.config/opencode/agents/give-me-job.md
OpenCode:    ~/.config/opencode/give-me-job/

Claude Code: ~/.claude/skills/<domain-skill>/SKILL.md
Claude Code: ~/.claude/agents/give-me-job.md
Claude Code: ~/.claude/give-me-job/
```

프로젝트 범위 설치 경로입니다.

```txt
Codex:       .agents/skills/<skill>/SKILL.md
Codex:       .codex/agents/give-me-job.toml

OpenCode:    .opencode/skills/<domain-skill>/SKILL.md
OpenCode:    .opencode/agents/give-me-job.md

Claude Code: .claude/skills/<domain-skill>/SKILL.md
Claude Code: .claude/agents/give-me-job.md
```

## 빠른 시작

저장소 검증:

```bash
npm test
```

회사별 지원 패키지 폴더 생성:

```bash
node tools/init-application.mjs --company kakao --role backend
```

생성되는 위치:

```txt
applications/kakao-backend/
```

그 다음 코딩 에이전트에게 다음처럼 요청합니다.

```txt
agent.md를 읽고, resume.md와 이 JD를 사용해서 applications/kakao-backend 지원 패키지를 완성해줘.
```

작성된 패키지를 검증합니다.

```bash
node tools/validate-application.mjs applications/kakao-backend
```

## 워크플로우

```txt
JD URL / JD text
        |
        v
agent.md intake ---- missing or weak ----> resume-intake
        |                                      |
        v                                      v
existing resume.md <---------------------- resume.md
        |
        v
jd-analyzer
        |
        v
JD analysis <---- optional ---- company-values-analyzer
        |
        v
cover-letter-writer
        |
        v
hr-reviewer
        |
        v
application-packager
        |
        v
applications/<company-role>/
        |
        v
User reviews and submits manually
```

`agent.md`는 필수 입력이 없거나, `resume.md`가 강한 주장을 뒷받침하지 못하거나, 다음 행동이 제출/발송/로그인/CAPTCHA 우회/개인정보 전송에 해당하면 멈춰야 합니다.

## 생성되는 지원 패키지

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
    `-- submission-checklist.md
```

`applications/`는 개인정보와 지원 자료가 들어갈 수 있으므로 Git에서 제외됩니다.

## Skill 목록

- `resume-intake`: 원시 경력 입력을 `resume.md` 근거 자료로 정리합니다.
- `jd-analyzer`: 채용공고의 요구 역량, 평가 기준, 키워드, gap을 분석합니다.
- `company-values-analyzer`: 선택 입력인 회사 가치, 문화, 인재상 자료를 분석합니다.
- `cover-letter-writer`: `resume.md`와 JD 분석에 근거한 한국어 자기소개서 초안을 작성합니다.
- `hr-reviewer`: 제출 전 HR 관점의 리스크와 blocker를 검토합니다.
- `application-packager`: 회사별 지원 패키지와 수동 제출 체크리스트를 조립합니다.

## 채용공고 수집과 우선순위

환경 파일을 준비합니다.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Saramin API 키가 있으면 `.env`에 `SARAMIN_ACCESS_KEY`를 설정한 뒤 공고를 가져올 수 있습니다.

```bash
node tools/fetch-jobs.mjs --source saramin --keywords "백엔드 Java" --deadline tomorrow --count 20
```

API 키 없이 fixture 기반 검증만 실행할 수도 있습니다.

```bash
node tools/validate-job-sources.mjs
```

수집한 공고의 마감 일정과 적합도를 확인합니다.

```bash
node tools/schedule-jobs.mjs --week --jobs data/jobs
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
```

## 로컬 검증

전체 검증:

```bash
npm test
```

동등한 수동 검증:

```bash
node tools/validate-skills.mjs
node tools/validate-job-sources.mjs
node tools/validate-job-schedule.mjs
node tools/validate-job-ranking.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node tools/validate-application.mjs .tmp-release-check/demo-backend
node tools/validate-application.mjs examples/demo-new-grad-backend/applications/demo-cloud-backend
```

## 저장소 구조

```txt
.
|-- AGENTS.md
|-- agent.md
|-- docs/
|   |-- assets/
|   |-- competitive-v1-roadmap.md
|   |-- integrations/
|   |-- npm-install.md
|   |-- platform-support.md
|   |-- quickstart.md
|   |-- release-checklist.md
|   `-- safety.md
|-- examples/
|-- skills/
|   |-- resume-intake/
|   |-- jd-analyzer/
|   |-- company-values-analyzer/
|   |-- cover-letter-writer/
|   |-- hr-reviewer/
|   `-- application-packager/
|-- templates/
|-- tests/
|-- tools/
`-- job-agent-plan.md
```

## 원칙

- 사용자가 제공하지 않은 경험, 성과, 수치, 책임 범위, 수상, 회사명을 만들지 않습니다.
- 자기소개서의 강한 주장은 반드시 `resume.md` 근거와 연결합니다.
- 회사 가치 자료는 참고 맥락으로만 사용하고 문구를 그대로 복사하지 않습니다.
- HR review에서 blocker가 남아 있으면 최종 제출용 문구로 확정하지 않습니다.
- 최종 제출, 로그인, CAPTCHA 우회, 이메일 발송, 개인정보 전송은 자동화하지 않습니다.
