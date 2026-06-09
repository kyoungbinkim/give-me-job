---
name: resume-intake
description: Build or improve a job seeker's resume.md source file from conversational career input. Use when the user wants to create resume.md, organize new-grad or experienced career history, convert raw experiences into STAR/CAR evidence, add missing metrics, or prepare reusable career evidence for cover letters and job applications.
---

# Resume Intake

Use this skill to turn raw career material into a structured `resume.md` that other give-me-job skills can trust.

## Workflow

1. Determine whether the user is `New Grad` or `Experienced`.
2. Read an existing `resume.md` if present. If it does not exist, propose creating one from the schema in `references/resume-schema.md`.
3. Collect raw experiences in the user's language first. Do not force the user to fill every field before making progress.
4. Split the material into evidence units:
   - project, work, internship, activity, education, certificate, award, or personal study
   - one evidence unit per concrete problem, action, and result
5. Convert each evidence unit into STAR or CAR:
   - Situation/Context
   - Task/Problem
   - Action
   - Result
6. Ask follow-up questions only for fields that materially affect cover letter quality:
   - metric, scale, period, role scope, stakeholder, tool, business impact, learning, or failure recovery
7. Mark `Evidence Strength` as `High`, `Medium`, or `Low`.
8. Keep claims factual. Do not invent company names, numbers, responsibilities, awards, or outcomes.

## New Grad Focus

Emphasize project depth, learning speed, role clarity, problem solving, collaboration, and job relevance. If metrics are weak, strengthen the explanation of process, decision making, and learning.

## Experienced Focus

Separate responsibility from achievement. Emphasize role scope, measurable result, business impact, cross-functional work, decision making, and repeatable contribution.

## Output

Return one of these:

- a complete `resume.md` draft
- a patch/update plan for the existing `resume.md`
- focused follow-up questions when evidence is too weak

Use `references/resume-schema.md` for the canonical structure.

## Fallback

If the user gives too little information, ask for 3 short prompts:

- target role
- strongest project or work experience
- one measurable or observable result
