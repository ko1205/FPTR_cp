### A) Right-Click Context Menu on Row

* **Implementation**
    * Intercept default context menu on the `<tr>` element using `onContextMenu={(e) => { e.preventDefault(); ... }}`.
    * Track menu coordinates in state `{ visible: true, x: e.clientX, y: e.clientY, rowData }` and render the menu using a React Portal (`document.body`) with `position: fixed; left: x; top: y; z-index: 9999;`.
    * Close the menu by adding global event listeners (using cleanup in `useEffect`) for `click`, `scroll` (use capture phase: `window.addEventListener('scroll', close, true)`), and the `Escape` key.
    * Do not auto-select the row on right-click unless the target row isn't already part of the current selection. If it isn't, clear current selections and select only the right-clicked row.
* **Confirm UX**
    * Use a modal overlay for confirmation instead of browser-native `confirm()`.
    * Show the specific name/code of the item to be deleted (e.g., *"Delete Shot 'sh_010'?"*) to prevent accidental loss of data.
* **Recommendation**
    * Use React Portals for rendering the menu container to bypass parent CSS overflows, and manage the state with a custom hook (`useContextMenu`).
* **Top Pitfalls**
    * **Menu clipping:** If rendered inside the table row or grid, parent containers with `overflow: auto` or `overflow: hidden` will cut off the menu.
    * **Floating during scroll:** Failing to listen to scroll events in the capture phase leaves the context menu floating detached in mid-air when scrolling the table body.
    * **Edge collisions:** Positioning coordinates directly at `e.clientX/Y` without checking viewport bounds can render the menu partially off-screen.

---

### B) Bulk Delete via the "More" Toolbar Dropdown

* **Implementation**
    * Fetch the array of IDs from the grid's selected `Set<number>`.
    * Disable the "More" dropdown and trigger a loading state when "Delete Selected" is clicked.
    * Send a single batch request containing the array of IDs in the body (e.g., `POST /api/v1/shots/bulk-delete` with `{ ids: [...] }`).
    * Optimistic UI: Immediately filter out the deleted rows from local React state. If the server request fails, restore the cached backup state and display an error banner or toast.
* **Sequential vs. Backend Bulk**
    * **Backend bulk endpoint is mandatory.** Sequential client-side loops (`DELETE /api/.../id`) degrade performance, overload the network, and cause SQLite connection pooling issues (database locking).
* **Recommendation**
    * Implement a single backend endpoint `/api/v1/{entity}/bulk-delete` that runs a single SQL `DELETE FROM table WHERE id IN (...)` command inside a transaction.
* **Top Pitfalls**
    * **N+1 network requests:** Looping API calls on the frontend is slow, non-transactional, and leaves data in a partially deleted state if the network disconnects halfway.
    * **Orphaned selections:** Failing to clear the `selectedIds` state set on success causes the toolbar to display bulk options for non-existent rows.
    * **SQLite lockups:** SQLite does not handle concurrent write requests well; sequential client-side loops can trigger "Database is locked" exceptions.

---

### C) Generic Add Form

* **Implementation**
    * Render a Modal rather than an inline new row. ShotGrid schemas typically have relationships, validation states, and secondary fields that make inline entry fields cramped and fragile.
    * Keep `EntityGrid` completely abstract by letting it receive a configuration array: `fields: Array<{key, label, type, options?, required?, default?}>`.
    * The parent page components (e.g., `ShotsPage`, `AssetsPage`) configure the specific schema mapping and pass it to the grid container, which hands it down to a `<GenericForm>` component.
    * Keep form state locally inside the modal as a key-value object (`{ [fieldKey]: value }`) initialized with `default` values.
* **Recommendation**
    * Use a modal overlay driven by a declarative JSON field configuration prop, maintaining clean separation of concerns between layout (grid) and validation schema (page/entity config).
* **Top Pitfalls**
    * **Stale Modal State:** Failing to reset the form state object on modal open/close, causing the inputs to preserve values from the previously created item.
    * **No Focus Trap:** Letting the user tab outside the modal window, which moves focus and triggers keystrokes (like Enter/Escape) on the main entity grid underneath.
    * **Validation Limitations:** Simple static JSON configuration schemas struggle with conditional rules (e.g., field B is required only if field A is "Asset").

---

### D) Add Multiple / Add CSV (Bulk Create)

* **Implementation**
    * **Add Multiple:** Provide a simple text area modal. Parse line-by-line (`textareaText.split('\n')`), map each non-empty string to the entity's primary field (e.g., `code`), fill in defaults for remaining fields, and POST the payload.
    * **Add CSV:** Provide a file picker/paste area. Use a library like PapaParse on the client. Show a mapping interface where users match CSV headers to the entity's `fields` keys, run validation, and then batch POST.
    * **Backend Processing:** Execute a single `POST /api/v1/{entity}/bulk` request.
* **Handling Partial Failures**
    * Avoid database rollbacks for the entire batch. Instead, return a structured object from the backend: `{ succeededCount: X, failedItems: [{ row: Y, error: "Code already exists", data: {...} }] }`. Re-populate the input or CSV interface with the failed rows so users can correct them and retry.
* **Recommendation**
    * Use client-side CSV parsing (PapaParse) with a visual header-mapping screen. Submit rows in a single backend bulk call, returning granular validation results per row rather than failing the entire transaction.
* **Top Pitfalls**
    * **Naive string splitting:** Splitting strings manually with `line.split(',')` fails on values containing commas enclosed in quotes (e.g., `"Shot description, with comma"`).
    * **Payload size limits:** Importing thousands of rows in one network request can trigger gateway timeouts or payload size limits. Batch client-side requests in chunks of 500 records.
    * **Silent database failures:** Failing to catch database constraint errors (like unique keys) inside the backend loop, causing a server crash instead of reporting a clean validation error.
