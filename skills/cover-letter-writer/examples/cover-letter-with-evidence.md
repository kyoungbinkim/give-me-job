## Draft

예약 서비스 팀 프로젝트에서 저는 기능 구현보다 먼저 상태가 일관되게 바뀌는 구조를 만드는 데 집중했습니다. 테스트 중 동일 시간대 예약이 여러 사용자에게 다르게 보이는 문제가 반복됐고, 이 문제가 실제 서비스라면 고객 신뢰를 떨어뜨릴 수 있다고 판단했습니다. 저는 예약 상태 전환 규칙을 정리하고 트랜잭션 처리를 보강했으며, 주요 흐름에 대한 API 테스트 12개를 추가했습니다. 그 결과 최종 발표 전 주요 예약 오류 3건을 수정했고, 팀원들이 같은 기준으로 문제를 확인할 수 있었습니다.

이 경험을 통해 백엔드 개발자는 기능을 빠르게 만드는 것뿐 아니라 데이터 일관성과 협업 가능한 기준을 함께 만들어야 한다는 점을 배웠습니다. 귀사의 커머스 API 개발 업무에서도 요구사항을 명확히 나누고, 장애 가능성을 줄이는 방식으로 안정적인 서비스 개선에 기여하겠습니다.

## Evidence Map
- Sentence/Claim: 예약 상태 전환 규칙을 정리하고 트랜잭션 처리를 보강했다.
- Resume Evidence ID: EXP-001
- JD Requirement: REST API design, RDBMS understanding, reliability
- Company Value: customer problem solving, ownership

- Sentence/Claim: API 테스트 12개를 추가하고 주요 예약 오류 3건을 수정했다.
- Resume Evidence ID: EXP-001
- JD Requirement: testing experience, backend quality
- Company Value: learn from operational data

## Follow-Up Questions
- 실제 트랜잭션 설정이나 DB 제약 조건을 더 구체적으로 설명할 수 있나요?
- 최종 발표 이후 사용자의 피드백이나 운영 결과가 있었나요?
