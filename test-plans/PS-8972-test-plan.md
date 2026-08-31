# PS-8972 — Test Plan

**Story:** [PS-8972](https://plansight.atlassian.net/browse/PS-8972) — Presentation Editor — Anchor Cell Comments to the Quote, Not the Grid Position  
**Test plan ticket:** [PS-9332](https://plansight.atlassian.net/browse/PS-9332)  
**Branch under test:** `PS-8972-cell-anchor` (Bitbucket `plansight/plansight`)  
**Author:** Boyd Ivey  
**Date:** 2026-08-28

---

## 1. Objective

Verify that presentation editor cell annotations (typed notes and cell overrides) **follow the quote, plan group, or carrier row they belong to** when quotes are added, removed, or reordered — and that the same placement appears in **PDF** and **Excel** exports.

Verify **backward compatibility**: presentations saved before this change open unchanged; re-saving upgrades annotations to anchor-based storage.

---

## 2. Scope

### In scope

| Area | Coverage |
|------|----------|
| Market Response page | Notes cell on carrier rows |
| Comparison grid (Medical, Dental, Vision) | Cell edits on quote columns |
| Legacy presentations | Open without regression; upgrade-on-save |
| Quote add / remove / reorder | Annotation follows identity |
| PDF export | Matches editor |
| Excel export | Matches editor; hidden rows still hide |
| Editor regression | Borders, row selection, navigator, hidden rows, row theme |
| Sticky notes & shapes | Unchanged (out of feature scope) |
| Multi-page grids | Annotation on page 2+ survives reorder |

### Out of scope

- Contribution, elections, and ACA pages (file follow-up if same defect appears)
- Sticky notes and free-floating shapes
- Database migration (none expected)
- Making carrier notes first-class RFP data (future card)

---

## 3. Environment & build

| Item | Value |
|------|-------|
| Recommended env | Local dev or stage with branch `PS-8972-cell-anchor` deployed |
| Base branch | `master` @ `83184c9dba` (or later) |
| Browser | Chrome (primary), Edge (spot check) |
| Automated coverage (dev) | `tests/js-anchor`, `tests/Unit/PresentationCellAnchorTest.php` — all green on branch |

---

## 4. Test data setup

### Required fixtures

1. **RFP A — reorder scenario**
   - At least **two carriers** quoting the same benefit type (for Market Response)
   - At least one **Medical plan group** with **two or more quotes**
   - Saved **presentation P1** containing:
     - Market Response page
     - Medical comparison grid page

2. **RFP B — legacy scenario**
   - **Presentation P0** saved **before** `PS-8972-cell-anchor` is deployed
   - Must contain at least one cell annotation (note or override)
   - Keep a screenshot of annotation placement before testing

3. **Optional — multi-page grid**
   - Medical grid long enough to **paginate** (page 2 exists)

### Recognisable test strings

Use unique strings per scenario so misplacement is obvious:

| Token | Use |
|-------|-----|
| `CARRIER-NOTE-A` | Market Response note |
| `GRID-MED-Q2-EE` | Medical grid, quote column 2 |
| `GRID-DENTAL-Q1` | Dental grid |
| `GRID-VISION-Q1` | Vision grid |
| `LEGACY-KEEP` | Pre-change presentation |

---

## 5. Acceptance criteria mapping

| AC # | Acceptance criterion | Test case(s) |
|------|---------------------|--------------|
| AC-1 | Market Response note stays on same carrier after add/reorder | TC-1 |
| AC-2 | Grid cell edit stays on same quote after add/remove/reorder (Med/Dental/Vision) | TC-2, TC-3, TC-4, TC-12, TC-13 |
| AC-3 | Legacy presentation opens with annotations in same positions | TC-5 |
| AC-4 | Re-saved legacy presentation survives reorder | TC-6 |
| AC-5 | Deleting annotated quote drops annotation (no bleed to neighbour) | TC-7 |
| AC-6 | PDF matches editor | TC-8 |
| AC-7 | Excel matches editor | TC-9 |
| AC-8 | Editor regression (borders, selection, navigator, hidden rows, theme) | TC-10 |
| AC-9 | Sticky notes and shapes unchanged | TC-11 |
| AC-10 | Multi-page grid annotation survives reorder | TC-14 |

---

## 6. Manual test cases

### TC-1 — Market Response: note follows carrier (reported bug)

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Preconditions** | RFP A; presentation P1 open in editor; Market Response page visible |
| **Steps** | 1. Click **Notes** cell on 2nd or 3rd carrier row<br>2. Type `CARRIER-NOTE-A`<br>3. Save presentation<br>4. Add a new quote for a carrier that sorts **above** the annotated row, **or** reorder rows so annotated carrier moves<br>5. Reload presentation editor |
| **Expected** | `CARRIER-NOTE-A` remains on the **same carrier**, not on the row that occupied the old position |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-2 — Medical grid: cell edit follows quote after column shift

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Preconditions** | RFP A; Medical grid page in P1; ≥2 quotes in first plan group |
| **Steps** | 1. Edit a cell on **quote column 2** (e.g. employee cost); enter `GRID-MED-Q2-EE`<br>2. Save<br>3. Add a quote to the plan group so columns shift right<br>4. Reload editor |
| **Expected** | Edit remains on the **original quote**, not column 2 by position |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-3 — Reorder quotes within plan group (no add)

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Preconditions** | Annotated quote exists in a plan group (from TC-2 or fresh annotation) |
| **Steps** | 1. Reorder quotes within the plan group (drag or reorder control)<br>2. Save if prompted<br>3. Reload editor |
| **Expected** | Annotation follows its quote to the new column position |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-4 — Dental and Vision grids

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Preconditions** | Presentation includes Dental and/or Vision grid pages with ≥2 quotes |
| **Steps** | 1. Annotate a cell on quote column 2 on Dental page (`GRID-DENTAL-Q1`)<br>2. Repeat for Vision if present (`GRID-VISION-Q1`)<br>3. Add or reorder quotes<br>4. Reload |
| **Expected** | Same behaviour as Medical — annotations follow quote identity |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-5 — Legacy presentation: no regression on first open

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Preconditions** | Presentation **P0** saved before branch deploy; screenshot of pre-change state |
| **Steps** | 1. Open P0 in editor on branch build<br>2. Compare every existing annotation to pre-change screenshot |
| **Expected** | Every annotation renders **exactly where it did before**, including any the old bug had already misplaced (do **not** file as new defect) |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-6 — Legacy upgrade-on-save

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Preconditions** | TC-5 complete; P0 still available |
| **Steps** | 1. Open P0<br>2. Save presentation (no edits required, or minor save trigger)<br>3. Reorder quotes or add a quote<br>4. Reload |
| **Expected** | Annotations now **follow their quotes** after re-save + reorder |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-7 — Quote deletion drops annotation

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Preconditions** | Quote with cell annotation saved in presentation |
| **Steps** | 1. Delete the annotated quote from the RFP/plan group<br>2. Reload presentation editor |
| **Expected** | Annotation is **gone**; it has **not** moved to a neighbouring quote |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-8 — PDF parity

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Preconditions** | TC-1 and TC-2 scenarios complete with passing annotations |
| **Steps** | 1. Generate PDF for presentations used in TC-1 and TC-2<br>2. Compare annotation text and placement to editor |
| **Expected** | PDF matches editor for all annotated cells |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-9 — Excel parity

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Preconditions** | Same presentations as TC-8; include a hidden row if available |
| **Steps** | 1. Generate Excel export<br>2. Compare cell values/styling to editor<br>3. Confirm hidden rows remain hidden |
| **Expected** | Excel matches editor; hidden rows still hide |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-10 — Editor regression sweep

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Preconditions** | Any presentation with selectable grid cells |
| **Steps** | 1. Select a cell → apply **border** controls → confirm whole row affected<br>2. Template mode → **row selection** highlights full row<br>3. Open **navigator list** → cell names correct<br>4. Toggle **hidden row** → row hides/shows<br>5. Apply **row-level theme** styling |
| **Expected** | All behaviours identical to pre-change editor |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-11 — Sticky notes and shapes unchanged

| Field | Detail |
|-------|--------|
| **Priority** | Medium |
| **Preconditions** | Presentation editor open |
| **Steps** | 1. Add a sticky note at arbitrary x/y<br>2. Add a shape<br>3. Save and reload |
| **Expected** | Note and shape position unchanged by this feature |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-12 — Summary / aggregate cells anchor to plan group

| Field | Detail |
|-------|--------|
| **Priority** | Medium |
| **Preconditions** | Grid page with summary/aggregate column outside `.quote-col` |
| **Steps** | 1. Edit an aggregate cell<br>2. Reorder quotes<br>3. Reload |
| **Expected** | Aggregate annotation stays with **plan group**, not positional column |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-13 — Plan group with buffered summary columns

| Field | Detail |
|-------|--------|
| **Priority** | Medium |
| **Preconditions** | Plan group where summary columns render after quote loop |
| **Steps** | 1. Annotate quote column and adjacent summary column<br>2. Reorder quotes<br>3. Reload |
| **Expected** | Each annotation stays paired with its quote/summary identity |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

### TC-14 — Multi-page grid

| Field | Detail |
|-------|--------|
| **Priority** | Medium |
| **Preconditions** | Grid spans ≥2 pages |
| **Steps** | 1. Navigate to page 2<br>2. Annotate a cell on a specific quote<br>3. Save, reorder quotes, reload<br>4. Navigate back to page 2 |
| **Expected** | Annotation on correct quote on correct page |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |

---

## 7. Automated test reference (dev verification)

Run on branch before manual QA:

```bash
# JS anchor tests (jsdom + real print.js)
npm test -- tests/js-anchor

# PHPUnit Excel anchor tests
vendor/bin/phpunit tests/Unit/PresentationCellAnchorTest.php
```

| Suite | Assertions | Purpose |
|-------|-------------|---------|
| `tests/js-anchor` | 20 | Anchor helpers, returnCells, applyEditorContentToCells, market-response HTML |
| Markup assertions | 14 | `data-anchor-id` / `data-anchor-prefix` on templates |
| `PresentationCellAnchorTest.php` | 4 | Excel `setInlineCSS` anchor resolution |

---

## 8. Known limitations & QA notes

1. **Pre-existing misplacement is not auto-fixed.** Annotations the old bug already moved stay wrong until the presentation is re-saved (TC-5 note).
2. **Steve manually verified** market-response + PDF on local build (2026-08-22). QA should still run TC-9 (Excel) and TC-5/6 (legacy) on real data.
3. **Open question:** Confirm no duplicate market-response canonical keys on multi-plan-group RFPs (see PS-8972 open questions).

---

## 9. Exit criteria

- All **Critical** cases (TC-1, TC-2, TC-5, TC-6, TC-8, TC-9) **Pass**
- No open **Critical** or **High** defects blocking merge
- Legacy presentation (P0) verified on real pre-change data
- PDF and Excel parity confirmed on at least one Market Response + one Medical grid scenario

---

## 10. References

- [PS-8972 story](https://plansight.atlassian.net/browse/PS-8972)
- [PS-9331 Testing sub-task](https://plansight.atlassian.net/browse/PS-9331)
- Branch handoff: `HANDOFF-PS8972.md` on `PS-8972-cell-anchor`
- Research: `PRESENTATION-CELL-ANCHOR-RESEARCH.md` (plansight repo root)
- Loom repro: https://www.loom.com/share/eba2541e2b5b40df95ec6a8f4c48c946
