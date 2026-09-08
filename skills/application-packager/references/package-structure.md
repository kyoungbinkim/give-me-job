# Application Package Structure

Use this layout for each application.

```txt
applications/
└── company-role/
    ├── workflow.md
    ├── state.json
    ├── jd-analysis.md
    ├── company-values.md
    ├── cover-letter-draft.md
    ├── hr-review.md
    ├── cover-letter-final.md
    ├── evidence-map.md
    ├── interview-prep.md
    └── submission-checklist.md
```

## File Purposes

- `jd-analysis.md`: role requirements and inferred evaluation criteria.
- `company-values.md`: optional values/talent-profile summary.
- `cover-letter-draft.md`: draft answers before HR review.
- `hr-review.md`: HR findings for draft and current final text, bound to input hashes.
- `cover-letter-final.md`: final text prepared for user review.
- `evidence-map.md`: mapping from claims to `resume.md` evidence IDs.
- `interview-prep.md`: interview follow-up questions and answer points grounded in evidence.
- `submission-checklist.md`: final manual checklist before submission.
- `state.json`: machine-readable preparation state, review freshness, blockers, and next action.
- `workflow.md`: generated state summary plus manual submission notes.

## Status Values

- `intake`
- `resume-needed`
- `jd-analyzed`
- `drafted`
- `review-blocked`
- `ready-for-user-review`
- `submitted-by-user`
- `paused`

Use `submitted-by-user` only after the user explicitly confirms that they submitted manually.

Recruitment progress belongs to the tracker separately from preparation status.
Only successful ready validation grants `ready-for-user-review`; structure
validation merely confirms a readable package layout. Existing packages without
review metadata need revalidation, with their prose preserved.
