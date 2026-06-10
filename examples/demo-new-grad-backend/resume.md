# Resume Source

## Profile
- Name: Demo Candidate
- Target Roles: Backend Engineer
- Career Type: New Grad

## Experience Bank

### E1. Order API Reliability Project
- Type: Project
- Period: 2025.03-2025.06
- Context: Team project that built a mock order service with Java and Spring Boot.
- Problem: The order creation endpoint produced duplicate orders during repeated client retries.
- Action: Added idempotency keys, transaction boundaries, and integration tests for retry scenarios.
- Result: Duplicate order creation was prevented in the tested retry cases.
- Metrics: 12 integration test cases covered retry and duplicate-submission scenarios.
- Related Competencies: Backend API design, testing, reliability
- Related Job Roles: Backend Engineer
- Evidence Strength: High

### E2. Query Performance Improvement
- Type: Project
- Period: 2025.07
- Context: Product-list API became slow as seed data increased.
- Problem: The service loaded related data inefficiently.
- Action: Compared query logs, added pagination, and adjusted fetch strategy.
- Result: The API response became stable on the local test dataset.
- Metrics: Local test dataset contained 10,000 product rows.
- Related Competencies: SQL, performance analysis
- Related Job Roles: Backend Engineer
- Evidence Strength: Medium
