# Gencar Admin - Design Review Report

**Mode:** review
**Date:** 2026-08-21
**Register:** Product (dashboard / ops tool)
**Surface:** `frontend/src/App.tsx`, `frontend/src/index.css`
**Verdict:** Needs changes

## First Impression

Dark floating sidebar with a lime `#c5f54c` accent on a light slate canvas reads as a deliberate, authored choice, not a template default. The four-page admin shell (Anggota, Kegiatan, User, Absensi) has a clear information architecture: page headers give each surface a named job, and the KPI row answers "how are we doing" before the table asks "who are they". It is a credible product dashboard, not a dressed-up landing page. What it lacks is a point of view beyond the accent color: the sidebar is the only element with real character, and every content surface uses the same white-card-on-gray formula.

## Experience Walkthrough (primary flow: manage Anggota)

1. Arrive at Anggota. Page header names the job, KPI row states the totals, toolbar offers search, filter, and view toggle.
2. Search narrows the list. The table keeps its shape; no loading state appears, so on real data the user stares at a blank table while the fetch resolves.
3. "Tambah Anggota" opens a modal. A stepper shows progress. Fields are labeled above inputs, which is correct. The `✕` close is an icon-only button with no accessible name.
4. Save flow ends with "Simpan & Generate Magic 30m". The term "Magic 30m" appears with no explanation anywhere on the surface. The user cannot know what this button does.
5. The table's row actions repeat "Nonaktifkan/Aktifkan" and "Magic 30m" for every row with no confirm on an irreversible-looking state toggle.

The story holds together until step 3-4, where the modal's unnamed close control and the unexplained "Magic 30m" action break trust.

## Heuristic Scores

| # | Heuristic | Score | Key Finding |
|---|---|---|---|
| 1 | First impression | 7/10 | Authored shell, but no voice beyond the accent |
| 2 | Hierarchy | 7/10 | Page headers + KPI + table is a sound scan path |
| 3 | Color voice | 6/10 | Lime accent carries state and action, but it is the only color decision |
| 4 | Type voice | 6/10 | Plus Jakarta Sans for headers, Inter for body; workmanlike, not authored |
| 5 | Interaction feel | 5/10 | Missing focus rings, unnamed icon button, unexplained action |
| **Total** | | **31/50** | Middle: focused interventions, not a rethink |

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Accessibility | `frontend/src/index.css:393-421` | `.admin-sidebar a, .admin-sidebar button` define hover/active but no `:focus-visible` rule anywhere in the file | Add a visible focus ring (2-3px, offset, 3:1 contrast) for sidebar, chips, buttons, inputs, search | Tab can land on nav, chips, and buttons with nothing visible to show it landed. Escalation trigger. |
| 2 | HIGH | Accessibility | `frontend/src/App.tsx:248, 379` | `<button className="btn btn-ghost btn-sm" onClick={onClose}><IcoX /></button>` icon-only, no aria-label | Add `aria-label="Tutup"` (and `aria-label="Tutup modal"` for the Kegiatan modal) | A user can operate this control and it never says what it is. Escalation trigger. |
| 3 | MEDIUM | Interaction | `frontend/src/App.tsx:195, 219, 322` | "Magic 30m" action on table rows, member cards, and the save button with no definition anywhere | Rename to the concrete action, e.g. "Buat Kartu QR" / "Generate QR", or add a helper line under the header defining it | An action the operator cannot interpret is a guess; naming the artifact (the QR card) makes the button trustworthy |
| 4 | MEDIUM | Writing | `frontend/src/App.tsx:358` | `<span className="muted">Role {role} {role === "admin_kelompok" ? "hanya buat tingkat kelompok" : ...}</span>` inline role explanation floating in the filter row | Move the permission note into the page-header-sub or drop it; filters should only carry filter state | The toolbar mixes a filter control with a permission explainer, splitting attention |
| 5 | MEDIUM | Layout | `frontend/src/App.tsx:361-372` | Kegiatan list = stacked `.card` rows, each with `border-bottom` hairline via `.card` + list gap | Group into 2-col grid on desktop or use a single table with sparse dividers | Row-on-row card stacking with hairlines is the spec-sheet default the skill bans |
| 6 | MEDIUM | Accessibility | `frontend/src/App.tsx:539` | `<button className="card" ...>` a `.card` (bordered, shadowed container) nested inside another `.card` (line 531) | Flatten: use a plain row with `border-bottom`, or an `li` with padding, not a second card | Card-in-card is never right; also a button that looks like a card hides its affordance |
| 7 | MEDIUM | Layout | `frontend/src/index.css:344-351` | `.admin-shell { height: 100dvh; overflow: hidden }` | `min-height: 100dvh` and let `.admin-main` scroll; remove `overflow: hidden` | At 200% zoom or small viewports, fixed height + hidden overflow clips content. Escalation-adjacent. |
| 8 | LOW | Type | `frontend/src/App.tsx:150-153` | KPI cards use inline `style={{ display: "flex", gap: 12, alignItems: "center" }}` per card, repeated 4x | Promote to a `.kpi-card` flex layout in CSS (one line, all cards) | Consistency token: the layout decision lives in 4 inline styles instead of the component class |
| 9 | LOW | Color | `frontend/src/App.tsx:539` | In-radius state shown as `borderColor: "#10b981"` / `"#fecaca"` on the picker rows | Keep the pill label ("Di radius"/"Luar radius") which already exists, so the border is redundant decoration | Color alone must never carry state; here the pill already carries it, so the border is noise |

## Considered but Rejected

| Location | Candidate | Rejected because |
|---|---|---|
| `App.tsx:5-46` | Replace hand-rolled inline SVG icons with a library | The project already ships no icon dependency; the six hand-drawn paths are consistent (same 24px viewBox, 1.8 stroke) and match the skill's "simple geometric mark" allowance |
| `index.css` | Add dark mode | This is a product ops surface with a fixed light register; the brand reference (lime on dark navy) is already the sidebar. Dark mode adds cost with no operator demand |
| `App.tsx:231-329` | Restructure the 3-step modal into a single form | The stepper is the right artifact for a multi-field member intake; splitting identity, domisili, and summary is a sound dependency order |
| `App.tsx:556-557` | Add a role switcher back to the topbar | The user explicitly removed it; role is fixed to `admin_kelompok` in the demo and the sidebar is the right home for scope |

## Verification

**Ran:**
- `npx tsc -b --noEmit` in `frontend/` - passes clean
- Grep for `&mdash;` / `—` across `App.tsx` - zero em-dashes
- Read `App.tsx` (570 lines) and `index.css` (923 lines) in full
- Grep `admin-topbar` in `index.css` - dead rules removed in prior pass

**Not verified:**
- Rendered browser behavior at 320px / 200% zoom (no browser session in this environment; finding 7 is inferred from `overflow: hidden` + `height: 100dvh` source, flagged as such)
- Keyboard walk of the modal flow (focus trap/restore not implemented; findings 1-2 are source-evident)

## Verdict

**Needs changes.** No `Block`-level design failure, but two accessibility escalation triggers stand (missing focus-visible, unnamed icon-only close) plus a medium cluster of interaction, layout, and writing issues. The 31/50 sits at "focused interventions" - the shell direction is right and should not be rethought.

**Next modes, in order of impact:**
1. `/design a11y` - focus rings, aria-labels on icon buttons, modal focus handling
2. `/design refine` - Kegiatan list regroup, flatten card-in-card, promote KPI layout to CSS
3. `/design interaction` - rename "Magic 30m", add loading/empty/error states to the table flow
4. `/design writing` - move the role permission note out of the filter row
