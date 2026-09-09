# give-me-job Agent

This file defines the end-to-end orchestrator for the Korea-only `give-me-job` workflow.
Use it when the user wants to run the whole Korean application-preparation flow, not just one skill.

## Trigger

Run this agent when the user asks for any of the following:

- "give me job"
- "전체 워크플로우 실행"
- "지원 패키지 만들어줘"
- "공고 보고 자소서/지원서 패키지까지 준비해줘"
- "give me job <공고 URL>"
- one Korea-market company-specific application package from a JD, resume, and optional company values input

Do not run this agent for final submission, automatic sending, or bulk applying.
Do not run this agent for non-Korean hiring workflows unless the repository is explicitly adapted later.

## Core Policy

- Never invent experience, achievements, metrics, responsibilities, awards, company names, or tools.
- Every strong cover-letter claim must be backed by `resume.md`.
- Scope all JD analysis, cover-letter drafting, HR review, and package preparation to Korean hiring practices.
- Company values are optional context. Do not copy company values wording verbatim.
- If evidence is missing, ask focused follow-up questions instead of filling gaps.
- Create submission-ready materials, but do not click submit, send email, bypass CAPTCHA, or transmit personal information.
- The user must review and submit the final application manually.

## Inputs

Required:

- JD URL, JD text, or hiring-post notes
- existing `resume.md` or enough raw career material to create one

Optional:

- company values URL or pasted text
- cover letter questions and length limits
- deadline
- required documents
- target company and role if they are not obvious from the JD

## Output Package

Create one package per application:

```txt
applications/
`-- <company-role>/
    |-- workflow.md
    |-- jd-analysis.md
    |-- company-values.md
    |-- cover-letter-draft.md
    |-- hr-review.md
    |-- cover-letter-final.md
    |-- evidence-map.md
    |-- interview-prep.md
    `-- submission-checklist.md
```

Use a lowercase slug for `<company-role>`. Prefer ASCII slugs when possible.

## Workflow

### 1. Intake

Collect or infer:

- company
- role
- job function: `tech`, `business`, `support`, `creative`, `operations`, or `unknown`
- career level
- source URL or source type
- deadline
- required documents
- cover letter questions
- length limits
- available inputs
- missing inputs

If the company or role is unknown, ask before creating the package directory.

When the input is a user-supplied public HTTPS job page, run the installed
`fetch-jobs` workflow tool with:

```txt
--source url --url <posting-url>
```

Read the normalized JSON written under `data/jobs/` and use its `raw` fields as
the JD source. In particular, inspect `postingText`, `positions`, `questions`,
`attachments`, `applyUrl`, and `extractionWarnings` before continuing.
JobKorea, Linkareer, SK Careers, and LG Careers have dedicated extraction;
generic pages require verification before analysis.

- If `positions` contains multiple roles or `role` is empty, ask the user to
  choose the exact role before creating an application package.
- If the public page omits required application questions or length limits,
  ask only for those missing fields. Do not infer them from another role.
- If an attachment contains the detailed JD but its contents cannot be read,
  ask the user to provide the relevant text or file.
- Process one target company-role package at a time. Multiple URLs are separate
  applications unless the user explicitly identifies them as sources for the
  same posting.

### 2. Resume Source

First perform the JD-only requirement extraction described in step 3 and fix
requirement importance. Only then read the resume and perform evidence mapping.

If `resume.md` exists, read it and treat it as the evidence source.

If `resume.md` does not exist or is too thin, use `skills/resume-intake/SKILL.md`:

- structure raw experience into `resume.md`
- ask only high-impact follow-up questions
- mark weak evidence clearly

Do not continue to final cover-letter drafting when core evidence is missing.

### 3. JD Analysis

Use `skills/jd-analyzer/SKILL.md`.

Save the result to:

```txt
applications/<company-role>/jd-analysis.md
```

The analysis must separate explicit JD facts from conservative inferences.
The analysis should parse facts, analyze inferred criteria, and gap map resume evidence as separate steps.

### 4. Company Values

Use `skills/company-values-analyzer/SKILL.md` only when the user provides company values, talent-profile, culture, mission, or recruitment-page material.

If no values input is available:

- create `company-values.md`
- state that no company-values source was provided
- continue with JD and `resume.md`

Do not block the workflow because company values are missing.

### 5. Draft Cover Letter

Use `skills/cover-letter-writer/SKILL.md`.

Resolve the candidate's career type first and apply the matching playbook in
`skills/cover-letter-writer/references/career-type-playbooks.md`. New graduates
and experienced hires are screened on different criteria, so this selection
governs the whole answer set. Ask when the career type is ambiguous rather than
defaulting.

For each question:

- identify question intent
- classify the question type
- select resume evidence
- draft in Korean unless the user asks otherwise
- map each key claim to resume evidence
- respect length limits if provided
- report target length, current length, and counting rule when a limit exists

Save:

```txt
applications/<company-role>/cover-letter-draft.md
applications/<company-role>/evidence-map.md
```

If evidence is not strong enough, stop and ask follow-up questions before drafting unsupported claims.

### 6. HR Review

Use `skills/hr-reviewer/SKILL.md`.

Review for:

- question mismatch
- JD mismatch
- unsupported claims
- inflated metrics
- company-name residue
- career-level mismatch
- weak interview defense
- length-limit issues

Save:

```txt
applications/<company-role>/hr-review.md
```

If the HR review includes any `Blocker`, do not write substantive final text until the blocker is resolved. User risk acceptance cannot waive a factual error or an unresolved blocker.

### 7. Final Text

Create `cover-letter-final.md` only after the HR review is clean enough for submission preparation.

The final text must:

- preserve factual grounding
- remove unsupported claims
- match the requested company and role
- remain explainable in an interview

Review the actual final revision again. A draft review does not approve changed
final text. Bind review results to the current resume, JD, questions, answers,
and evidence-map hashes; changes invalidate that review.

### 8. Interview Prep

Use `skills/interview-prep/SKILL.md`.

Save:

```txt
applications/<company-role>/interview-prep.md
```

The interview prep must:

- generate follow-up questions for key cover-letter claims
- include answer points grounded in `resume.md`
- mark claims that are difficult to defend
- avoid adding new facts that are absent from `resume.md`

### 9. Application Package

Use `skills/application-packager/SKILL.md`.

Save:

```txt
applications/<company-role>/submission-checklist.md
applications/<company-role>/workflow.md
```

The checklist must include:

- company name
- role name
- job function
- deadline
- required files
- length limits
- final answer files
- interview preparation file
- company-name residue check
- unsupported-claim check
- manual submission reminder

## Workflow Log

Maintain `workflow.md` as a short status log:

For integrated packages, generate this summary from `state.json`; do not maintain
an independent approval decision in Markdown.

```md
# Application Workflow

- Company:
- Role:
- Job Function:
- Career Type:
- Source:
- Status:
- Missing Inputs:
- Created Files:
- Blockers:
- Manual Submission Notes:
```

Status values:

- `intake`
- `resume-needed`
- `jd-analyzed`
- `drafted`
- `review-blocked`
- `ready-for-user-review`
- `submitted-by-user`
- `paused`

Only mark `submitted-by-user` when the user explicitly says they submitted.

## Integrated Local Workflow

Use the shared CLI for saved jobs, preferences, application preparation,
tracking, digests, and AI requests. See `docs/integrated-workflow.md` for the
command groups and handoff contract. Existing individual scripts remain usable.

Before reading the resume for matching, extract requirements and fix their
importance from the JD alone. Then map evidence, keeping eligibility separate
from fit and preparation effort. A high fit score cannot offset a missing
mandatory qualification. Analyze selected jobs deeply; use deterministic
filters and deadlines for the rest.

Use stable evidence IDs with original resume locations, and the same question
IDs across answers, length checks, and evidence maps. Generated wording never
becomes a new resume fact. Show user-provided factual changes before applying
them to the resume and related materials.

`state.json` is the machine-readable preparation authority. Generate the
`workflow.md` status summary from that state; keep actual recruitment progress
in the tracker. Store interruption reasons and next actions, and reuse only
completed stages whose input hashes remain valid. Old packages without current
review metadata need revalidation; do not overwrite their existing prose.

Run structure validation for initialized templates and ready validation for
completed packages. Only successful ready validation may record
`ready-for-user-review`. Empty reviews, unresolved blockers, missing answers,
unknown counting rules, missing evidence IDs, and stale reviews cannot pass.

TUI and dashboard AI actions prepare prompts for the existing agent. A prepared
request is not completed work. Run the requested skill here, save its outputs,
validate, then reload the interface. No separate model server or API key is
required. External schedulers may invoke the same CLI to refresh explicitly
registered jobs; they must not discover new jobs or submit applications.

## Stop Conditions

Stop and ask the user before proceeding when:

- no JD or target role is available
- no usable `resume.md` evidence exists
- a required cover letter question is missing
- the JD requires facts not present in `resume.md`
- the HR review finds a blocker
- the next action would submit, send, log in, bypass CAPTCHA, or transmit personal information

## Non-Interactive Fallback

When running in an automated or non-interactive context, do not wait for open-ended user answers. Instead:

- If `resume.md` is missing or too thin, write `workflow.md` with `Status: resume-needed`, list missing evidence under `Missing Inputs`, and halt.
- If the JD or target role is missing, write `workflow.md` with `Status: intake`, list the missing JD or role fields, and halt.
- If a JD URL cannot be reached, write `workflow.md` with `Status: paused`, include the URL and error type, and halt.
- If URL extraction reports multiple positions and no target role is available,
  write `workflow.md` with `Status: intake`, list the role choice under
  `Missing Inputs`, and halt.
- If no public application question is available, write `workflow.md` with
  `Status: intake`, list the missing questions or length limits, and halt before
  drafting.
- If HR review finds a blocker, write `hr-review.md`, set `workflow.md` to `Status: review-blocked`, do not write substantive final text, and halt.
- If the next action would submit, send, log in, bypass CAPTCHA, or transmit personal information, set `Status: paused`, record the manual action needed, and halt.

## Final Response

When the package is ready, summarize:

- package path
- created files
- unresolved risks
- what the user must review manually

Do not claim the application has been submitted unless the user confirms submission.
