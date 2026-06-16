## Interview Prep
- Company: LG전자
- Role: Backend Engineer
- Source Cover Letter: cover-letter-final.md

## Claim Defense

| Claim | Evidence ID | Follow-Up Questions | Answer Points | Evidence Risk |
| --- | --- | --- | --- | --- |
| 고객 최우선과 혁신, 팀워크와 자율적 실행을 API 신뢰성 개선 경험과 연결했다. | E1 | 고객 최우선을 왜 주문 API 신뢰성 문제와 연결했나요? 팀워크와 자율적 실행은 프로젝트에서 어떻게 드러났나요? | 반복 요청으로 생기는 오류가 사용자 경험에 영향을 줄 수 있다고 보고, 팀 프로젝트 안에서 문제를 발견해 테스트 가능한 개선으로 연결했다. | Medium |
| 주문 API 중복 생성 문제를 발견하고 idempotency key와 트랜잭션 경계를 정리했다. | E1 | 왜 idempotency key를 선택했나요? 트랜잭션 경계는 어떤 기준으로 조정했나요? | 클라이언트 재시도로 같은 주문이 반복 저장될 수 있었고, 단순 예외 처리보다 요청 단위의 안전성이 필요하다고 판단했다. | Low |
| 재시도와 중복 제출 상황을 검증하는 통합 테스트 12개를 추가했다. | E1 | 12개 테스트는 어떤 케이스를 나눴나요? 실패 케이스를 어떻게 재현했나요? | 정상 요청, 재시도, 중복 제출 상황을 나누어 API 결과가 흔들리지 않는지 검증했다. | Low |
| 상품 목록 API에서 쿼리 로그, 페이지네이션, fetch 전략을 조정하며 10,000건 로컬 데이터 조회 흐름을 점검했다. | E2 | 쿼리 로그에서 어떤 비효율을 봤나요? 10,000건 데이터는 실서비스 데이터인가요? | 로컬 테스트 데이터였음을 명확히 말하고, 쿼리 로그 비교와 조회 흐름 점검에 집중해 설명한다. | Medium |

## Metric And Tool Verification
- Question: 통합 테스트 12개와 10,000건 데이터 수치는 어디에서 나온 건가요?
- Evidence To Use: resume.md E1, E2
- Risk: Low for count accuracy, medium for business impact because both are project/local test metrics.

## JD Fit Questions
- Question: 이 경험이 LG전자 인재상과 백엔드 직무의 안정성 요구에 어떻게 연결되나요?
- Answer Points: 반복 요청과 데이터 증가 상황을 가정하고, 코드 변경과 테스트 근거를 함께 남긴 경험으로 연결한다.
- Resume Evidence ID: E1, E2

## Missing Evidence
- Claim: LG전자 특정 제품 또는 팀 맥락
- Needed Evidence: Real LG전자 posting, product/team context, or role-specific hiring notes

## Preparation Checklist
- Review every quantified claim.
- Prepare one concrete example per key claim.
- Do not add facts that are absent from `resume.md`.
