1. **ShotGrid Global Inbox:** Tracks updates (Notes, Versions, Tasks) on followed/assigned entities. Grouped primarily by **Unread** vs. **Read**, and sub-grouped chronologically into relative date buckets (*Today*, *Yesterday*, *Last Week*).
2. **Minimal Row Layout:**
   * **Left:** Actor avatar/initials + Blue unread dot indicator.
   * **Center:** Main text phrase: `[Actor Link] [Verb] [Entity Link]` in `[Project Link]` (e.g., *"Admin submitted Version v001 on Shot SH_10"*). Underneath: activity snippet (e.g., Note body or status diff).
   * **Right:** Relative timestamp (e.g., *"5m ago"*).
3. **Simplest Unread Tracking:**
   * Store a `last_read_timestamp` on the User model. Events newer than this are "unread" by default.
   * Support individual read/unread overrides using a simple backend join table `user_read_events(user_id, event_log_id)` or a client-side localStorage set of read event IDs for a lightweight local prototype.
