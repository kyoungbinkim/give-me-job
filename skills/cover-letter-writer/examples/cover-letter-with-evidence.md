## Draft

In the reservation API project, I focused on making state changes predictable
instead of only adding visible features. The team found repeated inconsistency
reports when multiple users tested the same reservation time slot. I defined
reservation state transition rules, applied transaction handling, and added API
tests around creation and status changes. As a result, the team fixed 3 major
reservation bugs before the final demo and kept 12 API tests as repeatable
checks.

This experience taught me that backend work depends on clear rules and
verifiable behavior. In a commerce backend role, I would use the same approach
to clarify requirements, reduce ambiguous edge cases, and improve service
reliability with tests.

## Evidence Map
- Sentence/Claim: Defined reservation state transition rules and applied transaction handling.
- Resume Evidence: Projects > Reservation API Consistency Project > bullet 1
- JD Requirement: REST API design, RDBMS understanding, reliability
- Company Value: customer problem solving, ownership

- Sentence/Claim: Added 12 API tests and fixed 3 major reservation bugs before demo.
- Resume Evidence: Projects > Reservation API Consistency Project > bullet 2
- JD Requirement: testing experience, backend quality
- Company Value: learn from operational data

## Follow-Up Questions
- Which state transition rules changed?
- What database or transaction behavior caused the original inconsistency?
