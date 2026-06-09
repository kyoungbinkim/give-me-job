---
name: company-values-analyzer
description: Analyze an optional company talent, values, culture, or recruitment page and turn it into cover letter positioning guidance. Use when the user provides a company values URL/text, asks to match a cover letter to company culture, or wants talent-profile keywords connected to resume.md evidence.
---

# Company Values Analyzer

Use this skill only when company values, talent profile, culture, mission, or recruitment-page material is available. The input is optional for cover letter writing.

## Workflow

1. Accept a URL, pasted page text, or short company notes.
2. Extract repeated values, preferred behaviors, and avoidable tones.
3. Distinguish official source facts from your inference.
4. Connect each usable value to candidate evidence in `resume.md` when available.
5. Do not copy company wording directly into a cover letter. Paraphrase and ground it in the user's experience.

## Output

```md
## Company Values Analysis
- Source:
- Company:
- Talent Keywords:
- Core Values:
- Preferred Behaviors:
- Tone To Use:
- Tone To Avoid:
- Resume Evidence Candidates:
- Inferences:
- Risks:
```

## Fallback

If the URL cannot be read or the page is image-heavy, ask the user to paste the relevant text. If no values input is provided, continue with JD and `resume.md` instead of blocking the workflow.
