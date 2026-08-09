---
name: jd-analyzer
description: Analyze a job description, hiring post, or recruitment page for role requirements, evaluation criteria, keywords, risks, and resume or cover letter angles. Use when the user provides a JD URL/text, asks what a company is looking for, wants JD-resume gap analysis, or needs inputs for a tailored cover letter. 한국어 요청도 포함합니다 - 채용공고 분석, 공고 분석, JD 분석, 직무기술서 분석, 자격요건, 우대사항, 이 공고 뭘 원하는지, 공고랑 내 경력 비교.
---

# JD Analyzer

Use this skill to convert a hiring post into practical selection criteria.

## Trigger

Use this skill when the user provides a JD URL, pasted hiring post, normalized job record, or hiring notes that need Korean-market role analysis.

## Do Not Trigger

Do not use this skill to draft cover letters, invent missing JD requirements, or analyze company culture pages that are not part of the hiring post.

## Autonomy Level

**DoF: MEDIUM**

Separate deterministic parsing from conservative inference. Label every inferred evaluation criterion as inferred.

Permitted inferences:

- Hidden evaluation criteria that follow directly from explicit duties, tools, seniority, or hiring process language.
- Likely resume evidence categories needed to answer the JD.

Prohibited inferences:

- Do not add requirements absent from the JD or role context.
- Do not treat inferred criteria as explicit facts.

## Input Contract

Required context:

- JD URL, JD text, normalized job record, or hiring-post notes.

Optional context:

- `resume.md` for gap mapping.
- Cover letter questions and length limits.

Required parameters:

- `source`: URL, text, normalized job record, or `unknown`.

Outputs produced:

- `applications/<company-role>/jd-analysis.md`

## Workflow

1. Accept a JD URL, pasted JD text, or mixed notes.
2. Parse deterministic facts only:
   - source URL or source type
   - accessed date when browsing or checking a live posting
   - company
   - role
   - seniority
   - deadline
   - required documents
   - cover letter questions and length limits
3. Analyze explicit requirements and inferred evaluation criteria in separate sections.
4. Gap map the JD against `resume.md` when resume evidence is available.
5. Identify the likely evidence needed from `resume.md`.
6. Mark gaps where the resume evidence appears weak or missing.
7. Keep inference conservative. Label inferred criteria as inferred.

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
