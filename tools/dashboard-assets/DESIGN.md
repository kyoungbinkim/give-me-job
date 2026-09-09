# Local hiring workspace

## Research and scope
Operational dashboard for Korean applicants using an existing agent. References: frontend design/perfection router, taste-skill and Notion reference. Content-first warm neutral document layout, native controls, one blue accent. User's explicit dependency-free HTML/CSS/JavaScript constraint takes precedence over reference framework and image-generation recommendations. No marketing imagery or external assets.

## Tokens and layout
White surface; warm background #f6f5f4; text #242320; secondary #615d59; border #d7d3ce; accent #075ca8; error #a12822. System Korean fonts (Malgun Gothic, Apple SD Gothic Neo, sans-serif). Type 14/16/20/28 px, line height 1.6. Spacing 4/8/12/16/24/32 px. Borders-only depth. Inputs and buttons radius 4 px. Maximum main width 1200 px. Navigation 208 px, detail panel flexible. At 768 px navigation wraps horizontally and content stacks.

## Primitives and states
Native buttons, labeled inputs, textarea and select form fields; visible blue focus outline; blue active navigation; disabled controls while loading. Bordered job rows open readable details. Structured results use definition lists and nested sections; source text uses wrapped preformatted text. Error and loading feedback is announced through a live status region. Empty screens explain the next available action.

## Content and accessibility
Today → jobs → packages → tracker → profile → AI requests follows the applicant's workflow. No implied AI completion: requests remain prepared. Keyboard Tab/Enter for every web action. No fixed-width CJK table cells. Korean word-break keep-all with overflow-wrap anywhere for URLs. No animations, external font requests or executable Markdown. Mobile controls minimum 44 px. Review debt must be reported with actual evidence; no unmeasured Lighthouse score is claimed.

## Terminal surface
The TUI uses the same workflow order in five labeled groups: today, postings, applications, process, and settings. At 72 columns and wider it uses a compact navigation rail with a task preview; narrower terminals use a single stacked column. The header always shows live counts for postings, review work, and upcoming stages. Results are rendered as labeled summaries and rows instead of raw JSON.

Use terminal-native emphasis only: bold text, inverse selection, and one blue ANSI accent when color is available. Respect `NO_COLOR`. Keep every rendered line within the reported terminal width and calculate Korean and emoji grapheme widths before clipping or padding. Do not rely on box-drawing glyphs for structure.

Arrow keys move through menus and form fields. Left/right changes a select, Space toggles a checkbox, Enter edits or accepts a field, `s` runs a form, Escape moves back, and `q` exits from navigation or results. The footer must show only the keys available in the current context. Empty results state the next useful action.
