Here is the structured gap-analysis report comparing the actual Autodesk Flow Production Tracking (FPTR) instance with the current prototype clone.

# Autodesk FPTR vs. Prototype Clone: Gap Analysis Report

## 1. Analysis of the Real FPTR (Evidence-based)

Based on headless Chrome DOM dumps, CSS extractions (`base.css`), and captured screenshots (`기획/09_원본UI_실제캡처분석.md`), here is how the real FPTR behaves across major areas:

### Navigation / Chrome
- **Real FPTR**: The primary navigation is a **2-level top navigation bar** (horizontal), *not* a left sidebar. 
  - Level 1 (Global): Features a green "F" logo, followed by items like `Inbox | My Tasks | Media | Projects▾ | All Pages▾`, etc., on a medium-dark `#3c3c3c` background.
  - Level 2 (Project Tab Bar): Features horizontal tabs for the active project like `Overview | Project Details | Assets | Shots`, active tabs having a teal underline (`#0696d7`).
- **Evidence**: `기획/09_원본UI_실제캡처분석.md` (Section 1), `base.css_추출.txt` (`--globalbar: #3c3c3c`).

### Entity Grid + Columns/Fields
- **Real FPTR**: Highly dense, spreadsheet-like grid that spans full-width. Most cells can be blank. The toolbar contains specific drop-downs and a high-saturation blue `+ Add Shot ▾` button. 
  - Supports resizing, reordering, and hiding/showing columns (using a `Fields▾` menu).
  - Link texts (e.g., Shot Code, Sequence) are teal (`#0696d7`).
- **Evidence**: `01_Projects_그리드.png`, `02_Shots_그리드.png`, `기획/09_원본UI_실제캡처분석.md` (Section 2), `base.css_추출.txt` (`#0696d7` accent color).

### Detail Page
- **Real FPTR**: Exists as a **full page** under the route `/detail/<EntityType>/<id>` (e.g., `/detail/Shot/13450`). It includes breadcrumbs (`Project > Entity ▾`), a large thumbnail (approx 250px), field tables, and a dedicated bottom section with sub-grids organized via tabs (`Activity | Shot Info | Tasks | Versions | Notes`). 
- **Evidence**: `03_Shot_상세페이지.png`, URL routing logic `grep -oE 'Shot/[0-9]+'`.

### Media / Review
- **Real FPTR**: The `Versions` entity serves as the core media/review layer, shown in a grid format with video thumbnails, play overlays, and frame counts. Empty states prompt the user with CTA buttons (e.g., "Once you create some Versions, this is where you can see them.").
- **Evidence**: `04_Versions_미디어그리드.png`, `기획/09_원본UI_실제캡처분석.md`.

### Scheduling / Gantt / Pipeline
- **Real FPTR**: The pipeline step summaries are *not* shown on default grid views but can be toggled on via the `Fields▾` menu. The step sequences represent task statuses under a specific pipeline slot.
- **Evidence**: `기획/09_원본UI_실제캡처분석.md` (Section 6 - Pipeline step summary).

### Statuses
- **Real FPTR**: The status is usually the **first data column**. The *entire cell* is filled with the status color (e.g., `#00a0e4`), containing a small dot icon or short text, instead of a small isolated pill inside a grey cell.
- **Evidence**: `09_원본UI_실제캡처분석.md` (Section 2.4 - 셀 디테일), `styles.css` (Targeting `.status-select.is-cell`).

### Custom Fields
- **Real FPTR**: Supports dynamic addition of fields per entity type directly via the `Fields▾` menu, which binds directly to the backend schema.
- **Evidence**: Grid DOM structures exposing diverse dynamically named column headers.

### Data Model
- **Real FPTR**: Relational data mapped tightly. `Project` -> `Sequence` -> `Shot` <-> `Asset`. `Task`, `Version`, and `Note` use polymorphic linkages (`entity_type`, `entity_id`) to attach to Shots or Assets.
- **Evidence**: `app/models.py` (Clone implemented this accurately based on early DB design).

---

## 2. Feature Comparison Table

| Feature | Real FPTR | Current Clone | Evidence (Clone File Path) |
|:---|:---|:---|:---|
| **Global Navigation** | 2-level Horizontal Top-Nav (`#3c3c3c` / `#222222`) | **Partial** / Needs Sidebar Removal | `src/styles.css` (Lines 68-199 show CSS exists but `EntityDetailPanel` implies sidebar usage) |
| **Grid UI & Density** | Spreadsheet dense, many blanks, blue `+ Add` button | **Present** | `src/components/EntityGrid.tsx` (Lines 187-228, Toolbar setup) |
| **Grid Customization** | Reorder via drag, hide/show via localStorage | **Present** | `src/components/gridView.ts` (localStorage bindings) |
| **Status Rendering** | First column, *Full colored cell* with dot/text | **Partial** | `src/styles.css` (`.status-select.is-cell` implemented but needs verification in grid) |
| **Detail Page Layout** | Dedicated Full Page (`/detail/Shot/:id`) with Sub-grids | **Missing** (Uses Side Panel) | `src/components/EntityDetailPanel.tsx` (Line 31: `<aside className="detail-panel">`), `src/pages/Shots.tsx` (Side-by-side rendering) |
| **Pipeline Strips** | Optional `Fields` toggle; strict slot mapping | **Present** (Hardcoded default) | `src/components/PipelineStrip.tsx` (Lines 22-48 fixed slot logic), `src/pages/Shots.tsx` |
| **Custom Fields** | Dynamic schema, API driven | **Present** | `src/components/EntityGrid.tsx` (Line 113), `app/models.py` (JSON `custom_fields`) |
| **Media / Versions** | Dedicated grids with thumbnails & play overlays | **Partial** | `app/models.py` (`Version` schema), `src/components/EntityDetailPanel.tsx` (Line 90, mini-table implementation) |
| **Theme / Colors** | SGDS design tokens, Teal links (`#0696d7`) | **Present** | `src/styles.css` (Lines 1-20, CSS Vars extracted from `base.css`) |

---

## 3. Prioritized Concrete Recommendations

### 🔴 High Priority (Core Structure & UX)
1. **Convert Side Panel Detail View to a Full Page Route:**
   - **What:** The current clone opens details in a right-side panel (`EntityDetailPanel.tsx`). Real FPTR uses a dedicated full-page (`/detail/Shot/:id`).
   - **Where:** `src/pages/Shots.tsx`, `src/App.tsx` (assuming router setup), `src/pages/EntityDetail.tsx` (Create new).
   - **How:** Remove `<EntityDetailPanel>` from `Shots.tsx`. Use a routing library (like `react-router-dom`) to navigate from row click `onSelect` to a full page that houses the breadcrumbs, large thumbnail, field properties, and full-scale sub-grids for Tasks/Versions/Notes.

2. **Revamp Global App Shell (Navigation):**
   - **What:** Enforce the 2-level horizontal top-nav layout strictly and eliminate any leftover vertical sidebar layouts.
   - **Where:** `src/App.tsx` or `src/components/Layout.tsx`.
   - **How:** Use the CSS classes already defined in `styles.css` (`.globalbar`, `.projbar`) to wrap the top application shell. Ensure active tabs use the `--accent` (`#0696d7`) bottom border.

3. **Status Column Full-Cell Rendering Verification:**
   - **What:** Ensure the `Status` column is the absolute first data column (after checkboxes) and that the cell background fills the entire `<td>`.
   - **Where:** `src/pages/Shots.tsx` (Columns array), `src/styles.css`.
   - **How:** Verify that `StatusSelect variant="cell"` applies `.is-cell` correctly, neutralizing padding on the `<td>` so the color bleeds to the borders.

### 🟡 Medium Priority (Features & Fidelity)
4. **Make Pipeline Strip an Optional Field:**
   - **What:** Pipeline strips shouldn't be forced by default; they clutter the basic view.
   - **Where:** `src/pages/Shots.tsx` & `src/components/gridView.ts`.
   - **How:** Move the `pipeline` column out of the hardcoded default columns and into a togglable option inside the `FieldsMenu`, keeping it consistent with how FPTR handles dynamic summary fields.

5. **Enhance Pagination Footer:**
   - **What:** Implement the real pagination readout UI at the bottom of the grid.
   - **Where:** `src/components/EntityGrid.tsx`.
   - **How:** Upgrade `.grid-footer` to accurately display real counts, e.g., `1 - 100 of 350 Shots` rather than the currently hardcoded mock text.

### 🟢 Low Priority (Polish)
6. **"Upload Thumbnail" Placeholder States:**
   - **What:** Empty thumbnail cells should not just be blank or black, but have a subtle placeholder or an "Upload Thumbnail" hover state.
   - **Where:** `src/util/thumb.ts`, `src/components/EntityGrid.tsx`.
   - **How:** Apply a fallback SVG film icon and a transparent overlay on hover for entities missing a `thumbnail` property.

---

## 4. Uncertainties / Needs Human Verification

- **Checkbox Selections (Bulk Actions):** The DOM dumps show an empty checkbox column leading the grid rows for bulk actions. The clone does not currently seem to implement row selection via checkboxes. Verification is needed on whether bulk-action capabilities should be introduced in this phase.
- **Custom Field Data Types:** The current SQLite implementation safely stores custom fields in a `JSON` column as a key-value pair map. However, we should verify if FPTR expects complex relational data (like entity lookups) inside custom fields, which a simple key-value JSON might struggle to filter/sort efficiently at scale.
- **Media Playback Infrastructure:** Real FPTR streams proxy-generated videos in the Version views. Verification is needed on how the clone intends to handle `.media_url` — whether it will be a simple `<video>` tag pointing to an S3 bucket or if it requires HLS/DASH streaming logic.
