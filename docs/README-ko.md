# give-me-job

`give-me-job`은 Codex CLI, Claude Code, OpenCode 같은 코딩 에이전트에서 사용할 수 있는 취업 도우미 Skill 모음입니다.

이 프로젝트는 `skills.sh` 호환 저장소를 목표로 합니다. 1차 목표는 웹앱이나 자체 npm CLI가 아니라, 지원자의 경험 정리, JD 분석, 자기소개서 작성, HR 리뷰, 지원 패키지 생성을 도와주는 재사용 가능한 에이전트 Skill을 제공하는 것입니다.

영문 문서는 [README.md](../README.md)를 참고하세요.

## 워크플로우

```txt
                       optional
                +-------------------+
                | Company Values    |
                | URL / pasted text |
                +---------+---------+
                          |
                          v
+---------+      +--------+--------+      +-------------+
| CV /    |      | resume-intake   |      | resume.md   |
| raw exp | ---> | structure facts | ---> | evidence DB |
+---------+      +--------+--------+      +------+------+
                          |                      |
                          |                      v
                          |              +-------+--------+
                          |              | cover-letter   |
                          |              | writer         |
                          |              +-------+--------+
                          |                      ^
                          v                      |
                  +-------+--------+      +------+------+
                  | jd-analyzer    | ---> | JD analysis |
                  +-------+--------+      +------+------+
                          |                      |
                          v                      v
                +---------+---------+    +-------+--------+
                | company-values    |    | evidence map   |
                | analyzer          |    | draft answers  |
                +---------+---------+    +-------+--------+
                          |                      |
                          v                      v
                     +----+----------------------+----+
                     | hr-reviewer                    |
                     | risk, evidence, HR readability |
                     +----------------+---------------+
                                      |
                                      v
                         +------------+-------------+
                         | application-packager     |
                         | final files + checklist  |
                         +------------+-------------+
                                      |
                                      v
                         User reviews and submits
                         final application manually
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
```

검증 항목:

- 예상된 6개 Skill 폴더 존재 여부
- 각 Skill의 `SKILL.md` 존재 여부
- `name`, `description`만 포함한 YAML frontmatter
- 폴더명과 Skill name 일치 여부
- Skill 폴더 내부 금지 보조 문서 여부
- 관련 Skill의 핵심 `resume.md` 근거 규칙 포함 여부

## 저장소 구조

```txt
.
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
