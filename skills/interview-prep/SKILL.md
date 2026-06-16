---
name: interview-prep
description: Prepare Korean interview follow-up questions and evidence-backed answer points from resume.md, JD analysis, cover letter text, and an evidence map. Use after HR review or final cover letter drafting when the user wants 면접 준비, 꼬리질문, interview defense, or claim verification before manual submission.
---

# Interview Prep

Use this skill to turn a cover letter package into interview preparation that the applicant can defend from `resume.md` evidence.

## Trigger

Use this skill after `cover-letter-draft.md` or `cover-letter-final.md` exists and an evidence map is available.

Use it when the user asks for 면접 준비, 꼬리질문, 예상 질문, 답변 포인트, or interview defense based on a Korean application package.

## Do Not Trigger

Do not use this skill before JD analysis and resume evidence exist.

Do not invent missing answers, metrics, tools, or company context. If a claim cannot be defended from `resume.md`, mark it as missing evidence.

## Autonomy Level

**DoF: LOW**

Follow the input evidence. Generate questions and answer points only from the JD, cover letter, and `resume.md`. Do not add new achievements or unsupported explanation.

Permitted inferences:

- Likely interviewer follow-up questions from a specific cover-letter claim.
- Risk level from the strength of the mapped resume evidence.

Prohibited inferences:

- Do not infer unlisted tools, metrics, responsibilities, awards, or business impact.
- Do not turn weak evidence into a confident answer point.

## Input Contract

Required context:

- `resume.md`: structured career evidence.
- `applications/<company-role>/jd-analysis.md`: role requirements and evaluation criteria.
- `applications/<company-role>/evidence-map.md`: claim-to-evidence mapping.
- `applications/<company-role>/cover-letter-final.md` or `cover-letter-draft.md`: answer text to defend.

Optional context:

- `applications/<company-role>/hr-review.md`: blocker and warning context.
- `applications/<company-role>/company-values.md`: optional company values context.

Required parameters:

- `company`: target company name.
- `role`: target role title.

Outputs produced:

- `applications/<company-role>/interview-prep.md`

## Workflow

1. Read the cover letter and split it into core claims.
2. Match each claim to `evidence-map.md` and `resume.md`.
3. Generate 2-3 follow-up questions for each core claim.
4. Add verification questions for metrics, tools, role scope, collaboration, failure handling, and JD fit when relevant.
5. Write answer points using only supported evidence.
6. Mark missing or thin evidence clearly.
7. Add a short preparation checklist for manual review before interview.

## Output

```md
## Interview Prep
- Company:
- Role:
- Source Cover Letter:

## Claim Defense
| Claim | Resume Evidence | Follow-Up Questions | Answer Points | Evidence Risk |
| --- | --- | --- | --- | --- |

## Metric And Tool Verification
- Question:
- Evidence To Use:
- Risk:

## JD Fit Questions
- Question:
- Answer Points:
- Resume Evidence:

## Missing Evidence
- Claim:
- Needed Evidence:

## Preparation Checklist
- Review every quantified claim.
- Prepare one concrete example per key claim.
- Do not add facts that are absent from `resume.md`.
```

## Fallback

If required inputs are missing, update `workflow.md` with `Status: paused`, list the missing files under `Missing Inputs`, and halt. In interactive mode, ask for the missing file or text. In non-interactive mode, do not continue.
