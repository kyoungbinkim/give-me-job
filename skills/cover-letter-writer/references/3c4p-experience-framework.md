# 3C4P Experience Framework

Use 3C4P to decompose a real experience into a sharper cover letter angle. Treat it as a diagnostic tool, not a mandatory final writing template.

## When To Use

Use this reference when:

- the user asks for `3C4P`
- the user asks for a stronger `필살기`
- the experience is real but too broad, adjective-heavy, or weakly structured
- the draft needs clearer customer, problem, action, result, and communication logic

Do not use it to invent missing facts. If an element is not supported by `resume.md` or user-provided context, mark it as missing and ask a follow-up question.

## Critical Guardrails

- 3C4P is useful for decomposing experience, but it is not always appropriate for every story.
- Do not discard a valuable technical or research experience only because one 3C4P element is unclear. Instead, mark the story as weaker for cover letter use and ask for missing context.
- Do not force `Competitor` into a fake competitor. In job applications, it can mean benchmark, reference case, prior solution, alternative tool, peer team, market standard, or investigated example.
- Do not turn all 7 labels into visible headings in the final answer unless the user requests that format.
- The final cover letter should read naturally: problem, action, result, learning, and company contribution.

## 3C

### Customer

Who received the benefit or had the need?

Possible customers:

- first-order customer: actual users, clients, service users
- second-order customer: partner team, another department, company-wide stakeholder
- third-order customer: manager, professor, teammate, reviewer, maintainer

Ask:

- Who needed this work?
- What pain, need, risk, or expectation did they have?
- How did the work change their situation?

### Company

What was the candidate's situation and role?

Capture:

- organization, team, project, or personal context
- team goal, problem, or opportunity
- candidate's role and responsibility
- constraints such as time, tool, data, device, policy, or team size

Ask:

- What was the goal?
- What was the problem or opportunity?
- What exactly did the candidate own?

### Competitor

What was investigated before acting?

In employment writing, this does not need to be a literal competitor. It can be:

- benchmark service
- open-source implementation
- previous internal approach
- peer team's approach
- academic paper or reference architecture
- alternative tool or framework

Capture only:

- what was investigated
- how it was investigated
- what was learned

Put changes made from this investigation under the relevant 4P element.

## 4P

### Product

What was produced and why did it matter?

Use for:

- final result
- product, feature, prototype, document, test, model, recognizer, dashboard, app, or process
- meaning of the result

Ask: `What did this experience produce?`

### Place

Where was the problem found and solved?

Use for:

- problem location
- channel, workflow, touchpoint, system boundary, runtime environment, or integration point
- discovery of the root issue

Ask: `What exact problem point did I find and solve?`

### Price

What cost, time, risk, or effort was reduced?

Use for:

- cost saving
- time saving
- productivity improvement
- reduced manual work
- reduced error, risk, latency, failure, or operational burden

`Price` and `Place` may overlap. Keep both only when they explain different parts of the story.

Ask: `What became cheaper, faster, safer, or easier?`

### Promotion

How was the result communicated, adopted, or made usable?

Use for:

- explanation to stakeholders
- documentation
- guide, test, demo, PR description, dashboard, report, presentation
- reflecting customer or team needs in the final output

Ask: `What did I do so others could understand, use, review, or trust the result?`

## Quantification Prompt

For each 4P element, ask `얼마나?`

- Product: how many features, tests, recognizers, repositories, artifacts, users, or use cases?
- Place: how many workflows, environments, pages, systems, nodes, modules, or failure points?
- Price: how much time, cost, latency, error, failure, manual work, or risk was reduced?
- Promotion: how many docs, demos, reviewers, PRs, stakeholders, teams, or adoption cases?

If the answer is unknown, ask the user. Do not invent numbers.

## Output Shape

Use this compact internal format:

```md
## 3C4P Notes
- Customer:
- Company:
- Competitor:
- Product:
- Place:
- Price:
- Promotion:
- Missing Evidence:
- Best Cover Letter Angle:
```

Then write the final cover letter in natural paragraphs.
