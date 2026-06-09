---
name: application-packager
description: Create a company-specific job application package from a JD, resume.md, cover letter drafts, HR review, and optional company values input. Use when the user wants 지원 패키지, submission checklist, application folder structure, final answer snippets, email draft support, or safe pre-submission preparation without automatic final submission.
---

# Application Packager

Create submission-ready materials, but do not submit applications automatically.

## Inputs

- company name
- role name
- JD or JD analysis
- `resume.md`
- cover letter draft or final
- optional company values analysis
- deadline, file requirements, and length limits if available

## Workflow

1. Normalize the application slug as `company-role`.
2. Create or propose the package structure from `references/package-structure.md`.
3. Save JD analysis, company values analysis, cover letter draft/final, evidence map, and checklist.
4. Check company name, role name, file names, length limits, and required attachments.
5. Prepare manual submission snippets or email draft text when requested.
6. Record submission status only after the user confirms what happened.

## Hard Rules

- Do not click or trigger a final submit/send action.
- Do not bypass CAPTCHA, login, payment, consent, or sensitive personal information prompts.
- Do not create unsupported claims that are absent from `resume.md`.
- Do not auto-create user data during skill installation. Create files only when the user asks during a task.

## Output

```md
## Application Package
- Company:
- Role:
- Deadline:
- Package Path:
- Included Files:
- Missing Inputs:
- Submission Checklist:
- Manual Submission Notes:
```

## Fallback

If final cover letter text is not ready, call for `cover-letter-writer` and `hr-reviewer` work before packaging.
