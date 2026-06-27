* **Q1 Recommendation: Generalize `<EntityGrid>` via Props using a Container-Presenter Pattern**
  * Avoid creating a separate `VersionsGrid` component; duplicating complex grid behaviors (drag-reorder, resizing, inline editing, and grouping) creates a severe maintenance burden.
  * Instead, keep `<EntityGrid>` purely presentational. Pass `columns`, `data`, and handlers (like `onRowClick` and `bulkActions`) as props.
  * Use parent wrapper components (e.g., `<ShotAssetGrid>` vs. `<VersionGrid>`) to handle entity-specific logic, such as fetching custom field definitions and appending them to the column list.
  * **Top Pitfalls to Avoid:**
    * **Spaghetti Conditionals:** Hardcoding entity-specific logic inside the grid (e.g., `if (entityType === 'Version') showReviewPanel()`). Keep the grid unaware of the "Review Panel" and simply bubble up `onRowClick`.
    * **Coupled Data Fetching:** Placing the Shot/Asset custom field API calls directly inside `<EntityGrid>`. This causes unnecessary network requests and schema runtime errors when rendering Versions.

* **Q2 Recommendation: Sort Rows prior to Grouping, and Isolate Header Click Events**
  * **Sorting & Grouping Flow:** First sort the flat array of rows based on the selected column, then run the grouping function. JavaScript's grouping preserves the sorted insertion order within each group.
  * **Input Conflict Prevention:**
    * **Resize Grip:** Add `e.stopPropagation()` on the mousedown/click handlers of the resize handle element so it never bubbles to the header click listener.
    * **Drag-Reorder:** Track mouse movement distance (threshold) on `mousedown`. Only initiate a drag if the mouse moves more than 5 pixels. If the mouse is released under that threshold, trigger the column sort click.
  * **Active Sort Indicator:** Render a small chevron icon next to the column label (e.g., `▲` for asc, `▼` for desc) that is hidden or styled with low opacity (`opacity: 0.3`) when unsorted but hoverable.
  * **Type-Aware & Stable Sort Pitfalls:**
    * **Type Mismatches:** Direct subtraction (`a - b`) fails on strings, dates, and nulls. Use a robust helper that handles `null`/`undefined` (always pushing them to the bottom) and compares strings via `localeCompare`.
    * **Date Comparison:** Comparing raw date strings alphabetically (e.g., "2026-06-27" vs "Date") fails if formats vary. Ensure accessors parse dates into timestamps (`getTime()`) before sorting.
    * **Unstable Sorts:** If two rows have identical sort values, the browser's default sort can cause rows to visually jump. Always fall back to a unique identifier (like `row.id` or the original index) as a secondary tie-breaker.
