# give-me-job 한국어 문서

![give-me-job banner](assets/give-me-job-banner.jpg)

`give-me-job`은 한국 채용 시장 전용 취업 지원 패키지 생성기입니다. Codex CLI, Claude Code, OpenCode 같은 코딩 에이전트가 `resume.md`와 채용공고(JD)를 읽고 회사별 지원 패키지를 만들 수 있도록 설계되었습니다.

이 프로젝트는 자동 지원이나 자동 제출 도구가 아닙니다. 결과물은 사용자가 직접 검토하고 제출하는 문서 패키지입니다.

검색 키워드: 자기소개서, 취업준비, 한국 취업, 취업 에이전트, 개발자 취업준비, 개발자 자기소개서.

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
| [Job Source Integrations](integrations/job-sources.md) | Saramin, Work24, JobKorea 연동 |

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

설치기는 일곱 개의 도메인 Skill과 `give-me-job` 오케스트레이터 Agent를 설치합니다.

- `resume-intake`
- `jd-analyzer`
- `company-values-analyzer`
- `cover-letter-writer`
- `hr-reviewer`
- `interview-prep`
- `application-packager`

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
OpenCode:    ~/.config/opencode/give-me-job/

Claude Code: ~/.claude/skills/<domain-skill>/SKILL.md
Claude Code: ~/.claude/agents/give-me-job.md
Claude Code: ~/.claude/give-me-job/
```

프로젝트 범위 설치 경로:

```txt
Codex:       .agents/skills/<skill>/SKILL.md
Codex:       .codex/agents/give-me-job.toml
OpenCode:    .opencode/skills/<domain-skill>/SKILL.md
OpenCode:    .opencode/agents/give-me-job.md
Claude Code: .claude/skills/<domain-skill>/SKILL.md
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

`agent.md`는 다음 순서로 여섯 개 Skill을 사용합니다.

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

## 채용공고 연동

환경 파일을 준비합니다.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Saramin API 사용:

```bash
node tools/fetch-jobs.mjs --source saramin --keywords "백엔드 Java" --deadline tomorrow --count 20
```

fixture 기반 검증:

```bash
node support/validate/validate-job-sources.mjs
```

마감 일정과 적합도 랭킹:

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
