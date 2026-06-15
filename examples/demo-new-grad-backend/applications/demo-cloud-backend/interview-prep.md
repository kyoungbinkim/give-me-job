## Interview Prep
- Company: Demo Cloud
- Role: Backend Engineer
- Source Cover Letter: cover-letter-final.md

## Claim Defense

| Claim | Evidence ID | Follow-Up Questions | Answer Points | Evidence Risk |
| --- | --- | --- | --- | --- |
| 주문 API 중복 생성 문제를 발견하고 idempotency key와 트랜잭션 경계를 정리했다. | E1 | 왜 idempotency key가 필요했나요? 트랜잭션 경계는 어디에서 조정했나요? | 클라이언트 재시도로 같은 주문이 반복 저장될 수 있었고, 요청 자체를 안전하게 만드는 방향으로 해결했다. | Low |
| 재시도와 중복 제출 상황을 검증하는 통합 테스트 12개를 추가했다. | E1 | 어떤 케이스를 테스트했나요? 12개라는 수치는 어디서 확인할 수 있나요? | 재시도, 중복 제출, 정상 요청 흐름을 나누어 검증했다. 수치는 resume.md E1 근거를 사용한다. | Low |
| 상품 목록 API에서 쿼리 로그, 페이지네이션, fetch 전략을 점검했다. | E2 | 쿼리 로그에서 무엇을 봤나요? 데이터가 늘어날 때 어떤 문제가 있었나요? | 상품 목록 조회에서 쿼리 로그를 비교하며 페이지네이션과 fetch 전략을 조정했다. | Medium |

## Metric And Tool Verification
- Question: 통합 테스트 12개는 어떤 기준으로 세었나요?
- Evidence To Use: resume.md E1
- Risk: Low

## JD Fit Questions
- Question: 이 경험이 Demo Cloud의 API reliability 요구와 어떻게 연결되나요?
- Answer Points: 실패와 재시도 상황까지 고려해 API 동작을 검증한 경험을 강조한다.
- Resume Evidence ID: E1

## Missing Evidence
- Claim: Demo Cloud 고유 제품이나 조직 맥락
- Needed Evidence: 실제 회사 가치, 제품, 또는 채용 페이지 자료

## Preparation Checklist
- Review every quantified claim.
- Prepare one concrete example per key claim.
- Do not add facts that are absent from `resume.md`.
