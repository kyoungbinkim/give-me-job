# give-me-job

`give-me-job`은 Codex CLI, Claude Code, OpenCode 같은 코딩 에이전트에서 사용할 수 있는 취업 도우미 Skill 모음입니다.

이 프로젝트는 `skills.sh` 호환 저장소를 목표로 합니다. 1차 목표는 웹앱이나 자체 npm CLI가 아니라, 지원자의 경험 정리, JD 분석, 자기소개서 작성, HR 리뷰, 지원 패키지 생성을 도와주는 재사용 가능한 에이전트 Skill을 제공하는 것입니다.

전체 지원 준비를 한 번에 실행할 때는 루트의 [`agent.md`](../agent.md)를 오케스트레이터로 사용합니다. `agent.md`는 6개 Skill을 순서대로 실행해 `applications/<company-role>/` 아래에 회사별 지원 패키지를 만듭니다.

저장소 수준 agent discovery는 [`AGENTS.md`](../AGENTS.md)가 담당합니다. 생성된 사용자 지원 패키지인 `applications/`는 Git에서 제외됩니다.

영문 문서는 [README.md](../README.md)를 참고하세요.

로컬 도구는 Node.js 18.17 이상에서 Windows PowerShell, Ubuntu/Linux, macOS를 지원합니다. 자세한 내용은 [platform-support](platform-support.md)를 참고하세요.

## 워크플로우

워크플로우는 두 계층으로 나뉩니다.

- `agent.md`: 하나의 지원 건을 끝까지 준비하는 오케스트레이터
- `skills/*`: 오케스트레이터가 호출하는 재사용 가능한 도메인 Skill

```txt
+---------------------+
| JD URL / JD text    |
+----------+----------+
           |
           v
+----------+----------+        missing or weak
| agent.md intake     | --------------------+
+----------+----------+                     |
           |                                v
           v                         +------+------+
+----------+----------+              | resume-     |
| existing resume.md  | <----------- | intake      |
| evidence source     |              +------+------+
+----------+----------+                     |
           |                                v
           |                         +------+------+
           |                         | resume.md   |
           |                         +-------------+
           v
+----------+----------+
| jd-analyzer         |
+----------+----------+
           |
           v
+----------+----------+        optional
| JD analysis         | <---------------------+
+----------+----------+                       |
           |                                  |
           v                                  |
+----------+----------+              +--------+--------+
| cover-letter-writer | <----------- | company-values |
| draft + evidence    |              | analyzer       |
+----------+----------+              +----------------+
           |
           v
+----------+----------+
| hr-reviewer         |
| risk and evidence   |
+----------+----------+
           |
           v
+----------+----------+
| application-        |
| packager            |
+----------+----------+
           |
           v
+----------+----------+
| applications/       |
| <company-role>/     |
+----------+----------+
           |
           v
User reviews and submits manually
```

오케스트레이터는 필수 입력이 없거나, `resume.md` 근거가 부족하거나, 다음 행동이 제출/발송/로그인/CAPTCHA 우회/개인정보 전송에 해당하면 멈추고 사용자 확인을 요청합니다.

## End-To-End Agent

사용자가 전체 워크플로우를 원할 때는 `agent.md`를 사용합니다. 생성되는 패키지 구조는 다음과 같습니다.

```txt
applications/
└── <company-role>/
    ├── workflow.md
    ├── jd-analysis.md
    ├── company-values.md
    ├── cover-letter-draft.md
    ├── hr-review.md
    ├── cover-letter-final.md
    ├── evidence-map.md
    └── submission-checklist.md
```

예시 요청:

```txt
전체 워크플로우 실행해서 카카오 백엔드 지원 패키지 만들어줘
공고 URL과 인재상 페이지를 보고 자소서 초안, HR 리뷰, 제출 체크리스트까지 만들어줘
give me job: use resume.md and this JD to prepare the full package
```

`agent.md`는 제출기가 아닙니다. 파일과 체크리스트를 준비하고, 최종 제출은 사용자가 직접 수행합니다.

## 빠른 시작

저장소를 검증합니다.

```bash
npm test
```

지원 패키지 폴더를 만듭니다.

```bash
node tools/init-application.mjs --company kakao --role backend
```

이후 coding agent에게 `agent.md`를 읽고 `resume.md`와 JD를 바탕으로 패키지를 채우라고 요청합니다. 작성 후 패키지를 검증합니다.

```bash
node tools/validate-application.mjs applications/kakao-backend
```

자세한 내용은 [quickstart](quickstart.md), [safety](safety.md), [release checklist](release-checklist.md)를 참고하세요.

한국 시장에서 경쟁 가능한 v1 제품 로드맵은 [competitive-v1-roadmap](competitive-v1-roadmap.md)을 참고하세요.
한국 공고 수집 연동 설정은 [integrations/job-sources](integrations/job-sources.md)를 참고하세요.

공고를 수집한 뒤에는 다음 명령으로 마감 일정과 지원 우선순위를 확인할 수 있습니다.

```bash
node tools/schedule-jobs.mjs --week --jobs data/jobs
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
```

## Skills

- `resume-intake`: 원시 경력/경험 입력을 구조화해 `resume.md`를 만들거나 개선합니다.
- `jd-analyzer`: JD 또는 채용공고에서 요구 역량, 숨은 평가 기준, 키워드, gap을 추출합니다.
- `company-values-analyzer`: 선택 입력인 인재상, 핵심가치, 문화 페이지, 붙여넣기 텍스트를 분석합니다.
- `cover-letter-writer`: `resume.md`, JD 분석, optional 인재상 분석을 근거로 한국어 자기소개서 초안을 작성합니다.
- `hr-reviewer`: 이력서, 자기소개서, evidence map, 지원 패키지를 HR 관점에서 검토합니다.
- `application-packager`: 회사별 지원 패키지와 제출 전 체크리스트를 만듭니다.

## 설치 목표

배포 검증 후 목표 설치 흐름은 다음과 같습니다.

```bash
npx skills add kyoungbinkim/give-me-job --list
npx skills add kyoungbinkim/give-me-job@cover-letter-writer
npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode
```

현재 저장소가 private인 동안에는 공개 GitHub 접근을 전제로 하는 `skills.sh` 검증이 실패할 수 있습니다. 공개 배포 전에는 이 저장소를 public으로 전환할지, 별도 public skills repo를 만들지 결정해야 합니다.

Codex에서 로컬 테스트를 하려면 Skill 폴더를 Codex skills 디렉터리에 복사합니다.

```txt
~/.codex/skills/
```

로컬 Skill 설치 후에는 Codex를 재시작해야 합니다.

## 로컬 검증

```bash
node tools/validate-skills.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node tools/validate-application.mjs .tmp-release-check/demo-backend
node tools/validate-application.mjs examples/demo-new-grad-backend/applications/demo-cloud-backend
node tools/validate-job-sources.mjs
node tools/validate-job-schedule.mjs
node tools/validate-job-ranking.mjs
```

Windows, Ubuntu/Linux, macOS에서 동일하게 전체 검증을 실행하려면 다음을 사용합니다.

```bash
npm test
```

검증 항목:

- 루트 `AGENTS.md` 저장소 지시문 존재 여부
- 루트 `agent.md` 오케스트레이터 존재 여부
- 예상된 6개 Skill 폴더 존재 여부
- 각 Skill의 `SKILL.md` 존재 여부
- `name`, `description`만 포함한 YAML frontmatter
- 폴더명과 Skill name 일치 여부
- Skill 폴더 내부 금지 보조 문서 여부
- 관련 Skill의 핵심 `resume.md` 근거 규칙 포함 여부
- 배포 문서, 패키지 템플릿, 워크플로우 보조 스크립트 존재 여부
- 한국 공고 수집 어댑터와 fixture 존재 여부
- 공고 마감 일정과 적합도 랭킹 도구 존재 여부

## 저장소 구조

```txt
.
├── AGENTS.md
├── agent.md
├── docs/
│   ├── competitive-v1-roadmap.md
│   ├── integrations/
│   ├── platform-support.md
│   ├── quickstart.md
│   ├── release-checklist.md
│   └── safety.md
├── examples/
├── skills/
│   ├── resume-intake/
│   ├── jd-analyzer/
│   ├── company-values-analyzer/
│   ├── cover-letter-writer/
│   ├── hr-reviewer/
│   └── application-packager/
├── templates/
├── tests/
│   ├── fixtures/
│   └── golden/
├── tools/
│   ├── fetch-jobs.mjs
│   ├── init-application.mjs
│   ├── normalize-job.mjs
│   ├── rank-jobs.mjs
│   ├── schedule-jobs.mjs
│   ├── validate-application.mjs
│   ├── validate-job-ranking.mjs
│   ├── validate-job-schedule.mjs
│   ├── validate-job-sources.mjs
│   └── validate-skills.mjs
└── job-agent-plan.md
```

## 원칙

- 사용자가 제공하지 않은 경험, 성과, 수치, 책임 범위, 수상, 회사명을 만들지 않습니다.
- 자기소개서는 반드시 `resume.md` 근거를 바탕으로 작성합니다.
- 기업 인재상 페이지는 선택적 맥락으로 사용하고, 문구를 그대로 복사하지 않습니다.
- 강한 주장은 구체적인 경험 근거와 연결합니다.
- 자동 제출보다 안전한 지원 준비를 우선합니다.
- 사용자의 명시적 행동 없이 최종 제출을 실행하지 않습니다.
