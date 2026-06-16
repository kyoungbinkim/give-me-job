---
name: cover-letter-writer
description: Write Korean job application cover letter drafts from a question, JD, resume.md, and optional company values input. Use when the user asks for 자기소개서, 자소서, 지원동기, 입사 후 포부, 필살기, 3C4P experience decomposition, experience-based application answers, or tailored cover letter text grounded in resume.md evidence.
---

# Cover Letter Writer

Write cover letters from evidence, not imagination. Every important claim must be backed by `resume.md`.

## Trigger

Use this skill after JD analysis and usable `resume.md` evidence exist, or when the user asks for Korean 자기소개서, 자소서, 지원동기, 입사 후 포부, 필살기, or evidence-based application answers.

## Do Not Trigger

Do not use this skill when `resume.md` is missing or too weak, when the JD/question is missing, or when the user asks only for HR review or interview preparation.

## Autonomy Level

**DoF: MEDIUM**

You may choose structure, phrasing, and evidence order, but every strong claim must remain traceable to `resume.md`.

Permitted inferences:

- Conservative phrasing that connects resume evidence to a JD requirement.
- Question type and answer frame from the wording of the question.

Prohibited inferences:

- Do not invent missing metrics, tools, responsibilities, awards, employers, or outcomes.
- Do not imply seniority beyond the resume evidence.

## Input Contract

Required context:

- Cover letter question.
- JD or `applications/<company-role>/jd-analysis.md`.
- `resume.md`.

Optional context:

- `applications/<company-role>/company-values.md`.
- Length limit and counting rule.
- Tone preference or user writing sample.

Required parameters:

- `company`: target company name.
- `role`: target role title.
- `question`: cover letter question.

Outputs produced:

- `applications/<company-role>/cover-letter-draft.md`
- `applications/<company-role>/evidence-map.md`

## Required Inputs

- cover letter question
- JD or job posting
- `resume.md`

## Optional Inputs

- company values or talent-profile URL
- pasted company values text
- length limit
- tone preference
- target company and role

## Workflow

1. Analyze the question intent. Read `references/question-types.md` if needed.
2. Analyze the JD requirements or use an existing JD analysis.
3. If company values are provided, use them as supporting context only.
4. Select the strongest matching `resume.md` evidence references. Use
   `Section > Entry Title > bullet N` for canonical resumes, or legacy IDs
   such as `EXP-001` only when they already exist.
5. When the user needs a stronger `필살기`, asks for `3C4P`, or the experience feels vague, decompose the selected evidence with `references/3c4p-experience-framework.md`.
6. If evidence is missing, ask follow-up questions before drafting.
7. Classify each question before drafting:
   - 경험형: STAR or CAR.
   - 역량형: strength, evidence, role application.
   - 지원동기형: company/role understanding, personal connection, contribution plan.
   - 직무형: role understanding, evidence mapping, growth or contribution plan.
   - 협업/문제해결/가치관/입사후포부: use the matching frame in `references/question-types.md`.
8. Draft in a structure suitable for the user's career type:
   - new grad: motivation, relevant project, learning, contribution
   - experienced: role fit, result, how it was achieved, reusable contribution
9. Apply natural Korean writing rules.
10. Count characters immediately after drafting. Include spaces unless the company or question states otherwise.
11. Target 90-98% of the stated limit when a limit exists.
12. Produce an evidence map that links key sentences to concrete `resume.md`
    evidence references.
13. Review for unsupported claims, company-name leftovers, vague enthusiasm, and length limit.

## Natural Korean Writing Rules

- Prefer concrete actions over abstract claims.
- Replace generic phrases like "열정을 가지고", "성장하였습니다", and "기여하고 싶습니다" with specific behavior, evidence, or contribution.
- Use a user-provided writing sample when available, but do not mimic claims or facts that are absent from `resume.md`.
- Avoid over-polished three-part boilerplate when the question calls for direct experience.
- Keep the tone factual, specific, and interview-defensible.

## Hard Rules

- Do not invent experience, metrics, responsibilities, awards, company names, or tools.
- Do not use a strong claim unless it is supported by `resume.md`.
- Do not copy company values page wording verbatim.
- Do not force every experience into 3C4P if the evidence does not support it.
- Do not make a new grad sound like an experienced hire.
- Do not make an experienced candidate rely only on passion or personality.

Read `references/cover-letter-rules.md` for detailed writing and review rules.
Read `references/3c4p-experience-framework.md` when decomposing an experience into a stronger cover letter angle.

## Output

```md
## Question

## Question Type

## Length Check
- Target Length:
- Current Length:
- Counting Rule:

## Evidence References

## Draft

## Evidence Map
- Sentence/Claim:
- Resume Evidence:
- JD Requirement:
- Company Value:

## Follow-Up Questions
```

Include `3C4P Notes` only when the user asks for 3C4P, asks for a stronger 필살기, or the selected experience needs decomposition before drafting:

```md
## 3C4P Notes
- Customer:
- Company:
- Competitor:
- Product:
- Place:
- Price:
- Promotion:
```

## Fallback

If the user has no `resume.md`, use `resume-intake` first. If the question or JD is missing, ask for it before drafting.
