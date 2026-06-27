### 1. Custom Field Values: Database JSON Column vs. LocalStorage
I **propose using a JSON column in SQLite + API** rather than `localStorage`.
* **Collaborative Realism:** ShotGrid is inherently collaborative. Storing values in `localStorage` means edits made by one user won't be visible to others, breaking the fundamental cooperative flow of a production tracker.
* **SQLite JSON Support:** SQLite has robust native JSON support. Storing a `custom_attributes` JSON object in your Shot/Asset tables is extremely simple in FastAPI and allows for easy updates.
* **Easy API Integration:** A single `PATCH /api/shots/{id}` endpoint can merge updates into the JSON field without schema migrations.
* **Where LocalStorage belongs:** Keep the view configuration (column order, column visibility) in `localStorage` (per-user preferences), but keep the actual entity data in the database.

### 2. Header Reordering: Native HTML5 vs. Library
I **propose using a library like `@dnd-kit`** over native HTML5 drag-and-drop.
* **Semantic `<table>` Limitations:** Dragging `<th>` elements natively often causes layout collapses, weird drop-indicator offsets, and styling issues across different browsers.
* **UX & Polish:** Native HTML5 does not support smooth layout animations (layout transitions) when elements shift. A professional grid needs to animate elements moving out of the way during a drag.
* **Accessibility & Touch:** Library-based solutions handle keyboard accessibility and touch events out of the box, which is tedious to implement natively.

### 3. Missing ShotGrid Behaviors to Consider
To truly feel like ShotGrid, your grid will soon need:
* **Column Resizing:** Shot codes, file paths, and descriptions vary wildly in length. Dynamic column width adjustment with drag handles on `<th>` borders is highly utilized.
* **Pipeline Step Columns:** Columns in ShotGrid often represent task statuses across pipeline stages (e.g., Layout, Anim, FX, Comp) grouped together under a parent header.
* **Multi-Entity Link Fields:** The ability to link a Shot to multiple Assets (and vice-versa) using tokenized tags in a cell.
* **Summary Rows:** A bottom row that shows aggregate calculations (e.g., sum of bid days, average percentage complete, status distributions).
* **Multi-Row Edit:** Double-clicking to change a status or custom field value for all currently selected rows at once.
