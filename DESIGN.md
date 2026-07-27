# ReviewPilot — Portal UI System

## Context and goals

ReviewPilot must present code-review work with Portal's clean, high-contrast, implementation-first visual language while remaining optimized for developers, dense findings, and multi-step review inputs.

- Product: ReviewPilot
- Visual reference: Portal (`https://useportal.net/`)
- Audience: software developers, engineering teams, and technical decision-makers
- Product surface: responsive developer web application
- Accessibility target: WCAG 2.2 AA

## Design tokens and foundations

### Typography

- `font.family.primary=Inter`
- `font.family.stack=Inter, sans-serif`
- `font.size.xs=10px`
- `font.size.sm=12px`
- `font.size.md=14px`
- `font.size.lg=16px`
- `font.size.xl=18px`
- `font.size.2xl=36px`
- `font.size.3xl=48px`
- `font.weight.base=400`
- `font.weight.emphasis=500`
- `font.lineHeight.base=21.6px`

Components must use this scale. Components must not introduce one-off font sizes.

### Color

- `color.surface.base=#000000`
- `color.surface.raised=#ffffff`
- `color.surface.muted=#f7f7f7`
- `color.text.primary=#ffffff`
- `color.text.onLight=#000000`
- `color.text.tertiary=#0000ee`
- `color.action.primary=#007aff`

Status colors must use semantic `danger`, `warning`, `success`, and their soft-surface counterparts. Components must reference semantic CSS custom properties instead of raw colors.

### Spacing, shape, and motion

- `space.1=4px`
- `space.2=8px`
- `space.3=12px`
- `space.4=16px`
- `space.5=36px`
- `space.6=60px`
- `radius.xs=7px`
- `radius.sm=20px`
- `radius.md=50px`
- `motion.duration.instant=400ms`

Cards must use `radius.sm`. Compact fields must use `radius.xs`. Buttons, badges, toggles, and avatars should use `radius.md`.

Motion must communicate state changes. Motion must be removed or reduced when `prefers-reduced-motion` is enabled.

## Component-level rules

### Navigation

- Navigation must expose Reviews, Rules, and Settings with descriptive labels.
- The current page must use `aria-current="page"` and a visually distinct state.
- Desktop navigation should remain centered in the header.
- Navigation must move to a reachable bottom bar below 900px.
- Keyboard focus must remain visible against both black and white surfaces.

States: default uses secondary text; hover uses a dark muted surface; active uses a white surface; focus-visible uses the primary action ring; disabled must reduce opacity and pointer response; loading and error are not valid navigation states.

### Buttons

- Primary buttons must use black on light surfaces and may use action blue on hover.
- Secondary buttons must use a transparent surface and visible border.
- Icon-only buttons must have an accessible name.
- Loading buttons must set `aria-busy="true"` and retain their label.
- Disabled buttons must remain legible and must not respond to pointer input.
- Touch targets must be at least 44 by 44 CSS pixels.

### Forms

- Every input must have a visible label.
- Placeholder text must not replace labels.
- Default, hover, focus-visible, disabled, loading, and error states must be distinguishable.
- Error feedback must identify the field or request and must not depend on color alone.
- Long repository instructions must remain editable without horizontal overflow.
- ZIP and token controls must clearly state size, privacy, and persistence behavior.

### Source selector

- Paste diff, GitHub URL, and ZIP archive must behave as a tab group.
- The selected source must expose `aria-selected="true"`.
- Selecting a source must preserve applicable review preferences.
- Narrow layouts must stack the three source options without truncating labels.
- Empty states must explain the required input and accepted format.

### Cards and review findings

- Light cards must sit on the black application canvas.
- Review findings must expose severity in text as well as color.
- Finding headers must be native buttons and expose `aria-expanded`.
- Long paths and messages must wrap or truncate without overlapping actions.
- Empty findings must show a concise, non-ambiguous message.
- Dense review content should use spacing tokens rather than one-off compression.

### Modal

- The API-key modal must use `role="dialog"` and `aria-modal="true"`.
- Escape must close the modal.
- Clicking the backdrop should close the modal.
- Focus-visible must remain visible inside the modal.
- Sensitive fields must use password input types and must not expose values in UI copy.

### Rules, Settings, and Profile

- Rule toggles must expose native switch semantics and checked state.
- Settings must provide an explicit save action and saved confirmation.
- Profile fields must clearly distinguish read-only and edit states.
- Empty connected-account states must use descriptive labels such as “Not connected.”
- Responsive layouts must collapse to one column without hiding primary actions.

## Accessibility requirements

- All text and interactive controls must meet WCAG 2.2 AA contrast.
- Every interactive element must be reachable using only Tab and Shift+Tab.
- Every button must activate with Enter and Space.
- Focus-visible indicators must be at least 3 CSS pixels and must not be clipped.
- Touch targets must measure at least 44 by 44 CSS pixels.
- Source tabs must expose `tablist`, `tab`, and `aria-selected` semantics.
- Expandable findings must expose `aria-expanded`.
- The active navigation item must expose `aria-current="page"`.
- Loading review actions must expose `aria-busy="true"`.
- Reduced-motion mode must reduce transitions and animations to effectively instant.
- At 320px width, content must not create page-level horizontal scrolling.

Acceptance checks must be performed using keyboard navigation, browser accessibility inspection, 320px responsive rendering, and automated contrast evaluation.

## Content and tone standards

Copy must be concise, confident, and implementation-focused.

Use:

- “Review this PR”
- “Choose a ZIP file”
- “Add API key”
- “Changes requested”
- “No matching findings”

Do not use:

- “Click here”
- “Submit”
- “Something went wrong” without an actionable explanation
- Unexplained abbreviations in primary actions

Messages should name the object and the next action. Error messages must state what failed and how a developer can correct it.

## Anti-patterns and prohibited implementations

- Components must not use raw color values outside the semantic token layer.
- Components must not hide focus outlines.
- Components must not use placeholder-only form labels.
- Components must not encode severity using color alone.
- Components must not use one-off spacing, typography, radius, or motion values.
- Buttons must not use ambiguous labels.
- Responsive layouts must not hide required navigation or review actions.
- Long paths, rule names, and profile data must not overlap adjacent controls.
- Sensitive API or GitHub tokens must not be persisted outside session storage.

## Migration notes

- The previous dark-only card system is replaced by a black canvas with raised white and muted surfaces.
- DM Mono usage is removed; code content should use the system monospace stack.
- Green accent usage is replaced by semantic action blue.
- Small interface text below `font.size.xs` is prohibited.
- Existing functionality and data flow must remain unchanged during visual migration.

## QA checklist

- [ ] All pages use Inter and the approved type scale.
- [ ] All component colors reference semantic tokens.
- [ ] Every control has default, hover, focus-visible, active, disabled, loading, and error behavior where applicable.
- [ ] Reviews, Rules, Settings, and Profile are keyboard reachable.
- [ ] Diff, GitHub, and ZIP source tabs expose correct ARIA state.
- [ ] API-key modal closes with Escape and has dialog semantics.
- [ ] Findings expose severity text and expansion state.
- [ ] Touch targets are at least 44 by 44 CSS pixels.
- [ ] Reduced-motion preferences are honored.
- [ ] Layouts render without horizontal overflow at 320px, 768px, and desktop widths.
- [ ] TypeScript checks, automated tests, production build, and live smoke tests pass.
