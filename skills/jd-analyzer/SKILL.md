---
name: jd-analyzer
description: Analyze a job description, hiring post, or recruitment page for role requirements, evaluation criteria, keywords, risks, and resume or cover letter angles. Use when the user provides a JD URL/text, asks what a company is looking for, wants JD-resume gap analysis, or needs inputs for a tailored cover letter.
---

# JD Analyzer

Use this skill to convert a hiring post into practical selection criteria.

## Workflow

1. Accept a JD URL, pasted JD text, or mixed notes.
2. Extract the basic facts:
   - source URL or source type
   - accessed date when browsing or checking a live posting
   - company
   - role
   - seniority
   - deadline
   - required documents
   - cover letter questions and length limits
3. Separate explicit requirements from inferred evaluation criteria.
4. Identify the likely evidence needed from `resume.md`.
5. Mark gaps where the resume evidence appears weak or missing.
6. Keep inference conservative. Label inferred criteria as inferred.

## Output

Use this structure:

```md
## JD Analysis
- Company:
- Source:
- Accessed Date:
- Role:
- Career Level:
- Main Responsibilities:
- Must-Have:
- Nice-To-Have:
- Hidden Evaluation Criteria:
- Resume Keywords:
- Cover Letter Angles:
- Risk/Gaps:
- Unknown Or Unverified Fields:
- Questions To Ask:
```

## New Grad vs Experienced

- For new grads, look for learning ability, project relevance, tool familiarity, collaboration, and job motivation.
- For experienced candidates, look for role scope, measurable impact, domain depth, stakeholder work, and repeatable contribution.

## Fallback

If the JD is vague, ask for the target role, company, and any available posting text. Do not create requirements that are not in the JD or reasonably inferable from the role.
