### A) Per-Column Filtering

* **Cleanest UI & Integration Approach**
  * **Popover per Column Header**: Place a small filter icon next to each column header title. Clicking it toggles a popover containing inputs tailored to the column's data type (text input, status checkboxes, or numeric range). This keeps the header clean and preserves valuable vertical screen space compared to a dedicated filter row.
  * **Column Definition Extension**: Extend column schemas with `filterType: 'text' | 'select' | 'number'` and an optional custom `filterAccessor?: (row: T) => any`.
  * **Data Pipeline Execution**: Compute filtering at the very start of the data processing chain: `Raw Data -> Filter -> Group -> Sort -> Paginate/Render`. This ensures grouping and sorting logic only processes active, matching rows.

* **Clear Recommendation**
  * Implement the **Popover per Column** approach. Combine this with a lightweight **Active Filters Ribbon** in the grid toolbar showing active chips (e.g., `Status: [In Progress, Approved] ✕`). This allows users to immediately see what filters are active and clear them globally without opening individual column popovers.

* **Top Pitfalls & Mitigations**
  * **Group-Filter Interplay**: Applying a filter might leave groups empty. Ensure the client-side grouping function drops groups with zero matching items to avoid rendering empty header bands.
  * **Combining Multiple Column Filters (AND)**: Keep a unified grid state `filters: Record<string, FilterCondition>`. Evaluate rows using logical AND (`Object.values(filters).every(cond => matches(row, cond))`).
  * **Performance Lag**: Re-running filters on hundreds of rows during typing causes lag. Wrap the filter logic in `useMemo` dependent on `rawRows` and `filters`, and debounce text input state changes in the popovers by 150-200ms.
  * **Filter State Persistence**: Users expect filters to persist when navigating away (e.g., to a detail view) and returning. Store the filter state in the URL query string (using search params) so that the grid's state is bookmarkable and persists back-navigation.

---

### B) Activity / History (Audit Trail)

* **Cleanest Backend Approach**
  * **SQLAlchemy Event Listeners**: Use SQLAlchemy's `before_flush` or `after_commit` event listeners. This separates logging from business logic, ensuring that any update (whether via standard endpoints, bulk imports, or background tasks) is automatically captured in the `EventLog` table without polluting FastAPI route controllers.

* **API Shape**
  * **Entity Detail Feed**: `GET /api/entities/{entity_type}/{entity_id}/activity` - returns chronological history for the detail page.
  * **Global Feed**: `GET /api/activity?project_id={id}&limit=50` - returns recent changes across all entities in the project for the global inbox.

* **Frontend Integration**
  * Render a vertical chronological timeline in the "Activity" tab.
  * Use a declarative mapper on the frontend to turn raw database diffs into friendly strings: if `attribute` is `status_id`, map the IDs to status labels and render: `User avatar` **changed status** from `Old Status` ➜ `New Status` `relative time`.

* **Top Pitfalls & Mitigations**
  * **Determining the Acting User in No-Auth**: In a prototype, pass a custom request header (e.g., `X-Mock-User-Id`) from the frontend. Retrieve this in a FastAPI dependency and bind it to a Python context variable (`contextvars.ContextVar`) that the SQLAlchemy listener can access when creating the log record.
  * **Noise and Over-Logging**: Logging every minor metadata change (like `updated_at` timestamps or lock tokens) creates massive database bloat. Define a whitelist of audited columns per model in SQLAlchemy (e.g., `__audited_attributes__ = {'status', 'assignee_id', 'description'}`) and ignore the rest.
  * **Eager Loading & Performance**: Querying the event feed can lead to N+1 database queries when fetching actor user profiles or target entity names. Ensure the `EventLog` model uses SQLAlchemy's `joinedload` on the user relationship, and stores a denormalized target name string (e.g., `entity_name: "Shot 010"`) directly on the log row to avoid querying the entity tables.
  * **Capturing Relationships and Old Values**: Updates to foreign keys (like changing `assignee_id` from `1` to `2`) only log IDs, which are meaningless to users. Have the backend listener fetch the old and new display names of the related entity before saving the event, storing them in JSON format in the `old_value` and `new_value` columns.
