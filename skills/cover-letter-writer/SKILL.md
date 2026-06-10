---
name: cover-letter-writer
description: Write Korean job application cover letter drafts from a question, JD, resume.md, and optional company values input. Use when the user asks for 자기소개서, 자소서, 지원동기, 입사 후 포부, 필살기, 3C4P experience decomposition, experience-based application answers, or tailored cover letter text grounded in resume.md evidence.
---

# Cover Letter Writer

Write cover letters from evidence, not imagination. Every important claim must be backed by `resume.md`.

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
4. Select the strongest matching `resume.md` evidence IDs.
5. When the user needs a stronger "필살기" or the experience feels vague, decompose the selected evidence with `references/3c4p-experience-framework.md`.
6. If evidence is missing, ask follow-up questions before drafting.
7. Draft in a structure suitable for the user's career type:
   - new grad: motivation, relevant project, learning, contribution
   - experienced: role fit, result, how it was achieved, reusable contribution
8. Produce an evidence map that links key sentences to `resume.md` evidence IDs.
9. Review for unsupported claims, company-name leftovers, vague enthusiasm, and length limit.

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
## Draft

## Evidence Map
- Sentence/Claim:
- Resume Evidence ID:
- JD Requirement:
- Company Value:

## 3C4P Notes
- Customer:
- Company:
- Competitor:
- Product:
- Place:
- Price:
- Promotion:

## Follow-Up Questions
```

## Fallback

If the user has no `resume.md`, use `resume-intake` first. If the question or JD is missing, ask for it before drafting.
