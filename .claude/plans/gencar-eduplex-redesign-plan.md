# Gencar — Eduplex-Inspired Redesign Plan (Emerald · Subtle Tint · Full)

**Parent:** `gencar-d1-hono-spa-migrasi-plan.md` (Approved 2026-05-03) — this plan is a **visual layer on top** of the migration. No schema / worker / D1 changes.
**Status:** Draft — awaiting approval. Build mode authorized after sign-off.
**Scope:** `frontend/` only. Single pass across all 4 admin pages + shell. Custom CSS only (no Tailwind/shadcn).
**Reference:** `cf1749b03232343876ebdf35582de80e.jpg` (Eduplex dashboard).

---

## 0. Decisions Locked

| Pick | Choice | Rationale |
|---|---|---|
| **a — Color** | **Keep emerald** (`#065f46`) as primary. Lime/yellow/purple only as **small icon-badge tints + chart**, not brand. | Minimal brand disruption; Turso→D1 users stay oriented. Lime can be introduced later as secondary. |
| **b — Shell** | **Subtle tint**, not full floating. Outer `body` / `.admin-shell` → `#F1F5F9` / `#EEF2F7` (cool gray-blue). Inner cards stay white with slightly stronger shadow. | Reads as elevated without heavy wrapper refactors. Avoids full lavender `#EDE8FF` outer that the reference uses — too playful for an org tool. |
| **c — Scope** | **Full — all 4 admin pages now** (Anggota, Kegiatan, Users, Absensi) + shell. Peserta mobile preview + modal + toolbar included. | Ships a coherent system in one pass; avoids half-adopted aesthetic. |

Change any of these and the token table in §3 shifts.

---

## 1. Context & Reference Breakdown

### 1.1 Current SPA

- `frontend/src/App.tsx` — 558 lines, single file: `AdminShell`, `AnggotaPage` (+ `AddMemberModal` 3-step), `KegiatanAdmin`, `UsersManage`, `AbsensiPage`, `PesertaMobilePreview`.
- `frontend/src/index.css` — 96 lines, custom tokens: `--emerald #065f46`, `--ink #0f172a`, `--muted #64748b`, `--line #e2e8f0`, `--bg #f8fafc`, `--card #fff`, `--radius 16px`. Light shell: white sidebar + white topbar on flat `#f8fafc`.
- No Tailwind/shadcn/component library; inline `style={{}}` used ~40× in `App.tsx`; glyphs `◧▦◉◎⌕✕` for icons.
- `frontend/index.html` — `Plus Jakarta Sans` (brand) + `Inter` (body), `theme-color #065f46`.

### 1.2 Reference (Eduplex) — What It Implies

| Element | Visual | Gencar Mapping |
|---|---|---|
| **Dark sidebar** — heavily rounded, lime pill active, icons, bottom CTA | `#1A1A2E` + lime `#C8E859` | Replaces white `admin-sidebar`; active becomes emerald pill (or `rgba(255,255,255,.10)`) on ink. |
| **Floating white card** on tinted outer bg | White inner panel `~24px` radius + shadow on `#C4B5E8` lavender | → Subtle tint outer `#F1F5F9` + white inner cards with `0 8px 30px rgba(15,23,42,.08)`. |
| **Top row — 3 small metric + promo card** | Circle icon badge (peach/yellow/blue) + Rate + Type | → `Total Anggota / Sambung Hadir / Perantauan / Kegiatan` (KPI row, already 4). Add colored circle badges. |
| **Bar chart** — lime bars, "+3% vs last week" | Compact | Deferred — slot reserved for future kehadiran mingguan chart; no chart now. |
| **Daily Schedule + mini calendar** | Row + `>` + Aug 2023 grid | → `KegiatanAdmin` list + filter chips. |
| **Assignments pills** — In progress / Completed / Upcoming | Pill per row | → `AbsensiPage` pick pills (`Di radius` / `Luar radius`). |

**Shared principles adopted:** every block is a white card `16-20px` radius with soft shadow, generous whitespace, `Inter`/`General Sans`-like rounded sans, emerald as the only saturated accent in shell, small colored circle badges for KPI.

---

## 2. Design Direction — Gencar Interpretation

- **Palette:** emerald stays primary (buttons, active sidebar, `pill-emerald`). Dark sidebar is **ink `#0f172a`** bg. Idle nav = `#94a3b8` (slate-400). Active nav = emerald pill + white text (fallback `rgba(255,255,255,.12)` if emerald-on-ink feels muddy).
- **Shell:** outer tint `#F1F5F9` (outer-bg) → white `admin-main` / `.card` / `.table-wrap` / `.kpi-card` / `.member-card` float via shadow. Topbar stays white with faint `box-shadow` to separate from dark sidebar.
- **Typography:** keep `Inter` + `Plus Jakarta Sans`; no font change.
- **Radius & shadow:** keep `--radius 16px` base; KPI/member cards already `16px`; bump shadow from `0 8px 24px rgba(15,23,42,.06)` to `.08` so white pops on tinted bg. If a "floating shell" variant is desired later, wrap `admin-main` content with an inner `20-24px` radius card.
- **Iconography:** replace glyphs with inline SVG sprite (no new dep) — or optionally `npm i @phosphor-icons/react` if preferred. Scope: sidebar 4 items + search + close + KPI badges. SVGs use `currentColor` so they inherit sidebar/text color.
- **Content:** no new features; restyle existing KPI, toolbar, table, card grid, chips, QR boxes.

---

## 3. Token & CSS Delta

### 3.1 New tokens (`:root` add)

```css
--outer-bg: #F1F5F9;        /* subtle cool tint, alt #EEF2F7 if too warm */
--sidebar-bg: #0f172a;      /* ink */
--sidebar-text: #94a3b8;    /* slate-400 */
--sidebar-active: #065f46;  /* emerald — active pill */
--sidebar-active-alt: rgba(255,255,255,.12); /* fallback if contrast fails */
--shadow-card: 0 8px 24px rgba(15,23,42,.08);
--shadow-topbar: 0 1px 3px rgba(0,0,0,.05);
```

Keep: `--emerald`, `--ink`, `--muted`, `--line`, `--card #fff`, `--radius 16px`.

### 3.2 Shell (`index.css` — ~40 lines changed)

```css
.admin-shell { background: var(--outer-bg); }
.admin-topbar { background: #fff; box-shadow: var(--shadow-topbar); }
.admin-sidebar { background: var(--sidebar-bg); border-right: none; }
.admin-sidebar button { color: var(--sidebar-text); }
.admin-sidebar button:hover { background: rgba(255,255,255,.06); color: #e2e8f0; }
.admin-sidebar .active { background: var(--sidebar-active); color: #fff; }
.admin-sidebar .muted { color: #64748b; opacity: .85; } /* singleton note */
.card, .table-wrap, .kpi-card, .member-card { box-shadow: var(--shadow-card); }
```

Responsive `@max-width: 900px`: horizontal sidebar row **stays dark** (`background: var(--sidebar-bg)`), `border-bottom: none`, `overflow-x: auto`, scrollbar hidden.

### 3.3 New utility

```css
.kpi-icon { width: 36px; height: 36px; border-radius: 999px; display: grid; place-items: center; font-size: 16px; }
.kpi-icon--emerald { background: #d1fae5; color: #065f46; }
.kpi-icon--amber   { background: #fef3c7; color: #92400e; }
.kpi-icon--peach   { background: #ffe4e6; color: #9f1239; }
.kpi-icon--slate   { background: #f1f5f9; color: #475569; }
[disabled] { opacity: .5; cursor: not-allowed; } /* hierarchy-disabled buttons */
```

---

## 4. Per-Page Changes (Full Scope)

| Page | Current | After |
|---|---|---|
| **AdminShell** | White sidebar, white topbar, flat bg | Dark ink sidebar, emerald active, subtle tint outer, white topbar with faint shadow. Icon glyphs → SVG. Singleton note restyled as muted block. |
| **Anggota — KPI** | 4 white cards, label + `strong 22px` | Same 4 cards + **colored circle badge** per KPI (emerald/amber/peach/slate tints matching reference top row). Shadow bump so they float. |
| **Anggota — toolbar** | `flex wrap` search + desa select + view toggle + `+ Tambah` | No layout change; ensure `search` stays white on tinted bg; `view-toggle .on` (`var(--ink)`) already pairs with dark sidebar. |
| **Anggota — table / card grid** | `.table-wrap` + `table.admin-table` + `.cards-grid 3-col` | White cards pop via shadow; avatar `#e2e8f0` unchanged; `pill-emerald/amber/slate` unchanged. Disabled-state style added. |
| **Anggota — AddMemberModal** | 3-step wizard, stepper dots emerald | Unchanged except modal shadow already fine; backdrop `rgba(15,23,42,.45)` stays. Add `role="dialog"` if touching modal markup. |
| **Kegiatan** | Chip filter bar + `card` per kegiatan (pills + title + meta) + create modal | Card radius stays `16px`; `pill-emerald` for `sambung_rutin` keeps emerald story; `canCreate` warning `pill-amber` unchanged. Slight padding polish. |
| **Users** | Info `.card` + `table.admin-table` + `+ Tambah Admin` | Same table treatment; hierarchy-disabled buttons now visibly disabled via `[disabled]` rule; info card shadow bump. |
| **Absensi** | `card` with 3 chips + 2 buttons + 3× `qr-box` dashed + conditional pick card (`emerald`/`red` pills) | `qr-box` stays white dashed inside `.card`; pick card border green `#10b981` / red `#fecaca` unchanged; level chips (`var(--ink)` active) unchanged. |
| **PesertaMobilePreview** | `shell 480px` + `topbar` + chips + card list / QR | No change — keep as preview block. Border `1px var(--line)` already contrasts on tinted outer. |

No new routes, no state/logic changes. `document.getElementById` in `KegiatanAdmin` save handler is kept (out of scope for this pass).

---

## 5. File Map

| File | Change | Size |
|---|---|---|
| `frontend/src/index.css` | **Primary** — tokens + shell + shadow + `kpi-icon` + `[disabled]` + responsive dark row | ~+25 lines, ~40 lines edited |
| `frontend/src/App.tsx` | **Light** — replace glyphs, add `<span class="kpi-icon kpi-icon--*">` per KPI, remove a few inline `style` blocks in `AdminShell` | ~20 lines edited |
| `frontend/src/main.tsx` | No change | — |
| `frontend/index.html` | No change (`theme-color` stays emerald) | — |
| `frontend/package.json` / `vite.config.ts` | Only if adding `@phosphor-icons/react` — otherwise no change (inline SVG) | — |
| `shared/*`, `worker/*`, `wrangler.toml`, `drizzle.config.ts` | **No change** | — |

Single-file `App.tsx` stays unsplit for this pass (keeps diff small); split into `components/` is deferred.

---

## 6. Build Steps (Ordered)

1. **Tokens + shell** — edit `index.css` `:root` + `.admin-shell/.admin-topbar/.admin-sidebar` + add `--outer-bg`/`--sidebar-*`/`--shadow-*`. Verify `vite dev` at `5173` — desktop `1280px`, tablet `900px`, mobile `480px`.
2. **Icons** — swap glyphs (`◧▦◉◎⌕✕`) for inline SVG (or `phosphor`) in `AdminShell` nav (4 items) + search magnifier + modal close `✕`. Use `currentColor` so dark/light inherit correctly.
3. **KPI badges** — add `.kpi-icon` + 4 variants; wire per-KPI tint in `AnggotaPage` (`Total` emerald, `Aktif` slate, `Pending` amber, `Perantauan` peach).
4. **Fine-tune remaining pages** — apply shadow bump + `[disabled]` + chip radius polish (if needed) across Kegiatan/Users/Absensi. No layout moves.
5. **Responsive QA** — collapsed sidebar row stays dark at `900px`; `480px` padding intact; no horizontal overflow.
6. **Design QA** — side-by-side compare to Eduplex reference: sidebar contrast, card float, pill/chip rounding, shadow softness. Tune `--outer-bg` between `#F1F5F9` ↔ `#EEF2F7` if too stark/too flat.

---

## 7. Verification

- **Visual:** desktop `1280px` — dark sidebar, emerald active pill, KPI badges colored, white cards floating on tinted bg, pills consistent. Tablet `900px` — sidebar row stays dark, no white flash. Mobile `480px` — `admin-main 12px` padding, stacked KPI `2-col`, card grid `1-col`.
- **Functional (no regression):** role selector still scopes (`admin_daerah` all / `admin_desa` Desa Fajar / `admin_kelompok` Fajar C), filter chips, search `q`, `view` toggle, modal backdrop `stopPropagation`, `sambungJudulTemplate` hint, `haversineM` GPS distance + `Di radius`/`Luar radius` pills.
- **Build:** `npm run build` in `frontend/` still passes (`tsc -b && vite build`); `frontend/dist` → `wrangler.toml [assets]` unchanged; no new dep required unless Phosphor is opted in.

---

## 8. Risks & Alternatives

- **Emerald-on-ink contrast** — `#065f46` on `#0f172a` can read muted. Fallback is `rgba(255,255,255,.12)` active bg with white text — swap one line in `index.css`.
- **Outer tint too subtle / too stark** — `F1F5F9` may be imperceptible on some monitors; `EEF2F7` is slightly cooler. One-token tweak.
- **Single-file `App.tsx`** — staying unsplit keeps this pass reviewable; splitting into `components/AdminShell.tsx`, `pages/AnggotaPage.tsx`, etc. is a follow-up and not required for visual QA.
- **No Tailwind** — intentional; keeps the 96-line custom system intact. Adopting Tailwind would be a separate migration.

---

## 9. Acceptance

- [ ] Desktop sidebar dark ink, emerald (or fallback white-12) active, muted idle, hover `white 6%`
- [ ] Outer bg subtle tint `#F1F5F9`/`#EEF2F7`, white cards visibly elevated (shadow `.08`)
- [ ] KPI row — 4 cards each with colored circle badge (emerald/amber/peach/slate)
- [ ] All 4 admin pages: Anggota (KPI+table/card), Kegiatan (chips+cards+modal), Users (table+disabled states), Absensi (QR+pick pills) — no visual regression
- [ ] Responsive `900px` + `480px` — dark sidebar row persists, no overflow, padding correct
- [ ] Icons SVG-based, `currentColor`, no glyph fallback
- [ ] `vite build` passes; `localhost:5173` matches direction; no schema/worker/D1 changes
