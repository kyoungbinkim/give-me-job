# Demo: New Grad Backend Application

This demo shows the expected package shape for a Korean new-grad backend application.

Inputs:

- `resume.md`: fictional resume evidence
- `jd.md`: fictional backend JD

Generated package:

- `applications/demo-cloud-backend/`

Useful output files:

- `cover-letter-final.md`: final Korean cover-letter answer draft
- `evidence-map.md`: claim-to-evidence mapping
- `hr-review.md`: blocker and risk review
- `interview-prep.md`: interview follow-up questions and answer points
- `submission-checklist.md`: manual review checklist

Try the same flow locally:

```bash
cp examples/demo-new-grad-backend/resume.md resume.md
cp examples/demo-new-grad-backend/jd.md jd.md
node tools/init-application.mjs --company demo-cloud --role backend
```

Then ask your coding agent:

```txt
Read agent.md and prepare the full Korean application package in applications/demo-cloud-backend.
Use resume.md as the only evidence source and jd.md as the job description.
Do not submit anything.
```

The demo is intentionally small. It exists to verify package structure, evidence mapping, HR review, interview defense, and manual submission policy.
