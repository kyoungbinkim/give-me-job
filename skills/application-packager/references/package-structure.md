# Application Package Structure

Use this layout for each application.

```txt
applications/
└── company-role/
    ├── workflow.md
    ├── jd-analysis.md
    ├── company-values.md
    ├── cover-letter-draft.md
    ├── hr-review.md
    ├── cover-letter-final.md
    ├── evidence-map.md
    └── submission-checklist.md
```

## File Purposes

- `jd-analysis.md`: role requirements and inferred evaluation criteria.
- `company-values.md`: optional values/talent-profile summary.
- `cover-letter-draft.md`: draft answers before HR review.
- `hr-review.md`: HR risk review before final text.
- `cover-letter-final.md`: final text prepared for user review.
- `evidence-map.md`: mapping from claims to `resume.md` evidence IDs.
- `submission-checklist.md`: final manual checklist before submission.
- `workflow.md`: package status, missing inputs, blockers, and manual submission notes.

## Status Values

- `interested`
- `drafting`
- `review-needed`
- `ready-to-submit`
- `submitted`
- `paused`
- `rejected`
- `accepted`

Use `submitted` only after the user explicitly confirms that they submitted manually.
