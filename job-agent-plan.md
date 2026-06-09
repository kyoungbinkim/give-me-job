# 취업 도우미 에이전트 개발 계획

## 1. 목표

신입과 경력 지원자를 구분해 이력서, 경험 정리, 기업 인재상 분석, 자기소개서 작성, 검토까지 도와주는 취업 도우미 에이전트를 만든다.

핵심 목표는 다음과 같다.

- 지원자의 실제 경험을 구조화해 `resume.md`에 축적한다.
- 신입과 경력의 평가 기준 차이를 반영해 다른 질문과 작성 전략을 적용한다.
- 기업의 인재상, JD, 채용 페이지를 가져와 자기소개서와 이력서를 맞춤화한다.
- 허위 경력, 과장 표현, 근거 없는 문장을 줄이고 HR 관점에서 설득력을 높인다.
- 최초 버전은 Codex CLI, Claude Code, OpenCode에서 설치 가능한 `skills.sh` 호환 에이전트 Skill 저장소로 만들고, 이후 웹 수집, RAG, 지원 현황 관리로 확장한다.

### 1.1 제품 형태

이 프로젝트의 1차 제품은 웹앱도 자체 npm CLI도 아니라, `skills.sh` 생태계에서 `npx skills add ...`로 설치할 수 있는 공개 에이전트 Skill 모음이다.

대상 실행 환경:

- Codex CLI: Codex skill 형태로 사용한다.
- Claude Code: skills.sh가 생성하는 Claude Code skill 링크를 통해 사용한다.
- OpenCode: skills.sh가 생성하는 OpenCode skill 링크를 통해 사용한다.
- 공통 설치: `npx skills add kyoungbinkim/give-me-job` 또는 특정 Skill 지정 명령으로 설치한다.

중요한 설계 방향:

- 취업 도메인 로직은 플랫폼에 종속되지 않는 `SKILL.md`, references, examples, scripts 중심으로 둔다.
- 플랫폼별 직접 설치기를 만들기보다 skills.sh의 agent detection, project/global install, symlink/copy 설치 방식을 활용한다.
- `resume.md`, JD, optional 인재상 페이지, 지원 패키지 생성 규칙은 모든 런타임에서 동일하게 유지한다.
- 자체 `npx give-me-job` CLI는 초기 목표가 아니다. 필요한 경우 나중에 `resume.md` scaffold나 테스트 도구로 제한한다.
- 웹 UI는 후순위다. 먼저 터미널/에이전트 환경에서 신뢰성 있는 워크플로우를 만든다.

참고한 에이전트 플랫폼 문서:

- OpenAI Codex customization: Codex는 `AGENTS.md`, Skills, MCP, Subagents, Plugins를 조합해 프로젝트 맞춤 동작을 구성한다. Skills는 반복 워크플로우와 도메인 전문성을 담고, Plugins는 배포 단위로 쓰는 방향이 적합하다. https://developers.openai.com/codex/concepts/customization
- OpenAI Codex plugin build: Codex plugin은 `.codex-plugin/plugin.json` manifest가 필요하며, skills, hooks, MCP 설정, marketplace를 포함할 수 있다. https://developers.openai.com/codex/plugins/build
- OpenCode agents: OpenCode는 `opencode.json` 또는 Markdown 파일로 agent를 정의하고, global 위치는 `~/.config/opencode/agents/`, 프로젝트 위치는 `.opencode/agents/`를 사용한다. agent별 model, tools, permissions, mode를 설정할 수 있다. https://opencode.ai/docs/ko/agents/
- Claude Code subagents: Claude Code subagent는 YAML frontmatter와 Markdown 시스템 프롬프트로 구성되며, `name`, `description`은 필수이고 tools, model, permissionMode, skills, mcpServers, hooks 등을 지정할 수 있다. https://code.claude.com/docs/ko/sub-agents
- skills.sh 소개: skills.sh는 `npx skills find`, `npx skills add <owner/repo@skill>`, `npx skills list`, `npx skills update`, `npx skills generate-lock` 같은 명령으로 공개 Skill을 검색, 설치, 업데이트, 잠금 관리하는 생태계다. 설치 시 프로젝트의 `.agents/skills/<skill>`에 Skill을 두고 선택한 에이전트 폴더에 symlink 또는 copy할 수 있다. https://daleseo.com/skills-sh/

## 2. 핵심 사용자 구분

### 신입 지원자

신입은 정규 경력보다 잠재력, 학습 속도, 문제 해결 방식, 직무 이해도, 프로젝트 경험의 깊이가 중요하다.

주요 입력 항목:

- 희망 직무와 산업
- 학교, 전공, 교육 과정
- 프로젝트, 공모전, 인턴, 대외활동
- 문제를 정의하고 해결한 경험
- 협업, 갈등 해결, 리더십 경험
- 사용 기술, 툴, 자격증
- 지원 동기와 커리어 방향

에이전트 작성 전략:

- 직무와 직접 연결되는 프로젝트를 우선 사용한다.
- 결과 수치가 부족하면 과정의 논리성, 역할, 배운 점을 강화한다.
- "열심히 했다"보다 "어떤 문제를 어떻게 해결했는지"를 중심으로 쓴다.
- 인재상에는 태도, 성장 가능성, 협업 방식, 학습 경험을 연결한다.

### 경력 지원자

경력은 즉시 기여 가능성, 성과, 역할 범위, 도메인 이해도, 조직 내 영향력이 중요하다.

주요 입력 항목:

- 회사별 재직 기간, 직무, 직급
- 담당 업무와 책임 범위
- 정량 성과, 비용 절감, 매출 기여, 효율 개선
- 사용 기술, 프로세스, 협업 조직
- 이직 사유와 커리어 방향
- 리딩, 의사결정, 이해관계자 조율 경험
- 실패, 개선, 재발 방지 경험

에이전트 작성 전략:

- 성과와 역할 범위를 명확히 분리한다.
- 지원 회사의 JD와 기존 경력의 접점을 앞쪽에 배치한다.
- 추상적인 역량보다 실제 비즈니스 결과를 강조한다.
- 인재상에는 성과를 낸 방식, 일하는 원칙, 조직 적합성을 연결한다.

## 3. 주요 기능

### 3.1 `resume.md` 입력 스킬

지원자의 경력과 경험을 구조화해 `resume.md`에 저장하는 스킬을 구현한다.

입력 방식:

- 대화형 질문으로 기본 정보를 수집한다.
- 신입/경력 여부에 따라 질문 세트를 다르게 적용한다.
- 사용자가 자유롭게 적은 경험을 STAR 또는 CAR 구조로 재정리한다.
- 부족한 정보가 있으면 후속 질문을 생성한다.

권장 `resume.md` 구조:

```md
# Resume Source

## Profile
- Name:
- Target Roles:
- Target Industries:
- Career Type: New Grad | Experienced
- Location Preference:

## Core Summary
- One-line Positioning:
- Strengths:
- Work Style:
- Career Vision:
- 1-Year Contribution:
- 3-Year Growth Direction:

## Skills
- Technical Skills:
- Domain Skills:
- Tools:
- Languages:

## Experience Bank
### Experience 1
- Type: Project | Work | Internship | Activity | Education
- Period:
- Context:
- Problem:
- Action:
- Result:
- Metrics:
- Related Competencies:
- Related Job Roles:
- Evidence Strength: High | Medium | Low

## Work History
### Company
- Period:
- Role:
- Responsibilities:
- Achievements:
- Tech/Tools:

## Education

## Certifications

## Preferences And Constraints
- Preferred Company Type:
- Unwanted Conditions:
- Salary Range:
- Notes:
```

트레이드오프:

- 자유 입력은 사용자가 편하지만 품질이 불안정하다.
- 고정 양식은 분석이 쉽지만 입력 부담이 커진다.
- 따라서 초기에는 자유 입력을 허용하되, 에이전트가 구조화 질문으로 보완하는 방식을 사용한다.

### 3.2 직무/JD 분석

채용 공고 또는 JD를 입력받아 다음 항목을 추출한다.

- 직무명
- 주요 업무
- 필수 자격
- 우대 사항
- 필요 역량
- 기술 스택
- 평가될 가능성이 높은 경험
- 신입/경력별 강조 포인트

출력 예:

```md
## JD Analysis
- Role:
- Must-Have:
- Nice-To-Have:
- Hidden Evaluation Criteria:
- Resume Keywords:
- Cover Letter Angles:
- Risk/Gaps:
```

### 3.3 기업 인재상 페이지 수집 및 분석

기업의 인재상, 핵심가치, 채용 페이지 URL을 선택적으로 입력받아 내용을 가져오고 자기소개서 전략으로 변환한다.

입력 정책:

- 자기소개서 작성 시 인재상 페이지 URL 또는 붙여넣기 텍스트를 optional 입력으로 받는다.
- 사용자가 인재상 페이지를 제공하면 JD, `resume.md`, 인재상 분석 결과를 함께 사용한다.
- 사용자가 제공하지 않으면 자기소개서 작성을 막지 않고 JD와 `resume.md`를 중심으로 작성한다.
- 인재상 페이지가 없을 때는 기업 공식 홈페이지, 채용 공고 내 가치 표현, 최근 뉴스에서 보조 신호를 찾되 추정임을 표시한다.
- 접근 실패, 동적 페이지, 이미지 기반 페이지는 수동 붙여넣기 fallback을 제공한다.

분석 항목:

- 인재상 키워드
- 핵심가치
- 반복 표현
- 조직이 선호하는 행동 방식
- 피해야 할 톤 또는 주장
- 자기소개서에 연결할 경험 후보

주의 사항:

- 페이지 원문을 그대로 복사하지 않는다.
- 사용자 경험과 연결 가능한 가치만 사용한다.
- 근거 없는 맞춤형 문장을 만들지 않는다.
- 동적 페이지, 이미지 기반 페이지, 접근 제한 페이지는 사용자가 텍스트를 붙여넣는 fallback을 둔다.

트레이드오프:

- 자동 크롤링은 편하지만 robots 정책, 동적 렌더링, 페이지 변경에 취약하다.
- 수동 붙여넣기는 안정적이지만 사용자의 입력 부담이 있다.
- MVP에서는 URL 입력과 수동 붙여넣기를 모두 지원하고, 실패 시 수동 입력으로 전환한다.

### 3.4 자기소개서 작성 에이전트

질문, JD, `resume.md`를 기본 입력으로 보고 자기소개서 초안을 작성한다. 인재상 페이지는 optional 입력으로 받으며, 제공된 경우에만 핵심가치와 조직 적합성 반영에 사용한다.

입력 항목:

- 필수: 자기소개서 문항, JD 또는 채용 공고, `resume.md`
- 선택: 인재상 페이지 URL, 핵심가치 페이지 URL, 기업 소개 페이지 URL, 사용자가 붙여넣은 인재상 텍스트

작성 절차:

1. 질문 의도를 분석한다.
2. JD에서 필요한 역량을 추출한다.
3. 인재상 페이지가 제공되었으면 핵심가치와 선호 행동 방식을 추출한다.
4. `resume.md`의 경험 중 가장 적합한 근거를 고른다.
5. 신입/경력에 맞는 서술 구조를 선택한다.
6. 초안을 작성한다.
7. 과장, 모호함, 반복 표현, 기업명 치환 흔적을 검토한다.
8. 문항 글자 수에 맞춰 압축한다.

핵심 원칙:

- 자기소개서의 모든 주요 주장은 반드시 `resume.md`의 경험, 경력, 프로젝트, 성과 중 하나를 근거로 삼는다.
- `resume.md`에 없는 경험, 성과, 수치, 업무 범위는 생성하지 않는다.
- 근거가 부족하면 초안을 쓰기 전에 추가 질문을 생성한다.
- 문항별 초안에는 내부적으로 `Evidence ID`를 붙여 어떤 경험을 사용했는지 추적한다.
- 최종 사용자에게는 자연스러운 자기소개서만 보여주되, 리뷰 화면에서는 근거 매핑을 함께 보여준다.

참고한 자기소개서 작성 프레임워크:

- 출처: STAFFS STORY, "취업 자소서 쓰는법: 합격률 높이는 꿀팁 7가지", 네이버 블로그, 2024-07-30. https://blog.naver.com/staffs00/223530180865
- 요지: 기업 분석, 채용공고 키워드 반영, STAR 구조, 성과 수치화, 차별화 강점, 논리적 구조, 기업 니즈와 지원자 경험 연결을 강조한다.
- 출처: 고용24, "자기소개서 작성 준비", 이력서/자소서 작성가이드. https://m.work24.go.kr/wk/r/d/1111/resumeSelfIntroGuide2.do
- 요지: 자기소개서는 지원 회사와 직무에 적합한 역량, 입사 의지, 입사 후 성과 가능성을 보여주는 자료이며 면접의 기초자료가 된다. 준비 단계에서는 지원 직무와 회사 정보 탐색, 보유 직무 역량 정리, 직무/인성 경험 정리, 직무 비전 수립이 필요하다.

에이전트 반영 방식:

- 기업 분석: 기업 홈페이지, 인재상, 최근 뉴스, 채용 페이지에서 반복되는 가치와 사업 방향을 요약한다.
- 키워드 활용: JD에서 반복되는 명사와 역량 표현을 추출하되, 문장에 억지로 끼워 넣지 않는다.
- 구체 경험: `resume.md`의 경험을 Situation, Task, Action, Result로 재구성한다.
- 성과 수치화: `Metrics`가 있으면 우선 사용하고, 없으면 "기간", "규모", "빈도", "사용자 수", "처리량" 등 대체 지표를 질문한다.
- 차별화: 다른 지원자와 구별되는 경험을 직무 관련성 기준으로 선별한다.
- 논리 구조: 문항 의도에 따라 서론, 근거 경험, 배운 점, 회사 기여로 이어지는 흐름을 만든다.
- 기업 니즈 연결: "내가 하고 싶은 말"보다 "회사가 뽑을 이유"를 먼저 검증한다.
- 직무 비전: `resume.md`의 `Career Vision`, `1-Year Contribution`, `3-Year Growth Direction`을 활용해 입사 후 포부를 작성한다.
- 면접 근거성: 자기소개서에 쓴 모든 핵심 문장은 면접에서 질문받아도 설명 가능한 경험인지 검증한다.

문항 유형 분류:

| 문항 유형 | 평가 의도 | 필요한 `resume.md` 근거 |
| --- | --- | --- |
| 지원동기 | 회사 이해도, 입사 의지, 직무 선택 이유 | Target Roles, Career Vision, 관련 경험 |
| 직무수행 경험 | 업무능력, 유사 경험, 성과 재현 가능성 | Experience Bank, Work History, Metrics |
| 성장과정/성격 | 가치관, 행동 패턴, 조직 적합성 | 인성 경험, 반복 행동, 피드백 수용 사례 |
| 협업/소통 | 공동 목표 달성, 갈등 해결, 조율 방식 | 협업 경험, 갈등 상황, Action/Result |
| 문제해결 | 문제 정의, 실행력, 개선 성과 | Problem, Action, Result, 재발 방지 |
| 창의/도전 | 비효율 발견, 새로운 시도, 리스크 대응 | 개선 경험, 실험, 실패 후 학습 |
| 직업윤리/가치관 | 책임감, 공공성, 신뢰성, 판단 기준 | 가치관 사례, 어려운 선택, 원칙 준수 |
| 입사 후 포부 | 직무 비전, 성장 계획, 회사 기여 | Career Vision, 1-Year Contribution, 3-Year Growth Direction |

신입 자기소개서 기본 구조:

- 지원 동기
- 직무 관심의 계기
- 관련 프로젝트 또는 경험
- 배운 점과 성장 가능성
- 입사 후 기여 방향

경력 자기소개서 기본 구조:

- 지원 직무와 기존 경력의 접점
- 대표 성과
- 성과를 만든 방식
- 지원 회사에서 재현 가능한 기여
- 조직 적합성

### 3.5 자동 지원서 작성 및 배포 에이전트

지원 공고를 찾고, 회사별 지원서 패키지를 만들고, 사용자의 확인을 거쳐 제출 또는 제출 준비까지 돕는 기능이다.

중요한 판단:

- 기술적으로는 지원서 자동 작성과 일부 사이트의 자동 입력은 가능하다.
- 그러나 완전 자동 제출은 개인정보 전송, 채용 사이트 약관 위반, CAPTCHA, 계정 잠금, 잘못된 회사 제출, 허위 기재 위험이 크다.
- 따라서 MVP에서는 "자동 작성 + 제출 전 검토 + 사용자가 직접 최종 제출"을 기본 정책으로 둔다.
- 향후에는 사이트별 약관과 사용자의 명시적 승인 범위 안에서만 반자동 제출을 검토한다.

자동화 수준:

| 수준 | 설명 | 권장 여부 |
| --- | --- | --- |
| Level 0 | 자기소개서와 이력서 문장 초안만 생성 | MVP 필수 |
| Level 1 | 회사별 지원 패키지 생성: 자기소개서, 이력서 요약, 제출 체크리스트 | MVP 권장 |
| Level 2 | 채용 사이트 입력값을 미리 채운 draft 생성, 사용자가 브라우저에서 확인 | Phase 6 이후 검토 |
| Level 3 | 사용자가 매 지원 건마다 승인하면 브라우저 자동 입력 후 제출 직전까지 진행 | 제한적으로 가능 |
| Level 4 | 승인 없이 여러 회사에 자동 제출 | 제외 권장 |

지원 패키지 구성:

```txt
applications/
└── company-role/
    ├── jd-analysis.md
    ├── company-values.md
    ├── resume-tailoring.md
    ├── cover-letter-draft.md
    ├── cover-letter-final.md
    ├── submission-checklist.md
    └── evidence-map.md
```

작성 및 배포 절차:

1. 지원 공고 URL 또는 텍스트를 입력받는다.
2. 회사명, 직무명, 마감일, 문항, 글자 수 제한을 추출한다.
3. 인재상 페이지 URL 또는 텍스트를 optional로 입력받는다.
4. JD를 분석하고, 인재상 입력이 있으면 함께 분석한다.
5. `resume.md`에서 사용할 경험 후보를 고른다.
6. 문항별 자기소개서 초안을 작성한다.
7. `Evidence Map`으로 문장과 근거 경험을 연결한다.
8. HR 리뷰와 제출 전 체크리스트를 실행한다.
9. 사용자가 승인하면 최종본을 저장한다.
10. 사이트별 제출 방식에 따라 수동 제출 가이드, 이메일 draft, 브라우저 자동 입력 중 하나를 선택한다.

배포 채널별 정책:

- 회사 채용 페이지: URL, 문항, 글자 수, 첨부 파일 요구사항을 추출하고 제출 전까지 보조한다.
- 채용 플랫폼: 로그인 세션과 약관 문제가 있으므로 사용자의 브라우저에서 반자동 입력까지만 우선 검토한다.
- 이메일 지원: Gmail draft 또는 `.eml` 초안 생성은 비교적 안전하다. 발송은 사용자가 직접 확인한다.
- PDF/문서 제출: 이력서와 자기소개서 파일을 생성하고 파일명 규칙과 첨부 체크리스트를 제공한다.

반자동 제출 가드레일:

- 회사명, 직무명, 제출 문항, 첨부 파일을 제출 직전에 다시 보여준다.
- 다른 회사명 잔존 여부를 검사한다.
- `resume.md` 근거가 없는 문장은 차단하거나 경고한다.
- 사용자의 명시적 승인 없이는 제출 버튼을 누르지 않는다.
- CAPTCHA, 결제, 민감 정보 추가 입력, 계정 권한 변경은 자동화하지 않는다.
- 지원 완료 후 접수 번호, 제출 시각, 제출 파일, 최종 문항을 기록한다.

트레이드오프:

- 자동 작성은 속도를 높이지만, 회사별 맥락이 얕아지면 탈락률이 높아질 수 있다.
- 자동 제출은 반복 작업을 줄이지만, 오제출과 개인정보 리스크가 매우 크다.
- 반자동 입력은 안전성과 효율의 균형이 좋지만, 사이트별 UI 변화에 취약하다.
- 이메일 draft는 구현이 쉽고 안정적이지만, 채용 플랫폼 중심 지원에는 한계가 있다.
- 품질 높은 지원을 우선하려면 "많이 뿌리기"보다 "적합한 공고에 맞춤 작성"을 기본 전략으로 둔다.

### 3.6 HR 리뷰 에이전트

작성된 이력서와 자기소개서를 HR 관점에서 검토한다.

검토 기준:

- 직무 적합성
- 인재상 적합성
- 직무 이해도와 입사 의지
- 입사 후 기여 가능성
- 성과와 근거의 구체성
- 문항 의도 충족 여부
- 신입/경력 레벨 적합성
- 과장 또는 허위로 보일 위험
- 면접에서 추가 질문을 받아도 방어 가능한 근거
- 문장 길이와 읽기 편한 구조
- 읽는 사람 입장에서의 설득력
- ATS 키워드 포함 여부

출력 형식:

```md
## HR Review
- Overall Score:
- Strong Points:
- Weak Points:
- Risky Claims:
- Missing Evidence:
- Recommended Revision:
```

## 4. 에이전트 구성

초기에는 하나의 CLI 또는 로컬 스크립트에서 시작하고, 내부 기능은 역할별 모듈로 나눈다.

### 4.1 Intake Agent

사용자의 기본 상황을 파악한다.

- 신입/경력 구분
- 희망 직무
- 목표 회사
- 현재 보유 자료
- 마감일
- 필요한 산출물

### 4.2 Resume Structuring Agent

자유 입력 경험을 `resume.md` 구조로 변환한다.

- 경험 단위 분리
- STAR/CAR 구조화
- 정량 성과 추출
- 부족한 정보 질문 생성
- 직무별 관련도 태깅

### 4.3 Company Research Agent

기업 페이지와 JD를 분석한다. 인재상 페이지는 optional 입력으로 처리한다.

- URL 또는 붙여넣기 텍스트 입력
- 인재상 또는 핵심가치 페이지가 제공된 경우 핵심가치 추출
- JD 키워드 추출
- 지원자 경험과 매칭

### 4.4 Application Writer Agent

자기소개서, 이력서 요약, 경력기술서 문장을 작성한다.

- 문항별 초안 작성
- 글자 수 조절
- 톤 조절
- 신입/경력 분기
- 버전별 저장

### 4.5 Reviewer Agent

최종 검토를 담당한다.

- HR 관점 평가
- 약한 주장 표시
- 근거 없는 문장 제거 제안
- 더 강한 경험으로 교체 제안
- 최종 제출 전 체크리스트 제공

### 4.6 Application Automation Agent

회사별 지원 패키지 생성과 제출 준비를 담당한다.

- 지원 공고 URL 또는 텍스트 수집
- 회사명, 직무명, 마감일, 문항, 글자 수 제한 추출
- 자기소개서 최종본과 `resume.md` 근거 매핑 확인
- 제출 파일명과 첨부 파일 체크리스트 생성
- 이메일 draft 또는 브라우저 입력 draft 생성
- 사용자의 최종 승인 전까지 제출을 보류

이 에이전트는 작성 에이전트가 아니라 운영 에이전트로 본다. 품질이 낮은 초안을 많이 제출하는 것보다, 검증된 지원 패키지를 안전하게 관리하는 것이 우선이다.

### 4.7 skills.sh Distribution Layer

Codex CLI, Claude Code, OpenCode에서 같은 취업 워크플로우를 사용할 수 있도록 `skills.sh` 호환 Skill 저장소로 배포한다.

공통 원칙:

- 핵심 지시문은 각 Skill의 `SKILL.md`와 `references/`, `examples/`, `scripts/`에 둔다.
- 설치는 자체 CLI가 아니라 `npx skills add`에 맡긴다.
- 저장소는 `npx skills add kyoungbinkim/give-me-job --list`로 Skill 목록이 탐지되어야 한다.
- 특정 Skill 설치는 `npx skills add kyoungbinkim/give-me-job@cover-letter-writer` 형식을 목표로 한다.
- 여러 에이전트 설치는 `npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode` 형태를 목표로 한다.
- 프로젝트 설치와 전역 설치를 모두 지원하되, 팀 재현성은 프로젝트 설치와 `.skill-lock.json` 커밋을 우선한다.
- 설치 방식은 symlink를 권장한다. 단일 source of truth와 업데이트가 쉽기 때문이다.
- 자동 제출, 브라우저 입력, 이메일 draft 같은 외부 전송 가능 기능은 Skill 본문에서 보수적으로 다루고, 최종 제출은 사용자 승인 전제로 둔다.

권장 Skill 목록:

- `resume-intake`: `resume.md` 생성과 경험 구조화
- `jd-analyzer`: JD/채용공고 분석
- `company-values-analyzer`: optional 인재상 페이지 분석
- `cover-letter-writer`: `resume.md` 근거 기반 자기소개서 작성
- `hr-reviewer`: HR 관점 검토
- `application-packager`: 회사별 지원 패키지 생성

권장 Skill 구조:

```txt
skills/
├── resume-intake/
│   ├── SKILL.md
│   ├── references/
│   └── examples/
├── jd-analyzer/
│   └── SKILL.md
├── company-values-analyzer/
│   └── SKILL.md
├── cover-letter-writer/
│   ├── SKILL.md
│   ├── references/
│   └── examples/
├── hr-reviewer/
│   └── SKILL.md
└── application-packager/
    ├── SKILL.md
    └── scripts/
```

설치 후 기대 구조:

```txt
.
├── .agents/
│   └── skills/
│       ├── resume-intake/
│       ├── cover-letter-writer/
│       └── hr-reviewer/
├── .claude/
│   └── skills/
│       └── cover-letter-writer -> ../../.agents/skills/cover-letter-writer
└── .skill-lock.json
```

주의:

- skills.sh가 각 에이전트를 어떤 폴더로 링크하는지는 실제 CLI 동작으로 검증한다.
- Claude Code subagent나 OpenCode agent 파일은 Skill 배포가 안정화된 뒤 optional adapter로 추가한다.
- Codex plugin/marketplace도 초기 배포 목표가 아니라, skills.sh 배포가 안정화된 뒤 검토한다.

## 5. 데이터와 파일 구조

사용자 워크스페이스 권장 구조:

```txt
.
├── resume.md
├── job-agent-plan.md
├── companies/
│   └── company-name.md
├── jobs/
│   └── company-role.md
├── applications/
│   └── company-role/
│       ├── jd-analysis.md
│       ├── company-values.md
│       ├── resume-tailoring.md
│       ├── cover-letter-draft.md
│       ├── cover-letter-final.md
│       ├── submission-checklist.md
│       └── evidence-map.md
├── cover-letters/
│   └── company-role-question.md
├── reviews/
│   └── company-role-review.md
└── templates/
    ├── resume-template.md
    ├── jd-analysis-template.md
    └── cover-letter-template.md
```

skills.sh 호환 저장소 권장 구조:

```txt
.
├── README.md
├── job-agent-plan.md
├── skills/
│   ├── resume-intake/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── examples/
│   ├── jd-analyzer/
│   │   ├── SKILL.md
│   │   └── examples/
│   ├── company-values-analyzer/
│   │   └── SKILL.md
│   ├── cover-letter-writer/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── examples/
│   ├── hr-reviewer/
│   │   └── SKILL.md
│   └── application-packager/
│       ├── SKILL.md
│       ├── references/
│       └── scripts/
├── templates/
│   ├── resume-template.md
│   ├── jd-analysis-template.md
│   ├── evidence-map-template.md
│   └── application-package-template.md
├── tools/
│   ├── validate-skills.mjs
│   └── render-examples.mjs
└── tests/
    ├── fixtures/
    ├── unit/
    └── golden/
```

MVP에서는 사용자 산출물과 Skill 본문 모두 Markdown을 우선 사용한다. 보조 스크립트가 필요할 때만 `tools/` 또는 각 Skill의 `scripts/`에 Node.js 스크립트를 둔다. 이후 지원 이력이 많아지면 SQLite 또는 JSON 기반 상태 파일을 추가한다.

skills.sh 설치 목표:

```bash
npx skills find job
npx skills add kyoungbinkim/give-me-job
npx skills add kyoungbinkim/give-me-job --list
npx skills add kyoungbinkim/give-me-job@cover-letter-writer
npx skills add kyoungbinkim/give-me-job --skill cover-letter-writer
npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode
npx skills add kyoungbinkim/give-me-job -g
npx skills list
npx skills check
npx skills update
npx skills generate-lock
```

skills.sh 설치가 기대하는 동작:

- 저장소의 Skill 목록을 탐지한다.
- 선택한 Skill을 프로젝트의 `.agents/skills/<skill>`에 설치한다.
- 선택한 에이전트의 skills 폴더에 symlink 또는 copy를 생성한다.
- project install과 global install을 모두 지원한다.
- `.skill-lock.json`을 생성해 팀 단위 재현성을 제공한다.
- `resume.md`, `applications/`, `companies/`, `jobs/` 같은 사용자 데이터 파일은 설치 시 자동 생성하지 않는다.
- Skill 본문에서 필요한 사용자 파일을 안내하고, 실제 파일 생성은 사용자가 에이전트에게 요청했을 때 수행한다.

트레이드오프:

- Markdown은 사람이 읽고 수정하기 쉽지만 검색과 통계에는 약하다.
- DB는 자동화와 조회에 좋지만 초기 개발 비용이 커진다.
- 취업 자료는 사용자가 직접 읽고 고치는 일이 많으므로 MVP는 Markdown이 적합하다.
- skills.sh 배포는 설치 UX가 좋고 여러 에이전트에 재사용하기 쉽지만, 생태계가 초기 단계라 버전 관리와 에이전트별 지원이 변할 수 있다.
- symlink 설치는 업데이트가 쉽지만 Windows나 일부 보안 정책에서 제약이 있을 수 있다.
- copy 설치는 안정적이지만 여러 에이전트에 설치했을 때 drift가 생기기 쉽다.

## 6. 구현 단계

### Phase 1. 공통 Markdown/Prompt MVP

목표:

- `resume.md` 구조 설계
- 신입/경력 입력 질문 구현
- JD 텍스트 분석
- 인재상 텍스트 분석
- 자기소개서 초안 생성
- HR 리뷰 출력
- 공통 prompt 파일 작성
- `resume.md` 근거 매핑 규칙 작성

완료 기준:

- 신입 지원자 샘플 1개와 경력 지원자 샘플 1개를 처리할 수 있다.
- `resume.md`에서 경험을 가져와 문항별 자기소개서를 작성할 수 있다.
- 인재상 입력이 있으면 키워드가 자기소개서 문장에 자연스럽게 반영된다.
- 인재상 입력이 없어도 JD와 `resume.md`만으로 자기소개서 초안을 작성할 수 있다.
- Codex, Claude Code, OpenCode에 넣을 수 있는 공통 지시문이 준비된다.

### Phase 2. skills.sh 호환 Skill 저장소

목표:

- `skills/<skill-name>/SKILL.md` 구조 생성
- references, examples, scripts 구조 정리
- skills.sh가 Skill 목록을 탐지할 수 있는 저장소 구조 검증
- 각 Skill의 name, description, trigger 조건 작성
- 각 Skill에서 동일한 `resume.md` 근거 규칙을 사용하도록 정렬

완료 기준:

- `npx skills add kyoungbinkim/give-me-job --list`로 Skill 목록을 확인할 수 있다.
- `npx skills add kyoungbinkim/give-me-job@cover-letter-writer`로 특정 Skill을 설치할 수 있다.
- 설치 후 `.agents/skills/<skill>`에 Skill 파일이 위치한다.
- Claude Code, Codex, OpenCode를 agent 대상으로 선택할 수 있는지 검증한다.
- project install과 global install을 모두 검증한다.

### Phase 3. Skill 설치, 잠금, 업데이트 검증

목표:

- `npx skills add` 설치 플로우 검증
- `npx skills list` 설치 목록 확인
- `npx skills check` 업데이트 가능 여부 확인
- `npx skills update` 업데이트 플로우 검증
- `npx skills generate-lock` 잠금 파일 생성 검증
- symlink 설치와 copy 설치 비교
- Windows/macOS/Linux에서 설치 경로 검증

완료 기준:

- `npx skills add kyoungbinkim/give-me-job`가 전체 Skill 설치 후보를 보여준다.
- `npx skills add kyoungbinkim/give-me-job@resume-intake`가 단일 Skill만 설치한다.
- `npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode`가 의도한 에이전트 대상 설치를 수행한다.
- `.skill-lock.json`이 생성되고 Git에 커밋 가능한 형태다.
- 설치 과정은 `resume.md`와 사용자 지원 데이터 폴더를 자동 생성하지 않는다.
- 기존 Skill 파일이 있을 때 skills.sh의 update/check 흐름으로 관리한다.

### Phase 4. URL 수집 및 근거 매핑

목표:

- 채용 공고 URL 수집
- optional 인재상 페이지 URL 수집
- 페이지 본문 추출
- 출처별 요약 저장
- 경험과 JD 요구사항 또는 기업 가치의 매칭 근거 표시

완료 기준:

- URL 입력만으로 JD 요약 파일을 만들 수 있다.
- 인재상 URL 또는 텍스트가 제공되면 인재상 요약 파일을 만들 수 있다.
- 자기소개서 초안에 어떤 경험이 어떤 JD 요구사항 또는 기업 가치와 연결됐는지 표시할 수 있다.

### Phase 5. 지원 현황 및 반자동 지원 패키지

목표:

- 회사별 지원 상태 관리
- 마감일 관리
- 제출 문서 버전 관리
- 면접 예상 질문 생성
- 탈락/합격 결과 회고 기록
- 회사별 지원 패키지 폴더 자동 생성
- 자기소개서 최종본, 근거 매핑, 제출 체크리스트 생성
- 이메일 지원 draft 생성
- 지원 사이트에 붙여넣을 문항별 최종 답변 생성
- 제출 전 회사명, 직무명, 파일명, 글자 수, 개인정보 점검

완료 기준:

- 회사, 직무, 마감일, 진행 상태를 Markdown 또는 JSON으로 조회할 수 있다.
- 제출한 자기소개서와 리뷰 결과를 다시 찾을 수 있다.
- 사용자가 하나의 지원 공고를 입력하면 제출 가능한 패키지가 생성된다.
- 자기소개서의 모든 핵심 문장에 `resume.md` 근거가 연결된다.
- 사용자가 제출 전 체크리스트를 보고 직접 제출할 수 있다.

### Phase 6. 제한적 브라우저 자동 입력

목표:

- 사용자의 브라우저에서 채용 사이트 입력란을 인식한다.
- 자기소개서 문항과 입력란을 매칭한다.
- 제출 버튼을 누르기 전 단계까지만 자동 입력한다.
- 제출 직전 요약 화면에서 사용자가 직접 확인한다.

완료 기준:

- 지원 사이트별 입력 성공률과 실패 케이스를 기록한다.
- CAPTCHA, 추가 개인정보 요구, 약관상 자동화 금지 흐름에서는 자동화를 중단한다.
- 사용자의 명시적 승인 없이 최종 제출하지 않는다.

### Deferred. 웹 UI 또는 대화형 앱

웹 UI는 초기 배포 목표가 아니다. `npx` 설치와 코딩 에이전트 런타임 호환성이 안정화된 뒤 검토한다.

검토할 기능:

- 경험 입력 화면
- JD 붙여넣기 또는 URL 입력 화면
- optional 인재상 붙여넣기 또는 URL 입력 화면
- 자기소개서 생성 및 비교 화면
- HR 리뷰 화면
- 지원 현황 대시보드
- 회사별 지원 패키지 관리 화면

## 7. 주요 트레이드오프

| 주제 | 선택지 A | 선택지 B | 권장 방향 |
| --- | --- | --- | --- |
| 데이터 저장 | Markdown | DB | MVP는 Markdown, 지원 이력 관리부터 DB 검토 |
| 경험 입력 | 자유 입력 | 고정 폼 | 자유 입력 후 구조화 질문 |
| 에이전트 구조 | 단일 에이전트 | 역할별 멀티 에이전트 | 내부 모듈은 분리하되 UX는 단순하게 |
| 기업 분석 | 자동 크롤링 | 수동 붙여넣기 | 둘 다 지원, 실패 시 수동 fallback |
| 자기소개서 | 강한 맞춤화 | 진정성 우선 | 실제 경험을 벗어나지 않는 맞춤화 |
| 신입/경력 로직 | 완전 분리 | 공통 로직 | 공통 코어 + 질문/평가 기준 분리 |
| 리뷰 강도 | 부드러운 피드백 | 엄격한 HR 리뷰 | 제출 전에는 엄격한 리뷰가 유리 |
| 자동화 수준 | 완전 자동 제출 | 반자동 패키지/입력 | MVP는 자동 작성과 제출 준비, 이후 제출 직전까지의 반자동 입력만 검토 |
| 배포 채널 | 채용 플랫폼 자동 제출 | 이메일 draft/수동 제출 가이드 | 약관과 개인정보 리스크가 낮은 채널부터 구현 |
| 자기소개서 근거 | 생성 모델 판단 | `resume.md` 근거 매핑 | `resume.md`에 없는 주장은 차단하거나 추가 질문 |
| 제품 형태 | 웹앱 우선 | 에이전트 패키지 우선 | Codex/Claude/OpenCode에서 쓰는 agent package를 우선 구현 |
| 플랫폼 지원 | 단일 플랫폼 최적화 | 공통 코어 + 어댑터 | 공통 prompt/core를 유지하고 플랫폼별 wrapper만 분리 |
| 배포 방식 | 자체 installer | skills.sh 표준 설치 | `npx skills add kyoungbinkim/give-me-job`를 1차 목표로 둠 |
| 설치 범위 | 전체 scaffold | Skill만 설치 | Skill 설치 시 사용자 데이터 파일을 자동 생성하지 않음 |
| CLI 이름 | `npx give-me-job` | `npx skills add owner/repo@skill` | 설치는 skills.sh CLI를 사용하고 자체 CLI는 후순위 |
| Codex 배포 | plugin/marketplace 우선 | skills.sh Skill 우선 | MVP는 skills.sh Skill, plugin/marketplace는 안정화 후 검토 |
| 권한 정책 | 편의 중심 allow | 보수적 ask/deny | 파일 생성은 허용하되 외부 전송/제출은 ask 또는 deny |
| 유지보수 | 플랫폼별 prompt 따로 관리 | 공통 prompt를 변환 | 중복 prompt는 drift가 커지므로 공통 소스에서 생성 |

## 8. 추가하면 좋은 기능

### 8.1 경험 은행

한 번 입력한 경험을 여러 회사에 재사용할 수 있게 만든다.

- 경험별 관련 직무 태그
- 연결 가능한 인재상 태그
- 성과 수치 보강 상태
- 자기소개서 사용 이력

### 8.2 JD-Resume Gap 분석

채용 공고와 `resume.md`를 비교해 부족한 부분을 알려준다.

- 필수 자격 중 근거가 약한 항목
- 우대 사항 중 강조 가능한 항목
- 이력서에 추가해야 할 키워드
- 자기소개서에서 보완할 포인트

### 8.3 면접 준비 에이전트

제출한 이력서와 자기소개서를 바탕으로 예상 질문을 만든다.

- 인성 질문
- 직무 질문
- 프로젝트 꼬리 질문
- 경력 이직 사유 질문
- 답변 구조와 개선 피드백

### 8.4 회사별 톤 조절

기업 문화와 산업에 따라 문체를 조절한다.

- 대기업: 구조적이고 안정적인 문체
- 스타트업: 실행력과 주도성을 강조하는 문체
- 기술 회사: 문제 해결 과정과 기술적 깊이 강조
- 금융/공공: 신뢰성, 책임감, 리스크 관리 강조

### 8.5 제출 전 체크리스트

최종 제출 전에 자동 점검한다.

- 회사명 오타
- 다른 회사명 잔존 여부
- 글자 수 초과
- 문항 의도 이탈
- 중복 경험 과다 사용
- 근거 없는 성과 표현
- 개인정보 과다 노출
- 문장이 과하게 길거나 읽기 어려운지
- 면접에서 설명할 수 없는 주장 포함 여부
- 지원 직무를 충분히 이해하고 쓴 문장인지
- 입사 후 포부가 추상적인 다짐에 머무르는지

### 8.6 지원 큐와 배포 관리

지원할 회사를 큐로 관리하고, 각 지원 건의 작성/검토/제출 상태를 추적한다.

- 관심 공고
- 작성 필요
- 리뷰 필요
- 제출 준비 완료
- 제출 완료
- 보류 또는 제외

각 지원 건에는 다음 정보를 저장한다.

- 회사명, 직무명, 공고 URL
- 마감일
- 제출 문항
- 사용한 `resume.md` 경험
- 최종 자기소개서 파일
- 제출 방식
- 제출 여부와 접수 번호
- 회고 메모

## 9. 품질 원칙

- 사용자가 제공하지 않은 경력이나 성과를 만들지 않는다.
- 자기소개서는 반드시 `resume.md`를 근거로 작성한다.
- `resume.md` 근거가 없는 핵심 주장은 작성하지 않고 추가 질문으로 전환한다.
- 기업 인재상 문구를 그대로 베끼지 않는다.
- 모든 강한 주장에는 경험 근거를 연결한다.
- 자기소개서는 면접의 기초자료이므로, 면접에서 설명할 수 없는 문장은 쓰지 않는다.
- 신입에게 경력자 같은 성과를 요구하지 않는다.
- 경력자에게 추상적인 열정만 강조하지 않는다.
- 자기소개서는 예쁘게 쓰는 것보다 평가자가 뽑을 이유를 명확히 주는 것이 우선이다.
- 최종 결과물은 사용자가 직접 검토하고 제출하는 것을 기본 전제로 한다.
- 자동 입력 기능이 있더라도 사용자의 명시적 승인 없이는 최종 제출하지 않는다.

## 10. 구현 확정 사항

다음 항목은 MVP 구현을 위해 우선 확정한다. 이후 사용하면서 바꿀 수는 있지만, 첫 구현자는 아래 결정을 기본값으로 삼는다.

| 항목 | 결정 |
| --- | --- |
| 1차 제품 | `skills.sh` 호환 Skill 저장소 |
| 설치 방식 | `npx skills add kyoungbinkim/give-me-job` |
| 자체 CLI | 후순위. MVP에서는 만들지 않는다 |
| 웹 UI | 후순위. Skill 동작이 안정화된 뒤 검토한다 |
| 구현 언어 | Skill 본문은 Markdown, 검증/보조 스크립트는 Node.js ESM |
| 데이터 저장 | 사용자 산출물은 Markdown, 테스트 fixtures는 Markdown/JSON 혼합 |
| 사용자 데이터 생성 | Skill 설치 시 자동 생성하지 않는다 |
| 최종 제출 | 자동 제출 금지. 제출 전 패키지와 체크리스트까지만 MVP 범위 |
| 인재상 입력 | optional. URL 또는 붙여넣기 텍스트 모두 허용 |
| 자기소개서 근거 | 모든 핵심 주장은 `resume.md` 근거가 있어야 한다 |
| 공개 범위 | skills.sh 검증 전까지 private 유지, 배포 검증 시 public 전환 또는 별도 public repo 결정 |
| Codex plugin | MVP 제외. skills.sh 배포 후 검토 |
| Claude/OpenCode adapter | MVP에서는 skills.sh 설치 결과를 우선 검증하고, 필요 시 후속 adapter로 추가 |

MVP Skill 이름은 다음 6개로 고정한다.

- `resume-intake`
- `jd-analyzer`
- `company-values-analyzer`
- `cover-letter-writer`
- `hr-reviewer`
- `application-packager`

## 11. 바로 실행 가능한 구현 계획

### 11.1 1차 커밋: Skill 저장소 골격

목표는 skills.sh가 탐지할 수 있는 최소 구조를 만드는 것이다.

생성할 구조:

```txt
skills/
├── resume-intake/
│   ├── SKILL.md
│   ├── references/
│   │   └── resume-schema.md
│   └── examples/
│       ├── new-grad-resume.md
│       └── experienced-resume.md
├── jd-analyzer/
│   ├── SKILL.md
│   └── examples/
│       └── jd-analysis.md
├── company-values-analyzer/
│   ├── SKILL.md
│   └── examples/
│       └── company-values.md
├── cover-letter-writer/
│   ├── SKILL.md
│   ├── references/
│   │   ├── cover-letter-rules.md
│   │   └── question-types.md
│   └── examples/
│       └── cover-letter-with-evidence.md
├── hr-reviewer/
│   ├── SKILL.md
│   └── examples/
│       └── hr-review.md
└── application-packager/
    ├── SKILL.md
    ├── references/
    │   └── package-structure.md
    └── examples/
        └── application-package.md
```

구현 규칙:

- 각 `SKILL.md` frontmatter는 `name`, `description`만 둔다.
- `description`에는 언제 이 Skill을 써야 하는지 명확히 쓴다.
- `SKILL.md` 본문은 500줄 이하로 유지한다.
- 긴 스키마, 문항 유형, 예시는 `references/` 또는 `examples/`로 분리한다.
- Skill 안에는 `README.md`, `INSTALL.md`, `CHANGELOG.md` 같은 보조 문서를 만들지 않는다.
- 모든 Skill은 `resume.md` 근거 원칙을 반복하지 않고, 필요한 경우 관련 reference를 읽도록 안내한다.

완료 기준:

- 6개 Skill 폴더가 모두 존재한다.
- 모든 `SKILL.md`에 유효한 YAML frontmatter가 있다.
- 각 Skill은 입력, 출력, 절차, 실패 시 fallback을 포함한다.
- 예시 파일은 실제 에이전트가 따라 할 수 있는 최소 샘플을 담는다.

### 11.2 2차 커밋: 공통 템플릿과 검증 도구

목표는 Skill이 만드는 산출물의 형식을 고정하고, 문서 품질을 자동으로 점검하는 것이다.

생성할 구조:

```txt
templates/
├── resume-template.md
├── jd-analysis-template.md
├── company-values-template.md
├── cover-letter-template.md
├── evidence-map-template.md
├── hr-review-template.md
└── application-package-template.md
tools/
└── validate-skills.mjs
tests/
├── fixtures/
│   ├── resume-new-grad.md
│   ├── resume-experienced.md
│   ├── jd-backend.md
│   └── company-values.md
└── golden/
    ├── cover-letter-new-grad.md
    └── cover-letter-experienced.md
```

`validate-skills.mjs` 검증 항목:

- `skills/*/SKILL.md` 존재 여부
- YAML frontmatter의 `name`, `description` 존재 여부
- 폴더명과 `name` 일치 여부
- 금지 보조 문서 존재 여부
- `description` 최소 길이와 trigger 표현 포함 여부
- `resume.md` 근거 원칙이 `cover-letter-writer`, `hr-reviewer`, `application-packager`에 포함됐는지 여부

완료 기준:

- `node tools/validate-skills.mjs`가 통과한다.
- 템플릿은 실제 사용자 산출물로 바로 복사해 쓸 수 있다.
- fixtures는 신입/경력 두 케이스를 모두 포함한다.

### 11.3 3차 커밋: 핵심 Skill 본문 작성

우선순위는 다음 순서로 둔다.

1. `resume-intake`: `resume.md`를 만드는 시작점이다.
2. `cover-letter-writer`: 프로젝트의 핵심 가치다.
3. `hr-reviewer`: 허위/과장/근거 부족을 줄이는 안전장치다.
4. `jd-analyzer`: 자기소개서와 이력서 맞춤화의 입력 품질을 올린다.
5. `company-values-analyzer`: optional 인재상 입력을 처리한다.
6. `application-packager`: 제출 준비와 지원 이력 관리를 담당한다.

각 Skill의 최소 입출력:

| Skill | 입력 | 출력 |
| --- | --- | --- |
| `resume-intake` | 자유 입력 경험, 신입/경력 여부 | 구조화된 `resume.md` 초안과 추가 질문 |
| `jd-analyzer` | JD URL 또는 텍스트 | `JD Analysis`와 gap 후보 |
| `company-values-analyzer` | optional 인재상 URL 또는 텍스트 | 핵심가치 요약과 연결 가능한 경험 후보 |
| `cover-letter-writer` | 문항, JD, `resume.md`, optional 인재상 | 자기소개서 초안, evidence map, 추가 질문 |
| `hr-reviewer` | 자기소개서/이력서 초안, `resume.md`, JD | HR 리뷰와 수정 제안 |
| `application-packager` | 공고, 최종 자기소개서, 제출 조건 | 회사별 지원 패키지와 체크리스트 |

완료 기준:

- 각 Skill만 읽어도 에이전트가 독립적으로 작업을 수행할 수 있다.
- `cover-letter-writer`는 `resume.md`에 없는 성과를 만들지 말라는 규칙을 명시한다.
- `application-packager`는 최종 제출 버튼을 누르지 않는 정책을 명시한다.
- 모든 출력은 Markdown으로 저장 가능한 구조를 가진다.

### 11.4 4차 커밋: skills.sh 설치 검증

검증은 repo가 public이거나 GitHub 인증이 된 상태에서 수행한다. 현재 private repo에서는 설치 검증이 실패할 수 있으므로, 이 단계에서 공개 repo 전략을 결정한다.

검증 명령:

```bash
npx skills add kyoungbinkim/give-me-job --list
npx skills add kyoungbinkim/give-me-job@resume-intake
npx skills add kyoungbinkim/give-me-job@cover-letter-writer
npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode
npx skills list
npx skills check
npx skills generate-lock
```

검증 기준:

- Skill 목록이 의도한 6개로 나온다.
- 단일 Skill 설치가 된다.
- 프로젝트 설치 후 `.agents/skills/<skill>` 경로가 생성된다.
- Codex, Claude Code, OpenCode 대상 설치 경로가 문서와 일치하는지 확인한다.
- `.skill-lock.json` 생성 여부와 커밋 가능 여부를 확인한다.
- 설치 과정에서 `resume.md`, `applications/`, `jobs/`, `companies/`가 자동 생성되지 않는다.

### 11.5 5차 커밋: 실제 사용 시나리오 테스트

테스트 시나리오는 사람이 읽는 golden test 중심으로 둔다. LLM 출력은 완전 동일 비교가 어렵기 때문에, 구조와 안전 원칙을 중심으로 검증한다.

필수 시나리오:

- 신입 지원자가 프로젝트 경험으로 자기소개서 초안을 만든다.
- 경력 지원자가 기존 성과로 직무 적합 자기소개서 초안을 만든다.
- 인재상 페이지가 없을 때도 JD와 `resume.md`만으로 작성한다.
- 인재상 텍스트가 있을 때 핵심가치를 억지로 베끼지 않고 경험과 연결한다.
- `resume.md`에 없는 성과 수치가 필요한 경우 문장을 만들지 않고 추가 질문을 생성한다.
- 다른 회사명 잔존, 글자 수 초과, 근거 없는 주장, 과장 표현을 HR 리뷰가 잡아낸다.
- 지원 패키지는 최종 제출이 아니라 제출 전 체크리스트까지만 만든다.

완료 기준:

- fixtures 기반으로 최소 2개 자기소개서 예시가 생성된다.
- 각 자기소개서에는 어떤 `resume.md` 경험을 썼는지 evidence map이 있다.
- HR 리뷰가 최소 1개 이상의 약점과 수정 제안을 반환한다.
- 자동 제출 금지 정책이 Skill 출력에 반영된다.

## 12. 첫 구현 작업 순서

바로 다음 작업은 아래 순서로 진행한다.

1. `skills/` 하위 6개 Skill 폴더를 만든다.
2. 각 Skill의 `SKILL.md` frontmatter와 최소 본문을 작성한다.
3. `resume-schema.md`, `cover-letter-rules.md`, `question-types.md`, `package-structure.md` reference를 작성한다.
4. 신입/경력 fixtures와 golden 예시를 만든다.
5. `templates/`에 사용자 산출물 템플릿을 만든다.
6. `tools/validate-skills.mjs`를 만들고 로컬 검증을 통과시킨다.
7. README에 설치 목표와 현재 private repo 한계를 명확히 적는다.
8. 커밋 후 push한다.

첫 구현에서 하지 않을 것:

- 웹 UI 생성
- 자체 `npx give-me-job` CLI 생성
- Codex plugin manifest 생성
- Claude Code subagent 전용 파일 생성
- OpenCode agent 전용 파일 생성
- 채용 사이트 자동 제출
- 브라우저 자동 입력
- DB 또는 서버 구축
