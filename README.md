# give-me-job

AI 기반 취업 도우미 에이전트 Skill 저장소입니다.

이 저장소의 1차 목표는 Codex CLI, Claude Code, OpenCode 같은 코딩 에이전트에서 `skills.sh`로 설치 가능한 취업 지원 Skill 모음을 제공하는 것입니다.

## Skills

- `resume-intake`: `resume.md` 생성과 경험 구조화
- `jd-analyzer`: JD/채용공고 분석
- `company-values-analyzer`: optional 인재상/핵심가치 분석
- `cover-letter-writer`: `resume.md` 근거 기반 자기소개서 작성
- `hr-reviewer`: HR 관점 제출 전 검토
- `application-packager`: 회사별 지원 패키지와 체크리스트 생성

## 설치 목표

배포 검증 후 목표 명령은 다음과 같습니다.

```bash
npx skills add kyoungbinkim/give-me-job --list
npx skills add kyoungbinkim/give-me-job@cover-letter-writer
npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode
```

현재 저장소가 private인 동안에는 공개 GitHub repo를 전제로 하는 `skills.sh` 설치 검증이 실패할 수 있습니다. 배포 단계에서 이 저장소를 public으로 전환하거나 별도 public skills repo를 만들지 결정합니다.

## 로컬 검증

```bash
node tools/validate-skills.mjs
```

이 검증은 6개 Skill 폴더, `SKILL.md` frontmatter, 금지 보조 문서, 핵심 `resume.md` 근거 규칙을 점검합니다.

## 원칙

- 사용자가 제공하지 않은 경력이나 성과를 만들지 않습니다.
- 자기소개서는 반드시 `resume.md`를 근거로 작성합니다.
- 기업 인재상 문구를 그대로 복사하지 않습니다.
- 모든 강한 주장에는 실제 경험 근거를 연결합니다.
- 자동 제출이 아니라 작성 보조와 제출 전 검토에 집중합니다.
