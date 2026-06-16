# Resume Schema

Canonical structure for `resume.md`. All give-me-job skills read this file
as the source of truth.

## Top-Level Structure

```txt
resume.md
├── Personal Info
├── Target Role
├── Summary
├── Work Experience      (experienced: required / new-grad: if any)
├── Projects             (always required)
├── Education
├── Skills
└── Certificates & Awards (optional)
```

## Metadata

Add this block at the top after each intake session:

```md
<!--
last-updated: YYYY-MM-DD
career-type: new-grad | experienced
target-role: value
intake-version: n
-->
```

Increment `intake-version` when updating an existing `resume.md`. Use `1` for
the first structured intake.

## Personal Info

```md
## Personal Info
- Name: [Full Name]
- Email: [email]
- Phone: [+82-10-xxxx-xxxx or local format]
- LinkedIn: [url]
- GitHub / Portfolio: [url]
- Location: [City, Country]
```

Rules:

- Phone should be international format when applying abroad.
- At least one profile link is required. If missing, ask for it or mark the
  missing field clearly instead of inventing one.

## Target Role

```md
## Target Role
[Role title] at [Company type or specific company]
```

Write `Unknown` when the target is not decided.

## Summary

```md
## Summary
[2-3 sentences. Written last, after all evidence units are complete.]
```

Do not write this section until all work and project evidence units are at
`Medium` strength or above. If any key evidence remains `Low`, leave a short
placeholder such as `Pending stronger evidence.` and ask follow-up questions.

## Work Experience

Experienced candidates require this section. New graduates may omit it when
they have no work, internship, or part-time experience relevant to the target
role.

```md
## Work Experience

### [Job Title] - [Company Name], [City]
*[Month Year] - [Month Year or Present]*
**Team / Org:** [Optional: team name or department]
**Headcount managed:** [Optional: number if applicable]

- [STAR/CAR bullet 1]
- [STAR/CAR bullet 2]
<!-- strength: High -->
```

Rules:

- List roles in reverse chronological order.
- Each bullet is one STAR/CAR unit: action verb, what was done, method or
  scale, and measurable or observable result.
- Use 2-5 bullets per role.
- The strength comment is mandatory and must be `High`, `Medium`, or `Low`.

STAR/CAR bullet format:

```txt
[Action verb] [what you did] [at what scale or with what method],
resulting in [measurable or observable outcome].
```

## Projects

Projects are always required. Include school projects, side projects,
open-source contributions, or portfolio work.

```md
## Projects

### [Project Name]
*[Month Year] - [Month Year] | [Your Role] | [Tech Stack]*
[Optional: link to repo or demo]

- [STAR/CAR bullet]
- [STAR/CAR bullet]
<!-- strength: Medium -->
```

Rules:

- State the candidate's specific role, such as `sole developer`,
  `backend lead`, or `contributor`.
- Do not list a project if there is no concrete action and observable result.
- The strength comment is mandatory and must be `High`, `Medium`, or `Low`.

## Education

```md
## Education

### [Degree Name] - [School Name]
*[Graduation Year or Expected Year]*
- GPA: [X.X / 4.0] (include only if >= 3.5/4.0 or equivalent)
- Thesis / Capstone: [Title, one sentence description]
- Relevant coursework: [Only if directly relevant to target role]
- Honors / Awards: [Dean's list, scholarship, etc.]
```

## Skills

```md
## Skills
- **Programming languages:** [e.g., Python, TypeScript, Java]
- **Frameworks & tools:** [e.g., React, FastAPI, Docker, PostgreSQL]
- **Human languages:** [e.g., Korean (native), English (business)]
```

Rules:

- List only skills the candidate can discuss in an interview.
- Do not rate proficiency with stars, bars, or vague levels.

## Certificates & Awards

```md
## Certificates & Awards
- [Certificate Name], [Issuing Body], [Year]
- [Award Name], [Context / Scope], [Year]
```

Optional. Include only directly relevant or nationally/internationally
recognized items.

## Evidence Strength

Every work and project entry must end with one comment:

```md
<!-- strength: High -->
<!-- strength: Medium -->
<!-- strength: Low -->
```

- `High`: concrete role, action, method or scale, result, and metric are
  present.
- `Medium`: concrete action and observable result are present, but metric or
  scope is weak.
- `Low`: mostly attitude, intent, responsibility, or generic description. Ask
  follow-up questions before using it as a core cover-letter claim.

## Evidence References

The canonical schema does not require stable `EXP-001` IDs. Downstream skills
should reference evidence by section and entry title, plus bullet number when
needed, for example:

```txt
Projects > Reservation API Consistency Project > bullet 1
Work Experience > Backend Engineer - FixturePay > bullet 2
```

If an older resume still contains `EXP-001` IDs, downstream skills may use them
for backward compatibility, but new intake should not create an `Experience
Bank` section.
